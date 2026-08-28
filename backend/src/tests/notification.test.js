const prisma = require('../config/prisma');
const { sendPaymentThankYou } = require('../services/notificationService');

describe('Notification Service Integration Test', () => {
    let testApartment;
    let testResident;
    let testOccupancy;

    beforeAll(async () => {
        // Clean existing test data if any
        await prisma.occupancies.deleteMany({
            where: {
                apartments: { code: 'TEST_CONFIRMATION_APT' }
            }
        });
        await prisma.residents.deleteMany({
            where: { id_number: 'TEST_RES_ID_CONFIRM' }
        });
        await prisma.apartments.deleteMany({
            where: { code: 'TEST_CONFIRMATION_APT' }
        });

        // 1. Create a test apartment
        testApartment = await prisma.apartments.create({
            data: {
                code: 'TEST_CONFIRMATION_APT',
                house_type: 'CANTATA',
                floor: 1,
                area: 80.00,
                electricity_type: 'RESIDENTIAL'
            }
        });

        // 2. Create a test resident
        testResident = await prisma.residents.create({
            data: {
                id: 'res_test_confirm',
                name: 'Nguyễn Văn Test',
                id_number: 'TEST_RES_ID_CONFIRM',
                phone_number: '0999999999',
                email: 'test_confirm@example.com',
                relationship_status: 'OWNER',
                is_active: true
            }
        });

        // 3. Create occupancy mapping
        testOccupancy = await prisma.occupancies.create({
            data: {
                apartment_id: testApartment.id,
                resident_id: testResident.id
            }
        });
    });

    afterAll(async () => {
        // Clean up created test data
        await prisma.occupancies.deleteMany({
            where: { apartment_id: testApartment.id }
        });
        await prisma.residents.deleteMany({
            where: { id: testResident.id }
        });
        await prisma.apartments.deleteMany({
            where: { id: testApartment.id }
        });
        await prisma.email_templates.deleteMany({
            where: { code: 'PAYMENT_CONFIRMATION' }
        });
    });

    it('should successfully create PAYMENT_CONFIRMATION template and invoke thank you notification', async () => {
        // Verify template does not exist initially
        await prisma.email_templates.deleteMany({
            where: { code: 'PAYMENT_CONFIRMATION' }
        });

        // Call the notification helper
        await expect(sendPaymentThankYou({
            apartmentId: testApartment.id,
            amount: 1250000,
            month: 5,
            year: 2026,
            paymentMethod: 'Ví điện tử',
            paymentDate: new Date()
        })).resolves.not.toThrow();

        // Verify template has been created automatically
        const template = await prisma.email_templates.findUnique({
            where: { code: 'PAYMENT_CONFIRMATION' }
        });

        expect(template).toBeDefined();
        expect(template.code).toBe('PAYMENT_CONFIRMATION');
        expect(template.variables).toContain('resident_name');
        expect(template.variables).toContain('amount');
    });
});
