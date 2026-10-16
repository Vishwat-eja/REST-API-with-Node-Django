const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();

// Security and utility middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve interactive API playground and documentation UI
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Fallback for API 404s
app.use('/api', notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
