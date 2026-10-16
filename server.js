require('dotenv').config();
const app = require('./src/app');
const { getDb } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Initialize SQLite database
try {
  getDb();
  console.log('✅ SQLite Database initialized successfully.');
} catch (err) {
  console.error('❌ Failed to initialize SQLite database:', err);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`
🚀 TaskFlow REST API server is running!
📡 URL: http://localhost:${PORT}
📚 Interactive Docs & Test Playground: http://localhost:${PORT}/
🔒 Health Endpoint: http://localhost:${PORT}/api/health
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping TaskFlow REST API server...');
  server.close(() => {
    console.log('Server stopped cleanly.');
    process.exit(0);
  });
});
