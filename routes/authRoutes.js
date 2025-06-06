const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require('../config/multer');

router.post('/register', authController.register);
router.post('/resend-confirmation', authController.resendConfirmation);
router.post('/login', authController.login);
router.post('/reset', authController.reset);
router.get("/verify-reset-token/:token", authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);
router.post('/confirm-account', authController.confirmAccount);
router.post('/edit-username', authController.editUsername);
router.post('/edit-name', authController.editName);
router.post('/edit-surname', authController.editSurname);
router.post('/edit-email', authController.editEmail);
router.delete('/delete-account', authController.deleteAccount);

module.exports = router;