// Mock dependencies before imports
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));
jest.mock('../../models/TranslationHistory');
jest.mock('../../models/SavedPhrase');
jest.mock('../../services/historyService');

const historyService = require('../../services/historyService');
const {
    getHistory,
    getTranslationById,
    deleteTranslation,
    toggleFavorite
} = require('../../controller/historyController');

describe('HistoryController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'user123' },
            query: {},
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getHistory', () => {
        it('should retrieve user history successfully', async () => {
            const mockHistory = {
                translations: [
                    { id: 1, originalText: 'hello', translatedText: 'hola' }
                ],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 20,
                    totalPages: 1
                }
            };

            historyService.getHistory.mockResolvedValue(mockHistory);

            await getHistory(req, res);

            expect(historyService.getHistory).toHaveBeenCalledWith('user123', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                ...mockHistory
            });
        });

        it('should handle errors when retrieving history', async () => {
            historyService.getHistory.mockRejectedValue(new Error('Database error'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('Failed to retrieve history')
            });
        });
    });

    describe('getTranslationById', () => {
        it('should retrieve a single translation by ID', async () => {
            const mockTranslation = {
                id: 1,
                originalText: 'hello',
                translatedText: 'hola'
            };

            req.params.id = '1';
            historyService.getTranslationById.mockResolvedValue(mockTranslation);

            await getTranslationById(req, res);

            expect(historyService.getTranslationById).toHaveBeenCalledWith('1', 'user123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                translation: mockTranslation
            });
        });

        it('should return 404 if translation not found', async () => {
            req.params.id = '999';
            historyService.getTranslationById.mockResolvedValue(null);

            await getTranslationById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Translation not found'
            });
        });
    });
});
