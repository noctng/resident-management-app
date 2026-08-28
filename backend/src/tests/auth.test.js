const request = require('supertest');
const app = require('../../server');
const prisma = require('../config/prisma');

describe('Auth Endpoints', () => {
    it('GET /api/auth/session - should return 401 Unauthorized if no token provided', async () => {
        const res = await request(app).get('/api/auth/session');
        expect(res.status).toBe(401);
    });

    it('POST /api/login - should return 400 Bad Request if missing fields', async () => {
        const res = await request(app).post('/api/login').send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/login - should return 401 for incorrect credentials', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'invalid_user_123', password: 'wrong_password' });
        expect(res.status).toBe(401);
    });
});
