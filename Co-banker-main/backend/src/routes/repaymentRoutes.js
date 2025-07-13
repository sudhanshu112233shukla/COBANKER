const express = require('express');
const { createRepayment, getRepaymentsByLoan } = require('../controllers/repaymentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and teller/manager/admin role
router.use(authenticateToken, authorizeRoles('admin', 'manager', 'teller'));

// Record a repayment
router.post('/', createRepayment);

// Get all repayments for a loan
router.get('/loan/:loan_id', getRepaymentsByLoan);

module.exports = router; 