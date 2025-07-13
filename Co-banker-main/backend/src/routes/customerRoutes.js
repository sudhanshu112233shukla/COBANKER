const express = require('express');
const { createCustomer, getCustomers, getCustomerById, updateCustomer, deactivateCustomer } = require('../controllers/customerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and employee role
router.use(authenticateToken, authorizeRoles('admin', 'manager', 'teller'));

// Create customer
router.post('/', createCustomer);

// Get all customers
router.get('/', getCustomers);

// Get customer by ID
router.get('/:id', getCustomerById);

// Update customer
router.put('/:id', updateCustomer);

// Deactivate (soft delete) customer
router.delete('/:id', deactivateCustomer);

module.exports = router; 