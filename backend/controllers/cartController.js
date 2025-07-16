const db = require('../config/database');
const { asyncHandler, formatPrice, calculateOrderTotal } = require('../utils/helpers');

const getCart = asyncHandler(async (req, res) => {
  // Get active cart for user
  let cart = await db.get(
    'SELECT * FROM carts WHERE user_id = ? AND status = ?',
    [req.user.id, 'active']
  );

  // Create cart if doesn't exist
  if (!cart) {
    const result = await db.run(
      'INSERT INTO carts (user_id) VALUES (?)',
      [req.user.id]
    );
    cart = { id: result.id, user_id: req.user.id, status: 'active' };
  }

  // Get cart items with product details
  const items = await db.all(`
    SELECT 
      ci.id,
      ci.quantity,
      ci.price_at_time,
      p.id as product_id,
      p.name,
      p.description,
      p.price as current_price,
      p.stock_quantity,
      p.image_url,
      p.category
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at DESC
  `, [cart.id]);

  // Calculate totals
  const subtotal = calculateOrderTotal(items);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  res.json({
    cart: {
      id: cart.id,
      status: cart.status,
      items: items.map(item => ({
        ...item,
        price_at_time: formatPrice(item.price_at_time),
        current_price: formatPrice(item.current_price),
        subtotal: formatPrice(item.price_at_time * item.quantity)
      })),
      subtotal: formatPrice(subtotal),
      tax: formatPrice(tax),
      total: formatPrice(total),
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
});

const addToCart = asyncHandler(async (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  // Get product details
  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (product.stock_quantity < quantity) {
    return res.status(400).json({ 
      error: 'Insufficient stock',
      available: product.stock_quantity 
    });
  }

  // Get or create active cart
  let cart = await db.get(
    'SELECT * FROM carts WHERE user_id = ? AND status = ?',
    [req.user.id, 'active']
  );

  if (!cart) {
    const result = await db.run(
      'INSERT INTO carts (user_id) VALUES (?)',
      [req.user.id]
    );
    cart = { id: result.id };
  }

  // Check if item already in cart
  const existingItem = await db.get(
    'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
    [cart.id, product_id]
  );

  if (existingItem) {
    // Check stock for updated quantity
    const newQuantity = existingItem.quantity + quantity;
    if (product.stock_quantity < newQuantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock for updated quantity',
        available: product.stock_quantity,
        inCart: existingItem.quantity
      });
    }

    // Update quantity
    await db.run(
      'UPDATE cart_items SET quantity = ?, price_at_time = ? WHERE id = ?',
      [newQuantity, product.price, existingItem.id]
    );

    res.json({ 
      message: 'Cart updated successfully',
      cartItemId: existingItem.id,
      newQuantity 
    });
  } else {
    // Add new item
    const result = await db.run(
      'INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
      [cart.id, product_id, quantity, product.price]
    );

    res.json({ 
      message: 'Item added to cart successfully',
      cartItemId: result.id 
    });
  }
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  // Get cart item with product info
  const item = await db.get(`
    SELECT ci.*, p.stock_quantity, p.price, c.user_id
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN carts c ON ci.cart_id = c.id
    WHERE ci.id = ?
  `, [id]);

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  // Verify ownership
  if (item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Check stock
  if (item.stock_quantity < quantity) {
    return res.status(400).json({ 
      error: 'Insufficient stock',
      available: item.stock_quantity 
    });
  }

  // Update quantity and price
  await db.run(
    'UPDATE cart_items SET quantity = ?, price_at_time = ? WHERE id = ?',
    [quantity, item.price, id]
  );

  res.json({ message: 'Cart item updated successfully' });
});

const removeFromCart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const item = await db.get(`
    SELECT ci.*, c.user_id
    FROM cart_items ci
    JOIN carts c ON ci.cart_id = c.id
    WHERE ci.id = ?
  `, [id]);

  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  if (item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Delete item
  await db.run('DELETE FROM cart_items WHERE id = ?', [id]);

  res.json({ message: 'Item removed from cart' });
});

const clearCart = asyncHandler(async (req, res) => {
  // Get active cart
  const cart = await db.get(
    'SELECT * FROM carts WHERE user_id = ? AND status = ?',
    [req.user.id, 'active']
  );

  if (!cart) {
    return res.status(404).json({ error: 'No active cart found' });
  }

  // Delete all items
  await db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);

  res.json({ message: 'Cart cleared successfully' });
});

const saveForLater = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // This would be implemented with a separate saved_items table
  // For now, we'll just remove from cart
  await removeFromCart(req, res);
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  saveForLater
};