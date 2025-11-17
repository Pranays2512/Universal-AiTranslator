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
const { getFailedJobs, retryFailedJob, getQueueStats } = require('../queue/translationQueue');

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

// Get queue statistics
router.get('/api/admin/queue/stats', async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get failed jobs from DLQ
router.get('/api/admin/queue/failed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const failedJobs = await getFailedJobs(limit);
        res.json({ jobs: failedJobs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Retry a failed job
router.post('/api/admin/queue/retry/:jobId', async (req, res) => {
    try {
        const job = await retryFailedJob(req.params.jobId);
        res.json({ success: true, newJobId: job.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
