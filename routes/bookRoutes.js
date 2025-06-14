const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { upload } = require('../config/multer');

router.post('/addBook', upload.single('portada'), bookController.addBook);
router.post('/editBook/:book_id', upload.single('portada'), bookController.editBook);
router.post('/save-book', bookController.saveBook);
router.post('/add-comment', bookController.addComment);
router.post('/add-reply', bookController.addReply);
router.get('/get-replies', bookController.getReplies);
router.get('/get-comments/:bookId', bookController.getComments);
router.get('/getSavedBooks/:user_id', bookController.getSavedBooks);
router.get('/allBooks', bookController.getAllBooks);
router.get('/newsBooks', bookController.getNewBooks);
router.get('/booksByCategory', bookController.getBooksByCategory);
router.get('/getBooksByUser/:user_id', bookController.getBooksByUser);
router.delete('/deleteSavedBook', bookController.deleteSavedBook);
router.delete('/deleteBook/:book_id', bookController.deleteBook);

module.exports = router;
