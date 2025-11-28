const TranslationHistory = require('../models/TranslationHistory');
const SavedPhrase = require('../models/SavedPhrase');
const { Op } = require('sequelize');

class HistoryService {
    /**
     * Save a translation to history
     */
    async saveTranslation(data) {
        try {
            const history = await TranslationHistory.create({
                userId: data.userId,
                originalText: data.originalText,
                translatedText: data.translatedText,
                sourceLang: data.sourceLang || 'auto',
                targetLang: data.targetLang,
                detectedLang: data.detectedLang,
                isFavorite: false,
                source: data.source || 'text',
                characterCount: data.originalText.length,
                metadata: data.metadata || {}
            });

            console.log(`✓ Translation saved to history: ${history.id}`);
            return history;
        } catch (error) {
            console.error('Error saving translation:', error);
            throw error;
        }
    }

    /**
     * Get user's translation history
     */
    async getHistory(userId, options = {}) {
        const {
            page = 1,
            limit = 20,
            sourceLang,
            targetLang,
            search,
            startDate,
            endDate,
            favoritesOnly = false
        } = options;

        try {
            const where = { userId };

            if (sourceLang) where.sourceLang = sourceLang;
            if (targetLang) where.targetLang = targetLang;
            if (favoritesOnly) where.isFavorite = true;

            if (search) {
                where[Op.or] = [
                    { originalText: { [Op.iLike]: `%${search}%` } },
                    { translatedText: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at[Op.gte] = new Date(startDate);
                if (endDate) where.created_at[Op.lte] = new Date(endDate);
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await TranslationHistory.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                translations: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting history:', error);
            throw error;
        }
    }

    /**
     * Get a single translation by ID
     */
    async getTranslationById(id, userId) {
        try {
            const translation = await TranslationHistory.findOne({
                where: { id, userId }
            });
            return translation;
        } catch (error) {
            console.error('Error getting translation:', error);
            throw error;
        }
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id, userId) {
        try {
            const translation = await TranslationHistory.findOne({
                where: { id, userId }
            });

            if (!translation) {
                throw new Error('Translation not found');
            }

            translation.isFavorite = !translation.isFavorite;
            await translation.save();

            console.log(`✓ Favorite toggled: ${id} -> ${translation.isFavorite}`);
            return translation;
        } catch (error) {
            console.error('Error toggling favorite:', error);
            throw error;
        }
    }

    /**
     * Get user's favorite translations
     */
    async getFavorites(userId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        try {
            const { count, rows } = await TranslationHistory.findAndCountAll({
                where: { userId, isFavorite: true },
                order: [['updated_at', 'DESC']],
                limit,
                offset
            });

            return {
                favorites: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    }

    /**
     * Delete a translation from history
     */
    async deleteTranslation(id, userId) {
        try {
            const result = await TranslationHistory.destroy({
                where: { id, userId }
            });

            if (result === 0) {
                throw new Error('Translation not found');
            }

            console.log(`✓ Translation deleted: ${id}`);
            return true;
        } catch (error) {
            console.error('Error deleting translation:', error);
            throw error;
        }
    }

    /**
     * Clear all history for a user
     */
    async clearHistory(userId) {
        try {
            const count = await TranslationHistory.destroy({
                where: { userId }
            });

            console.log(`✓ Cleared ${count} translations for user ${userId}`);
            return count;
        } catch (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    }

    /**
     * Save a phrase to saved phrases
     */
    async savePhrase(data) {
        try {
            // Check if phrase already exists
            const existing = await SavedPhrase.findOne({
                where: {
                    userId: data.userId,
                    originalText: data.originalText,
                    targetLang: data.targetLang
                }
            });

            if (existing) {
                // Update usage count
                existing.usageCount += 1;
                existing.lastUsedAt = new Date();
                await existing.save();
                return existing;
            }

            const phrase = await SavedPhrase.create({
                userId: data.userId,
                originalText: data.originalText,
                translatedText: data.translatedText,
                sourceLang: data.sourceLang,
                targetLang: data.targetLang,
                label: data.label,
                category: data.category || 'general',
                usageCount: 1,
                lastUsedAt: new Date()
            });

            console.log(`✓ Phrase saved: ${phrase.id}`);
            return phrase;
        } catch (error) {
            console.error('Error saving phrase:', error);
            throw error;
        }
    }

    /**
     * Get user's saved phrases
     */
    async getSavedPhrases(userId, options = {}) {
        const { page = 1, limit = 50, category, search } = options;
        const offset = (page - 1) * limit;

        try {
            const where = { userId };

            if (category) where.category = category;

            if (search) {
                where[Op.or] = [
                    { originalText: { [Op.iLike]: `%${search}%` } },
                    { translatedText: { [Op.iLike]: `%${search}%` } },
                    { label: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const { count, rows } = await SavedPhrase.findAndCountAll({
                where,
                order: [['usage_count', 'DESC'], ['last_used_at', 'DESC']],
                limit,
                offset
            });

            return {
                phrases: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting saved phrases:', error);
            throw error;
        }
    }

    /**
     * Update a saved phrase
     */
    async updatePhrase(id, userId, updates) {
        try {
            const phrase = await SavedPhrase.findOne({
                where: { id, userId }
            });

            if (!phrase) {
                throw new Error('Phrase not found');
            }

            if (updates.label !== undefined) phrase.label = updates.label;
            if (updates.category !== undefined) phrase.category = updates.category;

            await phrase.save();

            console.log(`✓ Phrase updated: ${id}`);
            return phrase;
        } catch (error) {
            console.error('Error updating phrase:', error);
            throw error;
        }
    }

    /**
     * Delete a saved phrase
     */
    async deletePhrase(id, userId) {
        try {
            const result = await SavedPhrase.destroy({
                where: { id, userId }
            });

            if (result === 0) {
                throw new Error('Phrase not found');
            }

            console.log(`✓ Phrase deleted: ${id}`);
            return true;
        } catch (error) {
            console.error('Error deleting phrase:', error);
            throw error;
        }
    }

    /**
     * Get translation statistics for a user
     */
    async getStats(userId) {
        try {
            const totalTranslations = await TranslationHistory.count({
                where: { userId }
            });

            const totalFavorites = await TranslationHistory.count({
                where: { userId, isFavorite: true }
            });

            const totalSavedPhrases = await SavedPhrase.count({
                where: { userId }
            });

            const totalCharacters = await TranslationHistory.sum('character_count', {
                where: { userId }
            });

            // Get language pair stats
            const languagePairs = await TranslationHistory.findAll({
                where: { userId },
                attributes: [
                    'sourceLang',
                    'targetLang',
                    [TranslationHistory.sequelize.fn('COUNT', '*'), 'count']
                ],
                group: ['sourceLang', 'targetLang'],
                order: [[TranslationHistory.sequelize.literal('count'), 'DESC']],
                limit: 5,
                raw: true
            });

            // Get translations by source
            const bySource = await TranslationHistory.findAll({
                where: { userId },
                attributes: [
                    'source',
                    [TranslationHistory.sequelize.fn('COUNT', '*'), 'count']
                ],
                group: ['source'],
                raw: true
            });

            return {
                totalTranslations,
                totalFavorites,
                totalSavedPhrases,
                totalCharacters: totalCharacters || 0,
                topLanguagePairs: languagePairs,
                translationsBySource: bySource
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
}

module.exports = new HistoryService();
