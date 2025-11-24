Universal Translator
Universal Translator is a web-based application that allows users to translate text between multiple languages in real-time. The app includes user authentication and stores user accounts securely in a PostgreSQL database using Prisma ORM.

Features
User authentication: Sign up and Sign in.

Secure storage of user credentials.

Text translation between multiple languages.

Auto-detect source language.

Real-time translation with a simple and clean interface.

**Translation History**: Automatically stores all past translations in the database.

**Saved Translations**: Bookmark and save frequently used phrases for quick access.

Copy translations to clipboard.

Word count for input text.

OCR support: Extract text from images and translate.

WebSocket support: Real-time translation updates.

Redis caching: Fast translation retrieval for cached results.

Technologies Used
Frontend: HTML, CSS, JavaScript

Backend: Node.js, Express.js

Database: PostgreSQL

ORM: Prisma

Translation API: @vitalets/google-translate-api

Installation
Clone this repository:

git clone [https://github.com/](https://github.com/)<your-username>/UniversalTranslator.git
cd UniversalTranslator

Install dependencies:

npm install

Set up PostgreSQL and create a database (e.g., translator_app).

Create a .env file in the root with:

DATABASE_URL="postgres://username:password@localhost:5432/translator_app"

Generate Prisma client:

npx prisma generate

Run database migrations (if any):

npx prisma migrate deploy

Or for development:

npx prisma migrate dev

Start the server:

npm start

Open your browser and go to:

http://localhost:3000

Usage
Sign up for a new account or sign in if you already have one.

Enter text in the "Source Text" panel.

Select source and target languages.

Click Translate to get the translation in the output panel.

Copy the translation if needed.

**View Translation History**: Click the "📜 History" button to see all your past translations.

**Save Favorite Translations**: Click the ⭐ button (appears after translation) to bookmark frequently used phrases.

**Access Saved Translations**: Click the "⭐ Saved" button to view and manage your saved translations.

Upload images with text for OCR extraction and translation.

Folder Structure
Translator/
├── controller/         # Backend logic for routes
│   ├── controller.js           # User authentication
│   ├── translationController.js # Translation operations
│   ├── historyController.js     # Translation history & saved translations
│   └── fileUploadController.js  # File upload handling
├── middleware/         # Authentication and middleware
├── routes/             # Express routes
├── prisma/             # Prisma schema and migrations
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── public/             # Static frontend files (HTML, CSS, JS)
├── queue/              # Background job processing
├── services/           # Caching and pub/sub services
├── websocket/          # WebSocket handlers
├── config/             # Configuration files
├── node_modules/
├── .env                # Environment variables (not tracked)
├── server.js           # Main server entry point
├── package.json
└── README.md

License
This project is open-source and free to use under the MIT License.

Future Improvements
Improve translation accuracy using advanced models.

Add support for audio input and output.

Implement password reset functionality.

Add export functionality for translation history.

Support for bulk translations.

Translation quality ratings and feedback.