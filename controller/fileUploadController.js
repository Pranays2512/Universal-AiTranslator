const translate = require('google-translate-api-x');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const cacheService = require('../services/cacheService');
const historyService = require('../services/historyService');

/**
 * Extract text from uploaded file (images or PDFs)
 */
async function extractTextFromFile(req, res) {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    try {
        console.log(`📄 Processing file: ${req.file.originalname}`);
        
        let extractedText = '';

        // Handle PDF files
        if (fileExt === '.pdf') {
            console.log('🔍 Extracting text from PDF...');
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text.trim();
            
            console.log(`✓ Extracted ${pdfData.numpages} pages from PDF`);
        } 
        // Handle image files
        else if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(fileExt)) {
            console.log('🔍 Running OCR on image...');
            
            // Convert image to PNG for better OCR accuracy
            const processedImagePath = filePath + '_processed.png';
            await sharp(filePath)
                .grayscale()
                .normalize()
                .png()
                .toFile(processedImagePath);

            // Run Tesseract OCR
            const { data: { text } } = await Tesseract.recognize(
                processedImagePath,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            extractedText = text.trim();

            // Clean up processed image
            await fs.unlink(processedImagePath).catch(() => {});
            console.log('✓ OCR completed');
        } 
        else {
            return res.status(400).json({ 
                success: false, 
                error: 'Unsupported file format. Please upload PDF, JPG, PNG, BMP, TIFF, or WEBP' 
            });
        }

        // Clean up uploaded file
        await fs.unlink(filePath).catch(() => {});

        if (!extractedText) {
            return res.status(400).json({ 
                success: false, 
                error: 'No text found in the file' 
            });
        }

        console.log(`✓ Extracted ${extractedText.length} characters`);

        res.json({
            success: true,
            extractedText,
            fileInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                type: fileExt
            }
        });

    } catch (error) {
        console.error('File extraction error:', error);
        
        // Clean up file on error
        await fs.unlink(filePath).catch(() => {});
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Extract text from file and translate
 */
async function extractAndTranslateFile(req, res) {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    const { targetLang, sourceLang = 'auto' } = req.body;

    if (!targetLang) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ 
            success: false, 
            error: 'Target language is required' 
        });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    try {
        console.log(`📄 Processing and translating: ${req.file.originalname}`);
        
        let extractedText = '';

        // Handle PDF files
        if (fileExt === '.pdf') {
            console.log('🔍 Extracting text from PDF...');
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text.trim();
            console.log(`✓ Extracted ${pdfData.numpages} pages from PDF`);
        } 
        // Handle image files
        else if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(fileExt)) {
            console.log('🔍 Running OCR on image...');
            
            // Convert image to PNG for better OCR accuracy
            const processedImagePath = filePath + '_processed.png';
            await sharp(filePath)
                .grayscale()
                .normalize()
                .png()
                .toFile(processedImagePath);

            // Run Tesseract OCR
            const { data: { text } } = await Tesseract.recognize(
                processedImagePath,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            extractedText = text.trim();

            // Clean up processed image
            await fs.unlink(processedImagePath).catch(() => {});
            console.log('✓ OCR completed');
        } 
        else {
            await fs.unlink(filePath).catch(() => {});
            return res.status(400).json({ 
                success: false, 
                error: 'Unsupported file format. Please upload PDF, JPG, PNG, BMP, TIFF, or WEBP' 
            });
        }

        // Clean up uploaded file
        await fs.unlink(filePath).catch(() => {});

        if (!extractedText) {
            return res.status(400).json({ 
                success: false, 
                error: 'No text found in the file' 
            });
        }

        console.log(`✓ Extracted ${extractedText.length} characters`);

        // Check cache for translation
        const cached = await cacheService.get(extractedText, sourceLang, targetLang);
        
        if (cached) {
            console.log('✓ Translation served from cache');
            
            // Save to history
            try {
                await historyService.saveTranslation({
                    userId: req.user.id,
                    originalText: extractedText,
                    translatedText: cached.translated,
                    sourceLang,
                    targetLang,
                    detectedLang: cached.sourceLang,
                    source: 'file',
                    metadata: { 
                        cached: true, 
                        fileType: fileExt,
                        fileName: req.file.originalname
                    }
                });
            } catch (historyError) {
                console.error('Failed to save to history:', historyError);
            }

            return res.json({
                success: true,
                extractedText,
                translation: cached.translated,
                detectedLanguage: cached.sourceLang,
                cached: true,
                fileInfo: {
                    originalName: req.file.originalname,
                    size: req.file.size,
                    type: fileExt
                }
            });
        }

        // Translate the extracted text
        console.log('🔄 Translating extracted text...');
        const result = await translate(extractedText, { 
            from: sourceLang, 
            to: targetLang 
        });

        const detectedLang = result.from?.language?.iso || sourceLang;

        // Store in cache
        await cacheService.set(
            extractedText,
            detectedLang,
            targetLang,
            result.text,
            { 
                userId: req.user?.id,
                ocrExtracted: true,
                fileType: fileExt
            }
        );

        // Save to history
        try {
            await historyService.saveTranslation({
                userId: req.user.id,
                originalText: extractedText,
                translatedText: result.text,
                sourceLang,
                targetLang,
                detectedLang,
                source: 'file',
                metadata: { 
                    fileType: fileExt,
                    fileName: req.file.originalname
                }
            });
        } catch (historyError) {
            console.error('Failed to save to history:', historyError);
        }

        console.log('✓ File processing and translation completed');

        res.json({
            success: true,
            extractedText,
            translation: result.text,
            detectedLanguage: detectedLang,
            cached: false,
            fileInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                type: fileExt
            }
        });

    } catch (error) {
        console.error('File extraction and translation error:', error);
        
        // Clean up file on error
        await fs.unlink(filePath).catch(() => {});
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

module.exports = {
    extractTextFromFile,
    extractAndTranslateFile
};
