const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const { checkUser } = require('../middleware/middleware');

// Get cache statistics
router.get('/stats', checkUser, async (req, res) => {
    try {
        const stats = await cacheService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get popular translations
router.get('/popular', checkUser, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const popular = await cacheService.getPopular(limit);
        res.json({ success: true, popular });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear cache
router.delete('/clear', checkUser, async (req, res) => {
    try {
        const { pattern } = req.query;
        const cleared = await cacheService.clear(pattern);
        res.json({ success: true, cleared });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Preload common phrases
router.post('/preload', checkUser, async (req, res) => {
    try {
        const { phrases } = req.body;
        const loaded = await cacheService.preloadCommon(phrases);
        res.json({ success: true, loaded });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;