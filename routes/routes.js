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
const { 
    extractTextFromFile,
    extractAndTranslateFile
} = require('../controller/fileUploadController.js');
const { signUp, signIn } = require('../controller/controller.js');
const { getFailedJobs, retryFailedJob, getQueueStats } = require('../queue/translationQueue');
const cacheRoutes = require('./cacheRoutes');
const historyRoutes = require('./historyRoutes');
const upload = require('../config/multerConfig');

// Increase payload limit for OCR endpoints (for base64 images)
const jsonParserLarge = express.json({ limit: '10mb' });

// Auth routes
router.post('/signup', checkSignUp, signUp);
router.post('/sign-in', checkSignIn, signIn);

// Translation routes
router.post('/translate', checkUser, handleTranslate);

// Old image-based OCR routes (keep for backward compatibility)
router.post('/ocr/extract', jsonParserLarge, checkUser, extractTextFromImage);
router.post('/ocr/translate', jsonParserLarge, checkUser, extractAndTranslate);

// NEW: File-based OCR routes (better accuracy)
router.post('/ocr/file/extract', checkUser, upload.single('file'), extractTextFromFile);
router.post('/ocr/file/translate', checkUser, upload.single('file'), extractAndTranslateFile);

router.get('/queue/stats', checkUser, getQueueStatistics);
router.get('/translation/cache', checkUser, checkTranslationCache);

// Cache routes
router.use('/cache', cacheRoutes);

// History routes
router.use('/history', historyRoutes);

// Health check
router.get('/health', async (req, res) => {
    try {
        const { redisClient } = require('../config/redis');
        const { sequelize } = require('../config/database');
        
        await redisClient.ping();
        await sequelize.authenticate();
        
        res.json({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            websocket: 'active',
            redis: 'connected',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'degraded',
            timestamp: new Date().toISOString(),
            websocket: 'active',
            redis: error.message.includes('redis') ? 'disconnected' : 'connected',
            database: error.message.includes('database') ? 'disconnected' : 'connected',
            error: error.message
        });
    }
});

// Admin queue routes
router.get('/api/admin/queue/stats', checkUser, async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/admin/queue/failed', checkUser, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const failedJobs = await getFailedJobs(limit);
        res.json({ success: true, jobs: failedJobs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/admin/queue/retry/:jobId', checkUser, async (req, res) => {
    try {
        const job = await retryFailedJob(req.params.jobId);
        res.json({ success: true, newJobId: job.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
