const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeContracts() {
    try {
        // Find all contracts for apartment CAN04-06
        const contracts = await prisma.contracts.findMany({
            where: {
                apartment_id: {
                    contains: 'CAN04-06',
                },
            },
            include: {
                customers: true,
                apartments: true,
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        console.log('\n=== Contracts for CAN04-06 ===');
        console.log(`Total contracts found: ${contracts.length}\n`);

        contracts.forEach((contract, index) => {
            console.log(`Contract ${index + 1}:`);
            console.log(`  ID: ${contract.id}`);
            console.log(`  Code: ${contract.contract_code}`);
            console.log(`  Customer: ${contract.customers.name} (${contract.customers.id})`);
            console.log(`  Apartment: ${contract.apartments.code}`);
            console.log(`  Status: ${contract.status}`);
            console.log(`  Created: ${contract.created_at}`);
            console.log(`  Total: ${contract.total_amount}`);
            console.log('---');
        });

        // Find all apartments with multiple contracts
        const allContracts = await prisma.contracts.findMany({
            include: {
                apartments: true,
                customers: true,
            },
        });

        const apartmentContractCount = {};
        allContracts.forEach((contract) => {
            const aptId = contract.apartment_id;
            if (!apartmentContractCount[aptId]) {
                apartmentContractCount[aptId] = [];
            }
            apartmentContractCount[aptId].push(contract);
        });

        console.log('\n=== Apartments with Multiple Contracts ===');
        Object.entries(apartmentContractCount).forEach(([aptId, contracts]) => {
            if (contracts.length > 1) {
                console.log(`\nApartment: ${contracts[0].apartments.code} (${aptId})`);
                console.log(`Total contracts: ${contracts.length}`);
                contracts.forEach((c) => {
                    console.log(`  - ${c.contract_code} | ${c.customers.name} | ${c.status}`);
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeContracts();
