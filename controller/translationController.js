
let translate;


try {
 
    translate = require('@vitalets/google-translate-api');
    if (!translate || typeof translate !== 'function') {
        translate = require('@vitalets/google-translate-api').default;
    }
    if (!translate || typeof translate !== 'function') {
        translate = require('@vitalets/google-translate-api').translate;
    }
} catch (err) {
    console.error('Error importing translate function:', err);
}

async function handleTranslate(req, res) {
    try {
        const { text, targetLang } = req.body;

        if (!text || !targetLang) {
            return res.status(400).json({ message: 'Text and target language are required' });
        }
        if (text.length > 5000) {
            return res.status(400).json({ message: 'Text is too long. Maximum 5000 characters allowed.' });
        }

        if (!translate || typeof translate !== 'function') {
            console.error('Translate function is not available');
            return res.status(500).json({ message: 'Translation service not available. Please check server configuration.' });
        }

        console.log(`Translating: "${text}" to language: ${targetLang}`);

        const result = await translate(text, { to: targetLang });

        console.log(`Translation result: "${result.text}"`);

        res.json({ 
            translatedText: result.text,
            detectedLanguage: result.from?.language?.iso || 'unknown'
        });
    } catch (err) {
        console.error('Translation error:', err);
        
      
        if (err.message.includes('400')) {
            res.status(400).json({ message: 'Invalid translation request. Please check your input.' });
        } else if (err.message.includes('429')) {
            res.status(429).json({ message: 'Too many requests. Please wait a moment and try again.' });
        } else if (err.message.includes('503')) {
            res.status(503).json({ message: 'Translation service temporarily unavailable. Please try again later.' });
        } else {
            res.status(500).json({ message: 'Translation failed. Please try again.' });
        }
    }
}

module.exports = { handleTranslate };