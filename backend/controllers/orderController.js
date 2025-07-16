const db = require('../config/database');
const emailService = require('../services/emailService');
const { asyncHandler, formatPrice, calculateOrderTotal, generateOrderNumber } = require('../utils/helpers');

const createOrder = asyncHandler(async (req, res) => {
  const { shipping_address, payment_method, notes } = req.body;

  // Get active cart
  const cart = await db.get(
    'SELECT * FROM carts WHERE user_id = ? AND status = ?',
    [req.user.id, 'active']
  );

  if (!cart) {
    return res.status(400).json({ error: 'No active cart found' });
  }

  // Get cart items
  const items = await db.all(`
    SELECT ci.*, p.price, p.stock_quantity, p.name
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
  `, [cart.id]);

  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Begin transaction
  await db.beginTransaction();

  try {
    // Validate stock and calculate total
    for (const item of items) {
      if (item.stock_quantity < item.quantity) {
        await db.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}`,
          available: item.stock_quantity,
          requested: item.quantity
        });
      }
    }

    const subtotal = calculateOrderTotal(items);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    // Create order
    const orderNumber = generateOrderNumber();
    const orderResult = await db.run(
      `INSERT INTO orders (user_id, cart_id, total_amount, subtotal, tax, shipping_address, payment_method, notes, order_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, cart.id, total, subtotal, tax, shipping_address, payment_method, notes, orderNumber]
    );

    // Update product stock
    for (const item of items) {
      await db.run(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Mark cart as completed
    await db.run(
      'UPDATE carts SET status = ? WHERE id = ?',
      ['completed', cart.id]
    );

    // Create new cart for user
    await db.run('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);

    // Commit transaction
    await db.commit();

    // Get user email
    const user = await db.get('SELECT email, username FROM users WHERE id = ?', [req.user.id]);

    // Send order confirmation email
    await emailService.sendOrderConfirmation(user.email, user.username, orderNumber, total, items);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: orderResult.id,
        orderNumber,
        total: formatPrice(total),
        subtotal: formatPrice(subtotal),
        tax: formatPrice(tax),
        status: 'pending',
        itemCount: items.length
      }
    });
  } catch (error) {
    await db.rollback();
    throw error;
  }
});

const getOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM orders WHERE user_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
  const params = [req.user.id];
  const countParams = [req.user.id];

  if (status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const [orders, countResult] = await Promise.all([
    db.all(query, params),
    db.get(countQuery, countParams)
  ]);

  // Get item counts for each order
  const orderIds = orders.map(o => o.cart_id);
  const itemCounts = orderIds.length > 0 ? await db.all(
    `SELECT cart_id, COUNT(*) as item_count, SUM(quantity) as total_quantity
     FROM cart_items 
     WHERE cart_id IN (${orderIds.map(() => '?').join(',')})
     GROUP BY cart_id`,
    orderIds
  ) : [];

  const countsMap = itemCounts.reduce((acc, count) => {
    acc[count.cart_id] = count;
    return acc;
  }, {});

  const ordersWithCounts = orders.map(order => ({
    ...order,
    total_amount: formatPrice(order.total_amount),
    subtotal: formatPrice(order.subtotal),
    tax: formatPrice(order.tax),
    itemCount: countsMap[order.cart_id]?.item_count || 0,
    totalQuantity: countsMap[order.cart_id]?.total_quantity || 0
  }));

  res.json({
    orders: ordersWithCounts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / limit)
    }
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Get order items
  const items = await db.all(`
    SELECT ci.*, p.name, p.price, p.image_url
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
  `, [order.cart_id]);

  res.json({
    order: {
      ...order,
      total_amount: formatPrice(order.total_amount),
      subtotal: formatPrice(order.subtotal),
      tax: formatPrice(order.tax),
      items: items.map(item => ({
        ...item,
        price_at_time: formatPrice(item.price_at_time),
        subtotal: formatPrice(item.price_at_time * item.quantity)
      }))
    }
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // For admin only - check order exists
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Update status
  await db.run(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id]
  );

  // If cancelled, restore stock
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items = await db.all(
      'SELECT * FROM cart_items WHERE cart_id = ?',
      [order.cart_id]
    );

    for (const item of items) {
      await db.run(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
  }

  res.json({ message: 'Order status updated successfully' });
});

const getOrderAnalytics = asyncHandler(async (req, res) => {
  // Total sales
  const totalSales = await db.get(
    'SELECT SUM(total_amount) as total, COUNT(*) as count FROM orders WHERE status != ?',
    ['cancelled']
  );

  // Orders by status
  const ordersByStatus = await db.all(
    'SELECT status, COUNT(*) as count, SUM(total_amount) as total FROM orders GROUP BY status'
  );

  // Top selling products
  const topProducts = await db.all(`
    SELECT 
      p.id, 
      p.name,
      p.category, 
      SUM(ci.quantity) as total_sold,
      SUM(ci.quantity * ci.price_at_time) as revenue
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN orders o ON o.cart_id = ci.cart_id
    WHERE o.status != 'cancelled'
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 10
  `);

  // Revenue by month
  const revenueByMonth = await db.all(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  // Average order value
  const avgOrderValue = await db.get(
    'SELECT AVG(total_amount) as avg_value FROM orders WHERE status != ?',
    ['cancelled']
  );

  // Category performance
  const categoryPerformance = await db.all(`
    SELECT 
      p.category,
      COUNT(DISTINCT o.id) as order_count,
      SUM(ci.quantity) as items_sold,
      SUM(ci.quantity * ci.price_at_time) as revenue
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN orders o ON o.cart_id = ci.cart_id
    WHERE o.status != 'cancelled' AND p.category IS NOT NULL
    GROUP BY p.category
    ORDER BY revenue DESC
  `);

  res.json({
    analytics: {
      summary: {
        totalRevenue: formatPrice(totalSales.total || 0),
        totalOrders: totalSales.count || 0,
        averageOrderValue: formatPrice(avgOrderValue.avg_value || 0)
      },
      ordersByStatus: ordersByStatus.map(s => ({
        ...s,
        total: formatPrice(s.total || 0)
      })),
      topProducts: topProducts.map(p => ({
        ...p,
        revenue: formatPrice(p.revenue)
      })),
      revenueByMonth: revenueByMonth.map(r => ({
        ...r,
        revenue: formatPrice(r.revenue)
      })),
      categoryPerformance: categoryPerformance.map(c => ({
        ...c,
        revenue: formatPrice(c.revenue)
      }))
    }
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!['pending', 'processing'].includes(order.status)) {
    return res.status(400).json({ 
      error: 'Order cannot be cancelled in current status' 
    });
  }

  // Update order status
  await updateOrderStatus(req, res);
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderAnalytics,
  cancelOrder
};
