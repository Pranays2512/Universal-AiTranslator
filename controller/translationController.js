const translate = require('google-translate-api-x');
const { addTranslationJob, getQueueStats } = require('../queue/translationQueue.js');
const { redisClient } = require('../config/redis.js');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Original REST endpoint (maintains backward compatibility)
async function handleTranslate(req, res) {
    try {
        const { text, targetLang, useQueue } = req.body;

        if (!text || !targetLang) {
            return res.status(400).json({ message: 'Text and target language are required' });
        }
        if (text.length > 5000) {
            return res.status(400).json({ message: 'Text is too long. Maximum 5000 characters allowed.' });
        }

        if (useQueue) {
            const job = await addTranslationJob({
                text,
                targetLang,
                userId: req.currentUser.id,
                socketId: null,
                priority: 5
            });
            
            return res.json({
                queued: true,
                jobId: job.id,
                message: 'Translation queued for processing'
            });
        }

        console.log(`Translating: "${text}" to language: ${targetLang}`);
        const result = await translate(text, { to: targetLang });
        console.log(`Translation result: "${result.text}"`);

        const cacheKey = `translation:${Buffer.from(text).toString('base64')}:${targetLang}`;
        await redisClient.setex(cacheKey, 300, JSON.stringify({
            translatedText: result.text,
            detectedLanguage: result.from?.language?.iso || 'unknown'
        }));

        res.json({ 
            translatedText: result.text,
            detectedLanguage: result.from?.language?.iso || 'unknown'
        });
    } catch (err) {
        console.error('Translation error:', err);

        if (err.message.includes('400')) {
            res.status(400).json({ message: 'Invalid translation request. Please check your input.' });
        } else if (err.message.includes('429') || err.message.includes('TooManyRequests')) {
            res.status(429).json({ message: 'Too many requests. Please wait a moment and try again.' });
        } else if (err.message.includes('503')) {
            res.status(503).json({ message: 'Translation service temporarily unavailable. Please try again later.' });
        } else {
            res.status(500).json({ message: 'Translation failed. Please try again.' });
        }
    }
}

// Helper: Preprocess image with different strategies
async function preprocessImage(base64Image, strategy = 'normal') {
    try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        let processedBuffer;
        
        switch (strategy) {
            case 'inverted':
                processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 2000, fit: 'inside', withoutEnlargement: false })
                    .grayscale()
                    .normalize()
                    .negate()
                    .linear(2.5, -(128 * 2.5) + 128)
                    .sharpen({ sigma: 2 })
                    .png()
                    .toBuffer();
                break;
                
            case 'highcontrast':
                processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 2000, fit: 'inside', withoutEnlargement: false })
                    .grayscale()
                    .normalize()
                    .linear(3.0, -(128 * 3.0) + 128)
                    .sharpen({ sigma: 2 })
                    .png()
                    .toBuffer();
                break;
                
            case 'threshold':
                processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 2000, fit: 'inside', withoutEnlargement: false })
                    .grayscale()
                    .normalize()
                    .threshold(128)
                    .png()
                    .toBuffer();
                break;
                
            default:
                processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 2000, fit: 'inside', withoutEnlargement: false })
                    .grayscale()
                    .normalize()
                    .sharpen()
                    .png()
                    .toBuffer();
        }
        
        return `data:image/png;base64,${processedBuffer.toString('base64')}`;
    } catch (err) {
        console.error(`Preprocessing error (${strategy}):`, err.message);
        return base64Image;
    }
}

// Helper: Try multiple OCR strategies and return best result
async function tryMultipleOCRStrategies(imageData) {
    const strategies = ['inverted', 'highcontrast', 'normal', 'threshold'];
    const languages = 'jpn+eng+chi_sim+chi_tra+kor+ara+hin+rus+spa+fra+deu+ita+por';
    
    let bestResult = null;
    let bestConfidence = 0;
    let bestStrategy = '';
    
    for (const strategy of strategies) {
        try {
            console.log(`\n=== Trying strategy: ${strategy.toUpperCase()} ===`);
            const processedImage = await preprocessImage(imageData, strategy);
            
            const result = await Tesseract.recognize(processedImage, languages, {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`[${strategy}] Progress: ${Math.round(info.progress * 100)}%`);
                    }
                }
            });
            
            const text = result.data.text.trim();
            const confidence = result.data.confidence;
            
            console.log(`[${strategy}] Result: "${text}"`);
            console.log(`[${strategy}] Confidence: ${Math.round(confidence)}%`);
            
            if (text && text.length > 0 && confidence > bestConfidence) {
                bestResult = result;
                bestConfidence = confidence;
                bestStrategy = strategy;
                console.log(`[${strategy}] ✓ New best result!`);
            }
            
            // Early exit on high confidence
            if (confidence > 85 && text.length > 0) {
                console.log(`[${strategy}] ✓ High confidence! Using this result.`);
                break;
            }
        } catch (err) {
            console.error(`[${strategy}] ✗ Failed:`, err.message);
        }
    }
    
    if (bestResult) {
        console.log(`\n✓ Best strategy: ${bestStrategy.toUpperCase()} (${Math.round(bestConfidence)}% confidence)`);
    }
    
    return bestResult;
}

// Extract text from image using OCR
async function extractTextFromImage(req, res) {
    try {
        const { imageData } = req.body;

        if (!imageData) {
            return res.status(400).json({ message: 'Image data is required' });
        }

        console.log('\n========== OCR EXTRACTION STARTED ==========');
        const result = await tryMultipleOCRStrategies(imageData);

        if (!result || !result.data.text.trim()) {
            return res.status(400).json({ message: 'No text found in the image' });
        }

        const extractedText = result.data.text.trim();
        const confidence = Math.round(result.data.confidence);

        console.log(`\nFinal Result: "${extractedText}"`);
        console.log(`Final Confidence: ${confidence}%`);
        console.log('========== OCR EXTRACTION COMPLETED ==========\n');

        res.json({
            success: true,
            text: extractedText,
            confidence: confidence
        });
    } catch (err) {
        console.error('OCR error:', err);
        res.status(500).json({ message: 'Failed to extract text from image. Please try again.' });
    }
}

// Extract text from image and translate
async function extractAndTranslate(req, res) {
    try {
        const { imageData, targetLang } = req.body;

        if (!imageData || !targetLang) {
            return res.status(400).json({ message: 'Image data and target language are required' });
        }

        console.log('\n========== OCR + TRANSLATION STARTED ==========');
        const ocrResult = await tryMultipleOCRStrategies(imageData);

        if (!ocrResult || !ocrResult.data.text.trim()) {
            return res.status(400).json({ 
                message: 'No text found in the image. Please try a clearer image.' 
            });
        }

        const extractedText = ocrResult.data.text.trim();
        const confidence = Math.round(ocrResult.data.confidence);

        console.log(`\nExtracted: "${extractedText}"`);
        console.log(`Confidence: ${confidence}%`);
        console.log(`Translating to: ${targetLang}...`);

        const translationResult = await translate(extractedText, { to: targetLang });
        console.log(`Translated: "${translationResult.text}"`);
        console.log('========== OCR + TRANSLATION COMPLETED ==========\n');

        const cacheKey = `translation:${Buffer.from(extractedText).toString('base64')}:${targetLang}`;
        await redisClient.setex(cacheKey, 300, JSON.stringify({
            translatedText: translationResult.text,
            detectedLanguage: translationResult.from?.language?.iso || 'unknown'
        }));

        res.json({
            success: true,
            extractedText,
            translatedText: translationResult.text,
            detectedLanguage: translationResult.from?.language?.iso || 'unknown',
            ocrConfidence: confidence
        });
    } catch (err) {
        console.error('Extract and translate error:', err);
        res.status(500).json({ message: 'Failed to process image. Please try again.' });
    }
}

// Get queue statistics
async function getQueueStatistics(req, res) {
    try {
        const stats = await getQueueStats();
        res.json({
            success: true,
            stats
        });
    } catch (err) {
        console.error('Error fetching queue stats:', err);
        res.status(500).json({ message: 'Failed to fetch queue statistics' });
    }
}

// Check translation cache
async function checkTranslationCache(req, res) {
    try {
        const { text, targetLang } = req.query;
        
        if (!text || !targetLang) {
            return res.status(400).json({ message: 'Text and target language are required' });
        }
        
        const cacheKey = `translation:${Buffer.from(text).toString('base64')}:${targetLang}`;
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            return res.json({
                cached: true,
                data: JSON.parse(cached)
            });
        }
        
        res.json({ cached: false });
    } catch (err) {
        console.error('Cache check error:', err);
        res.status(500).json({ message: 'Failed to check cache' });
    }
}

module.exports = { 
    handleTranslate,
    extractTextFromImage,
    extractAndTranslate,
    getQueueStatistics,
    checkTranslationCache
};