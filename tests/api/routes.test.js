const request = require('supertest');
const express = require('express');

// Mock all dependencies
jest.mock('../../middleware/middleware', () => ({
  checkSignUp: (req, res, next) => next(),
  checkSignIn: (req, res, next) => next(),
  checkUser: (req, res, next) => {
    req.user = { id: 123, name: 'Test User', email: 'test@example.com' };
    next();
  },
}));

const mockHandleTranslate = jest.fn((req, res) =>
  res.json({ success: true, translation: 'Hola' })
);
const mockExtractTextFromImage = jest.fn((req, res) =>
  res.json({ success: true, extractedText: 'Hello' })
);
const mockExtractAndTranslate = jest.fn((req, res) =>
  res.json({ success: true, translation: 'Hola' })
);
const mockGetQueueStatistics = jest.fn((req, res) =>
  res.json({ success: true, stats: {} })
);
const mockCheckTranslationCache = jest.fn((req, res) =>
  res.json({ success: true, cached: false })
);

jest.mock('../../controller/translationController', () => ({
  handleTranslate: mockHandleTranslate,
  extractTextFromImage: mockExtractTextFromImage,
  extractAndTranslate: mockExtractAndTranslate,
  getQueueStatistics: mockGetQueueStatistics,
  checkTranslationCache: mockCheckTranslationCache,
}));

const mockSignUp = jest.fn((req, res) =>
  res.status(201).json({ success: true, user: {}, token: 'test-token' })
);
const mockSignIn = jest.fn((req, res) =>
  res.json({ success: true, user: {}, token: 'test-token' })
);

jest.mock('../../controller/controller', () => ({
  signUp: mockSignUp,
  signIn: mockSignIn,
}));

const mockGetFailedJobs = jest.fn().mockResolvedValue([]);
const mockRetryFailedJob = jest.fn().mockResolvedValue({ id: 'new-job-id' });
const mockGetQueueStats = jest.fn().mockResolvedValue({
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
});

jest.mock('../../queue/translationQueue', () => ({
  getFailedJobs: mockGetFailedJobs,
  retryFailedJob: mockRetryFailedJob,
  getQueueStats: mockGetQueueStats,
}));

const mockRedisClient = {
  ping: jest.fn().mockResolvedValue('PONG'),
};

jest.mock('../../config/redis', () => ({
  redisClient: mockRedisClient,
}));

// Import routes after all mocks
const routes = require('../../routes/routes');

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/', routes);
    jest.clearAllMocks();
  });

  describe('Auth Routes', () => {
    describe('POST /signup', () => {
      it('should call signup controller', async () => {
        const response = await request(app)
          .post('/signup')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
          });

        expect(response.status).toBe(201);
        expect(mockSignUp).toHaveBeenCalled();
      });
    });

    describe('POST /sign-in', () => {
      it('should call signin controller', async () => {
        const response = await request(app)
          .post('/sign-in')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        expect(response.status).toBe(200);
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });

  describe('Translation Routes', () => {
    describe('POST /translate', () => {
      it('should call handleTranslate controller', async () => {
        const response = await request(app)
          .post('/translate')
          .send({
            text: 'Hello',
            targetLang: 'es',
          });

        expect(response.status).toBe(200);
        expect(mockHandleTranslate).toHaveBeenCalled();
        expect(response.body).toEqual({
          success: true,
          translation: 'Hola',
        });
      });
    });

    describe('POST /ocr/extract', () => {
      it('should call extractTextFromImage controller', async () => {
        const response = await request(app)
          .post('/ocr/extract')
          .send({
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
          });

        expect(response.status).toBe(200);
        expect(mockExtractTextFromImage).toHaveBeenCalled();
      });

      it('should handle large payloads', async () => {
        const largeImage = 'data:image/png;base64,' + 'A'.repeat(1024 * 1024);

        const response = await request(app)
          .post('/ocr/extract')
          .send({
            imageData: largeImage,
          });

        expect(response.status).toBe(200);
      });
    });

    describe('POST /ocr/translate', () => {
      it('should call extractAndTranslate controller', async () => {
        const response = await request(app)
          .post('/ocr/translate')
          .send({
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
            targetLang: 'es',
          });

        expect(response.status).toBe(200);
        expect(mockExtractAndTranslate).toHaveBeenCalled();
      });
    });

    describe('GET /queue/stats', () => {
      it('should call getQueueStatistics controller', async () => {
        const response = await request(app).get('/queue/stats');

        expect(response.status).toBe(200);
        expect(mockGetQueueStatistics).toHaveBeenCalled();
      });
    });

    describe('GET /translation/cache', () => {
      it('should call checkTranslationCache controller', async () => {
        const response = await request(app)
          .get('/translation/cache')
          .query({
            text: 'Hello',
            targetLang: 'es',
          });

        expect(response.status).toBe(200);
        expect(mockCheckTranslationCache).toHaveBeenCalled();
      });
    });
  });

  describe('Health Check', () => {
    describe('GET /health', () => {
      it('should return ok when Redis is connected', async () => {
        mockRedisClient.ping.mockResolvedValue('PONG');

        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'ok',
          websocket: 'active',
          redis: 'connected',
        });
        expect(response.body.timestamp).toBeDefined();
      });

      it('should return degraded when Redis is disconnected', async () => {
        mockRedisClient.ping.mockRejectedValue(new Error('Redis down'));

        const response = await request(app).get('/health');

        expect(response.status).toBe(503);
        expect(response.body).toMatchObject({
          status: 'degraded',
          websocket: 'active',
          redis: 'disconnected',
        });
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Admin Queue Routes', () => {
    describe('GET /api/admin/queue/stats', () => {
      it('should return queue stats', async () => {
        const mockStats = {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          deadLetterQueue: 1,
        };

        mockGetQueueStats.mockResolvedValue(mockStats);

        const response = await request(app).get('/api/admin/queue/stats');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          stats: mockStats,
        });
      });

      it('should handle errors', async () => {
        mockGetQueueStats.mockRejectedValue(new Error('Queue error'));

        const response = await request(app).get('/api/admin/queue/stats');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/queue/failed', () => {
      it('should return failed jobs', async () => {
        const mockJobs = [
          {
            id: 'dlq-1',
            originalJobId: 'job-1',
            error: 'Translation failed',
          },
        ];

        mockGetFailedJobs.mockResolvedValue(mockJobs);

        const response = await request(app).get('/api/admin/queue/failed');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          jobs: mockJobs,
        });
      });

      it('should accept limit parameter', async () => {
        await request(app).get('/api/admin/queue/failed?limit=10');

        expect(mockGetFailedJobs).toHaveBeenCalledWith(10);
      });

      it('should use default limit of 50', async () => {
        await request(app).get('/api/admin/queue/failed');

        expect(mockGetFailedJobs).toHaveBeenCalledWith(50);
      });

      it('should handle errors', async () => {
        mockGetFailedJobs.mockRejectedValue(new Error('DLQ error'));

        const response = await request(app).get('/api/admin/queue/failed');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/admin/queue/retry/:jobId', () => {
      it('should retry failed job', async () => {
        mockRetryFailedJob.mockResolvedValue({ id: 'new-job-123' });

        const response = await request(app)
          .post('/api/admin/queue/retry/dlq-job-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          newJobId: 'new-job-123',
        });
        expect(mockRetryFailedJob).toHaveBeenCalledWith('dlq-job-1');
      });

      it('should handle job not found', async () => {
        mockRetryFailedJob.mockRejectedValue(new Error('Job not found in DLQ'));

        const response = await request(app)
          .post('/api/admin/queue/retry/nonexistent');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Job not found in DLQ');
      });

      it('should handle errors', async () => {
        mockRetryFailedJob.mockRejectedValue(new Error('Retry failed'));

        const response = await request(app)
          .post('/api/admin/queue/retry/dlq-job-1');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/translate')
        .set('Content-Type', 'application/json')
        .send('{"invalid json"');

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/translate')
        .send('text=Hello&targetLang=es');

      // Should still work with urlencoded
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Route Parameters', () => {
    it('should pass query parameters correctly', async () => {
      await request(app)
        .get('/translation/cache')
        .query({
          text: 'Hello World',
          targetLang: 'es',
          sourceLang: 'en',
        });

      const req = mockCheckTranslationCache.mock.calls[0][0];
      expect(req.query).toMatchObject({
        text: 'Hello World',
        targetLang: 'es',
        sourceLang: 'en',
      });
    });

    it('should pass body parameters correctly', async () => {
      await request(app)
        .post('/translate')
        .send({
          text: 'Hello World',
          targetLang: 'es',
          sourceLang: 'en',
        });

      const req = mockHandleTranslate.mock.calls[0][0];
      expect(req.body).toMatchObject({
        text: 'Hello World',
        targetLang: 'es',
        sourceLang: 'en',
      });
    });
  });
});