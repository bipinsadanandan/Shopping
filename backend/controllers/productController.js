const db = require('../config/database');
const { asyncHandler, paginate, formatPrice } = require('../utils/helpers');

const getAllProducts = asyncHandler(async (req, res) => {
  const { 
    category, 
    minPrice, 
    maxPrice, 
    search, 
    sortBy = 'created_at', 
    order = 'DESC',
    page = 1,
    limit = 10
  } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
  const params = [];
  const countParams = [];

  // Add filters
  if (category) {
    const categoryFilter = ' AND category = ?';
    query += categoryFilter;
    countQuery += categoryFilter;
    params.push(category);
    countParams.push(category);
  }

  if (minPrice) {
    const minPriceFilter = ' AND price >= ?';
    query += minPriceFilter;
    countQuery += minPriceFilter;
    params.push(minPrice);
    countParams.push(minPrice);
  }

  if (maxPrice) {
    const maxPriceFilter = ' AND price <= ?';
    query += maxPriceFilter;
    countQuery += maxPriceFilter;
    params.push(maxPrice);
    countParams.push(maxPrice);
  }

  if (search) {
    const searchFilter = ' AND (name LIKE ? OR description LIKE ?)';
    query += searchFilter;
    countQuery += searchFilter;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern);
  }

  // Add sorting
  const allowedSortFields = ['price', 'created_at', 'name', 'stock_quantity'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // Add pagination
  const { limit: pageSize, offset } = paginate(page, limit);
  query += ' LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  // Execute queries
  const [products, countResult] = await Promise.all([
    db.all(query, params),
    db.get(countQuery, countParams)
  ]);

  // Get ratings for products
  const productIds = products.map(p => p.id);
  const ratings = productIds.length > 0 ? await db.all(
    `SELECT product_id, AVG(rating) as avgRating, COUNT(*) as reviewCount 
     FROM reviews 
     WHERE product_id IN (${productIds.map(() => '?').join(',')})
     GROUP BY product_id`,
    productIds
  ) : [];

  // Map ratings to products
  const ratingsMap = ratings.reduce((acc, r) => {
    acc[r.product_id] = { avgRating: r.avgRating, reviewCount: r.reviewCount };
    return acc;
  }, {});

  const productsWithRatings = products.map(product => ({
    ...product,
    price: formatPrice(product.price),
    avgRating: ratingsMap[product.id]?.avgRating || 0,
    reviewCount: ratingsMap[product.id]?.reviewCount || 0
  }));

  res.json({
    products: productsWithRatings,
    pagination: {
      page: parseInt(page),
      limit: pageSize,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / pageSize)
    }
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Get average rating and reviews
  const [ratingResult, reviews] = await Promise.all([
    db.get(
      'SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount FROM reviews WHERE product_id = ?',
      [req.params.id]
    ),
    db.all(
      `SELECT r.*, u.username 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC 
       LIMIT 5`,
      [req.params.id]
    )
  ]);

  res.json({
    ...product,
    price: formatPrice(product.price),
    avgRating: ratingResult.avgRating || 0,
    reviewCount: ratingResult.reviewCount || 0,
    recentReviews: reviews
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock_quantity, category, image_url } = req.body;

  const result = await db.run(
    `INSERT INTO products (name, description, price, stock_quantity, category, image_url) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, price, stock_quantity, category, image_url]
  );

  const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.id]);

  res.status(201).json({
    message: 'Product created successfully',
    product: {
      ...newProduct,
      price: formatPrice(newProduct.price)
    }
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if product exists
  const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Build dynamic update query
  const allowedFields = ['name', 'description', 'price', 'stock_quantity', 'category', 'image_url'];
  const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  
  const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  
  await db.run(query, values);

  const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);

  res.json({
    message: 'Product updated successfully',
    product: {
      ...updatedProduct,
      price: formatPrice(updatedProduct.price)
    }
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product is in any active carts
  const activeCartItems = await db.get(
    `SELECT COUNT(*) as count 
     FROM cart_items ci 
     JOIN carts c ON ci.cart_id = c.id 
     WHERE ci.product_id = ? AND c.status = 'active'`,
    [id]
  );

  if (activeCartItems.count > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete product that is in active carts' 
    });
  }

  const result = await db.run('DELETE FROM products WHERE id = ?', [id]);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json({ message: 'Product deleted successfully' });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await db.all(
    `SELECT DISTINCT category, COUNT(*) as count 
     FROM products 
     WHERE category IS NOT NULL 
     GROUP BY category 
     ORDER BY count DESC`
  );

  res.json({ categories });
});

const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ products: [] });
  }

  const products = await db.all(
    `SELECT id, name, price, image_url 
     FROM products 
     WHERE name LIKE ? OR description LIKE ? 
     LIMIT 10`,
    [`%${q}%`, `%${q}%`]
  );

  res.json({ 
    products: products.map(p => ({
      ...p,
      price: formatPrice(p.price)
    }))
  });
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  searchProducts
};
