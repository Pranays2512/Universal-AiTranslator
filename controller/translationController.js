const translate = require('google-translate-api-x');
const { translationQueue, addTranslationJob, getQueueStats } = require('../queue/translationQueue.js');
const Tesseract = require('tesseract.js');
const cacheService = require('../services/cacheService');
const historyService = require('../services/historyService');

async function handleTranslate(req, res) {
    const { text, targetLang, sourceLang = 'auto' } = req.body;

    if (!text || !targetLang) {
        return res.status(400).json({ 
            success: false, 
            error: 'Text and target language are required' 
        });
    }

    try {
        // Check cache first
        const cached = await cacheService.get(text, sourceLang, targetLang);
        
        if (cached) {
            console.log('✓ Serving translation from cache');
            
            // Save to history even if cached
            try {
                await historyService.saveTranslation({
                    userId: req.user.id,
                    originalText: text,
                    translatedText: cached.translated,
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    detectedLang: cached.sourceLang,
                    source: 'text',
                    metadata: { cached: true }
                });
            } catch (historyError) {
                console.error('Failed to save to history:', historyError);
            }

            return res.json({
                success: true,
                translation: cached.translated,
                detectedLanguage: cached.sourceLang,
                cached: true,
                cachedAt: cached.cachedAt
            });
        }

        // If not in cache, add to queue
        const job = await addTranslationJob({
            text,
            targetLang,
            sourceLang,
            userId: req.user.id,
            socketId: req.body.socketId
        });

        res.json({
            success: true,
            jobId: job.id,
            message: 'Translation queued',
            cached: false
        });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

async function extractTextFromImage(req, res) {
    const { imageData } = req.body;

    if (!imageData) {
        return res.status(400).json({ 
            success: false, 
            error: 'Image data is required' 
        });
    }

    try {
        console.log('Starting OCR extraction...');
        
        const { data: { text } } = await Tesseract.recognize(
            imageData,
            'eng',
            {
                logger: m => console.log(`OCR Progress: ${m.status} - ${Math.round(m.progress * 100)}%`)
            }
        );

        console.log('✓ OCR extraction completed');

        res.json({
            success: true,
            extractedText: text.trim()
        });

    } catch (error) {
        console.error('OCR extraction error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

async function extractAndTranslate(req, res) {
    const { imageData, targetLang, sourceLang = 'auto' } = req.body;

    if (!imageData || !targetLang) {
        return res.status(400).json({ 
            success: false, 
            error: 'Image data and target language are required' 
        });
    }

    try {
        console.log('Starting OCR + Translation...');
        
        // Extract text from image
        const { data: { text } } = await Tesseract.recognize(
            imageData,
            'eng',
            {
                logger: m => console.log(`OCR: ${Math.round(m.progress * 100)}%`)
            }
        );

        const extractedText = text.trim();
        console.log('✓ Text extracted:', extractedText.substring(0, 50) + '...');

        if (!extractedText) {
            return res.status(400).json({ 
                success: false, 
                error: 'No text found in image' 
            });
        }

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
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    detectedLang: cached.sourceLang,
                    source: 'image',
                    metadata: { cached: true, ocrExtracted: true }
                });
            } catch (historyError) {
                console.error('Failed to save to history:', historyError);
            }

            return res.json({
                success: true,
                extractedText,
                translation: cached.translated,
                detectedLanguage: cached.sourceLang,
                cached: true
            });
        }

        // Translate the extracted text
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
                userId: req.user.id,
                ocrExtracted: true
            }
        );

        // Save to history
        try {
            await historyService.saveTranslation({
                userId: req.user.id,
                originalText: extractedText,
                translatedText: result.text,
                sourceLang: sourceLang,
                targetLang: targetLang,
                detectedLang: detectedLang,
                source: 'image',
                metadata: { ocrExtracted: true }
            });
        } catch (historyError) {
            console.error('Failed to save to history:', historyError);
        }

        console.log('✓ OCR + Translation completed');

        res.json({
            success: true,
            extractedText,
            translation: result.text,
            detectedLanguage: detectedLang,
            cached: false
        });

    } catch (error) {
        console.error('OCR + Translation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

async function getQueueStatistics(req, res) {
    try {
        const stats = await getQueueStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Queue stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

async function checkTranslationCache(req, res) {
    const { text, sourceLang = 'auto', targetLang } = req.query;

    if (!text || !targetLang) {
        return res.status(400).json({ 
            success: false, 
            error: 'Text and target language are required' 
        });
    }

    try {
        const cached = await cacheService.get(text, sourceLang, targetLang);
        
        res.json({
            success: true,
            cached: !!cached,
            data: cached || null
        });
    } catch (error) {
        console.error('Cache check error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

module.exports = {
    handleTranslate,
    extractTextFromImage,
    extractAndTranslate,
    getQueueStatistics,
    checkTranslationCache
};
