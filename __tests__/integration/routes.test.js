const request = require('supertest');
const express = require('express');
const routes = require('../../routes/routes');
const cacheService = require('../../services/cacheService');
const historyService = require('../../services/historyService');

// Mock dependencies
// Mock Sequelize and database dependencies BEFORE imports
jest.mock('sequelize', () => {
    const SequelizeMock = require('sequelize-mock');
    return SequelizeMock;
});

jest.mock('../../models/TranslationHistory', () => {
    return {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findOne: jest.fn()
    };
});

jest.mock('../../models/SavedPhrase', () => {
    return {
        create: jest.fn(),
        findAll: jest.fn()
    };
});

jest.mock('../../services/cacheService');
jest.mock('../../services/historyService');
jest.mock('../../config/redis', () => ({
    redisClient: {
        ping: jest.fn().mockResolvedValue('PONG')
    },
    redisSubscriber: {},
    redisConfig: {}
}));
jest.mock('../../config/database', () => ({
    testConnection: jest.fn().mockResolvedValue(true),
    syncDatabase: jest.fn().mockResolvedValue(true),
    sequelize: {
        define: jest.fn(() => ({}))
    }
}));
jest.mock('../../middleware/middleware.js', () => ({
    checkSignUp: jest.fn((req, res, next) => next()),
    checkSignIn: jest.fn((req, res, next) => next()),
    checkUser: jest.fn((req, res, next) => {
        req.user = { id: 'user123' };
        next();
    })
}));
jest.mock('../../controller/translationController.js', () => ({
    handleTranslate: jest.fn(async (req, res) => {
        res.json({ success: true, translated: 'hola' });
    }),
    extractTextFromImage: jest.fn(async (req, res) => {
        res.json({ success: true, text: 'extracted text' });
    }),
    extractAndTranslate: jest.fn(async (req, res) => {
        res.json({ success: true, translated: 'translated text' });
    }),
    getQueueStatistics: jest.fn(async (req, res) => {
        res.json({ waiting: 0, active: 0, completed: 10 });
    }),
    checkTranslationCache: jest.fn(async (req, res) => {
        res.json({ cached: true });
    })
}));
jest.mock('../../controller/fileUploadController.js', () => ({
    extractTextFromFile: jest.fn(async (req, res) => {
        res.json({ success: true, text: 'file text' });
    }),
    extractAndTranslateFile: jest.fn(async (req, res) => {
        res.json({ success: true, translated: 'file translated' });
    })
}));
jest.mock('../../controller/controller.js', () => ({
    signUp: jest.fn(async (req, res) => {
        res.json({ success: true, userId: 'user123' });
    }),
    signIn: jest.fn(async (req, res) => {
        res.json({ success: true, token: 'token123' });
    })
}));
jest.mock('../../queue/translationQueue', () => ({
    getFailedJobs: jest.fn(),
    retryFailedJob: jest.fn(),
    getQueueStats: jest.fn()
}));

describe('API Routes Integration Tests', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/', routes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Auth Routes', () => {
        describe('POST /signup', () => {
            it('should create a new user account', async () => {
                const response = await request(app)
                    .post('/signup')
                    .send({
                        username: 'testuser',
                        email: 'test@example.com',
                        password: 'password123'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('POST /sign-in', () => {
            it('should authenticate user and return token', async () => {
                const response = await request(app)
                    .post('/sign-in')
                    .send({
                        email: 'test@example.com',
                        password: 'password123'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.token).toBeDefined();
            });
        });
    });

    describe('Translation Routes', () => {
        describe('POST /translate', () => {
            it('should translate text successfully', async () => {
                const response = await request(app)
                    .post('/translate')
                    .send({
                        text: 'hello',
                        targetLang: 'es',
                        sourceLang: 'en'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.translated).toBe('hola');
            });
        });

        describe('POST /ocr/extract', () => {
            it('should extract text from image', async () => {
                const response = await request(app)
                    .post('/ocr/extract')
                    .send({
                        image: 'base64encodedimage'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.text).toBeDefined();
            });
        });

        describe('POST /ocr/translate', () => {
            it('should extract and translate text from image', async () => {
                const response = await request(app)
                    .post('/ocr/translate')
                    .send({
                        image: 'base64encodedimage',
                        targetLang: 'es'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.translated).toBeDefined();
            });
        });

        describe('GET /queue/stats', () => {
            it('should return queue statistics', async () => {
                const response = await request(app).get('/queue/stats');

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('waiting');
                expect(response.body).toHaveProperty('active');
                expect(response.body).toHaveProperty('completed');
            });
        });

        describe('GET /translation/cache', () => {
            it('should check translation cache', async () => {
                const response = await request(app)
                    .get('/translation/cache')
                    .query({
                        text: 'hello',
                        sourceLang: 'en',
                        targetLang: 'es'
                    });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('cached');
            });

            it('should handle missing required fields', async () => {
                const response = await request(app)
                    .post('/translate')
                    .send({
                        text: 'hello'
                    });

                expect(response.status).toBe(400);
            });

            it('should handle translation errors gracefully', async () => {
                cacheService.get.mockRejectedValue(new Error('Cache service error'));

                const response = await request(app)
                    .post('/translate')
                    .send({
                        text: 'hello',
                        targetLang: 'es'
                    });

                expect(response.status).toBe(500);
            });
        });
    });

    describe('History Routes', () => {
        describe('GET /history', () => {
            it('should retrieve user translation history', async () => {
                const mockHistory = {
                    rows: [
                        {
                            id: 1,
                            originalText: 'hello',
                            translatedText: 'hola',
                            createdAt: new Date()
                        }
                    ],
                    count: 1
                };

                historyService.getHistory.mockResolvedValue(mockHistory);

                const response = await request(app)
                    .get('/history')
                    .set('Authorization', 'Bearer token');

                expect(response.status).toBe(200);
            });

            it('should handle pagination', async () => {
                const mockHistory = { rows: [], count: 0 };
                historyService.getHistory.mockResolvedValue(mockHistory);

                const response = await request(app)
                    .get('/history?page=1&limit=10')
                    .set('Authorization', 'Bearer token');

                expect(response.status).toBe(200);
            });
        });

        describe('DELETE /history/:id', () => {
            it('should delete translation history entry', async () => {
                historyService.deleteTranslation.mockResolvedValue(1);

                const response = await request(app)
                    .delete('/history/1')
                    .set('Authorization', 'Bearer token');

                expect(response.status).toBe(200);
            });

            it('should return 404 if entry not found', async () => {
                historyService.deleteTranslation.mockResolvedValue(0);

                const response = await request(app)
                    .delete('/history/999')
                    .set('Authorization', 'Bearer token');

                expect(response.status).toMatch(/404|400/);
            });
        });
    });

    describe('Health Check', () => {
        describe('GET /health', () => {
            it('should return health status', async () => {
                const response = await request(app).get('/health');

                expect(response.status).toBe(200);
            });

            it('should verify database connection', async () => {
                const response = await request(app).get('/health');

                expect(response.body).toHaveProperty('database');
            });

            it('should verify redis connection', async () => {
                const response = await request(app).get('/health');

                expect(response.body).toHaveProperty('redis');
            });
        });
    });
});
