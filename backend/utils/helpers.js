const formatPrice = (price) => {
  return parseFloat(price).toFixed(2);
};

const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price_at_time * item.quantity);
  }, 0);
};

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const paginate = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset };
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  formatPrice,
  calculateOrderTotal,
  generateOrderNumber,
  validateEmail,
  sanitizeInput,
  paginate,
  asyncHandler
};