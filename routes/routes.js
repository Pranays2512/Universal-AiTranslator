const express = require('express');
const router = express.Router();
const path = require('path');
const {checkSignUp,checkSignIn,checkUser} = require('../middleware/middleware.js');
const {handleTranslate} = require('../controller/translationController.js');
const {signUp,signIn} = require('../controller/controller.js');


router.post('/signup',checkSignUp,signUp);
router.post('/sign-in',checkSignIn,signIn);
router.post('/translate', checkUser, handleTranslate);
    

module.exports = router;