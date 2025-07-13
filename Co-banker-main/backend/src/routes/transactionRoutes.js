const express = require('express');
const { createTransaction, getTransactions, getTransactionById } = require('../controllers/transactionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and employee role
router.use(authenticateToken, authorizeRoles('admin', 'manager', 'teller'));

// Create transaction
router.post('/', createTransaction);

// Get all transactions
router.get('/', getTransactions);

// Get transaction by ID
router.get('/:id', getTransactionById);

module.exports = router; 