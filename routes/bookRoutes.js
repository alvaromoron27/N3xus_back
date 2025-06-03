const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.post('/addBook', bookController.addBook);
router.post('/editBook/:book_id', bookController.editBook);
router.post('/save-book', bookController.saveBook);
router.get('/getSavedBooks/:user_id', bookController.getSavedBooks);
router.get('/allBooks', bookController.getAllBooks);
router.get('/newsBooks', bookController.getNewBooks);
router.get('/booksByCategory', bookController.getBooksByCategory);
router.get('/getBooksByUser/:user_id', bookController.getBooksByUser);
router.delete('/deleteSavedBook', bookController.deleteSavedBook);
router.delete('/deleteBook/:book_id', bookController.deleteBook);

module.exports = router;
