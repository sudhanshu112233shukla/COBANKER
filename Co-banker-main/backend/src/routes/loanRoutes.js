const express = require('express');
const {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  addGuarantor,
  getGuarantors
} = require('../controllers/loanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and employee role
router.use(authenticateToken, authorizeRoles('admin', 'manager', 'loan_officer'));

// Create loan
router.post('/', createLoan);

// Get all loans
router.get('/', getLoans);

// Get loan by ID
router.get('/:id', getLoanById);

// Update loan
router.put('/:id', updateLoan);

// Add guarantor to loan
router.post('/:id/guarantors', addGuarantor);

// Get all guarantors for a loan
router.get('/:id/guarantors', getGuarantors);

module.exports = router; 