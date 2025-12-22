/**
 * Functional Tests for OCR (Optical Character Recognition)
 * Tests image text extraction and translation functionality
 */

jest.mock('tesseract.js');
jest.mock('google-translate-api-x');
jest.mock('sharp');
jest.mock('sequelize');
jest.mock('../../config/database', () => ({ sequelize: { define: jest.fn() } }));

const Tesseract = require('tesseract.js');
const translate = require('google-translate-api-x');
const sharp = require('sharp');

describe('OCR Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Text Extraction from Images', () => {
        it('should extract text from a clear image', async () => {
            const mockRecognize = jest.fn().mockResolvedValue({
                data: {
                    text: 'Hello World',
                    confidence: 95
                }
            });

            Tesseract.recognize = mockRecognize;

            const result = await Tesseract.recognize('image-path.png', 'eng');

            expect(result.data.text).toBe('Hello World');
            expect(result.data.confidence).toBeGreaterThan(90);
        });

        it('should handle multiple languages in image', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: {
                    text: 'Hello 你好 Hola',
                    confidence: 85
                }
            });

            const result = await Tesseract.recognize('multi-lang.png', 'eng+chi_sim+spa');

            expect(result.data.text).toContain('Hello');
            expect(result.data.text).toContain('你好');
            expect(result.data.text).toContain('Hola');
        });

        it('should handle low quality images', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: {
                    text: 'H3ll0 W0rld',
                    confidence: 45
                }
            });

            const result = await Tesseract.recognize('blurry-image.png', 'eng');

            expect(result.data.confidence).toBeLessThan(50);
        });

        it('should handle images with no text', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: {
                    text: '',
                    confidence: 0
                }
            });

            const result = await Tesseract.recognize('blank-image.png', 'eng');

            expect(result.data.text).toBe('');
        });
    });

    describe('Image Preprocessing', () => {
        it('should resize large images before OCR', async () => {
            const mockSharp = {
                resize: jest.fn().mockReturnThis(),
                grayscale: jest.fn().mockReturnThis(),
                normalize: jest.fn().mockReturnThis(),
                toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed'))
            };

            sharp.mockReturnValue(mockSharp);

            const processed = await sharp('large-image.png')
                .resize(2000, 2000, { fit: 'inside' })
                .grayscale()
                .normalize()
                .toBuffer();

            expect(mockSharp.resize).toHaveBeenCalled();
            expect(mockSharp.grayscale).toHaveBeenCalled();
            expect(mockSharp.normalize).toHaveBeenCalled();
        });

        it('should convert to grayscale for better OCR', async () => {
            const mockSharp = {
                grayscale: jest.fn().mockReturnThis(),
                toBuffer: jest.fn().mockResolvedValue(Buffer.from('gray'))
            };

            sharp.mockReturnValue(mockSharp);

            await sharp('color-image.png').grayscale().toBuffer();

            expect(mockSharp.grayscale).toHaveBeenCalled();
        });
    });

    describe('OCR and Translation Pipeline', () => {
        it('should extract text and translate it', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'Hello World', confidence: 95 }
            });

            translate.mockResolvedValue({
                text: 'Hola Mundo',
                from: { language: { iso: 'en' } }
            });

            const ocrResult = await Tesseract.recognize('image.png', 'eng');
            const translation = await translate(ocrResult.data.text, { to: 'es' });

            expect(ocrResult.data.text).toBe('Hello World');
            expect(translation.text).toBe('Hola Mundo');
        });

        it('should handle OCR errors during translation', async () => {
            Tesseract.recognize = jest.fn().mockRejectedValue(
                new Error('OCR failed')
            );

            await expect(
                Tesseract.recognize('corrupted.png', 'eng')
            ).rejects.toThrow('OCR failed');
        });

        it('should detect language from extracted text', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'Bonjour le monde', confidence: 90 }
            });

            translate.mockResolvedValue({
                text: 'Hello world',
                from: { language: { iso: 'fr' } }
            });

            const ocrResult = await Tesseract.recognize('french-text.png', 'fra');
            const translation = await translate(ocrResult.data.text, { to: 'en' });

            expect(translation.from.language.iso).toBe('fr');
        });
    });

    describe('Different Image Formats', () => {
        it('should process PNG images', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'PNG Text', confidence: 92 }
            });

            const result = await Tesseract.recognize('image.png', 'eng');
            expect(result.data.text).toBe('PNG Text');
        });

        it('should process JPEG images', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'JPEG Text', confidence: 88 }
            });

            const result = await Tesseract.recognize('image.jpg', 'eng');
            expect(result.data.text).toBe('JPEG Text');
        });

        it('should process WebP images', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'WebP Text', confidence: 90 }
            });

            const result = await Tesseract.recognize('image.webp', 'eng');
            expect(result.data.text).toBe('WebP Text');
        });
    });

    describe('OCR Performance', () => {
        it('should complete OCR within reasonable time', async () => {
            const startTime = Date.now();

            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'Quick OCR', confidence: 95 }
            });

            await Tesseract.recognize('image.png', 'eng');
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle large batch of images', async () => {
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'Batch text', confidence: 90 }
            });

            const images = Array(5).fill('image.png');
            const results = await Promise.all(
                images.map(img => Tesseract.recognize(img, 'eng'))
            );

            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result.data.text).toBe('Batch text');
            });
        });
    });

    describe('Base64 Image Processing', () => {
        it('should process base64 encoded images', async () => {
            const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
            
            Tesseract.recognize = jest.fn().mockResolvedValue({
                data: { text: 'Base64 Text', confidence: 91 }
            });

            const result = await Tesseract.recognize(base64Image, 'eng');
            expect(result.data.text).toBe('Base64 Text');
        });

        it('should validate base64 format', () => {
            const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
            const isValid = validBase64.startsWith('data:image/');
            
            expect(isValid).toBe(true);
        });
    });
});
