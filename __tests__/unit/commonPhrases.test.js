const commonPhrases = require('../../config/commonPhrases');

describe('CommonPhrases Configuration', () => {
    it('should export an array of common phrases', () => {
        expect(Array.isArray(commonPhrases)).toBe(true);
    });

    it('should contain phrase objects with required properties', () => {
        if (commonPhrases.length > 0) {
            commonPhrases.forEach(phrase => {
                expect(phrase).toHaveProperty('text');
                expect(typeof phrase.text).toBe('string');
            });
        }
    });

    it('should not contain empty phrases', () => {
        commonPhrases.forEach(phrase => {
            expect(phrase.text.trim().length).toBeGreaterThan(0);
        });
    });
});
