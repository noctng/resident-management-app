const request = require('supertest');
const app = require('../../server');
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

describe('Resident Deletion Integration Tests', () => {
    let testApartment;
    let testAdminUser;
    let testManagerUser;
    let testOwnerResident;
    let testFamilyResident;
    let adminCookie;
    let managerCookie;

    beforeAll(async () => {
        // 1. Clean up potential leftover data from previous failed runs
        await prisma.resident_feedback.deleteMany({
            where: { id: 'fb_test_delete' },
        });
        await prisma.amenity_usage.deleteMany({
            where: { id: 'am_test_delete' },
        });
        await prisma.occupancies.deleteMany({
            where: {
                resident_id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.resident_accounts.deleteMany({
            where: {
                resident_id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.residents.deleteMany({
            where: {
                id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.apartments.deleteMany({
            where: { code: 'TEST_DEL_APT' },
        });
        await prisma.users.deleteMany({
            where: { username: { in: ['test_admin_delete', 'test_manager_delete'] } },
        });

        // 2. Hash password for test users
        const passwordHash = await bcrypt.hash('password123', 10);

        // 3. Create test users (admin and manager)
        testAdminUser = await prisma.users.create({
            data: {
                id: 'usr_admin_delete',
                username: 'test_admin_delete',
                password_hash: passwordHash,
                role: 0, // Admin
            },
        });

        testManagerUser = await prisma.users.create({
            data: {
                id: 'usr_manager_delete',
                username: 'test_manager_delete',
                password_hash: passwordHash,
                role: 1, // Manager/Staff
                permissions: [],
            },
        });

        // 4. Create test apartment
        testApartment = await prisma.apartments.create({
            data: {
                id: 'apt_del_test',
                code: 'TEST_DEL_APT',
                house_type: 'CANTATA',
                floor: 1,
                area: 75.5,
                electricity_type: 'RESIDENTIAL',
            },
        });

        // 5. Create test residents
        testOwnerResident = await prisma.residents.create({
            data: {
                id: 'res_owner_delete',
                name: 'Owner Delete Test',
                id_number: 'OWNER_DEL_TEST_123',
                phone_number: '0987654321',
                email: 'owner_del@example.com',
                relationship_status: 'OWNER',
                is_active: true,
            },
        });

        testFamilyResident = await prisma.residents.create({
            data: {
                id: 'res_family_delete',
                name: 'Family Delete Test',
                id_number: 'FAMILY_DEL_TEST_123',
                phone_number: '0987654322',
                email: 'family_del@example.com',
                relationship_status: 'FAMILY',
                is_active: true,
            },
        });

        // 6. Connect residents to apartment via occupancies
        await prisma.occupancies.createMany({
            data: [
                { apartment_id: testApartment.id, resident_id: testOwnerResident.id },
                { apartment_id: testApartment.id, resident_id: testFamilyResident.id },
            ],
        });

        // 7. Create portal account for FAMILY resident
        await prisma.resident_accounts.create({
            data: {
                resident_id: testFamilyResident.id,
                password_hash: passwordHash,
            },
        });

        // 8. Create feedback for FAMILY resident
        await prisma.resident_feedback.create({
            data: {
                id: 'fb_test_delete',
                resident_id: testFamilyResident.id,
                apartment_id: testApartment.id,
                content: 'Phản ánh kiểm tra xóa cư dân',
                status: 'SUBMITTED',
            },
        });

        // 9. Create amenity booking for FAMILY resident
        await prisma.amenity_usage.create({
            data: {
                id: 'am_test_delete',
                resident_id: testFamilyResident.id,
                apartment_id: testApartment.id,
                amenity: 'GYM',
                usage_date: new Date(),
                status: 'pending',
            },
        });

        // 10. Perform logins to get cookies
        const adminLogin = await request(app)
            .post('/api/login')
            .send({ username: 'test_admin_delete', password: 'password123' });
        adminCookie = adminLogin.headers['set-cookie'];

        const managerLogin = await request(app)
            .post('/api/login')
            .send({ username: 'test_manager_delete', password: 'password123' });
        managerCookie = managerLogin.headers['set-cookie'];
    });

    afterAll(async () => {
        // Clean up mock data
        await prisma.resident_feedback.deleteMany({
            where: { id: 'fb_test_delete' },
        });
        await prisma.amenity_usage.deleteMany({
            where: { id: 'am_test_delete' },
        });
        await prisma.occupancies.deleteMany({
            where: {
                resident_id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.resident_accounts.deleteMany({
            where: {
                resident_id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.residents.deleteMany({
            where: {
                id: { in: ['res_owner_delete', 'res_family_delete'] },
            },
        });
        await prisma.apartments.deleteMany({
            where: { id: testApartment?.id },
        });
        await prisma.users.deleteMany({
            where: { username: { in: ['test_admin_delete', 'test_manager_delete'] } },
        });
        // We can optionally clean up 'res_deleted' feedback if it was created, but that might impact other tests or seeded data.
        // We'll clean up ONLY the test feedback.
    });

    it('should deny resident deletion for non-admin staff (role: 1)', async () => {
        const res = await request(app)
            .delete(`/api/residents/${testFamilyResident.id}`)
            .set('Cookie', managerCookie);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Quyền truy cập bị từ chối');

        // Verify resident still exists in DB
        const residentExists = await prisma.residents.findUnique({
            where: { id: testFamilyResident.id },
        });
        expect(residentExists).toBeDefined();
    });

    it('should block deletion of an OWNER resident with 400 Bad Request', async () => {
        const res = await request(app)
            .delete(`/api/residents/${testOwnerResident.id}`)
            .set('Cookie', adminCookie);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Không thể xóa cư dân là chủ sở hữu');

        // Verify resident still exists in DB
        const ownerExists = await prisma.residents.findUnique({
            where: { id: testOwnerResident.id },
        });
        expect(ownerExists).toBeDefined();
    });

    it('should successfully delete a FAMILY resident as Admin and anonymize feedback/amenity usage', async () => {
        const res = await request(app)
            .delete(`/api/residents/${testFamilyResident.id}`)
            .set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Đã xóa cư dân thành công');

        // 1. Verify resident record is deleted
        const residentExists = await prisma.residents.findUnique({
            where: { id: testFamilyResident.id },
        });
        expect(residentExists).toBeNull();

        // 2. Verify portal account is deleted
        const accountExists = await prisma.resident_accounts.findUnique({
            where: { resident_id: testFamilyResident.id },
        });
        expect(accountExists).toBeNull();

        // 3. Verify occupancy link is deleted
        const occupancyExists = await prisma.occupancies.findUnique({
            where: {
                apartment_id_resident_id: {
                    apartment_id: testApartment.id,
                    resident_id: testFamilyResident.id,
                },
            },
        });
        expect(occupancyExists).toBeNull();

        // 4. Verify feedback was reassigned to dummy 'res_deleted' resident
        const feedback = await prisma.resident_feedback.findUnique({
            where: { id: 'fb_test_delete' },
        });
        expect(feedback).toBeDefined();
        expect(feedback.resident_id).toBe('res_deleted');

        // Verify dummy resident was created automatically if not already exists
        const dummyResident = await prisma.residents.findUnique({
            where: { id: 'res_deleted' },
        });
        expect(dummyResident).toBeDefined();
        expect(dummyResident.name).toBe('Cư dân đã xóa');

        // 5. Verify amenity usage was anonymized (resident_id set to null)
        const amenityUsage = await prisma.amenity_usage.findUnique({
            where: { id: 'am_test_delete' },
        });
        expect(amenityUsage).toBeDefined();
        expect(amenityUsage.resident_id).toBeNull();
    });
});
