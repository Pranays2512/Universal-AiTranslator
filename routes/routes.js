const express = require('express');
const router = express.Router();
const path = require('path');
const {checkSignUp,checkSignIn,checkUser} = require('../middleware/middleware.js');
const {handleTranslate} = require('../controller/translationController.js');
const {signUp,signIn} = require('../controller/controller.js');
const {upload, handleFileUpload} = require('../controller/fileUploadController.js');

router.post('/signup',checkSignUp,signUp);
router.post('/sign-in',checkSignIn,signIn);
router.post('/translate', checkUser, handleTranslate);
router.post('/translate-file', checkUser, upload.single('file'), handleFileUpload);
    
module.exports = router;