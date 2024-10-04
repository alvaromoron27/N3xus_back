const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/resend-confirmation', authController.resendConfirmation);
router.post('/login', authController.login);
router.post('/reset', authController.reset);
router.post('/reset-password', authController.resetPassword);
router.post('/confirm-account', authController.confirmAccount);
router.delete('/delete-account', authController.deleteAccount);

module.exports = router;