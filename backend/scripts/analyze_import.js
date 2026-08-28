const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Read Excel
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('d:\\OneDrive - Cong Ty Co Phan Tap Doan Trung Nguyen\\test cu dan.xlsx');
  const ws = wb.getWorksheet('Sheet1');

  const excelRows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = row.getCell(3).value;
    if (!code) continue;
    excelRows.push({
      stt: row.getCell(1).value,
      building: row.getCell(2).value,
      code: code.toString().trim(),
      name: row.getCell(4).value ? row.getCell(4).value.toString().trim() : null,
      phone: row.getCell(5).value ? row.getCell(5).value.toString().trim() : null,
      email: row.getCell(6).value ? row.getCell(6).value.toString().trim() : null,
      address: row.getCell(7).value ? row.getCell(7).value.toString().trim() : null,
      ht: row.getCell(8).value ? row.getCell(8).value.toString().trim() : null, // Cư dân / CĐT
      meterName: row.getCell(9).value ? row.getCell(9).value.toString().trim() : null,
      meterSerial: row.getCell(10).value ? row.getCell(10).value.toString().trim() : null,
      usageType: row.getCell(11).value ? row.getCell(11).value.toString().trim() : null, // Hộ gia đình / Hộ kinh doanh
      waterPrev: Number(row.getCell(12).value) || 0,
      waterCurr: Number(row.getCell(13).value) || 0,
      waterTax: Number(row.getCell(14).value) || 0,
      elecPrev: Number(row.getCell(15).value) || 0,
      elecCurr: Number(row.getCell(16).value) || 0,
      elecTax: Number(row.getCell(17).value) || 0,
      debt: Number(row.getCell(18).value) || 0,
    });
  }
  console.log('Excel rows:', excelRows.length);

  // 2. Get existing DB data
  const dbApts = await prisma.apartments.findMany({ select: { id: true, code: true, electricity_type: true } });
  const dbAptMap = {};
  dbApts.forEach(a => { dbAptMap[a.code] = a; });

  const dbResidents = await prisma.residents.findMany({ select: { id: true, name: true, phone_number: true, email: true } });
  const dbResMap = {};
  dbResidents.forEach(r => {
    const key = (r.name || '').trim().toUpperCase();
    if (!dbResMap[key]) dbResMap[key] = [];
    dbResMap[key].push(r);
  });

  const dbOccs = await prisma.occupancies.findMany();
  const occSet = new Set();
  dbOccs.forEach(o => occSet.add(o.apartment_id + '|' + o.resident_id));

  // 3. Compare
  const missingApts = [];
  const existingApts = [];
  for (const row of excelRows) {
    if (dbAptMap[row.code]) {
      existingApts.push(row);
    } else {
      missingApts.push(row);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Excel apartments:', excelRows.length);
  console.log('Already in DB:', existingApts.length);
  console.log('Missing from DB:', missingApts.length);

  console.log('\n=== MISSING APARTMENTS ===');
  missingApts.forEach(r => console.log(r.code + ' | ' + r.name + ' | ' + r.usageType + ' | ' + r.ht));

  // Check which existing apartments need electricity_type update
  console.log('\n=== ELECTRICITY TYPE CHECK ===');
  let needUpdate = 0;
  for (const row of existingApts) {
    const dbApt = dbAptMap[row.code];
    const expectedType = row.usageType === 'Hộ kinh doanh' ? 'BUSINESS' : 'RESIDENTIAL';
    if (dbApt.electricity_type !== expectedType) {
      console.log('UPDATE ' + row.code + ': ' + dbApt.electricity_type + ' -> ' + expectedType);
      needUpdate++;
    }
  }
  console.log('Apartments needing electricity_type update:', needUpdate);

  // Check residents
  console.log('\n=== MISSING RESIDENTS (by name) ===');
  let missingResCount = 0;
  for (const row of excelRows) {
    if (!row.name || row.name === 'CĐT') continue;
    const key = row.name.toUpperCase();
    if (!dbResMap[key]) {
      console.log('MISSING: ' + row.name + ' (phone: ' + row.phone + ', apt: ' + row.code + ')');
      missingResCount++;
    }
  }
  console.log('Missing residents:', missingResCount);

  // Check occupancies
  console.log('\n=== MISSING OCCUPANCIES ===');
  let missingOccCount = 0;
  for (const row of excelRows) {
    if (!row.name || row.name === 'CĐT') continue;
    const key = row.name.toUpperCase();
    const residents = dbResMap[key];
    if (!residents) continue; // will be created
    const apt = dbAptMap[row.code];
    if (!apt) continue; // will be created
    const resident = residents[0];
    const occKey = apt.id + '|' + resident.id;
    if (!occSet.has(occKey)) {
      console.log('MISSING OCC: ' + row.code + ' -> ' + row.name + ' (' + resident.id + ')');
      missingOccCount++;
    }
  }
  console.log('Missing occupancies:', missingOccCount);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
