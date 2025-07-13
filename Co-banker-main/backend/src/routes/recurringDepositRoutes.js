const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/recurringDepositController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create RD (members, employees, admins)
router.post('/', authorizeRoles('member', 'bank_employee', 'admin'), controller.createRecurringDeposit);

// Get RD by ID (members can only access their own)
router.get('/:id', controller.getRecurringDeposit);

// List RDs by member (members can only access their own)
router.get('/', controller.listByMember);

// Pay an installment (members, employees, admins)
router.post('/pay', authorizeRoles('member', 'bank_employee', 'admin'), controller.payInstallment);

// Close RD early (members, employees, admins)
router.post('/:id/close-early', authorizeRoles('member', 'bank_employee', 'admin'), controller.closeEarly);

// Calculate penalty for missed payments (members, employees, admins)
router.get('/:id/penalty', authorizeRoles('member', 'bank_employee', 'admin'), controller.calculatePenalty);

module.exports = router; 