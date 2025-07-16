-- Sample data for testing
-- Run this after schema.sql

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@shopease.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Insert sample customers
INSERT INTO users (username, email, password_hash) 
VALUES 
    ('johndoe', 'john@example.com', '$2a$10$YourHashedPasswordHere'),
    ('janesmith', 'jane@example.com', '$2a$10$YourHashedPasswordHere');

-- Insert sample products
INSERT INTO products (name, description, price, stock_quantity, category, image_url) VALUES
    ('MacBook Pro 16"', 'Apple MacBook Pro 16-inch with M3 Pro chip', 2499.99, 25, 'Electronics', 'https://example.com/macbook.jpg'),
    ('iPhone 15 Pro', 'Latest iPhone with A17 Pro chip', 1199.99, 50, 'Electronics', 'https://example.com/iphone.jpg'),
    ('Sony WH-1000XM5', 'Premium noise-canceling headphones', 399.99, 100, 'Audio', 'https://example.com/sony.jpg'),
    ('Nike Air Max 270', 'Comfortable running shoes', 150.00, 75, 'Footwear', 'https://example.com/nike.jpg'),
    ('Patagonia Jacket', 'Warm down jacket', 299.99, 40, 'Clothing', 'https://example.com/patagonia.jpg');

-- Create carts for users
INSERT INTO carts (user_id) VALUES (1), (2), (3);

-- Add sample cart items
INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time) VALUES
    (2, 1, 1, 2499.99),
    (2, 3, 2, 399.99);

-- Create sample orders
INSERT INTO orders (order_number, user_id, cart_id, total_amount, subtotal, tax, shipping_address, payment_method, status) VALUES
    ('ORD-1234567890', 2, 2, 3299.97, 3055.53, 244.44, '123 Main St, City, State 12345', 'credit_card', 'delivered');

-- Add sample reviews
INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
    (1, 2, 5, 'Excellent laptop! Super fast and great display.'),
    (3, 2, 4, 'Great sound quality but a bit pricey.');