const request = require('supertest');
const app = require('../../server');
const prisma = require('../config/prisma');

describe('Utility AI/OCR & Validation Endpoints', () => {
    describe('POST /api/utility-records/analyze-meter', () => {
        it('should return 401 Unauthorized if token is missing', async () => {
            const res = await request(app)
                .post('/api/utility-records/analyze-meter')
                .send({});
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/utility-records', () => {
        it('should return 401 Unauthorized if token is missing', async () => {
            const res = await request(app)
                .post('/api/utility-records')
                .send({});
            expect(res.status).toBe(401);
        });

        it('should reject invalid reading body fields', async () => {
            // Log in as admin to get token
            const loginRes = await request(app)
                .post('/api/login')
                .send({ username: 'admin', password: 'password123' }); // default seed credentials if any
            
            if (loginRes.status === 200) {
                const cookie = loginRes.headers['set-cookie'];
                const res = await request(app)
                    .post('/api/utility-records')
                    .set('Cookie', cookie)
                    .send({
                        apartmentId: 'invalid-apt',
                        month: 'thirteen', // invalid month
                        year: 2026,
                        newElectricityReading: -10, // invalid negative reading
                        newWaterReading: 10
                    });
                
                expect(res.status).toBe(400);
                expect(res.body.message).toContain('Dữ liệu không hợp lệ');
            }
        });
    });
});
