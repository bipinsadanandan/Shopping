const db = require('../config/database');
const { asyncHandler } = require('../utils/helpers');

const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  // Check if product exists
  const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Get reviews with user info
  const [reviews, countResult] = await Promise.all([
    db.all(`
      SELECT r.*, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, parseInt(limit), offset]),
    db.get(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    )
  ]);

  // Get rating distribution
  const distribution = await db.all(`
    SELECT rating, COUNT(*) as count
    FROM reviews
    WHERE product_id = ?
    GROUP BY rating
  `, [productId]);

  const ratingDistribution = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  };
  distribution.forEach(d => {
    ratingDistribution[d.rating] = d.count;
  });

  res.json({
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / limit)
    },
    ratingDistribution
  });
});

const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  // Check if product exists
  const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Check if user has purchased this product
  const hasPurchased = await db.get(`
    SELECT 1
    FROM orders o
    JOIN cart_items ci ON o.cart_id = ci.cart_id
    WHERE o.user_id = ? AND ci.product_id = ? AND o.status = 'delivered'
  `, [userId, productId]);

  if (!hasPurchased) {
    return res.status(403).json({ 
      error: 'You must purchase and receive this product before reviewing' 
    });
  }

  // Check if already reviewed
  const existingReview = await db.get(
    'SELECT * FROM reviews WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );

  if (existingReview) {
    return res.status(400).json({ 
      error: 'You have already reviewed this product' 
    });
  }

  // Create review
  const result = await db.run(
    'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
    [productId, userId, rating, comment]
  );

  const newReview = await db.get(
    `SELECT r.*, u.username 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.id = ?`,
    [result.id]
  );

  res.status(201).json({ 
    message: 'Review created successfully',
    review: newReview
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  // Check if review exists and belongs to user
  const review = await db.get(
    'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  // Update review
  await db.run(
    'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
    [rating, comment, id]
  );

  const updatedReview = await db.get(
    `SELECT r.*, u.username 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.id = ?`,
    [id]
  );

  res.json({ 
    message: 'Review updated successfully',
    review: updatedReview
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Admin can delete any review, users can delete their own
  let query = 'DELETE FROM reviews WHERE id = ?';
  const params = [id];

  if (req.user.role !== 'admin') {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  const result = await db.run(query, params);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({ message: 'Review deleted successfully' });
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview
};