const { Account, ACCOUNT_TYPES, ACCOUNT_STATUS } = require('../models/Account');

// Mock Supabase for testing
jest.mock('../config/database', () => ({
  supabase: {
    from: jest.fn(),
  },
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Account Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Account Types', () => {
    test('should have all required account types', () => {
      expect(ACCOUNT_TYPES.SAVINGS).toBe('savings');
      expect(ACCOUNT_TYPES.CURRENT).toBe('current');
      expect(ACCOUNT_TYPES.FIXED_DEPOSIT).toBe('fixed_deposit');
      expect(ACCOUNT_TYPES.RECURRING_DEPOSIT).toBe('recurring_deposit');
      expect(ACCOUNT_TYPES.LOAN).toBe('loan');
      expect(ACCOUNT_TYPES.DEMAT).toBe('demat');
    });
  });

  describe('Account Status', () => {
    test('should have all required account statuses', () => {
      expect(ACCOUNT_STATUS.ACTIVE).toBe('active');
      expect(ACCOUNT_STATUS.INACTIVE).toBe('inactive');
      expect(ACCOUNT_STATUS.SUSPENDED).toBe('suspended');
      expect(ACCOUNT_STATUS.CLOSED).toBe('closed');
      expect(ACCOUNT_STATUS.PENDING).toBe('pending');
    });
  });

  describe('Account Constructor', () => {
    test('should create account with default values', () => {
      const accountData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        account_type: 'savings',
        branch_id: '123e4567-e89b-12d3-a456-426614174001',
        bank_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const account = new Account(accountData);

      expect(account.customer_id).toBe(accountData.customer_id);
      expect(account.account_type).toBe(accountData.account_type);
      expect(account.balance).toBe(0);
      expect(account.status).toBe(ACCOUNT_STATUS.PENDING);
      expect(account.account_number).toMatch(/^CB\d{12}$/);
    });

    test('should create account with custom values', () => {
      const accountData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        account_type: 'current',
        initial_balance: 1000,
        interest_rate: 5.5,
        minimum_balance: 500,
        branch_id: '123e4567-e89b-12d3-a456-426614174001',
        bank_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const account = new Account(accountData);

      expect(account.balance).toBe(1000);
      expect(account.interest_rate).toBe(5.5);
      expect(account.minimum_balance).toBe(500);
    });
  });

  describe('Account Number Generation', () => {
    test('should generate unique account numbers', () => {
      const account1 = new Account({});
      const account2 = new Account({});

      expect(account1.account_number).not.toBe(account2.account_number);
      expect(account1.account_number).toMatch(/^CB\d{12}$/);
      expect(account2.account_number).toMatch(/^CB\d{12}$/);
    });
  });

  describe('Account Validation', () => {
    test('should validate correct account data', () => {
      const accountData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        account_type: 'savings',
        branch_id: '123e4567-e89b-12d3-a456-426614174001',
        bank_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const account = new Account(accountData);
      expect(() => account.validate()).not.toThrow();
    });

    test('should throw error for invalid account type', () => {
      const accountData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        account_type: 'invalid_type',
        branch_id: '123e4567-e89b-12d3-a456-426614174001',
        bank_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const account = new Account(accountData);
      expect(() => account.validate()).toThrow('Validation error');
    });

    test('should throw error for missing required fields', () => {
      const accountData = {
        account_type: 'savings',
        // Missing customer_id, branch_id, bank_id
      };

      const account = new Account(accountData);
      expect(() => account.validate()).toThrow('Validation error');
    });
  });

  describe('Account Methods', () => {
    let account;

    beforeEach(() => {
      account = new Account({
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        account_type: 'savings',
        balance: 1000,
        branch_id: '123e4567-e89b-12d3-a456-426614174001',
        bank_id: '123e4567-e89b-12d3-a456-426614174002',
      });
    });

    test('should return account summary', () => {
      const summary = account.getSummary();

      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('account_number');
      expect(summary).toHaveProperty('account_type');
      expect(summary).toHaveProperty('balance');
      expect(summary).toHaveProperty('status');
      expect(summary.account_type).toBe('savings');
      expect(summary.balance).toBe(1000);
    });

    test('should check if account is active', () => {
      account.status = ACCOUNT_STATUS.ACTIVE;
      expect(account.isActive()).toBe(true);

      account.status = ACCOUNT_STATUS.SUSPENDED;
      expect(account.isActive()).toBe(false);
    });

    test('should check if account can transact', () => {
      account.status = ACCOUNT_STATUS.ACTIVE;
      account.balance = 1000;
      account.minimum_balance = 500;
      expect(account.canTransact()).toBe(true);

      account.balance = 300;
      expect(account.canTransact()).toBe(false);
    });
  });
}); 