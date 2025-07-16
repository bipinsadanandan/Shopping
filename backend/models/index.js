const models = {
  User: {
    tableName: 'users',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      username: 'TEXT UNIQUE NOT NULL',
      email: 'TEXT UNIQUE NOT NULL',
      password_hash: 'TEXT NOT NULL',
      role: "TEXT DEFAULT 'customer'",
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    }
  },
  Product: {
    tableName: 'products',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT NOT NULL',
      description: 'TEXT',
      price: 'DECIMAL(10,2) NOT NULL',
      stock_quantity: 'INTEGER NOT NULL',
      category: 'TEXT',
      image_url: 'TEXT',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    }
  },
  Cart: {
    tableName: 'carts',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      user_id: 'INTEGER NOT NULL',
      status: "TEXT DEFAULT 'active'",
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: 'FOREIGN KEY (user_id) REFERENCES users(id)'
    }
  },
  CartItem: {
    tableName: 'cart_items',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      cart_id: 'INTEGER NOT NULL',
      product_id: 'INTEGER NOT NULL',
      quantity: 'INTEGER NOT NULL',
      price_at_time: 'DECIMAL(10,2) NOT NULL',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: 'FOREIGN KEY (cart_id) REFERENCES carts(id), FOREIGN KEY (product_id) REFERENCES products(id)'
    }
  },
  Order: {
    tableName: 'orders',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      user_id: 'INTEGER NOT NULL',
      cart_id: 'INTEGER NOT NULL',
      total_amount: 'DECIMAL(10,2) NOT NULL',
      status: "TEXT DEFAULT 'pending'",
      shipping_address: 'TEXT',
      payment_method: 'TEXT',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: 'FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (cart_id) REFERENCES carts(id)'
    }
  },
  Review: {
    tableName: 'reviews',
    fields: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      product_id: 'INTEGER NOT NULL',
      user_id: 'INTEGER NOT NULL',
      rating: 'INTEGER CHECK(rating >= 1 AND rating <= 5)',
      comment: 'TEXT',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: 'FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (user_id) REFERENCES users(id)'
    }
  }
};

module.exports = models;