const { supabase } = require('../config/database');
const { transactionCreateSchema } = require('../validators/transactionValidator');
const { logger } = require('../utils/logger');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { error: validationError, value } = transactionCreateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Fetch account and check status
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, balance, status, account_type, minimum_balance')
      .eq('id', value.account_id)
      .single();
    if (accountError || !account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    if (account.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Account is not active' });
    }
    // Business logic: overdraft prevention
    let newBalance = account.balance;
    if (value.type === 'withdrawal') {
      if (account.balance - value.amount < account.minimum_balance) {
        return res.status(400).json({ success: false, error: 'Insufficient funds or minimum balance violation' });
      }
      newBalance -= value.amount;
    } else if (value.type === 'deposit' || value.type === 'loan_repayment') {
      newBalance += value.amount;
    } else if (value.type === 'inter_branch_transfer') {
      // For now, treat as withdrawal; inter-branch logic can be expanded
      if (account.balance - value.amount < account.minimum_balance) {
        return res.status(400).json({ success: false, error: 'Insufficient funds or minimum balance violation' });
      }
      newBalance -= value.amount;
    }
    // Update account balance
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', value.account_id);
    if (updateError) {
      logger.error('Account balance update failed:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update account balance' });
    }
    // Insert transaction
    const transactionData = {
      ...value,
      performed_by: req.user.id,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();
    if (error) {
      logger.error('Transaction creation failed:', error);
      return res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all transactions (with optional filters)
exports.getTransactions = async (req, res) => {
  try {
    const { account_id, member_id, type, status } = req.query;
    let query = supabase.from('transactions').select('*');
    if (account_id) query = query.eq('account_id', account_id);
    if (member_id) query = query.eq('member_id', member_id);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    query = query.order('timestamp', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get transaction by ID error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 