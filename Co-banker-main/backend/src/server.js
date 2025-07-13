require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const path = require('path');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { logger } = require('./utils/logger');
const { authenticateToken } = require('./middleware/authMiddleware');

// Import routes
const accountRoutes = require('./routes/accountRoutes');
const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const repaymentRoutes = require('./routes/repaymentRoutes');
const recurringDepositRoutes = require('./routes/recurringDepositRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 50 (new recommended config)
});

// Middleware
app.use(compression());
app.use(limiter);
app.use(speedLimiter);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/accounts`, authenticateToken, accountRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/customers`, authenticateToken, customerRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/transactions`, authenticateToken, transactionRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/members`, authenticateToken, memberRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/repayments`, authenticateToken, repaymentRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/recurring-deposits`, recurringDepositRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`CoBanker Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 