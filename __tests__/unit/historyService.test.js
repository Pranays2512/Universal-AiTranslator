// Mock Sequelize before importing anything that uses it
jest.mock('sequelize', () => {
    const DataTypes = {
        UUID: 'UUID',
        UUIDV4: 'UUIDV4',
        STRING: 'STRING',
        TEXT: 'TEXT',
        BOOLEAN: 'BOOLEAN',
        INTEGER: 'INTEGER',
        DATE: 'DATE',
        JSON: 'JSON'
    };
    return {
        DataTypes,
        Op: {
            or: Symbol('or'),
            gte: Symbol('gte'),
            lte: Symbol('lte'),
            iLike: Symbol('iLike')
        }
    };
});

jest.mock('../../config/database', () => ({
    sequelize: {
        define: jest.fn(() => ({}))
    }
}));

// Mock the models
jest.mock('../../models/TranslationHistory', () => ({
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn()
}));

jest.mock('../../models/SavedPhrase', () => ({
    create: jest.fn(),
    findAll: jest.fn()
}));

const historyService = require('../../services/historyService');
const TranslationHistory = require('../../models/TranslationHistory');
const SavedPhrase = require('../../models/SavedPhrase');

describe('HistoryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveTranslation', () => {
        it('should save translation to database successfully', async () => {
            const mockTranslation = {
                id: 1,
                userId: 'user123',
                originalText: 'hello',
                translatedText: 'hola',
                sourceLang: 'en',
                targetLang: 'es'
            };

            TranslationHistory.create.mockResolvedValue(mockTranslation);

            const data = {
                userId: 'user123',
                originalText: 'hello',
                translatedText: 'hola',
                sourceLang: 'en',
                targetLang: 'es'
            };

            const result = await historyService.saveTranslation(data);

            expect(result).toEqual(mockTranslation);
            expect(TranslationHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user123',
                    originalText: 'hello',
                    translatedText: 'hola',
                    sourceLang: 'en',
                    targetLang: 'es'
                })
            );
        });

        it('should set default values for optional fields', async () => {
            const mockTranslation = { id: 1 };
            TranslationHistory.create.mockResolvedValue(mockTranslation);

            const data = {
                userId: 'user123',
                originalText: 'hello',
                translatedText: 'hola',
                targetLang: 'es'
            };

            await historyService.saveTranslation(data);

            expect(TranslationHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    sourceLang: 'auto',
                    isFavorite: false,
                    source: 'text',
                    characterCount: 5
                })
            );
        });

        it('should throw error when save fails', async () => {
            TranslationHistory.create.mockRejectedValue(new Error('Database error'));

            const data = {
                userId: 'user123',
                originalText: 'hello',
                translatedText: 'hola',
                targetLang: 'es'
            };

            await expect(historyService.saveTranslation(data)).rejects.toThrow('Database error');
        });
    });

    describe('getHistory', () => {
        it('should retrieve user translation history with pagination', async () => {
            const mockRows = [
                { id: 1, originalText: 'hello', translatedText: 'hola' },
                { id: 2, originalText: 'goodbye', translatedText: 'adiós' }
            ];

            TranslationHistory.findAndCountAll.mockResolvedValue({
                count: 2,
                rows: mockRows
            });

            const result = await historyService.getHistory('user123', { page: 1, limit: 20 });

            expect(result.translations).toEqual(mockRows);
            expect(result.pagination.total).toBe(2);
            expect(result.pagination.page).toBe(1);
            expect(TranslationHistory.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user123' },
                    order: [['created_at', 'DESC']],
                    limit: 20,
                    offset: 0
                })
            );
        });

        it('should filter by source and target language', async () => {
            TranslationHistory.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

            await historyService.getHistory('user123', {
                sourceLang: 'en',
                targetLang: 'es'
            });

            expect(TranslationHistory.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user123',
                        sourceLang: 'en',
                        targetLang: 'es'
                    })
                })
            );
        });

        it('should filter favorites only', async () => {
            TranslationHistory.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

            await historyService.getHistory('user123', { favoritesOnly: true });

            expect(TranslationHistory.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        isFavorite: true
                    })
                })
            );
        });

        it('should handle errors gracefully', async () => {
            TranslationHistory.findAndCountAll.mockRejectedValue(new Error('Database error'));

            await expect(historyService.getHistory('user123')).rejects.toThrow('Database error');
        });
    });

    describe('getTranslationById', () => {
        it('should retrieve a translation by ID', async () => {
            const mockTranslation = {
                id: 1,
                userId: 'user123',
                originalText: 'hello',
                translatedText: 'hola'
            };

            TranslationHistory.findOne.mockResolvedValue(mockTranslation);

            const result = await historyService.getTranslationById(1, 'user123');

            expect(result).toEqual(mockTranslation);
            expect(TranslationHistory.findOne).toHaveBeenCalledWith({
                where: { id: 1, userId: 'user123' }
            });
        });

        it('should return null if translation not found', async () => {
            TranslationHistory.findOne.mockResolvedValue(null);

            const result = await historyService.getTranslationById(999, 'user123');

            expect(result).toBeNull();
        });
    });
});
