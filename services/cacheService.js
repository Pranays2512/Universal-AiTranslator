//caching usimg redis for better use case
const { redisClient } = require('../config/redis');
const crypto = require('crypto');

class CacheService {
    constructor() {
        this.DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 days
        this.POPULAR_TTL = 60 * 60 * 24 * 30; // 30 days
        this.enabled = true;
    }

    /**
     * Generate cache key from translation params
     */
    generateKey(text, sourceLang, targetLang) {
        const normalized = text.trim().toLowerCase();
        const hash = crypto
            .createHash('md5')
            .update(`${normalized}:${sourceLang}:${targetLang}`)
            .digest('hex');
        return `translation:${sourceLang}:${targetLang}:${hash}`;
    }

    /**
     * Get translation from cache
     */
    async get(text, sourceLang, targetLang) {
        if (!this.enabled) return null;

        try {
            const key = this.generateKey(text, sourceLang, targetLang);
            const cached = await redisClient.get(key);

            if (cached) {
                const data = JSON.parse(cached);
                
                // Track cache hit
                await this.incrementHitCount(key);

                console.log(`✓ Cache HIT: ${key.substring(0, 50)}...`);
                return {
                    ...data,
                    cached: true,
                    cachedAt: data.timestamp
                };
            }

            console.log(`✗ Cache MISS: ${key.substring(0, 50)}...`);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set translation in cache
     */
    async set(text, sourceLang, targetLang, translatedText, metadata = {}) {
        if (!this.enabled) return false;

        try {
            const key = this.generateKey(text, sourceLang, targetLang);
            const value = {
                original: text,
                translated: translatedText,
                sourceLang,
                targetLang,
                timestamp: new Date().toISOString(),
                ...metadata
            };

            // Set with TTL
            await redisClient.setex(
                key,
                this.DEFAULT_TTL,
                JSON.stringify(value)
            );

            // Initialize hit counter
            await redisClient.set(`${key}:hits`, 0, 'EX', this.DEFAULT_TTL);

            console.log(`✓ Cache SET: ${key.substring(0, 50)}...`);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Increment cache hit counter
     */
    async incrementHitCount(key) {
        try {
            const hits = await redisClient.incr(`${key}:hits`);

            // If translation is popular (>10 hits), extend TTL
            if (hits > 10) {
                await redisClient.expire(key, this.POPULAR_TTL);
                console.log(`♨  Popular translation, extended TTL: ${hits} hits`);
            }

            return hits;
        } catch (error) {
            console.error('Hit count error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const keys = await redisClient.keys('translation:*');
            const hitKeys = keys.filter(k => !k.endsWith(':hits'));

            let totalHits = 0;
            let popularCount = 0;

            for (const key of hitKeys) {
                const hits = await redisClient.get(`${key}:hits`);
                if (hits) {
                    const hitCount = parseInt(hits);
                    totalHits += hitCount;
                    if (hitCount > 10) popularCount++;
                }
            }

            return {
                totalCached: hitKeys.length,
                totalHits,
                popularTranslations: popularCount,
                averageHits: hitKeys.length > 0 ? (totalHits / hitKeys.length).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Cache stats error:', error);
            return {
                totalCached: 0,
                totalHits: 0,
                popularTranslations: 0,
                averageHits: 0
            };
        }
    }

    /**
     * Get most popular translations
     */
    async getPopular(limit = 10) {
        try {
            const keys = await redisClient.keys('translation:*');
            const translations = [];

            for (const key of keys) {
                if (key.endsWith(':hits')) continue;

                const [data, hits] = await Promise.all([
                    redisClient.get(key),
                    redisClient.get(`${key}:hits`)
                ]);

                if (data && hits) {
                    translations.push({
                        ...JSON.parse(data),
                        hits: parseInt(hits),
                        key
                    });
                }
            }

            return translations
                .sort((a, b) => b.hits - a.hits)
                .slice(0, limit);
        } catch (error) {
            console.error('Get popular error:', error);
            return [];
        }
    }

    /**
     * Preload common translations
     */
    async preloadCommon(commonPhrases) {
        console.log('🔄 Preloading common translations...');

        let loaded = 0;
        for (const phrase of commonPhrases) {
            const success = await this.set(
                phrase.text,
                phrase.from,
                phrase.to,
                phrase.translation,
                { preloaded: true }
            );
            if (success) loaded++;
        }

        console.log(`✓ Preloaded ${loaded}/${commonPhrases.length} common phrases`);
        return loaded;
    }

    /**
     * Clear cache by pattern
     */
    async clear(pattern = 'translation:*') {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(...keys);
                console.log(`🗑  Cleared ${keys.length} cache entries`);
            }
            return keys.length;
        } catch (error) {
            console.error('Cache clear error:', error);
            return 0;
        }
    }

    /**
     * Warm cache with user's history
     */
    async warmUserCache(userId, recentTranslations) {
        console.log(`🔥 Warming cache for user ${userId}...`);

        let warmed = 0;
        for (const trans of recentTranslations) {
            const success = await this.set(
                trans.original,
                trans.sourceLang,
                trans.targetLang,
                trans.translated,
                { userWarmed: true, userId }
            );
            if (success) warmed++;
        }

        console.log(`✓ Warmed ${warmed} translations for user ${userId}`);
        return warmed;
    }
}

module.exports = new CacheService();
