const path = require('path');
const fs = require('fs');

// Multer is optional for some test environments; try to require it but fall back
// to a no-op stub if it's not available so importing this module doesn't throw.
let upload;
try {
    const multer = require('multer');

    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, XLS, XLSX are allowed.'));
        }
    };

    upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });
} catch (e) {
    // Provide a minimal stub so tests and environments without multer don't break
    upload = { single: () => (req, res, next) => next() };
}
// NOTE: optional heavy parser modules are required lazily inside extractText to
// avoid throwing at module import time if they are not installed (e.g., during
// some test environments). This keeps the module robust and easier to test.

// (multer storage and filter configuration are created above when multer is available)

// `upload` is either the real multer instance or a no-op stub defined above

// Extract text from different file types
async function extractText(filePath, fileType) {
    try {
        switch (fileType) {
            case '.pdf':
                    // Lazy require to avoid module resolution at import time
                    const pdfParse = require('pdf-parse');
                    const pdfData = await fs.promises.readFile(filePath);
                    const pdfResult = await pdfParse(pdfData);
                    return pdfResult.text;

            case '.docx':
                // Lazy require
                const mammoth = require('mammoth');
                const docxResult = await mammoth.extractRawText({ path: filePath });
                return docxResult.value;

            case '.txt':
                return await fs.promises.readFile(filePath, 'utf8');

            case '.xlsx':
            case '.xls':
                // Lazy require
                const xlsx = require('xlsx');
                const workbook = xlsx.readFile(filePath);
                let text = '';
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += xlsx.utils.sheet_to_csv(sheet) + '\n';
                });
                return text;

            default:
                throw new Error('Unsupported file type');
        }
    } catch (error) {
        throw new Error(`Error extracting text: ${error.message}`);
    }
}

// Handle file upload and translation
async function handleFileUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { targetLang } = req.body;
        if (!targetLang) {
            fs.unlinkSync(req.file.path); // Clean up uploaded file
            return res.status(400).json({ message: 'Target language is required' });
        }

        const filePath = req.file.path;
        const fileType = path.extname(req.file.originalname).toLowerCase();

        console.log(`Processing file: ${req.file.originalname}`);

        // Extract text from file
        const extractedText = await extractText(filePath, fileType);

        if (!extractedText || extractedText.trim().length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'No text found in the file' });
        }

        console.log(`Extracted ${extractedText.length} characters`);

        // Translate the extracted text
        const translate = require('google-translate-api-x');
        const translationResult = await translate(extractedText, { to: targetLang });

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            originalText: extractedText,
            translatedText: translationResult.text,
            detectedLanguage: translationResult.from?.language?.iso || 'unknown',
            fileName: req.file.originalname
        });

    } catch (error) {
        console.error('File upload error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            message: error.message || 'Error processing file' 
        });
    }
}

module.exports = { upload, handleFileUpload };