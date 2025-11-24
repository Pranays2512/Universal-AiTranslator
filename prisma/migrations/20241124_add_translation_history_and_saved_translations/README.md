# Migration: Add Translation History and Saved Translations

## Date
2024-11-24

## Description
This migration adds support for storing translation history and saved/favorite translations in the database.

## Changes

### New Tables

1. **TranslationHistory**
   - Stores all translations performed by users
   - Automatically populated when translations are completed
   - Includes source text, translated text, and language pairs
   - Indexed on `userId` and `createdAt` for efficient querying

2. **SavedTranslation**
   - Stores user's favorite/saved translations
   - Allows users to bookmark frequently used phrases
   - Optional notes field for user annotations
   - Unique constraint on `(userId, sourceText, sourceLang, targetLang)` to prevent duplicates

### Schema Updates

- Updated `User` model to include relationships with TranslationHistory and SavedTranslation
- Added cascade delete: when a user is deleted, their history and saved translations are also deleted

## How to Apply

To apply this migration to your database:

```bash
npx prisma migrate deploy
```

Or for development with a fresh database:

```bash
npx prisma migrate dev
```

## API Endpoints

### Translation History
- `GET /api/history` - Get user's translation history (paginated)
- `DELETE /api/history/:id` - Delete a specific translation from history
- `DELETE /api/history` - Clear all translation history

### Saved Translations
- `GET /api/saved` - Get user's saved translations (paginated)
- `POST /api/saved` - Save a translation as favorite
- `DELETE /api/saved/:id` - Remove a saved translation
- `GET /api/saved/check` - Check if a translation is saved

## Features

1. **Automatic History Recording**: All translations are automatically saved to the database
2. **Favorites/Saved**: Users can bookmark frequently used translations
3. **Pagination**: Both history and saved translations support pagination
4. **Search & Filter**: Frontend UI allows browsing through history and saved items
5. **Quick Access**: Saved translations can be quickly accessed from the UI

## Testing

After applying the migration, verify:
1. Translations are being saved to the database
2. History endpoint returns translations
3. Save/unsave functionality works correctly
4. Pagination works for large datasets
5. Deleting history and saved items works as expected
