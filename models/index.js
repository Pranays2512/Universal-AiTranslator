const { sequelize } = require('../config/database');
const TranslationHistory = require('./TranslationHistory');
const SavedPhrase = require('./SavedPhrase');

// Define associations if needed
// TranslationHistory.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    TranslationHistory,
    SavedPhrase
};
