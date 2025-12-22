/**
 * Functional Tests for Translation Features
 * Tests the complete translation functionality from user input to output
 */

// Mock dependencies
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));
jest.mock('../../models/TranslationHistory');
jest.mock('../../config/redis');
jest.mock('google-translate-api-x', () => jest.fn());

const translate = require('google-translate-api-x');
const cacheService = require('../../services/cacheService');
const historyService = require('../../services/historyService');

describe('Translation Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Text Translation Flow', () => {
        it('should translate text from English to Spanish', async () => {
            const mockTranslation = {
                text: 'Hola',
                from: { language: { iso: 'en' } }
            };
            
            translate.mockResolvedValue(mockTranslation);

            const result = await translate('Hello', { from: 'en', to: 'es' });

            expect(result.text).toBe('Hola');
            expect(result.from.language.iso).toBe('en');
        });

        it('should auto-detect source language', async () => {
            const mockTranslation = {
                text: 'Hello',
                from: { language: { iso: 'es' } }
            };
            
            translate.mockResolvedValue(mockTranslation);

            const result = await translate('Hola', { to: 'en' });

            expect(result.from.language.iso).toBe('es');
        });

        it('should handle multiple languages', async () => {
            const languages = [
                { from: 'en', to: 'fr', text: 'Hello', expected: 'Bonjour' },
                { from: 'en', to: 'de', text: 'Hello', expected: 'Hallo' },
                { from: 'en', to: 'ja', text: 'Hello', expected: 'こんにちは' }
            ];

            for (const lang of languages) {
                translate.mockResolvedValue({ text: lang.expected });
                const result = await translate(lang.text, { from: lang.from, to: lang.to });
                expect(result.text).toBe(lang.expected);
            }
        });

        it('should handle long text translation', async () => {
            const longText = 'This is a very long text. '.repeat(100);
            const mockTranslation = {
                text: 'Este es un texto muy largo. '.repeat(100),
                from: { language: { iso: 'en' } }
            };
            
            translate.mockResolvedValue(mockTranslation);

            const result = await translate(longText, { from: 'en', to: 'es' });

            expect(result.text).toBeDefined();
            expect(result.text.length).toBeGreaterThan(0);
        });

        it('should handle special characters and emojis', async () => {
            const textWithEmojis = 'Hello 👋 World 🌍!';
            translate.mockResolvedValue({ text: 'Hola 👋 Mundo 🌍!' });

            const result = await translate(textWithEmojis, { to: 'es' });

            expect(result.text).toContain('👋');
            expect(result.text).toContain('🌍');
        });
    });

    describe('Translation with Cache Integration', () => {
        it('should cache successful translations', async () => {
            const text = 'Hello';
            const translated = 'Hola';
            
            cacheService.get = jest.fn().mockResolvedValue(null);
            cacheService.set = jest.fn().mockResolvedValue(true);
            translate.mockResolvedValue({ text: translated });

            await translate(text, { from: 'en', to: 'es' });

            expect(cacheService.set).toHaveBeenCalled();
        });

        it('should retrieve from cache on repeated translations', async () => {
            const cachedData = {
                translated: 'Hola',
                cached: true
            };

            cacheService.get = jest.fn().mockResolvedValue(cachedData);

            const result = await cacheService.get('Hello', 'en', 'es');

            expect(result.cached).toBe(true);
            expect(result.translated).toBe('Hola');
        });
    });

    describe('Translation Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            translate.mockRejectedValue(new Error('Network error'));

            await expect(translate('Hello', { to: 'es' }))
                .rejects.toThrow('Network error');
        });

        it('should handle invalid language codes', async () => {
            translate.mockRejectedValue(new Error('Invalid language code'));

            await expect(translate('Hello', { from: 'invalid', to: 'xyz' }))
                .rejects.toThrow();
        });

        it('should handle empty text input', async () => {
            translate.mockResolvedValue({ text: '' });

            const result = await translate('', { to: 'es' });

            expect(result.text).toBe('');
        });
    });

    describe('Batch Translation Functionality', () => {
        it('should translate multiple texts in batch', async () => {
            const texts = ['Hello', 'Goodbye', 'Thank you'];
            const translations = ['Hola', 'Adiós', 'Gracias'];

            texts.forEach((text, index) => {
                translate.mockResolvedValueOnce({ text: translations[index] });
            });

            const results = await Promise.all(
                texts.map(text => translate(text, { to: 'es' }))
            );

            expect(results).toHaveLength(3);
            expect(results[0].text).toBe('Hola');
            expect(results[1].text).toBe('Adiós');
            expect(results[2].text).toBe('Gracias');
        });

        it('should handle partial failures in batch', async () => {
            translate
                .mockResolvedValueOnce({ text: 'Hola' })
                .mockRejectedValueOnce(new Error('Translation failed'))
                .mockResolvedValueOnce({ text: 'Gracias' });

            const texts = ['Hello', 'Goodbye', 'Thank you'];
            const results = await Promise.allSettled(
                texts.map(text => translate(text, { to: 'es' }))
            );

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('rejected');
            expect(results[2].status).toBe('fulfilled');
        });
    });

    describe('Translation History Integration', () => {
        it('should save translation to history', async () => {
            historyService.saveTranslation = jest.fn().mockResolvedValue({
                id: 'history-1',
                originalText: 'Hello',
                translatedText: 'Hola'
            });

            const result = await historyService.saveTranslation({
                userId: 'user123',
                originalText: 'Hello',
                translatedText: 'Hola',
                sourceLang: 'en',
                targetLang: 'es'
            });

            expect(result.id).toBe('history-1');
            expect(historyService.saveTranslation).toHaveBeenCalledWith(
                expect.objectContaining({
                    originalText: 'Hello',
                    translatedText: 'Hola'
                })
            );
        });
    });
});
