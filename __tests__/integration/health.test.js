const request = require('supertest');
const express = require('express');

// Create a minimal Express app for health check testing
const app = express();

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

describe('Health Check Endpoint', () => {
    describe('GET /health', () => {
        it('should return 200 status', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
        });

        it('should return health status object', async () => {
            const response = await request(app).get('/health');

            expect(response.body).toHaveProperty('status', 'ok');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });

        it('should return valid timestamp', async () => {
            const response = await request(app).get('/health');

            const timestamp = new Date(response.body.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.getTime()).not.toBeNaN();
        });

        it('should return numeric uptime', async () => {
            const response = await request(app).get('/health');

            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
        });
    });
});
