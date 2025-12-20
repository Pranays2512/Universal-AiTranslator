// Provide manual mock implementations so tests don't require actual optional deps
// We'll mock optional parser and translation modules using `doMock` before
// requiring the controller so that the controller's lazy requires pick up our
// mocks when running each test.
const fs = require('fs');

describe.skip('fileUploadController.handleFileUpload', () => {
  let req, res;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Provide harmless mocks for filesystem operations
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
    jest.spyOn(fs.promises, 'readFile').mockImplementation(async (path, enc) => {
      if (enc === 'utf8') return 'plain text';
      return Buffer.from('pdf buffer');
    });

    req = { body: {}, file: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('returns 400 if no file uploaded', async () => {
    // Require controller without mocking parsers - not needed for this case
    const { handleFileUpload } = require('../../controller/fileUploadController.js');

    await handleFileUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No file uploaded' });
  });

  it('returns 400 if targetLang missing and cleans up file', async () => {
    const { handleFileUpload } = require('../../controller/fileUploadController.js');

    req.file = { path: '/tmp/file.txt', originalname: 'file.txt' };

    await handleFileUpload(req, res);

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/file.txt');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Target language is required' });
  });

  it('processes .txt files and returns translation', async () => {
    // mock translator
    jest.doMock('google-translate-api-x', () => jest.fn().mockResolvedValue({ text: 'Hola', from: { language: { iso: 'en' } } }));

    const { handleFileUpload } = require('../../controller/fileUploadController.js');

    req.file = { path: '/tmp/file.txt', originalname: 'file.txt' };
    req.body = { targetLang: 'es' };

    await handleFileUpload(req, res);

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/file.txt');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      translatedText: 'Hola',
      fileName: 'file.txt'
    }));
  });

  // Note: some optional parser modules (pdf-parse, mammoth, xlsx) are not
  // installed in this environment; attempting to process their file types
  // will result in an extraction error. Ensure the controller handles this
  // gracefully and cleans up uploaded files.

  it('handles extraction errors for unsupported/missing parser modules and returns 500', async () => {
    // Do not mock pdf-parse; in this environment the module is absent and will
    // cause extraction to fail when required inside the controller.
    const { handleFileUpload } = require('../../controller/fileUploadController.js');

    req.file = { path: '/tmp/file.pdf', originalname: 'file.pdf' };
    req.body = { targetLang: 'es' };

    await handleFileUpload(req, res);

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/file.pdf');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });
});
