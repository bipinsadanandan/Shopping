const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config/auth');
const { asyncHandler } = require('../utils/helpers');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user exists
  const existingUser = await db.get(
    'SELECT * FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existingUser) {
    return res.status(400).json({ 
      error: existingUser.email === email 
        ? 'Email already registered' 
        : 'Username already taken' 
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(bcryptRounds);
  const passwordHash = await bcrypt.hash(password, salt);

  // Begin transaction
  await db.beginTransaction();

  try {
    // Create user
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Create initial cart for user
    await db.run('INSERT INTO carts (user_id) VALUES (?)', [result.id]);

    // Commit transaction
    await db.commit();

    // Get created user
    const newUser = await db.get(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [result.id]
    );

    // Generate token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: newUser
    });
  } catch (error) {
    await db.rollback();
    throw error;
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await db.run(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  // Generate token
  const token = generateToken(user);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await db.get(
    'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const userId = req.user.id;

  if (username) {
    // Check if username is taken
    const existing = await db.get(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update username
    await db.run(
      'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, userId]
    );
  }

  const updatedUser = await db.get(
    'SELECT id, username, email, role FROM users WHERE id = ?',
    [userId]
  );

  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  });
});

module.exports = { register, login, getProfile, updateProfile };
