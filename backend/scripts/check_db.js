const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apts = await prisma.apartments.findMany({
    select: { id: true, code: true, electricity_type: true },
    orderBy: { code: 'asc' }
  });
  console.log('=== Apartments in DB (' + apts.length + ') ===');
  apts.forEach(a => console.log(a.code + ' | ' + a.id + ' | ' + a.electricity_type));

  const residents = await prisma.residents.findMany({
    select: { id: true, name: true, phone_number: true, email: true, relationship_status: true },
    orderBy: { name: 'asc' }
  });
  console.log('\n=== Residents in DB (' + residents.length + ') ===');
  residents.forEach(r => console.log(r.name + ' | ' + r.phone_number + ' | ' + r.email + ' | ' + r.relationship_status));

  const occs = await prisma.occupancies.findMany({
    select: { apartment_id: true, resident_id: true }
  });
  console.log('\n=== Occupancies in DB (' + occs.length + ') ===');
  occs.forEach(o => console.log(o.apartment_id + ' -> ' + o.resident_id));

  const utilities = await prisma.utility_records.findMany({
    select: { id: true, apartment_id: true, billing_month: true, water_previous: true, water_current: true, electricity_previous: true, electricity_current: true },
    orderBy: { billing_month: 'desc' },
    take: 20
  });
  console.log('\n=== Recent Utility Records (' + utilities.length + ') ===');
  utilities.forEach(u => console.log(u.apartment_id + ' | ' + u.billing_month + ' | W:' + u.water_previous + '->' + u.water_current + ' | E:' + u.electricity_previous + '->' + u.electricity_current));
}

main().then(() => prisma.$disconnect());
