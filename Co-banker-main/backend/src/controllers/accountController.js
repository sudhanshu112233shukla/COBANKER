const { Account, ACCOUNT_TYPES, ACCOUNT_STATUS } = require('../models/Account');
const { logger } = require('../utils/logger');
const { supabase } = require('../config/database');

// @desc    Create a new account
// @route   POST /api/v1/accounts
// @access  Private (Bank/Branch employees)
const createAccount = async (req, res) => {
  try {
    const {
      customer_id,
      account_type,
      initial_balance = 0,
      interest_rate = 0,
      minimum_balance = 0,
      overdraft_limit = 0,
      monthly_maintenance_fee = 0,
      description,
    } = req.body;

    // Add branch_id and bank_id from authenticated user
    const accountData = {
      customer_id,
      account_type,
      initial_balance,
      interest_rate,
      minimum_balance,
      overdraft_limit,
      monthly_maintenance_fee,
      description,
      branch_id: req.user.branch_id,
      bank_id: req.user.bank_id,
    };

    const account = await Account.create(accountData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error('Account creation controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get account by ID
// @route   GET /api/v1/accounts/:id
// @access  Private
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    logger.error('Get account by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get account by account number
// @route   GET /api/v1/accounts/number/:accountNumber
// @access  Private
const getAccountByNumber = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const account = await Account.findByAccountNumber(accountNumber);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    logger.error('Get account by number error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get accounts by customer ID
// @route   GET /api/v1/accounts/customer/:customerId
// @access  Private
const getAccountsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, status, account_type } = req.query;

    // Check if customer exists and user has access
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, bank_id, branch_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin' && 
        customer.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Build query
    let query = supabase
      .from('accounts')
      .select(`
        *,
        branches (id, name, address),
        banks (id, name, code)
      `)
      .eq('customer_id', customerId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (account_type) {
      query = query.eq('account_type', account_type);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: accounts, error, count } = await query;

    if (error) {
      throw error;
    }

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: accounts.map(account => new Account(account)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Get accounts by customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Update account
// @route   PUT /api/v1/accounts/:id
// @access  Private (Bank/Branch employees)
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updatedAccount = await account.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: updatedAccount,
    });
  } catch (error) {
    logger.error('Update account error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update account balance
// @route   PATCH /api/v1/accounts/:id/balance
// @access  Private (Bank/Branch employees)
const updateAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, transaction_type } = req.body;

    if (!amount || !transaction_type) {
      return res.status(400).json({
        success: false,
        error: 'Amount and transaction type are required',
      });
    }

    if (!['credit', 'debit'].includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        error: 'Transaction type must be credit or debit',
      });
    }

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updatedAccount = await account.updateBalance(amount, transaction_type);

    res.status(200).json({
      success: true,
      message: 'Account balance updated successfully',
      data: {
        account_number: updatedAccount.account_number,
        previous_balance: updatedAccount.balance - (transaction_type === 'credit' ? amount : -amount),
        new_balance: updatedAccount.balance,
        transaction_type,
        amount,
      },
    });
  } catch (error) {
    logger.error('Update account balance error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Close account
// @route   PATCH /api/v1/accounts/:id/close
// @access  Private (Bank/Branch employees)
const closeAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const closedAccount = await account.close();

    res.status(200).json({
      success: true,
      message: 'Account closed successfully',
      data: closedAccount.getSummary(),
    });
  } catch (error) {
    logger.error('Close account error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Suspend account
// @route   PATCH /api/v1/accounts/:id/suspend
// @access  Private (Bank/Branch employees)
const suspendAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const suspendedAccount = await account.suspend(reason);

    res.status(200).json({
      success: true,
      message: 'Account suspended successfully',
      data: suspendedAccount.getSummary(),
    });
  } catch (error) {
    logger.error('Suspend account error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Activate account
// @route   PATCH /api/v1/accounts/:id/activate
// @access  Private (Bank/Branch employees)
const activateAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Check if user has access to this account
    if (req.user.role !== 'admin' && 
        account.bank_id !== req.user.bank_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const activatedAccount = await account.activate();

    res.status(200).json({
      success: true,
      message: 'Account activated successfully',
      data: activatedAccount.getSummary(),
    });
  } catch (error) {
    logger.error('Activate account error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get account statistics
// @route   GET /api/v1/accounts/stats
// @access  Private (Bank employees)
const getAccountStats = async (req, res) => {
  try {
    const { bank_id } = req.user;
    const { period = 'month' } = req.query;

    // Get account statistics for the bank
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('account_type, status, balance, created_at')
      .eq('bank_id', bank_id);

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      total_accounts: accounts.length,
      active_accounts: accounts.filter(a => a.status === ACCOUNT_STATUS.ACTIVE).length,
      total_balance: accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
      by_type: {},
      by_status: {},
    };

    // Group by account type
    accounts.forEach(account => {
      if (!stats.by_type[account.account_type]) {
        stats.by_type[account.account_type] = {
          count: 0,
          total_balance: 0,
        };
      }
      stats.by_type[account.account_type].count++;
      stats.by_type[account.account_type].total_balance += account.balance || 0;
    });

    // Group by status
    accounts.forEach(account => {
      if (!stats.by_status[account.status]) {
        stats.by_status[account.status] = 0;
      }
      stats.by_status[account.status]++;
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

module.exports = {
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
}; 