const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'shopping-cart.db');

// Delete existing database for fresh start
const fs = require('fs');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Existing database removed');
}

const db = new sqlite3.Database(dbPath);

const initDatabase = async () => {
  console.log('🚀 Initializing database...');
  
  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
      else console.log('✅ Users table created');
    });

    // Products table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
        stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
        category TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating products table:', err);
      else console.log('✅ Products table created');
    });

    // Carts table
    db.run(`
      CREATE TABLE IF NOT EXISTS carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating carts table:', err);
      else console.log('✅ Carts table created');
    });

    // Cart items table
    db.run(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        price_at_time DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(cart_id, product_id)
      )
    `, (err) => {
      if (err) console.error('Error creating cart_items table:', err);
      else console.log('✅ Cart items table created');
    });

    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        cart_id INTEGER NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
        shipping_address TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (cart_id) REFERENCES carts(id)
      )
    `, (err) => {
      if (err) console.error('Error creating orders table:', err);
      else console.log('✅ Orders table created');
    });

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(product_id, user_id)
      )
    `, (err) => {
      if (err) console.error('Error creating reviews table:', err);
      else console.log('✅ Reviews table created');
    });

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)`);

    console.log('✅ Indexes created');

    // Insert sample data
    setTimeout(() => {
      insertSampleData();
    }, 1000);
  });
};

const insertSampleData = async () => {
  console.log('📦 Inserting sample data...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  db.run(`
    INSERT INTO users (username, email, password_hash, role) 
    VALUES ('admin', 'admin@shopease.com', ?, 'admin')
  `, [adminPassword], function(err) {
    if (err) console.error('Error creating admin user:', err);
    else {
      console.log('✅ Admin user created (email: admin@shopease.com, password: admin123)');
      
      // Create cart for admin
      db.run('INSERT INTO carts (user_id) VALUES (?)', [this.lastID]);
    }
  });

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  db.run(`
    INSERT INTO users (username, email, password_hash, role) 
    VALUES ('johndoe', 'john@example.com', ?, 'customer')
  `, [customerPassword], function(err) {
    if (err) console.error('Error creating customer user:', err);
    else {
      console.log('✅ Sample customer created (email: john@example.com, password: customer123)');
      
      // Create cart for customer
      db.run('INSERT INTO carts (user_id) VALUES (?)', [this.lastID]);
    }
  });

  // Insert sample products
  const products = [
    {
      name: 'MacBook Pro 16"',
      description: 'Apple MacBook Pro 16-inch with M3 Pro chip, 18GB RAM, 512GB SSD',
      price: 2499.99,
      stock: 25,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=400'
    },
    {
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone with A17 Pro chip, 256GB storage, Titanium design',
      price: 1199.99,
      stock: 50,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400'
    },
    {
      name: 'Sony WH-1000XM5',
      description: 'Premium noise-canceling wireless headphones with 30-hour battery',
      price: 399.99,
      stock: 100,
      category: 'Audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
    },
    {
      name: 'Nike Air Max 270',
      description: 'Comfortable running shoes with Air Max cushioning',
      price: 150.00,
      stock: 75,
      category: 'Footwear',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
    },
    {
      name: 'Patagonia Down Jacket',
      description: 'Warm and sustainable down jacket for cold weather',
      price: 299.99,
      stock: 40,
      category: 'Clothing',
      image: 'https://images.unsplash.com/photo-1566479179817-0ddb5fa87cd9?w=400'
    },
    {
      name: 'Canon EOS R6',
      description: 'Full-frame mirrorless camera with 20MP sensor and 4K video',
      price: 2499.00,
      stock: 15,
      category: 'Cameras',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'
    },
    {
      name: 'Samsung 65" OLED TV',
      description: '4K Smart TV with HDR and built-in streaming apps',
      price: 1799.99,
      stock: 20,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400'
    },
    {
      name: 'Herman Miller Aeron Chair',
      description: 'Ergonomic office chair with lumbar support',
      price: 1395.00,
      stock: 10,
      category: 'Furniture',
      image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400'
    },
    {
      name: 'Kindle Paperwhite',
      description: 'E-reader with 6.8" display and adjustable warm light',
      price: 139.99,
      stock: 150,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400'
    },
    {
      name: 'Yeti Rambler Tumbler',
      description: 'Insulated stainless steel tumbler, 30oz',
      price: 35.00,
      stock: 200,
      category: 'Home',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'
    }
  ];

  products.forEach((product, index) => {
    setTimeout(() => {
      db.run(`
        INSERT INTO products (name, description, price, stock_quantity, category, image_url) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [product.name, product.description, product.price, product.stock, product.category, product.image], 
      (err) => {
        if (err) console.error('Error inserting product:', err);
        else console.log(`✅ Product added: ${product.name}`);
      });
    }, index * 100);
  });

  console.log('✅ Database initialization complete!');
};

// Run initialization
initDatabase();

// Close database connection after a delay
setTimeout(() => {
  db.close((err) => {
    if (err) console.error(err);
    else console.log('🔒 Database connection closed');
  });
}, 5000);