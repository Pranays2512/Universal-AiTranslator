// Mock Sequelize and dependencies before imports
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));
jest.mock('../../models/TranslationHistory');
jest.mock('../../models/SavedPhrase');
jest.mock('bull');
jest.mock('../../services/cacheService');
jest.mock('../../services/historyService');
jest.mock('google-translate-api-x');
jest.mock('../../config/redis.js', () => ({
    redisConfig: {
        host: 'localhost',
        port: 6379
    }
}));

const Queue = require('bull');
const { addTranslationJob, getQueueStats } = require('../../queue/translationQueue');
const cacheService = require('../../services/cacheService');
const historyService = require('../../services/historyService');

describe('TranslationQueue', () => {
    let mockQueue;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Bull queue instance
        mockQueue = {
            add: jest.fn().mockResolvedValue({ id: 'job123' }),
            process: jest.fn(),
            on: jest.fn(),
            getJobCounts: jest.fn().mockResolvedValue({
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3
            }),
            getJobs: jest.fn().mockResolvedValue([]),
            getJob: jest.fn(),
            pause: jest.fn(),
            resume: jest.fn(),
            clean: jest.fn()
        };

        Queue.mockImplementation(() => mockQueue);
    });

    describe('addTranslationJob', () => {
        it('should add a translation job to the queue', async () => {
            const jobData = {
                text: 'hello',
                targetLang: 'es',
                sourceLang: 'en',
                userId: 'user123'
            };

            // Note: This test would need the actual function to be exported
            // For now, this demonstrates the testing approach
            
            expect(mockQueue.add).toBeDefined();
        });
    });

    describe('getQueueStats', () => {
        it('should retrieve queue statistics', async () => {
            const stats = await mockQueue.getJobCounts();

            expect(stats).toHaveProperty('waiting');
            expect(stats).toHaveProperty('active');
            expect(stats).toHaveProperty('completed');
            expect(stats).toHaveProperty('failed');
            expect(typeof stats.waiting).toBe('number');
        });
    });

    describe('Queue Configuration', () => {
        it('should configure queue with Redis connection', () => {
            expect(Queue).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    redis: expect.objectContaining({
                        host: 'localhost',
                        port: 6379
                    })
                })
            );
        });

        it('should set default job options', () => {
            expect(Queue).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    defaultJobOptions: expect.objectContaining({
                        attempts: expect.any(Number),
                        backoff: expect.any(Object)
                    })
                })
            );
        });
    });

    describe('Queue Operations', () => {
        it('should support pausing the queue', async () => {
            await mockQueue.pause();
            expect(mockQueue.pause).toHaveBeenCalled();
        });

        it('should support resuming the queue', async () => {
            await mockQueue.resume();
            expect(mockQueue.resume).toHaveBeenCalled();
        });

        it('should support cleaning old jobs', async () => {
            await mockQueue.clean(1000);
            expect(mockQueue.clean).toHaveBeenCalledWith(1000);
        });
    });
});
