const historyService = require('../services/historyService');

/**
 * Get translation history
 */
async function getHistory(req, res) {
    try {
        const userId = req.user.id;
        const { page, limit, sourceLang, targetLang, search, startDate, endDate, favoritesOnly } = req.query;

        const result = await historyService.getHistory(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            sourceLang,
            targetLang,
            search,
            startDate,
            endDate,
            favoritesOnly: favoritesOnly === 'true'
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get single translation
 */
async function getTranslation(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const translation = await historyService.getTranslationById(id, userId);

        if (!translation) {
            return res.status(404).json({
                success: false,
                error: 'Translation not found'
            });
        }

        res.json({
            success: true,
            translation
        });
    } catch (error) {
        console.error('Get translation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Toggle favorite status
 */
async function toggleFavorite(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const translation = await historyService.toggleFavorite(id, userId);

        res.json({
            success: true,
            translation,
            isFavorite: translation.isFavorite
        });
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get favorites only
 */
async function getFavorites(req, res) {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await historyService.getFavorites(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Delete translation from history
 */
async function deleteTranslation(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await historyService.deleteTranslation(id, userId);

        res.json({
            success: true,
            message: 'Translation deleted'
        });
    } catch (error) {
        console.error('Delete translation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Clear all history
 */
async function clearHistory(req, res) {
    try {
        const userId = req.user.id;

        const count = await historyService.clearHistory(userId);

        res.json({
            success: true,
            message: `Cleared ${count} translations`
        });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Save a phrase
 */
async function savePhrase(req, res) {
    try {
        const userId = req.user.id;
        const { originalText, translatedText, sourceLang, targetLang, label, category } = req.body;

        if (!originalText || !translatedText || !targetLang) {
            return res.status(400).json({
                success: false,
                error: 'originalText, translatedText, and targetLang are required'
            });
        }

        const phrase = await historyService.savePhrase({
            userId,
            originalText,
            translatedText,
            sourceLang: sourceLang || 'auto',
            targetLang,
            label,
            category
        });

        res.json({
            success: true,
            phrase
        });
    } catch (error) {
        console.error('Save phrase error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get saved phrases
 */
async function getSavedPhrases(req, res) {
    try {
        const userId = req.user.id;
        const { page, limit, category, search } = req.query;

        const result = await historyService.getSavedPhrases(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            category,
            search
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get saved phrases error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Update saved phrase
 */
async function updatePhrase(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { label, category } = req.body;

        const phrase = await historyService.updatePhrase(id, userId, { label, category });

        res.json({
            success: true,
            phrase
        });
    } catch (error) {
        console.error('Update phrase error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Delete saved phrase
 */
async function deletePhrase(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await historyService.deletePhrase(id, userId);

        res.json({
            success: true,
            message: 'Phrase deleted'
        });
    } catch (error) {
        console.error('Delete phrase error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get user statistics
 */
async function getStats(req, res) {
    try {
        const userId = req.user.id;

        const stats = await historyService.getStats(userId);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    getHistory,
    getTranslation,
    toggleFavorite,
    getFavorites,
    deleteTranslation,
    clearHistory,
    savePhrase,
    getSavedPhrases,
    updatePhrase,
    deletePhrase,
    getStats
};
