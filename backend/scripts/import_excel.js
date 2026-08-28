const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log('=== IMPORT EXCEL DATA ===\n');

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
      building: row.getCell(2).value.toString().trim(),
      code: code.toString().trim(),
      name: row.getCell(4).value ? row.getCell(4).value.toString().trim() : null,
      phone: row.getCell(5).value ? row.getCell(5).value.toString().trim() : null,
      email: row.getCell(6).value ? row.getCell(6).value.toString().trim() : null,
      ht: row.getCell(8).value ? row.getCell(8).value.toString().trim() : null,
      usageType: row.getCell(11).value ? row.getCell(11).value.toString().trim() : null,
      waterPrev: Number(row.getCell(12).value) || 0,
      waterCurr: Number(row.getCell(13).value) || 0,
      elecPrev: Number(row.getCell(15).value) || 0,
      elecCurr: Number(row.getCell(16).value) || 0,
    });
  }

  // 2. Get existing DB data
  const dbApts = await prisma.apartments.findMany({ select: { id: true, code: true, electricity_type: true, house_type: true, floor: true, area: true } });
  const dbAptMap = {};
  dbApts.forEach(a => { dbAptMap[a.code] = a; });

  const dbResidents = await prisma.residents.findMany({ select: { id: true, name: true, phone_number: true } });
  const dbResByName = {};
  dbResidents.forEach(r => {
    const key = (r.name || '').trim().toUpperCase();
    if (!dbResByName[key]) dbResByName[key] = [];
    dbResByName[key].push(r);
  });

  const dbOccs = await prisma.occupancies.findMany();
  const occSet = new Set();
  dbOccs.forEach(o => occSet.add(o.apartment_id + '|' + o.resident_id));

  const dbUtilities = await prisma.utility_records.findMany({
    where: { month: 3, year: 2026 },
    select: { apartment_id: true }
  });
  const utilSet = new Set(dbUtilities.map(u => u.apartment_id));

  // 3. Determine building -> house_type mapping
  const buildingTypeMap = {
    'CAN01': 'CANTATA', 'CAN02': 'CANTATA', 'CAN03': 'CANTATA',
    'CAN04': 'CANTATA', 'CAN05': 'CANTATA',
    'TES01': 'TESLA', 'TES02': 'TESLA', 'TES03': 'TESLA',
    'TES04': 'TESLA', 'TES05': 'TESLA', 'TES06': 'TESLA',
    'TES07': 'TESLA', 'TES08': 'TESLA', 'TES09': 'TESLA',
  };

  // Extract floor from apartment code (e.g., CAN03-01 -> floor 1, TES05-43 -> floor 4)
  function getFloor(code) {
    const parts = code.split('-');
    if (parts.length < 2) return 1;
    const num = parseInt(parts[1]);
    if (isNaN(num)) return 1;
    // For codes like CAN03-01, the number is sequential, not floor
    // We'll use 0 as placeholder since we don't know the actual floor
    return 0;
  }

  function getBuilding(code) {
    const parts = code.split('-');
    return parts[0];
  }

  // ===== PHASE 1: Create missing apartments =====
  console.log('--- PHASE 1: Create missing apartments ---');
  let createdApts = 0;
  const aptIdMap = {}; // code -> id (for newly created)

  for (const row of excelRows) {
    if (dbAptMap[row.code]) {
      aptIdMap[row.code] = dbAptMap[row.code].id;
      continue;
    }

    const building = getBuilding(row.code);
    const houseType = buildingTypeMap[building] || building;
    const elecType = row.usageType === 'Hộ kinh doanh' ? 'BUSINESS' : 'RESIDENTIAL';

    try {
      const apt = await prisma.apartments.create({
        data: {
          code: row.code,
          house_type: houseType,
          floor: getFloor(row.code),
          area: 0,
          electricity_type: elecType,
        }
      });
      aptIdMap[row.code] = apt.id;
      createdApts++;
      console.log('  CREATED: ' + row.code + ' (' + houseType + ', ' + elecType + ')');
    } catch (e) {
      console.error('  ERROR creating ' + row.code + ': ' + e.message);
    }
  }
  console.log('Created apartments: ' + createdApts);

  // ===== PHASE 2: Update electricity_type for existing apartments =====
  console.log('\n--- PHASE 2: Update electricity_type ---');
  let updatedApts = 0;

  for (const row of excelRows) {
    const dbApt = dbAptMap[row.code];
    if (!dbApt) continue;

    const expectedType = row.usageType === 'Hộ kinh doanh' ? 'BUSINESS' : 'RESIDENTIAL';
    if (dbApt.electricity_type !== expectedType) {
      await prisma.apartments.update({
        where: { id: dbApt.id },
        data: { electricity_type: expectedType }
      });
      updatedApts++;
      console.log('  UPDATED: ' + row.code + ' ' + dbApt.electricity_type + ' -> ' + expectedType);
    }
  }
  console.log('Updated apartments: ' + updatedApts);

  // ===== PHASE 3: Create missing residents =====
  console.log('\n--- PHASE 3: Create missing residents ---');
  let createdResidents = 0;
  const resIdMap = {}; // name_upper -> id

  for (const row of excelRows) {
    if (!row.name || row.name === 'CĐT') continue;

    const key = row.name.toUpperCase();
    if (dbResByName[key]) {
      resIdMap[key] = dbResByName[key][0].id;
      continue;
    }
    if (resIdMap[key]) continue; // already created in this run

    const relationshipStatus = row.ht === 'Cư dân' ? 'OWNER' : 'FAMILY';

    try {
      const resident = await prisma.residents.create({
        data: {
          id: uuidv4(),
          name: row.name,
          phone_number: row.phone || null,
          email: row.email || null,
          relationship_status: relationshipStatus,
          is_active: true,
          can_use_amenities: true,
        }
      });
      resIdMap[key] = resident.id;
      createdResidents++;
      console.log('  CREATED: ' + row.name + ' (phone: ' + (row.phone || 'N/A') + ', status: ' + relationshipStatus + ')');
    } catch (e) {
      console.error('  ERROR creating ' + row.name + ': ' + e.message);
    }
  }
  console.log('Created residents: ' + createdResidents);

  // ===== PHASE 4: Create occupancies =====
  console.log('\n--- PHASE 4: Create occupancies ---');
  let createdOccs = 0;

  for (const row of excelRows) {
    if (!row.name || row.name === 'CĐT') continue;

    const key = row.name.toUpperCase();
    const residentId = resIdMap[key];
    const aptId = aptIdMap[row.code];
    if (!residentId || !aptId) continue;

    const occKey = aptId + '|' + residentId;
    if (occSet.has(occKey)) continue;

    try {
      await prisma.occupancies.create({
        data: { apartment_id: aptId, resident_id: residentId }
      });
      occSet.add(occKey);
      createdOccs++;
      console.log('  CREATED: ' + row.code + ' -> ' + row.name);
    } catch (e) {
      console.error('  ERROR creating occupancy ' + row.code + ' -> ' + row.name + ': ' + e.message);
    }
  }
  console.log('Created occupancies: ' + createdOccs);

  // ===== PHASE 5: Create utility records for March 2026 =====
  console.log('\n--- PHASE 5: Create utility records (March 2026) ---');
  let createdUtils = 0;
  let skippedUtils = 0;

  for (const row of excelRows) {
    const aptId = aptIdMap[row.code];
    if (!aptId) continue;

    if (utilSet.has(aptId)) {
      skippedUtils++;
      continue;
    }

    try {
      await prisma.utility_records.create({
        data: {
          id: uuidv4(),
          apartment_id: aptId,
          month: 3,
          year: 2026,
          water_old_reading: row.waterPrev,
          water_new_reading: row.waterCurr,
          electricity_old_reading: row.elecPrev,
          electricity_new_reading: row.elecCurr,
        }
      });
      createdUtils++;
    } catch (e) {
      console.error('  ERROR creating utility for ' + row.code + ': ' + e.message);
    }
  }
  console.log('Created utility records: ' + createdUtils);
  console.log('Skipped (already exist): ' + skippedUtils);

  // ===== SUMMARY =====
  console.log('\n========== SUMMARY ==========');
  console.log('Apartments created: ' + createdApts);
  console.log('Apartments electricity_type updated: ' + updatedApts);
  console.log('Residents created: ' + createdResidents);
  console.log('Occupancies created: ' + createdOccs);
  console.log('Utility records created: ' + createdUtils);
  console.log('Utility records skipped: ' + skippedUtils);
  console.log('=============================');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
