const request = require('supertest');
const express = require('express');

// Mock setup
jest.mock('../../config/redis', () => ({
    redisClient: {
        keys: jest.fn().mockResolvedValue(['key1', 'key2']),
        get: jest.fn().mockResolvedValue(JSON.stringify({ translated: 'test' })),
        del: jest.fn().mockResolvedValue(1),
        flushall: jest.fn().mockResolvedValue('OK'),
        info: jest.fn().mockResolvedValue('# Stats\r\nused_memory:1000000\r\n')
    }
}));

const cacheRoutes = require('../../routes/cacheRoutes');

const app = express();
app.use(express.json());
app.use('/cache', cacheRoutes);

describe('Cache API Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /cache/keys', () => {
        it('should list all cache keys', async () => {
            const response = await request(app).get('/cache/keys');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('keys');
            expect(Array.isArray(response.body.keys)).toBe(true);
        });
    });

    describe('GET /cache/stats', () => {
        it('should return cache statistics', async () => {
            const response = await request(app).get('/cache/stats');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success');
        });
    });

    describe('DELETE /cache/clear', () => {
        it('should clear all cache', async () => {
            const response = await request(app).delete('/cache/clear');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('DELETE /cache/:key', () => {
        it('should delete a specific cache key', async () => {
            const response = await request(app).delete('/cache/test:key:123');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });
});
