// Mock Sequelize and dependencies before imports
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));
jest.mock('../../models/TranslationHistory');
jest.mock('../../models/SavedPhrase');
jest.mock('../../services/cacheService');
jest.mock('../../services/historyService');
jest.mock('../../queue/translationQueue');
jest.mock('google-translate-api-x');
jest.mock('tesseract.js');

const translationController = require('../../controller/translationController');
const cacheService = require('../../services/cacheService');
const historyService = require('../../services/historyService');
const { addTranslationJob } = require('../../queue/translationQueue');

describe('TranslationController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 'user123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('handleTranslate', () => {
        it('should return 400 if text is missing', async () => {
            req.body = { targetLang: 'es' };

            await translationController.handleTranslate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Text and target language are required'
            });
        });

        it('should return 400 if targetLang is missing', async () => {
            req.body = { text: 'hello' };

            await translationController.handleTranslate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Text and target language are required'
            });
        });

        it('should return cached translation if available', async () => {
            req.body = {
                text: 'hello',
                targetLang: 'es',
                sourceLang: 'en'
            };

            const cachedTranslation = {
                translated: 'hola',
                cached: true
            };

            cacheService.get.mockResolvedValue(cachedTranslation);
            historyService.saveTranslation.mockResolvedValue({ id: 1 });

            await translationController.handleTranslate(req, res);

            expect(cacheService.get).toHaveBeenCalledWith('hello', 'en', 'es');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    cached: true
                })
            );
        });

        it('should save translation to history even when cached', async () => {
            req.body = {
                text: 'hello',
                targetLang: 'es',
                sourceLang: 'en'
            };

            cacheService.get.mockResolvedValue({
                translated: 'hola',
                cached: true
            });
            historyService.saveTranslation.mockResolvedValue({ id: 1 });

            await translationController.handleTranslate(req, res);

            expect(historyService.saveTranslation).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user123',
                    originalText: 'hello',
                    translatedText: 'hola'
                })
            );
        });
    });

    describe('handleImageTranslation', () => {
        it('should return 400 if image data is missing', async () => {
            req.body = { targetLang: 'es' };

            await translationController.handleImageTranslation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Image and target language are required'
            });
        });

        it('should return 400 if targetLang is missing', async () => {
            req.body = { image: 'base64data' };

            await translationController.handleImageTranslation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Image and target language are required'
            });
        });
    });

    describe('handleBatchTranslation', () => {
        it('should return 400 if texts array is missing', async () => {
            req.body = { targetLang: 'es' };

            await translationController.handleBatchTranslation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Texts array and target language are required'
            });
        });

        it('should return 400 if texts is not an array', async () => {
            req.body = {
                texts: 'not an array',
                targetLang: 'es'
            };

            await translationController.handleBatchTranslation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Texts array and target language are required'
            });
        });

        it('should return 400 if texts array is empty', async () => {
            req.body = {
                texts: [],
                targetLang: 'es'
            };

            await translationController.handleBatchTranslation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Texts array cannot be empty'
            });
        });

        it('should handle translation queue jobs', async () => {
            req.body = {
                text: 'hello world',
                targetLang: 'es'
            };

            cacheService.get.mockResolvedValue(null);
            addTranslationJob.mockResolvedValue({ id: 'job123' });

            await translationController.handleTranslate(req, res);

            expect(addTranslationJob).toHaveBeenCalled();
        });

        it('should handle errors in translation process', async () => {
            req.body = {
                text: 'hello',
                targetLang: 'es'
            };

            cacheService.get.mockRejectedValue(new Error('Cache error'));

            await translationController.handleTranslate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should validate language codes', async () => {
            req.body = {
                text: 'hello',
                targetLang: 'invalid',
                sourceLang: 'xx'
            };

            await translationController.handleTranslate(req, res);

            expect(res.status).toHaveBeenCalled();
        });

        it('should handle very long text gracefully', async () => {
            const longText = 'a'.repeat(10000);
            req.body = {
                text: longText,
                targetLang: 'es'
            };

            cacheService.get.mockResolvedValue(null);

            await translationController.handleTranslate(req, res);

            expect(res.status).toHaveBeenCalled();
        });
    });
});
