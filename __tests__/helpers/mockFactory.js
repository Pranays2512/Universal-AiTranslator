/**
 * Mock Data Factory
 * Generate mock data for tests
 */

class MockDataFactory {
    /**
     * Generate a random string
     */
    static randomString(length = 10) {
        return Math.random().toString(36).substring(2, 2 + length);
    }

    /**
     * Generate a random email
     */
    static randomEmail() {
        return `${this.randomString(8)}@example.com`;
    }

    /**
     * Generate multiple translations
     */
    static createTranslations(count = 5) {
        return Array.from({ length: count }, (_, i) => ({
            id: `trans-${i + 1}`,
            userId: 'test-user',
            originalText: `Test text ${i + 1}`,
            translatedText: `Texto de prueba ${i + 1}`,
            sourceLang: 'en',
            targetLang: 'es',
            created_at: new Date(Date.now() - i * 60000)
        }));
    }

    /**
     * Generate cache data
     */
    static createCacheData(text, sourceLang = 'en', targetLang = 'es') {
        return {
            original: text,
            translated: `Translated: ${text}`,
            sourceLang,
            targetLang,
            timestamp: new Date().toISOString(),
            provider: 'google'
        };
    }

    /**
     * Generate queue job data
     */
    static createQueueJob(overrides = {}) {
        return {
            id: this.randomString(16),
            data: {
                text: 'Hello world',
                sourceLang: 'en',
                targetLang: 'es',
                userId: 'test-user',
                ...overrides
            },
            opts: {
                attempts: 3,
                backoff: 2000
            }
        };
    }

    /**
     * Generate file upload data
     */
    static createMockFile(mimetype = 'image/png') {
        return {
            fieldname: 'file',
            originalname: 'test-image.png',
            encoding: '7bit',
            mimetype,
            destination: '/tmp',
            filename: `test-${Date.now()}.png`,
            path: `/tmp/test-${Date.now()}.png`,
            size: 1024 * 100 // 100KB
        };
    }
}

module.exports = MockDataFactory;
