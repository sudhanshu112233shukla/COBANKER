const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { supabase, supabaseAdmin } = require('../config/database');
const { logger } = require('../utils/logger');

// Account types
const ACCOUNT_TYPES = {
  SAVINGS: 'savings',
  CURRENT: 'current',
  FIXED_DEPOSIT: 'fixed_deposit',
  RECURRING_DEPOSIT: 'recurring_deposit',
  LOAN: 'loan',
  DEMAT: 'demat',
};

// Account statuses
const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
  PENDING: 'pending',
};

// Validation schemas
const accountValidationSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  account_type: Joi.string().valid(...Object.values(ACCOUNT_TYPES)).required(),
  initial_balance: Joi.number().min(0).default(0),
  branch_id: Joi.string().uuid().required(),
  bank_id: Joi.string().uuid().required(),
  interest_rate: Joi.number().min(0).max(100).default(0),
  minimum_balance: Joi.number().min(0).default(0),
  overdraft_limit: Joi.number().min(0).default(0),
  monthly_maintenance_fee: Joi.number().min(0).default(0),
  description: Joi.string().max(500).optional(),
});

const accountUpdateSchema = Joi.object({
  account_type: Joi.string().valid(...Object.values(ACCOUNT_TYPES)),
  interest_rate: Joi.number().min(0).max(100),
  minimum_balance: Joi.number().min(0),
  overdraft_limit: Joi.number().min(0),
  monthly_maintenance_fee: Joi.number().min(0),
  status: Joi.string().valid(...Object.values(ACCOUNT_STATUS)),
  description: Joi.string().max(500),
});

class Account {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.account_number = data.account_number || this.generateAccountNumber();
    this.customer_id = data.customer_id;
    this.account_type = data.account_type;
    this.balance = data.balance || data.initial_balance || 0;
    this.interest_rate = data.interest_rate || 0;
    this.minimum_balance = data.minimum_balance || 0;
    this.overdraft_limit = data.overdraft_limit || 0;
    this.monthly_maintenance_fee = data.monthly_maintenance_fee || 0;
    this.status = data.status || ACCOUNT_STATUS.PENDING;
    this.branch_id = data.branch_id;
    this.bank_id = data.bank_id;
    this.description = data.description;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Generate unique account number
  generateAccountNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CB${timestamp.slice(-8)}${random}`;
  }

  // Validate account data
  validate() {
    const { error, value } = accountValidationSchema.validate(this, { allowUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  // Create new account
  static async create(accountData) {
    try {
      const account = new Account(accountData);
      const validatedData = account.validate();

      // Check if customer exists and is active
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, status')
        .eq('id', validatedData.customer_id)
        .single();

      if (customerError || !customer) {
        throw new Error('Customer not found');
      }

      if (customer.status !== 'active') {
        throw new Error('Customer account is not active');
      }

      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', validatedData.branch_id)
        .single();

      if (branchError || !branch) {
        throw new Error('Branch not found');
      }

      // Insert account into database
      const { data, error } = await supabase
        .from('accounts')
        .insert([validatedData])
        .select()
        .single();

      if (error) {
        logger.error('Failed to create account:', error);
        throw new Error('Failed to create account');
      }

      logger.info(`Account created successfully: ${data.account_number}`);
      return new Account(data);
    } catch (error) {
      logger.error('Account creation error:', error);
      throw error;
    }
  }

  // Get account by ID
  static async findById(accountId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          customers (id, name, email, phone),
          branches (id, name, address),
          banks (id, name, code)
        `)
        .eq('id', accountId)
        .single();

      if (error || !data) {
        return null;
      }

      return new Account(data);
    } catch (error) {
      logger.error('Error finding account by ID:', error);
      throw error;
    }
  }

  // Get account by account number
  static async findByAccountNumber(accountNumber) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          customers (id, name, email, phone),
          branches (id, name, address),
          banks (id, name, code)
        `)
        .eq('account_number', accountNumber)
        .single();

      if (error || !data) {
        return null;
      }

      return new Account(data);
    } catch (error) {
      logger.error('Error finding account by number:', error);
      throw error;
    }
  }

  // Get accounts by customer ID
  static async findByCustomerId(customerId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          branches (id, name, address),
          banks (id, name, code)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(account => new Account(account));
    } catch (error) {
      logger.error('Error finding accounts by customer ID:', error);
      throw error;
    }
  }

  // Update account
  async update(updateData) {
    try {
      const { error: validationError } = accountUpdateSchema.validate(updateData);
      if (validationError) {
        throw new Error(`Validation error: ${validationError.details[0].message}`);
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update account:', error);
        throw new Error('Failed to update account');
      }

      // Update current instance
      Object.assign(this, data);
      logger.info(`Account updated successfully: ${this.account_number}`);
      return this;
    } catch (error) {
      logger.error('Account update error:', error);
      throw error;
    }
  }

  // Update account balance
  async updateBalance(amount, transactionType = 'credit') {
    try {
      const newBalance = transactionType === 'credit' 
        ? this.balance + amount 
        : this.balance - amount;

      // Check minimum balance requirement
      if (newBalance < this.minimum_balance && transactionType === 'debit') {
        throw new Error(`Insufficient balance. Minimum required: ${this.minimum_balance}`);
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update account balance:', error);
        throw new Error('Failed to update account balance');
      }

      this.balance = data.balance;
      logger.info(`Account balance updated: ${this.account_number} - New balance: ${this.balance}`);
      return this;
    } catch (error) {
      logger.error('Balance update error:', error);
      throw error;
    }
  }

  // Close account
  async close() {
    try {
      if (this.balance > 0) {
        throw new Error('Cannot close account with positive balance');
      }

      const { error } = await supabase
        .from('accounts')
        .update({
          status: ACCOUNT_STATUS.CLOSED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.id);

      if (error) {
        logger.error('Failed to close account:', error);
        throw new Error('Failed to close account');
      }

      this.status = ACCOUNT_STATUS.CLOSED;
      logger.info(`Account closed successfully: ${this.account_number}`);
      return this;
    } catch (error) {
      logger.error('Account closure error:', error);
      throw error;
    }
  }

  // Suspend account
  async suspend(reason = '') {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          status: ACCOUNT_STATUS.SUSPENDED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.id);

      if (error) {
        logger.error('Failed to suspend account:', error);
        throw new Error('Failed to suspend account');
      }

      this.status = ACCOUNT_STATUS.SUSPENDED;
      logger.info(`Account suspended: ${this.account_number} - Reason: ${reason}`);
      return this;
    } catch (error) {
      logger.error('Account suspension error:', error);
      throw error;
    }
  }

  // Activate account
  async activate() {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          status: ACCOUNT_STATUS.ACTIVE,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.id);

      if (error) {
        logger.error('Failed to activate account:', error);
        throw new Error('Failed to activate account');
      }

      this.status = ACCOUNT_STATUS.ACTIVE;
      logger.info(`Account activated: ${this.account_number}`);
      return this;
    } catch (error) {
      logger.error('Account activation error:', error);
      throw error;
    }
  }

  // Get account summary
  getSummary() {
    return {
      id: this.id,
      account_number: this.account_number,
      account_type: this.account_type,
      balance: this.balance,
      status: this.status,
      interest_rate: this.interest_rate,
      minimum_balance: this.minimum_balance,
      created_at: this.created_at,
    };
  }

  // Check if account is active
  isActive() {
    return this.status === ACCOUNT_STATUS.ACTIVE;
  }

  // Check if account can perform transactions
  canTransact() {
    return this.isActive() && this.balance >= this.minimum_balance;
  }
}

module.exports = {
  Account,
  ACCOUNT_TYPES,
  ACCOUNT_STATUS,
}; 