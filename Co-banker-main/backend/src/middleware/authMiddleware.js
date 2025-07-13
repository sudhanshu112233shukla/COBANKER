const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { supabase } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Supabase to ensure they still exist and are active
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
      bank_id: user.bank_id,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Branch-specific authorization
const authorizeBranch = (req, res, next) => {
  if (!req.user.branch_id) {
    return res.status(403).json({
      success: false,
      error: 'Branch access required',
    });
  }
  next();
};

// Bank-specific authorization
const authorizeBank = (req, res, next) => {
  if (!req.user.bank_id) {
    return res.status(403).json({
      success: false,
      error: 'Bank access required',
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeBranch,
  authorizeBank,
}; 