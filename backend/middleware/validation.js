// backend/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateProduct = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 })
    .withMessage('Product name too long')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description too long')
    .trim()
    .escape(),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock_quantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category too long')
    .trim()
    .escape(),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Must be a valid URL'),
  handleValidationErrors
];

const validateCartItem = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

const validateCartUpdate = [
  param('id')
    .isInt()
    .withMessage('Valid cart item ID required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

const validateOrder = [
  body('shipping_address')
    .notEmpty()
    .withMessage('Shipping address is required')
    .isLength({ max: 500 })
    .withMessage('Shipping address too long')
    .trim()
    .escape(),
  body('payment_method')
    .isIn(['credit_card', 'debit_card', 'paypal', 'stripe'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment too long')
    .trim()
    .escape(),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateProductFilters = [
  query('minPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Min price must be non-negative'),
  query('maxPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Max price must be non-negative'),
  query('category')
    .optional({ checkFalsy: true })
    .trim()
    .escape(),
  query('search')
    .optional({ checkFalsy: true })
    .trim()
    .escape(),
  query('sortBy')
    .optional({ checkFalsy: true })
    .isIn(['price', 'name', 'created_at'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional({ checkFalsy: true })
    .isIn(['ASC', 'DESC'])
    .withMessage('Order must be ASC or DESC'),
  handleValidationErrors
];

const validateId = [
  param('id')
    .isInt()
    .withMessage('Valid ID required'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProduct,
  validateCartItem,
  validateCartUpdate,
  validateOrder,
  validateReview,
  validatePagination,
  validateProductFilters,
  validateId
};