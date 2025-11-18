const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const translate = require('google-translate-api-x');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls'];

// Multer storage
const storage = multer.diskStorage({
    destination(req, file, cb) {
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        cb(null, UPLOAD_DIR);
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowedTypes.includes(ext) ? null : new Error('Invalid file type'), allowedTypes.includes(ext));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Extract text
async function extractText(filePath, fileType) {
    try {
        switch (fileType) {
            case '.pdf': {
                const data = await fs.promises.readFile(filePath);
                const parsed = await pdfParse(data);
                return parsed.text;
            }
            case '.docx': {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            }
            case '.txt':
                return fs.promises.readFile(filePath, 'utf8');
            case '.xlsx':
            case '.xls': {
                const workbook = xlsx.readFile(filePath);
                return workbook.SheetNames
                    .map(name => xlsx.utils.sheet_to_csv(workbook.Sheets[name]))
                    .join('\n');
            }
            default:
                throw new Error('Unsupported file type');
        }
    } catch (err) {
        throw new Error(`Error extracting text: ${err.message}`);
    }
}

// Handle upload
async function handleFileUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const targetLang = req.body.targetLang?.trim();
        if (!targetLang) {
            await fs.promises.unlink(req.file.path);
            return res.status(400).json({ message: 'Target language is required' });
        }

        const filePath = req.file.path;
        const fileType = path.extname(req.file.originalname).toLowerCase();

        const extractedText = await extractText(filePath, fileType);

        if (!extractedText?.trim()) {
            await fs.promises.unlink(filePath);
            return res.status(400).json({ message: 'No text found in the file' });
        }

        const translated = await translate(extractedText, { to: targetLang });

        await fs.promises.unlink(filePath);

        res.json({
            success: true,
            originalText: extractedText,
            translatedText: translated.text,
            detectedLanguage: translated.from?.language?.iso || 'unknown',
            fileName: req.file.originalname
        });

    } catch (error) {
        console.error('File upload error:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            await fs.promises.unlink(req.file.path);
        }

        res.status(500).json({ message: error.message || 'Error processing file' });
    }
}

module.exports = { upload, handleFileUpload };
