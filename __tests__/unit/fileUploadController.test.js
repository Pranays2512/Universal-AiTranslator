// Mock dependencies before imports
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));
jest.mock('../../models/TranslationHistory');
jest.mock('tesseract.js');
jest.mock('google-translate-api-x');
jest.mock('../../services/cacheService');
jest.mock('../../services/historyService');
jest.mock('sharp');

const { extractTextFromFile, extractAndTranslateFile } = require('../../controller/fileUploadController');

describe('FileUploadController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            file: null,
            body: {},
            user: { id: 'user123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('extractTextFromFile', () => {
        it('should return 400 if no file is uploaded', async () => {
            req.file = null;

            await extractTextFromFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'No file uploaded'
            });
        });

        it('should return 400 if file type is not supported', async () => {
            req.file = {
                mimetype: 'text/plain',
                path: '/tmp/file.txt'
            };

            await extractTextFromFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('Unsupported file type')
            });
        });
    });

    describe('extractAndTranslateFile', () => {
        it('should return 400 if no file is uploaded', async () => {
            req.file = null;
            req.body.targetLang = 'es';

            await extractAndTranslateFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'No file uploaded'
            });
        });

        it('should return 400 if target language is missing', async () => {
            req.file = {
                mimetype: 'image/png',
                path: '/tmp/file.png'
            };

            await extractAndTranslateFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Target language is required'
            });
        });
    });
});
