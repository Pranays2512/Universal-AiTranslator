const express = require('express');
const router = express.Router();
const { checkUser } = require('../middleware/middleware');
const {
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
} = require('../controller/historyController');

// History routes
router.get('/', checkUser, getHistory);
router.get('/favorites', checkUser, getFavorites);
router.get('/stats', checkUser, getStats);
router.get('/:id', checkUser, getTranslation);
router.patch('/:id/favorite', checkUser, toggleFavorite);
router.delete('/:id', checkUser, deleteTranslation);
router.delete('/', checkUser, clearHistory);

// Saved phrases routes
router.post('/phrases', checkUser, savePhrase);
router.get('/phrases/all', checkUser, getSavedPhrases);
router.patch('/phrases/:id', checkUser, updatePhrase);
router.delete('/phrases/:id', checkUser, deletePhrase);

module.exports = router;
