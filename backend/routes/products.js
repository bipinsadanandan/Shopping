// backend/routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');
const { 
  validateProduct, 
  validatePagination, 
  validateProductFilters,
  validateId 
} = require('../middleware/validation');

// Public routes - Apply validation separately to handle optional parameters
router.get('/', validatePagination, validateProductFilters, productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', validateId, optionalAuth, productController.getProductById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, validateProduct, productController.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, validateId, validateProduct, productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, validateId, productController.deleteProduct);

module.exports = router;