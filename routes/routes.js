const express = require('express');
const router = express.Router();
const path = require('path');
<<<<<<< HEAD
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
=======
const {checkSignUp,checkSignIn,checkUser} = require('../middleware/middleware.js');
const {handleTranslate} = require('../controller/translationController.js');
const {signUp,signIn} = require('../controller/controller.js');
const {upload, handleFileUpload} = require('../controller/fileUploadController.js');
>>>>>>> 4aec86f575dd8595923a03631fb39b7e70913aa0

router.post('/translate', checkUser, handleTranslate);
<<<<<<< HEAD
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

=======
router.post('/translate-file', checkUser, upload.single('file'), handleFileUpload);
    
>>>>>>> 4aec86f575dd8595923a03631fb39b7e70913aa0
module.exports = router;