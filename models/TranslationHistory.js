const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TranslationHistory = sequelize.define('TranslationHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_id'
    },
    originalText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'original_text'
    },
    translatedText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'translated_text'
    },
    sourceLang: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'auto',
        field: 'source_lang'
    },
    targetLang: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'target_lang'
    },
    detectedLang: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'detected_lang'
    },
    isFavorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_favorite'
    },
    source: {
        type: DataTypes.ENUM('text', 'file', 'image', 'speech'),
        defaultValue: 'text'
    },
    characterCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'character_count'
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
}, {
    tableName: 'translation_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['is_favorite']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['source_lang', 'target_lang']
        }
    ]
});

module.exports = TranslationHistory;
