const cacheService = require("../../services/cacheService");
const { redisClient } = require("../../config/redis");

/**
 * Cache Service Test Suite
 *
 * Comprehensive tests for caching layer functionality:
 * - Key generation and consistency
 * - Cache retrieval and storage
 * - Expiration handling
 * - Cache invalidation
 * - Multi-language translation caching
 */

// Mock Redis client
jest.mock("../../config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    setex: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
  },
}));

describe("CacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateKey", () => {
    it("should generate a consistent key for the same input", () => {
      const key1 = cacheService.generateKey("hello", "en", "es");
      const key2 = cacheService.generateKey("hello", "en", "es");
      expect(key1).toBe(key2);
    });

    it("should generate different keys for different inputs", () => {
      const key1 = cacheService.generateKey("hello", "en", "es");
      const key2 = cacheService.generateKey("goodbye", "en", "es");
      expect(key1).not.toBe(key2);
    });

    it("should normalize text (case-insensitive)", () => {
      const key1 = cacheService.generateKey("Hello", "en", "es");
      const key2 = cacheService.generateKey("hello", "en", "es");
      expect(key1).toBe(key2);
    });
  });

  describe("get", () => {
    it("should return cached translation when available", async () => {
      const mockCachedData = JSON.stringify({
        original: "hello",
        translated: "hola",
        sourceLang: "en",
        targetLang: "es",
        timestamp: new Date().toISOString(),
      });

      redisClient.get.mockResolvedValue(mockCachedData);
      redisClient.incr.mockResolvedValue(1);

      const result = await cacheService.get("hello", "en", "es");

      expect(result).toBeDefined();
      expect(result.translated).toBe("hola");
      expect(result.cached).toBe(true);
      expect(redisClient.get).toHaveBeenCalled();
      expect(redisClient.incr).toHaveBeenCalled();
    });

    it("should return null when cache miss occurs", async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await cacheService.get("hello", "en", "es");

      expect(result).toBeNull();
      expect(redisClient.get).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      redisClient.get.mockRejectedValue(new Error("Redis error"));

      const result = await cacheService.get("hello", "en", "es");

      expect(result).toBeNull();
    });

    it("should return null when cache is disabled", async () => {
      cacheService.enabled = false;
      const result = await cacheService.get("hello", "en", "es");
      expect(result).toBeNull();
      cacheService.enabled = true;
    });
  });

  describe("set", () => {
    it("should cache translation successfully", async () => {
      redisClient.setex.mockResolvedValue("OK");
      redisClient.set.mockResolvedValue("OK");

      const result = await cacheService.set("hello", "en", "es", "hola");

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalled();
    });

    it("should include metadata in cached value", async () => {
      redisClient.setex.mockResolvedValue("OK");
      redisClient.set.mockResolvedValue("OK");

      const metadata = { provider: "google" };
      await cacheService.set("hello", "en", "es", "hola", metadata);

      const cachedValue = JSON.parse(redisClient.setex.mock.calls[0][2]);
      expect(cachedValue.provider).toBe("google");
    });

    it("should handle errors gracefully", async () => {
      redisClient.setex.mockRejectedValue(new Error("Redis error"));

      const result = await cacheService.set("hello", "en", "es", "hola");

      expect(result).toBe(false);
    });

    it("should not cache when disabled", async () => {
      cacheService.enabled = false;
      const result = await cacheService.set("hello", "en", "es", "hola");
      expect(result).toBe(false);
      expect(redisClient.setex).not.toHaveBeenCalled();
      cacheService.enabled = true;
    });
  });

  describe("incrementHitCount", () => {
    it("should increment hit counter", async () => {
      redisClient.incr.mockResolvedValue(5);
      const key = "test:key";

      await cacheService.incrementHitCount(key);

      expect(redisClient.incr).toHaveBeenCalledWith(`${key}:hits`);
    });

    it("should extend TTL for popular translations", async () => {
      redisClient.incr.mockResolvedValue(15);
      redisClient.expire.mockResolvedValue(1);
      const key = "test:key";

      await cacheService.incrementHitCount(key);

      expect(redisClient.expire).toHaveBeenCalled();
    });
  });
});
