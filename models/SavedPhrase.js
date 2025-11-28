const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SavedPhrase = sequelize.define('SavedPhrase', {
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
        field: 'source_lang'
    },
    targetLang: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'target_lang'
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(50),
        defaultValue: 'general'
    },
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'usage_count'
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_used_at'
    }
}, {
    tableName: 'saved_phrases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['category']
        },
        {
            fields: ['usage_count']
        }
    ]
});

module.exports = SavedPhrase;
