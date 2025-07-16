const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');
const { validateCartItem, validateCartUpdate, validateId } = require('../middleware/validation');

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/items', validateCartItem, cartController.addToCart);
router.put('/items/:id', validateCartUpdate, cartController.updateCartItem);
router.delete('/items/:id', validateId, cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.post('/items/:id/save-for-later', validateId, cartController.saveForLater);

module.exports = router;