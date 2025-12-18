Universal Translator
Universal Translator is a web-based application that allows users to translate text between multiple languages in real-time. The app includes user authentication and stores user accounts securely in a PostgreSQL database using Prisma ORM.

Features
User authentication: Sign up and Sign in.

Secure storage of user credentials.

Text translation between multiple languages.

Auto-detect source language.

Real-time translation with a simple and clean interface.

Copy translations to clipboard.

Word count for input text.

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

npx prisma migrate dev --name init

Start the server:

npm start

Open your browser and go to:

http://localhost:3000

Testing
Run tests:

npm test

Run tests in watch mode:

npm run test:watch

Run only unit tests:

npm run test:unit

Run only integration tests:

npm run test:integration

For more details, see [TESTING.md](TESTING.md)

Usage
Sign up for a new account or sign in if you already have one.

Enter text in the "Source Text" panel.

Select source and target languages.

Click Translate to get the translation in the output panel.

Copy the translation if needed.

Folder Structure
Translator/
├── controller/         # Backend logic for routes
├── middleware/         # Authentication and middleware
├── routes/             # Express routes
├── prisma/             # Prisma schema and migrations
├── public/             # Static frontend files (HTML, CSS, JS)
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

Add user history of translations.

Implement password reset functionality.

Configuration Files
✅ jest.config.js - Jest configuration
✅ jest.setup.js - Test environment setup
✅ .env.test - Test environment variables
✅ package.json - Updated with test scripts and dependencies
Unit Tests (unit)
cacheService.test.js - Cache operations
historyService.test.js - History service
translationController.test.js - Translation controller
fileUploadController.test.js - File upload handling
historyController.test.js - History controller
middleware.test.js - Authentication middleware
controller.test.js - User auth (signup/signin)
translationQueue.test.js - Queue operations
pubsubService.test.js - Pub/sub messaging
socketHandler.test.js - WebSocket handling
commonPhrases.test.js - Configuration
environment.test.js - Environment validation

Integration Tests (integration)
routes.test.js - API endpoints
health.test.js - Health checks
cache.test.js - Cache API
E2E Tests (e2e)
userFlow.test.js - Complete user workflows
Helper Files
testUtils.js - Reusable test utilities
mockFactory.js - Mock data generators
Scripts
test.js - Custom test runner
Documentation
TESTING.md - Testing guide
TEST_COVERAGE.md - Coverage report

npm test                  # Run all tests with coverage
npm run test:watch       # Run in watch mode
npm run test:unit        # Run only unit tests
npm run test:integration # Run only integration tests
node scripts/test.js -u  # Custom test runner for unit tests