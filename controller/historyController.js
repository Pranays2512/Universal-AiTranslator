const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get translation history for the current user
 * Supports pagination and filtering
 */
async function getTranslationHistory(req, res) {
    try {
        const userId = req.user.id;
        
        // Robust pagination validation
        const pageParam = req.query.page;
        const limitParam = req.query.limit;
        
        const page = (pageParam && !isNaN(pageParam)) ? Math.max(1, parseInt(pageParam, 10)) : 1;
        const limit = (limitParam && !isNaN(limitParam)) ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 20;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await prisma.translationHistory.count({
            where: { userId }
        });

        // Get paginated history
        const history = await prisma.translationHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        res.json({
            success: true,
            data: history,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching translation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch translation history'
        });
    }
}

/**
 * Delete a translation from history
 */
async function deleteTranslationHistory(req, res) {
    try {
        const userId = req.user.id;
        const historyId = parseInt(req.params.id, 10);
        
        // Validate ID parameter
        if (isNaN(historyId) || historyId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid history ID'
            });
        }

        // Verify ownership before deleting
        const history = await prisma.translationHistory.findFirst({
            where: {
                id: historyId,
                userId
            }
        });

        if (!history) {
            return res.status(404).json({
                success: false,
                error: 'Translation history not found'
            });
        }

        await prisma.translationHistory.delete({
            where: { id: historyId }
        });

        res.json({
            success: true,
            message: 'Translation deleted from history'
        });
    } catch (error) {
        console.error('Error deleting translation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete translation history'
        });
    }
}

/**
 * Clear all translation history for the current user
 */
async function clearTranslationHistory(req, res) {
    try {
        const userId = req.user.id;

        const result = await prisma.translationHistory.deleteMany({
            where: { userId }
        });

        res.json({
            success: true,
            message: `Deleted ${result.count} translations from history`
        });
    } catch (error) {
        console.error('Error clearing translation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear translation history'
        });
    }
}

/**
 * Get saved/favorite translations
 */
async function getSavedTranslations(req, res) {
    try {
        const userId = req.user.id;
        
        // Robust pagination validation
        const pageParam = req.query.page;
        const limitParam = req.query.limit;
        
        const page = (pageParam && !isNaN(pageParam)) ? Math.max(1, parseInt(pageParam, 10)) : 1;
        const limit = (limitParam && !isNaN(limitParam)) ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 20;
        const skip = (page - 1) * limit;

        const total = await prisma.savedTranslation.count({
            where: { userId }
        });

        const saved = await prisma.savedTranslation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
        });

        res.json({
            success: true,
            data: saved,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching saved translations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch saved translations'
        });
    }
}

/**
 * Save/favorite a translation
 */
async function saveTranslation(req, res) {
    try {
        const userId = req.user.id;
        const { sourceText, translatedText, sourceLang, targetLang, note } = req.body;

        if (!sourceText || !translatedText || !sourceLang || !targetLang) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Use upsert to handle duplicates
        const saved = await prisma.savedTranslation.upsert({
            where: {
                userId_sourceText_sourceLang_targetLang: {
                    userId,
                    sourceText,
                    sourceLang,
                    targetLang
                }
            },
            update: {
                translatedText,
                note: note || null,
                updatedAt: new Date()
            },
            create: {
                userId,
                sourceText,
                translatedText,
                sourceLang,
                targetLang,
                note: note || null
            }
        });

        res.json({
            success: true,
            data: saved,
            message: 'Translation saved successfully'
        });
    } catch (error) {
        console.error('Error saving translation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save translation'
        });
    }
}

/**
 * Remove a saved translation
 */
async function removeSavedTranslation(req, res) {
    try {
        const userId = req.user.id;
        const savedId = parseInt(req.params.id, 10);
        
        // Validate ID parameter
        if (isNaN(savedId) || savedId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid saved translation ID'
            });
        }

        // Verify ownership before deleting
        const saved = await prisma.savedTranslation.findFirst({
            where: {
                id: savedId,
                userId
            }
        });

        if (!saved) {
            return res.status(404).json({
                success: false,
                error: 'Saved translation not found'
            });
        }

        await prisma.savedTranslation.delete({
            where: { id: savedId }
        });

        res.json({
            success: true,
            message: 'Translation removed from saved'
        });
    } catch (error) {
        console.error('Error removing saved translation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove saved translation'
        });
    }
}

/**
 * Check if a translation is saved
 */
async function checkIfSaved(req, res) {
    try {
        const userId = req.user.id;
        const { sourceText, sourceLang, targetLang } = req.query;

        if (!sourceText || !sourceLang || !targetLang) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        const saved = await prisma.savedTranslation.findFirst({
            where: {
                userId,
                sourceText,
                sourceLang,
                targetLang
            }
        });

        res.json({
            success: true,
            isSaved: !!saved,
            data: saved || null
        });
    } catch (error) {
        console.error('Error checking saved status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check saved status'
        });
    }
}

module.exports = {
    getTranslationHistory,
    deleteTranslationHistory,
    clearTranslationHistory,
    getSavedTranslations,
    saveTranslation,
    removeSavedTranslation,
    checkIfSaved
};
