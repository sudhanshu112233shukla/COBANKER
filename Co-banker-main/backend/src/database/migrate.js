const { supabaseAdmin } = require('../config/database');
const { logger } = require('../utils/logger');

// SQL statements for creating tables
const createTablesSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'bank_employee', 'branch_employee', 'customer')),
  bank_id UUID REFERENCES banks(id),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  contact_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  bank_id UUID NOT NULL REFERENCES banks(id),
  address TEXT,
  contact_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  bank_id UUID NOT NULL REFERENCES banks(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  kyc_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('savings', 'current', 'fixed_deposit', 'recurring_deposit', 'loan', 'demat')),
  balance DECIMAL(15,2) DEFAULT 0.00,
  interest_rate DECIMAL(5,2) DEFAULT 0.00,
  minimum_balance DECIMAL(15,2) DEFAULT 0.00,
  overdraft_limit DECIMAL(15,2) DEFAULT 0.00,
  monthly_maintenance_fee DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'closed')),
  branch_id UUID NOT NULL REFERENCES branches(id),
  bank_id UUID NOT NULL REFERENCES banks(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'transfer')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_bank_id ON users(bank_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

CREATE INDEX IF NOT EXISTS idx_customers_bank_id ON customers(bank_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_bank_id ON accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_accounts_branch_id ON accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Bank employees can view users in their bank" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = users.bank_id
    )
  );

-- Banks policies
CREATE POLICY "Anyone can view active banks" ON banks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Bank employees can manage their bank" ON banks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = banks.id
    )
  );

-- Branches policies
CREATE POLICY "Anyone can view active branches" ON branches
  FOR SELECT USING (is_active = true);

CREATE POLICY "Bank employees can manage branches in their bank" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = branches.bank_id
    )
  );

-- Customers policies
CREATE POLICY "Bank employees can view customers in their bank" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = customers.bank_id
    )
  );

CREATE POLICY "Bank employees can manage customers in their bank" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = customers.bank_id
    )
  );

-- Accounts policies
CREATE POLICY "Bank employees can view accounts in their bank" ON accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = accounts.bank_id
    )
  );

CREATE POLICY "Bank employees can manage accounts in their bank" ON accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.bank_id = accounts.bank_id
    )
  );

-- Transactions policies
CREATE POLICY "Bank employees can view transactions in their bank" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a 
      JOIN users u ON u.bank_id = a.bank_id 
      WHERE a.id = transactions.account_id 
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Bank employees can create transactions in their bank" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts a 
      JOIN users u ON u.bank_id = a.bank_id 
      WHERE a.id = transactions.account_id 
      AND u.id = auth.uid()
    )
  );
`;

// Function to run migrations
const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');

    // Execute the SQL to create tables
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createTablesSQL });

    if (error) {
      logger.error('Migration failed:', error);
      throw error;
    }

    logger.info('Database migrations completed successfully');
    
    // Test the connection
    const { data, error: testError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      logger.error('Connection test failed:', testError);
      throw testError;
    }

    logger.info('Database connection test successful');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations }; 