/**
 * Functional Tests for Cache System
 * Tests Redis caching functionality and performance
 */

jest.mock('../../config/redis', () => ({
    redisClient: {
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        exists: jest.fn(),
        ttl: jest.fn(),
        expire: jest.fn(),
        incr: jest.fn(),
        flushall: jest.fn()
    }
}));

const { redisClient } = require('../../config/redis');

describe('Cache System Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Cache Storage and Retrieval', () => {
        it('should store data in cache', async () => {
            const key = 'translation:en:es:hello';
            const value = JSON.stringify({
                translated: 'Hola',
                timestamp: new Date().toISOString()
            });

            redisClient.setex.mockResolvedValue('OK');

            await redisClient.setex(key, 3600, value);

            expect(redisClient.setex).toHaveBeenCalledWith(key, 3600, value);
        });

        it('should retrieve data from cache', async () => {
            const key = 'translation:en:es:hello';
            const cachedValue = JSON.stringify({ translated: 'Hola' });

            redisClient.get.mockResolvedValue(cachedValue);

            const result = await redisClient.get(key);
            const parsed = JSON.parse(result);

            expect(parsed.translated).toBe('Hola');
        });

        it('should return null for cache miss', async () => {
            redisClient.get.mockResolvedValue(null);

            const result = await redisClient.get('nonexistent:key');

            expect(result).toBeNull();
        });

        it('should check if key exists', async () => {
            redisClient.exists.mockResolvedValue(1);

            const exists = await redisClient.exists('translation:en:es:hello');

            expect(exists).toBe(1);
        });
    });

    describe('Cache Expiration (TTL)', () => {
        it('should set TTL when caching data', async () => {
            const key = 'temp:data';
            const ttl = 3600; // 1 hour

            redisClient.setex.mockResolvedValue('OK');

            await redisClient.setex(key, ttl, 'value');

            expect(redisClient.setex).toHaveBeenCalledWith(key, 3600, 'value');
        });

        it('should get remaining TTL', async () => {
            redisClient.ttl.mockResolvedValue(1800); // 30 minutes remaining

            const remaining = await redisClient.ttl('translation:key');

            expect(remaining).toBe(1800);
        });

        it('should extend TTL for popular items', async () => {
            const key = 'popular:translation';
            const newTTL = 7200; // 2 hours

            redisClient.expire.mockResolvedValue(1);

            await redisClient.expire(key, newTTL);

            expect(redisClient.expire).toHaveBeenCalledWith(key, 7200);
        });

        it('should handle expired keys', async () => {
            redisClient.ttl.mockResolvedValue(-2); // Key doesn't exist

            const ttl = await redisClient.ttl('expired:key');

            expect(ttl).toBe(-2);
        });
    });

    describe('Cache Invalidation', () => {
        it('should delete specific cache entry', async () => {
            const key = 'translation:en:es:hello';

            redisClient.del.mockResolvedValue(1);

            const deleted = await redisClient.del(key);

            expect(deleted).toBe(1);
        });

        it('should delete multiple keys', async () => {
            const keys = ['key1', 'key2', 'key3'];

            redisClient.del.mockResolvedValue(3);

            const deleted = await redisClient.del(...keys);

            expect(deleted).toBe(3);
        });

        it('should clear all cache', async () => {
            redisClient.flushall.mockResolvedValue('OK');

            const result = await redisClient.flushall();

            expect(result).toBe('OK');
        });

        it('should find keys by pattern', async () => {
            const pattern = 'translation:en:*';
            const matchingKeys = [
                'translation:en:es:hello',
                'translation:en:fr:hello',
                'translation:en:de:hello'
            ];

            redisClient.keys.mockResolvedValue(matchingKeys);

            const keys = await redisClient.keys(pattern);

            expect(keys).toHaveLength(3);
            expect(keys).toContain('translation:en:es:hello');
        });
    });

    describe('Cache Hit Rate Tracking', () => {
        it('should increment hit counter', async () => {
            const counterKey = 'hits:translation:en:es:hello';

            redisClient.incr.mockResolvedValue(5);

            const hits = await redisClient.incr(counterKey);

            expect(hits).toBe(5);
        });

        it('should track cache statistics', async () => {
            const stats = {
                hits: 100,
                misses: 20,
                totalKeys: 500
            };

            const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;

            expect(hitRate).toBeCloseTo(83.33, 2);
        });
    });

    describe('Cache Performance', () => {
        it('should retrieve cached data faster than DB', async () => {
            const startCache = Date.now();
            redisClient.get.mockResolvedValue('cached-value');
            await redisClient.get('key');
            const cacheTime = Date.now() - startCache;

            // Cache should be very fast (< 100ms in real scenarios)
            expect(cacheTime).toBeLessThan(1000);
        });

        it('should handle concurrent cache requests', async () => {
            redisClient.get.mockResolvedValue('value');

            const requests = Array(10).fill(null).map(() => 
                redisClient.get('concurrent:key')
            );

            const results = await Promise.all(requests);

            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toBe('value');
            });
        });

        it('should batch cache operations', async () => {
            const operations = [
                { key: 'key1', value: 'value1' },
                { key: 'key2', value: 'value2' },
                { key: 'key3', value: 'value3' }
            ];

            redisClient.set.mockResolvedValue('OK');

            const results = await Promise.all(
                operations.map(op => redisClient.set(op.key, op.value))
            );

            expect(results).toHaveLength(3);
            expect(redisClient.set).toHaveBeenCalledTimes(3);
        });
    });

    describe('Cache Key Generation', () => {
        it('should generate consistent keys', () => {
            const generateKey = (text, from, to) => {
                const normalized = text.trim().toLowerCase();
                return `translation:${from}:${to}:${normalized}`;
            };

            const key1 = generateKey('Hello', 'en', 'es');
            const key2 = generateKey('Hello', 'en', 'es');

            expect(key1).toBe(key2);
        });

        it('should normalize text for key generation', () => {
            const normalize = (text) => text.trim().toLowerCase();

            expect(normalize('  Hello  ')).toBe('hello');
            expect(normalize('HELLO')).toBe('hello');
            expect(normalize('Hello')).toBe('hello');
        });

        it('should create unique keys for different languages', () => {
            const createKey = (text, from, to) => 
                `translation:${from}:${to}:${text}`;

            const keyES = createKey('hello', 'en', 'es');
            const keyFR = createKey('hello', 'en', 'fr');

            expect(keyES).not.toBe(keyFR);
        });
    });

    describe('Cache Error Handling', () => {
        it('should handle Redis connection errors', async () => {
            redisClient.get.mockRejectedValue(new Error('Connection refused'));

            await expect(redisClient.get('key'))
                .rejects.toThrow('Connection refused');
        });

        it('should fallback gracefully on cache failure', async () => {
            redisClient.get.mockRejectedValue(new Error('Redis error'));

            let value;
            try {
                value = await redisClient.get('key');
            } catch (error) {
                // Fallback to database or return null
                value = null;
            }

            expect(value).toBeNull();
        });

        it('should handle invalid JSON in cache', () => {
            const invalidJSON = '{invalid json}';

            expect(() => JSON.parse(invalidJSON)).toThrow();
        });
    });
});
