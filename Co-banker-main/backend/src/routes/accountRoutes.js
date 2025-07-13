const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createAccount,
  getAccountById,
  getAccountByNumber,
  getAccountsByCustomer,
  updateAccount,
  updateAccountBalance,
  closeAccount,
  suspendAccount,
  activateAccount,
  getAccountStats,
} = require('../controllers/accountController');
const { authorizeRoles, authorizeBranch } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { validationResult } = require('express-validator');

const router = express.Router();

// @route   POST /api/v1/accounts
// @desc    Create a new account
// @access  Private (Bank/Branch employees)
router.post(
  '/',
  [
    body('customer_id').isUUID().withMessage('Valid customer ID is required'),
    body('account_type')
      .isIn(['savings', 'current', 'fixed_deposit', 'recurring_deposit', 'loan', 'demat'])
      .withMessage('Valid account type is required'),
    body('initial_balance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Initial balance must be a positive number'),
    body('interest_rate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Interest rate must be between 0 and 100'),
    body('minimum_balance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum balance must be a positive number'),
    body('overdraft_limit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Overdraft limit must be a positive number'),
    body('monthly_maintenance_fee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly maintenance fee must be a positive number'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  createAccount
);

// @route   GET /api/v1/accounts/:id
// @desc    Get account by ID
// @access  Private
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
  ],
  validateRequest,
  getAccountById
);

// @route   GET /api/v1/accounts/number/:accountNumber
// @desc    Get account by account number
// @access  Private
router.get(
  '/number/:accountNumber',
  [
    param('accountNumber')
      .matches(/^CB\d{12}$/)
      .withMessage('Valid account number format is required (CB + 12 digits)'),
  ],
  validateRequest,
  getAccountByNumber
);

// @route   GET /api/v1/accounts/customer/:customerId
// @desc    Get accounts by customer ID
// @access  Private
router.get(
  '/customer/:customerId',
  [
    param('customerId').isUUID().withMessage('Valid customer ID is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'closed', 'pending'])
      .withMessage('Valid status is required'),
    query('account_type')
      .optional()
      .isIn(['savings', 'current', 'fixed_deposit', 'recurring_deposit', 'loan', 'demat'])
      .withMessage('Valid account type is required'),
  ],
  validateRequest,
  getAccountsByCustomer
);

// @route   PUT /api/v1/accounts/:id
// @desc    Update account
// @access  Private (Bank/Branch employees)
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
    body('account_type')
      .optional()
      .isIn(['savings', 'current', 'fixed_deposit', 'recurring_deposit', 'loan', 'demat'])
      .withMessage('Valid account type is required'),
    body('interest_rate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Interest rate must be between 0 and 100'),
    body('minimum_balance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum balance must be a positive number'),
    body('overdraft_limit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Overdraft limit must be a positive number'),
    body('monthly_maintenance_fee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly maintenance fee must be a positive number'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'closed', 'pending'])
      .withMessage('Valid status is required'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  updateAccount
);

// @route   PATCH /api/v1/accounts/:id/balance
// @desc    Update account balance
// @access  Private (Bank/Branch employees)
router.patch(
  '/:id/balance',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('transaction_type')
      .isIn(['credit', 'debit'])
      .withMessage('Transaction type must be credit or debit'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  updateAccountBalance
);

// @route   PATCH /api/v1/accounts/:id/close
// @desc    Close account
// @access  Private (Bank/Branch employees)
router.patch(
  '/:id/close',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  closeAccount
);

// @route   PATCH /api/v1/accounts/:id/suspend
// @desc    Suspend account
// @access  Private (Bank/Branch employees)
router.patch(
  '/:id/suspend',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  suspendAccount
);

// @route   PATCH /api/v1/accounts/:id/activate
// @desc    Activate account
// @access  Private (Bank/Branch employees)
router.patch(
  '/:id/activate',
  [
    param('id').isUUID().withMessage('Valid account ID is required'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'branch_employee', 'admin'),
  authorizeBranch,
  activateAccount
);

// @route   GET /api/v1/accounts/stats
// @desc    Get account statistics
// @access  Private (Bank employees)
router.get(
  '/stats',
  [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Valid period is required'),
  ],
  validateRequest,
  authorizeRoles('bank_employee', 'admin'),
  getAccountStats
);

module.exports = router; 