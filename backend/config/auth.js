module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  bcryptRounds: 10,
  roles: {
    ADMIN: 'admin',
    CUSTOMER: 'customer'
  }
};