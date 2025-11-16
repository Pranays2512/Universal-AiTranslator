const express = require('express');
const router = express.Router();
const path = require('path');
const { checkSignUp, checkSignIn, checkUser } = require('../middleware/middleware.js');
const { 
    handleTranslate, 
    extractTextFromImage,
    extractAndTranslate,
    getQueueStatistics, 
    checkTranslationCache 
} = require('../controller/translationController.js');
const { signUp, signIn } = require('../controller/controller.js');

// Increase payload limit for OCR endpoints (for base64 images)
const jsonParserLarge = express.json({ limit: '10mb' });

router.post('/signup', checkSignUp, signUp);
router.post('/sign-in', checkSignIn, signIn);

router.post('/translate', checkUser, handleTranslate);
router.post('/ocr/extract', jsonParserLarge, checkUser, extractTextFromImage);
router.post('/ocr/translate', jsonParserLarge, checkUser, extractAndTranslate);
router.get('/queue/stats', checkUser, getQueueStatistics);
router.get('/translation/cache', checkUser, checkTranslationCache);

router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: 'active',
        redis: 'connected'
    });
});

module.exports = router;