const express = require('express');
const { createMember, getMembers, getMemberById, updateMember } = require('../controllers/memberController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and employee role
router.use(authenticateToken, authorizeRoles('admin', 'manager', 'teller'));

// Create member
router.post('/', createMember);

// Get all members
router.get('/', getMembers);

// Get member by ID
router.get('/:id', getMemberById);

// Update member
router.put('/:id', updateMember);

module.exports = router; 