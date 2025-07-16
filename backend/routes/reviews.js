const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateReview, validatePagination, validateId } = require('../middleware/validation');

// Public routes
router.get('/products/:productId', validateId, validatePagination, reviewController.getProductReviews);

// Protected routes
router.post('/products/:productId', authMiddleware, validateId, validateReview, reviewController.createReview);
router.put('/:id', authMiddleware, validateId, validateReview, reviewController.updateReview);
router.delete('/:id', authMiddleware, validateId, reviewController.deleteReview);

module.exports = router;