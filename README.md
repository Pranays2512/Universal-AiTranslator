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