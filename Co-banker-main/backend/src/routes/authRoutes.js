const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validationMiddleware');
const { supabase } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          bank_id: user.bank_id,
          branch_id: user.branch_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      logger.info(`User logged in: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   POST /api/v1/auth/register
// @desc    Register new user
// @access  Public
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('role').isIn(['customer', 'bank_employee', 'branch_employee']).withMessage('Valid role is required'),
    body('bank_id').optional().isUUID().withMessage('Valid bank ID is required'),
    body('branch_id').optional().isUUID().withMessage('Valid branch ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email, password, name, role, bank_id, branch_id } = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists',
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: passwordHash,
          name,
          role,
          bank_id,
          branch_id,
          is_active: true,
        }])
        .select()
        .single();

      if (error) {
        logger.error('User creation error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          bank_id: user.bank_id,
          branch_id: user.branch_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      logger.info(`User registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    // Verify current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        bank_id: user.bank_id,
        branch_id: user.branch_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router; 