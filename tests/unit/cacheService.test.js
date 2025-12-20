const crypto = require('crypto');

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
};

// Mock the redis module
jest.mock('../../config/redis', () => ({
  redisClient: mockRedisClient,
}));

// Import after mocking
const CacheService = require('../../services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = CacheService.generateKey('Hello', 'en', 'es');
      const key2 = CacheService.generateKey('Hello', 'en', 'es');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = CacheService.generateKey('Hello', 'en', 'es');
      const key2 = CacheService.generateKey('Goodbye', 'en', 'es');
      expect(key1).not.toBe(key2);
    });

    it('should be case-insensitive', () => {
      const key1 = CacheService.generateKey('Hello', 'en', 'es');
      const key2 = CacheService.generateKey('HELLO', 'en', 'es');
      expect(key1).toBe(key2);
    });

    it('should trim whitespace', () => {
      const key1 = CacheService.generateKey('  Hello  ', 'en', 'es');
      const key2 = CacheService.generateKey('Hello', 'en', 'es');
      expect(key1).toBe(key2);
    });
  });

  describe('get', () => {
    it('should return cached translation if exists', async () => {
      const cachedData = {
        original: 'Hello',
        translated: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
        timestamp: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await CacheService.get('Hello', 'en', 'es');

      expect(result).toEqual({
        ...cachedData,
        cached: true,
        cachedAt: cachedData.timestamp,
      });
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should return null if cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await CacheService.get('Hello', 'en', 'es');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.get('Hello', 'en', 'es');

      expect(result).toBeNull();
    });

    it('should increment hit count on cache hit', async () => {
      const cachedData = {
        original: 'Hello',
        translated: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
        timestamp: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      mockRedisClient.incr.mockResolvedValue(5);

      await CacheService.get('Hello', 'en', 'es');

      expect(mockRedisClient.incr).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should store translation in cache', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await CacheService.set('Hello', 'en', 'es', 'Hola');

      expect(result).toBe(true);
      expect(mockRedisClient.setex).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should include metadata in cached value', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      await CacheService.set('Hello', 'en', 'es', 'Hola', { userId: 123 });

      const setexCall = mockRedisClient.setex.mock.calls[0];
      const cachedValue = JSON.parse(setexCall[2]);

      expect(cachedValue).toMatchObject({
        original: 'Hello',
        translated: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
        userId: 123,
      });
      expect(cachedValue.timestamp).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.set('Hello', 'en', 'es', 'Hola');

      expect(result).toBe(false);
    });

    it('should set TTL correctly', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      await CacheService.set('Hello', 'en', 'es', 'Hola');

      const setexCall = mockRedisClient.setex.mock.calls[0];
      expect(setexCall[1]).toBe(CacheService.DEFAULT_TTL);
    });
  });

  describe('incrementHitCount', () => {
    it('should increment hit counter', async () => {
      mockRedisClient.incr.mockResolvedValue(5);

      const hits = await CacheService.incrementHitCount('test-key');

      expect(hits).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('test-key:hits');
    });

    it('should extend TTL for popular translations', async () => {
      mockRedisClient.incr.mockResolvedValue(15);
      mockRedisClient.expire.mockResolvedValue(1);

      await CacheService.incrementHitCount('test-key');

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'test-key',
        CacheService.POPULAR_TTL
      );
    });

    it('should not extend TTL for unpopular translations', async () => {
      mockRedisClient.incr.mockResolvedValue(5);

      await CacheService.incrementHitCount('test-key');

      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));

      const hits = await CacheService.incrementHitCount('test-key');

      expect(hits).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'translation:en:es:hash1',
        'translation:en:es:hash1:hits',
        'translation:en:fr:hash2',
        'translation:en:fr:hash2:hits',
      ]);
      mockRedisClient.get.mockResolvedValueOnce('12').mockResolvedValueOnce('5');

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalCached: 2,
        totalHits: 17,
        popularTranslations: 1,
        averageHits: '8.50',
      });
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalCached: 0,
        totalHits: 0,
        popularTranslations: 0,
        averageHits: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalCached: 0,
        totalHits: 0,
        popularTranslations: 0,
        averageHits: 0,
      });
    });
  });

  describe('getPopular', () => {
    it('should return popular translations sorted by hits', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'translation:en:es:hash1',
        'translation:en:es:hash1:hits',
        'translation:en:fr:hash2',
        'translation:en:fr:hash2:hits',
      ]);

      const translation1 = {
        original: 'Hello',
        translated: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
      };
      const translation2 = {
        original: 'Hello',
        translated: 'Bonjour',
        sourceLang: 'en',
        targetLang: 'fr',
      };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(translation1))
        .mockResolvedValueOnce('15')
        .mockResolvedValueOnce(JSON.stringify(translation2))
        .mockResolvedValueOnce('5');

      const popular = await CacheService.getPopular(2);

      expect(popular).toHaveLength(2);
      expect(popular[0].hits).toBe(15);
      expect(popular[1].hits).toBe(5);
    });

    it('should limit results correctly', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'translation:en:es:hash1',
        'translation:en:fr:hash2',
        'translation:en:de:hash3',
      ]);

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify({}))
        .mockResolvedValueOnce('10')
        .mockResolvedValueOnce(JSON.stringify({}))
        .mockResolvedValueOnce('20')
        .mockResolvedValueOnce(JSON.stringify({}))
        .mockResolvedValueOnce('15');

      const popular = await CacheService.getPopular(2);

      expect(popular).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear cache entries matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'translation:en:es:hash1',
        'translation:en:es:hash2',
      ]);
      mockRedisClient.del.mockResolvedValue(2);

      const cleared = await CacheService.clear('translation:*');

      expect(cleared).toBe(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'translation:en:es:hash1',
        'translation:en:es:hash2'
      );
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const cleared = await CacheService.clear();

      expect(cleared).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const cleared = await CacheService.clear();

      expect(cleared).toBe(0);
    });
  });

  describe('preloadCommon', () => {
    it('should preload common phrases', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      const commonPhrases = [
        { text: 'Hello', from: 'en', to: 'es', translation: 'Hola' },
        { text: 'Goodbye', from: 'en', to: 'es', translation: 'Adiós' },
      ];

      const loaded = await CacheService.preloadCommon(commonPhrases);

      expect(loaded).toBe(2);
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      mockRedisClient.setex
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis error'));
      mockRedisClient.set.mockResolvedValue('OK');

      const commonPhrases = [
        { text: 'Hello', from: 'en', to: 'es', translation: 'Hola' },
        { text: 'Goodbye', from: 'en', to: 'es', translation: 'Adiós' },
      ];

      const loaded = await CacheService.preloadCommon(commonPhrases);

      expect(loaded).toBe(1);
    });
  });

  describe('warmUserCache', () => {
    it('should warm cache with user translations', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      const recentTranslations = [
        {
          original: 'Hello',
          sourceLang: 'en',
          targetLang: 'es',
          translated: 'Hola',
        },
      ];

      const warmed = await CacheService.warmUserCache(123, recentTranslations);

      expect(warmed).toBe(1);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should include userId in metadata', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');

      const recentTranslations = [
        {
          original: 'Hello',
          sourceLang: 'en',
          targetLang: 'es',
          translated: 'Hola',
        },
      ];

      await CacheService.warmUserCache(123, recentTranslations);

      const setexCall = mockRedisClient.setex.mock.calls[0];
      const cachedValue = JSON.parse(setexCall[2]);

      expect(cachedValue.userId).toBe(123);
      expect(cachedValue.userWarmed).toBe(true);
    });
  });
});