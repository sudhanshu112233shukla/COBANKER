const { validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      url: req.originalUrl,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

module.exports = {
  validateRequest,
}; 