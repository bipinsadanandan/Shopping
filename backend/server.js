const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

// Test database connection
db.get("SELECT 1", [], (err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
});

