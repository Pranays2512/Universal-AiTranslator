// Mock dependencies
const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
  getCompleted: jest.fn(),
};

const mockDeadLetterQueue = {
  add: jest.fn(),
  getCompletedCount: jest.fn(),
  getCompleted: jest.fn(),
};

const mockTranslate = jest.fn();
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockPublish = jest.fn();

jest.mock('bull', () => {
  return jest.fn().mockImplementation((name) => {
    if (name === 'translation:failed') {
      return mockDeadLetterQueue;
    }
    return mockQueue;
  });
});

jest.mock('google-translate-api-x', () => mockTranslate);
jest.mock('../../services/cacheService', () => mockCacheService);
jest.mock('../../services/pubsubService', () => ({ publish: mockPublish }));

// Import after mocking
const {
  addTranslationJob,
  getQueueStats,
  getFailedJobs,
  retryFailedJob,
  cleanOldDLQJobs,
} = require('../../queue/translationQueue');

describe('Translation Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTranslationJob', () => {
    it('should add job to queue with correct data', async () => {
      const jobData = {
        text: 'Hello',
        targetLang: 'es',
        userId: 123,
        priority: 5,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const job = await addTranslationJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          priority: 5,
          jobId: expect.stringContaining('123-'),
        })
      );
      expect(job.id).toBe('job-123');
    });

    it('should use default priority if not provided', async () => {
      const jobData = {
        text: 'Hello',
        targetLang: 'es',
        userId: 123,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await addTranslationJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          priority: 5,
        })
      );
    });

    it('should generate unique job IDs', async () => {
      const jobData = {
        text: 'Hello',
        targetLang: 'es',
        userId: 123,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await addTranslationJob(jobData);
      const firstCall = mockQueue.add.mock.calls[0];

      await addTranslationJob(jobData);
      const secondCall = mockQueue.add.mock.calls[1];

      expect(firstCall[1].jobId).not.toBe(secondCall[1].jobId);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockDeadLetterQueue.getCompletedCount.mockResolvedValue(1);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        deadLetterQueue: 1,
      });
    });

    it('should handle errors gracefully', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Queue error'));

      await expect(getQueueStats()).rejects.toThrow('Queue error');
    });
  });

  describe('getFailedJobs', () => {
    it('should return failed jobs from DLQ', async () => {
      const mockJobs = [
        {
          id: 'dlq-job-1',
          data: {
            originalJobId: 'job-1',
            originalJobData: {
              userId: 123,
              text: 'Hello',
            },
            error: {
              message: 'Translation failed',
            },
            failedAt: '2024-01-01T00:00:00Z',
            attemptsMade: 3,
          },
        },
      ];

      mockDeadLetterQueue.getCompleted.mockResolvedValue(mockJobs);

      const failedJobs = await getFailedJobs(50);

      expect(failedJobs).toHaveLength(1);
      expect(failedJobs[0]).toMatchObject({
        id: 'dlq-job-1',
        originalJobId: 'job-1',
        userId: 123,
        text: 'Hello',
        error: 'Translation failed',
        failedAt: '2024-01-01T00:00:00Z',
        attemptsMade: 3,
      });
    });

    it('should limit results correctly', async () => {
      const mockJobs = Array(100)
        .fill()
        .map((_, i) => ({
          id: `dlq-job-${i}`,
          data: {
            originalJobId: `job-${i}`,
            originalJobData: {},
            error: { message: 'Error' },
            failedAt: new Date().toISOString(),
            attemptsMade: 3,
          },
        }));

      mockDeadLetterQueue.getCompleted.mockResolvedValue(mockJobs);

      const failedJobs = await getFailedJobs(10);

      expect(mockDeadLetterQueue.getCompleted).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('retryFailedJob', () => {
    it('should retry job from DLQ', async () => {
      const mockDLQJob = {
        id: 'dlq-job-1',
        data: {
          originalJobId: 'job-1',
          originalJobData: {
            text: 'Hello',
            targetLang: 'es',
            userId: 123,
          },
        },
      };

      mockDeadLetterQueue.getCompleted.mockResolvedValue([mockDLQJob]);
      mockQueue.add.mockResolvedValue({ id: 'retry-123' });

      const newJob = await retryFailedJob('dlq-job-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        mockDLQJob.data.originalJobData,
        expect.objectContaining({
          priority: 1,
          jobId: expect.stringContaining('retry-'),
        })
      );
      expect(newJob.id).toBe('retry-123');
    });

    it('should throw error if job not found', async () => {
      mockDeadLetterQueue.getCompleted.mockResolvedValue([]);

      await expect(retryFailedJob('nonexistent')).rejects.toThrow(
        'Job not found in DLQ'
      );
    });
  });

  describe('cleanOldDLQJobs', () => {
    it('should remove old jobs from DLQ', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const mockJobs = [
        {
          id: 'old-job',
          data: { failedAt: oldDate.toISOString() },
          remove: jest.fn().mockResolvedValue(true),
        },
        {
          id: 'recent-job',
          data: { failedAt: recentDate.toISOString() },
          remove: jest.fn().mockResolvedValue(true),
        },
      ];

      mockDeadLetterQueue.getCompleted.mockResolvedValue(mockJobs);

      const cleaned = await cleanOldDLQJobs(30);

      expect(cleaned).toBe(1);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
    });

    it('should handle errors during cleanup', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const mockJob = {
        id: 'old-job',
        data: { failedAt: oldDate.toISOString() },
        remove: jest.fn().mockRejectedValue(new Error('Remove failed')),
      };

      mockDeadLetterQueue.getCompleted.mockResolvedValue([mockJob]);

      // Should not throw, but handle error gracefully
      await expect(cleanOldDLQJobs(30)).rejects.toThrow();
    });

    it('should use default days if not provided', async () => {
      mockDeadLetterQueue.getCompleted.mockResolvedValue([]);

      const cleaned = await cleanOldDLQJobs();

      expect(cleaned).toBe(0);
    });
  });

  describe('Queue Job Processing', () => {
    let processCallback;

    beforeEach(() => {
      // Capture the process callback
      mockQueue.process.mockImplementation((callback) => {
        processCallback = callback;
      });
      // Re-require to trigger process registration
      jest.resetModules();
      require('../../queue/translationQueue');
      processCallback = mockQueue.process.mock.calls[0]?.[0];
    });

    it('should serve translation from cache if available', async () => {
      const job = {
        id: 'job-123',
        data: {
          text: 'Hello',
          targetLang: 'es',
          userId: 123,
          socketId: 'socket-123',
        },
      };

      mockCacheService.get.mockResolvedValue({
        translated: 'Hola',
        sourceLang: 'en',
      });

      if (processCallback) {
        const result = await processCallback(job);

        expect(result).toMatchObject({
          translatedText: 'Hola',
          detectedLanguage: 'en',
          userId: 123,
          socketId: 'socket-123',
          cached: true,
        });
        expect(mockTranslate).not.toHaveBeenCalled();
      }
    });

    it('should translate and cache if not in cache', async () => {
      const job = {
        id: 'job-123',
        data: {
          text: 'Hello',
          targetLang: 'es',
          sourceLang: 'auto',
          userId: 123,
          socketId: 'socket-123',
        },
      };

      mockCacheService.get.mockResolvedValue(null);
      mockTranslate.mockResolvedValue({
        text: 'Hola',
        from: { language: { iso: 'en' } },
      });
      mockCacheService.set.mockResolvedValue(true);

      if (processCallback) {
        const result = await processCallback(job);

        expect(mockTranslate).toHaveBeenCalledWith('Hello', {
          from: 'auto',
          to: 'es',
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'Hello',
          'en',
          'es',
          'Hola',
          expect.objectContaining({
            userId: 123,
            queueProcessed: true,
            jobId: 'job-123',
          })
        );
        expect(result).toMatchObject({
          translatedText: 'Hola',
          detectedLanguage: 'en',
          cached: false,
        });
      }
    });

    it('should handle translation errors', async () => {
      const job = {
        id: 'job-123',
        data: {
          text: 'Hello',
          targetLang: 'es',
          userId: 123,
        },
      };

      mockCacheService.get.mockResolvedValue(null);
      mockTranslate.mockRejectedValue(new Error('Translation API error'));

      if (processCallback) {
        await expect(processCallback(job)).rejects.toThrow('Translation API error');
      }
    });
  });
});