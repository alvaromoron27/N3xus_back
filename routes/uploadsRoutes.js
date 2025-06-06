const express = require('express');
const router = express.Router();
const { upload } = require('../config/multer');
const uploadController = require('../controllers/uploadController');

router.post('/upload-avatar', upload.single('avatar'), uploadController.uploadAvatar);

module.exports = router;