// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateOrder, validatePagination, validateId } = require('../middleware/validation');

// User routes
router.use(authMiddleware);
router.post('/', validateOrder, orderController.createOrder);
router.get('/', validatePagination, orderController.getOrders);
router.get('/:id', validateId, orderController.getOrderById);
router.post('/:id/cancel', validateId, orderController.cancelOrder);

// Admin routes
router.get('/analytics/summary', adminMiddleware, orderController.getOrderAnalytics);
router.put('/:id/status', adminMiddleware, validateId, orderController.updateOrderStatus);

module.exports = router;