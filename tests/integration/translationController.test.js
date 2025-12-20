// Mock dependencies
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockAddTranslationJob = jest.fn();
const mockGetQueueStats = jest.fn();
const mockTranslate = jest.fn();
const mockTesseract = {
  recognize: jest.fn(),
};

jest.mock('../../services/cacheService', () => mockCacheService);
jest.mock('../../queue/translationQueue', () => ({
  addTranslationJob: mockAddTranslationJob,
  getQueueStats: mockGetQueueStats,
}));
jest.mock('google-translate-api-x', () => mockTranslate);
jest.mock('tesseract.js', () => mockTesseract);

const {
  handleTranslate,
  extractTextFromImage,
  extractAndTranslate,
  getQueueStatistics,
  checkTranslationCache,
} = require('../../controller/translationController');

describe('Translation Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      user: { id: 123, name: 'Test User', email: 'test@example.com' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('handleTranslate', () => {
    it('should return cached translation if available', async () => {
      mockReq.body = {
        text: 'Hello',
        targetLang: 'es',
      };

      mockCacheService.get.mockResolvedValue({
        translated: 'Hola',
        sourceLang: 'en',
        cachedAt: '2024-01-01T00:00:00Z',
      });

      await handleTranslate(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        translation: 'Hola',
        detectedLanguage: 'en',
        cached: true,
        cachedAt: '2024-01-01T00:00:00Z',
      });
      expect(mockAddTranslationJob).not.toHaveBeenCalled();
    });

    it('should queue translation if not cached', async () => {
      mockReq.body = {
        text: 'Hello',
        targetLang: 'es',
        socketId: 'socket-123',
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAddTranslationJob.mockResolvedValue({
        id: 'job-123',
      });

      await handleTranslate(mockReq, mockRes);

      expect(mockAddTranslationJob).toHaveBeenCalledWith({
        text: 'Hello',
        targetLang: 'es',
        sourceLang: 'auto',
        userId: 123,
        socketId: 'socket-123',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        jobId: 'job-123',
        message: 'Translation queued',
        cached: false,
      });
    });

    it('should return 400 if text is missing', async () => {
      mockReq.body = {
        targetLang: 'es',
      };

      await handleTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Text and target language are required',
      });
    });

    it('should return 400 if targetLang is missing', async () => {
      mockReq.body = {
        text: 'Hello',
      };

      await handleTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Text and target language are required',
      });
    });

    it('should handle errors gracefully', async () => {
      mockReq.body = {
        text: 'Hello',
        targetLang: 'es',
      };

      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      await handleTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cache error',
      });
    });

    it('should use provided sourceLang', async () => {
      mockReq.body = {
        text: 'Hello',
        targetLang: 'es',
        sourceLang: 'en',
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAddTranslationJob.mockResolvedValue({ id: 'job-123' });

      await handleTranslate(mockReq, mockRes);

      expect(mockAddTranslationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceLang: 'en',
        })
      );
    });
  });

  describe('extractTextFromImage', () => {
    it('should extract text from image', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: '  Hello World  ',
        },
      });

      await extractTextFromImage(mockReq, mockRes);

      expect(mockTesseract.recognize).toHaveBeenCalledWith(
        'data:image/png;base64,iVBORw0KGgoAAAANS...',
        'eng',
        expect.any(Object)
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        extractedText: 'Hello World',
      });
    });

    it('should return 400 if imageData is missing', async () => {
      mockReq.body = {};

      await extractTextFromImage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Image data is required',
      });
    });

    it('should handle OCR errors', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      mockTesseract.recognize.mockRejectedValue(new Error('OCR failed'));

      await extractTextFromImage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'OCR failed',
      });
    });

    it('should trim whitespace from extracted text', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: '\n\n  Hello World  \n\n',
        },
      });

      await extractTextFromImage(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        extractedText: 'Hello World',
      });
    });
  });

  describe('extractAndTranslate', () => {
    it('should extract and translate text from image', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: 'Hello',
        },
      });

      mockCacheService.get.mockResolvedValue(null);

      mockTranslate.mockResolvedValue({
        text: 'Hola',
        from: { language: { iso: 'en' } },
      });

      mockCacheService.set.mockResolvedValue(true);

      await extractAndTranslate(mockReq, mockRes);

      expect(mockTesseract.recognize).toHaveBeenCalled();
      expect(mockTranslate).toHaveBeenCalledWith('Hello', {
        from: 'auto',
        to: 'es',
      });
      expect(mockCacheService.set).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        extractedText: 'Hello',
        translation: 'Hola',
        detectedLanguage: 'en',
        cached: false,
      });
    });

    it('should return cached translation if available', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: 'Hello',
        },
      });

      mockCacheService.get.mockResolvedValue({
        translated: 'Hola',
        sourceLang: 'en',
      });

      await extractAndTranslate(mockReq, mockRes);

      expect(mockTranslate).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        extractedText: 'Hello',
        translation: 'Hola',
        detectedLanguage: 'en',
        cached: true,
      });
    });

    it('should return 400 if imageData is missing', async () => {
      mockReq.body = {
        targetLang: 'es',
      };

      await extractAndTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Image data and target language are required',
      });
    });

    it('should return 400 if targetLang is missing', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      await extractAndTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Image data and target language are required',
      });
    });

    it('should return 400 if no text found in image', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: '   ',
        },
      });

      await extractAndTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No text found in image',
      });
    });

    it('should handle OCR errors', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockRejectedValue(new Error('OCR failed'));

      await extractAndTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'OCR failed',
      });
    });

    it('should handle translation errors', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: 'Hello',
        },
      });

      mockCacheService.get.mockResolvedValue(null);
      mockTranslate.mockRejectedValue(new Error('Translation failed'));

      await extractAndTranslate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Translation failed',
      });
    });

    it('should store OCR metadata in cache', async () => {
      mockReq.body = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        targetLang: 'es',
      };

      mockTesseract.recognize.mockResolvedValue({
        data: {
          text: 'Hello',
        },
      });

      mockCacheService.get.mockResolvedValue(null);
      mockTranslate.mockResolvedValue({
        text: 'Hola',
        from: { language: { iso: 'en' } },
      });
      mockCacheService.set.mockResolvedValue(true);

      await extractAndTranslate(mockReq, mockRes);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'Hello',
        'en',
        'es',
        'Hola',
        expect.objectContaining({
          userId: 123,
          ocrExtracted: true,
        })
      );
    });
  });

  describe('getQueueStatistics', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        deadLetterQueue: 1,
      };

      mockGetQueueStats.mockResolvedValue(mockStats);

      await getQueueStatistics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        stats: mockStats,
      });
    });

    it('should handle errors', async () => {
      mockGetQueueStats.mockRejectedValue(new Error('Queue error'));

      await getQueueStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Queue error',
      });
    });
  });

  describe('checkTranslationCache', () => {
    it('should check if translation is cached', async () => {
      mockReq.query = {
        text: 'Hello',
        targetLang: 'es',
      };

      const cachedData = {
        translated: 'Hola',
        sourceLang: 'en',
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      await checkTranslationCache(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        cached: true,
        data: cachedData,
      });
    });

    it('should return cached: false if not in cache', async () => {
      mockReq.query = {
        text: 'Hello',
        targetLang: 'es',
      };

      mockCacheService.get.mockResolvedValue(null);

      await checkTranslationCache(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        cached: false,
        data: null,
      });
    });

    it('should return 400 if text is missing', async () => {
      mockReq.query = {
        targetLang: 'es',
      };

      await checkTranslationCache(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Text and target language are required',
      });
    });

    it('should return 400 if targetLang is missing', async () => {
      mockReq.query = {
        text: 'Hello',
      };

      await checkTranslationCache(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Text and target language are required',
      });
    });

    it('should use auto as default sourceLang', async () => {
      mockReq.query = {
        text: 'Hello',
        targetLang: 'es',
      };

      mockCacheService.get.mockResolvedValue(null);

      await checkTranslationCache(mockReq, mockRes);

      expect(mockCacheService.get).toHaveBeenCalledWith('Hello', 'auto', 'es');
    });

    it('should handle errors', async () => {
      mockReq.query = {
        text: 'Hello',
        targetLang: 'es',
      };

      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      await checkTranslationCache(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cache error',
      });
    });
  });
});