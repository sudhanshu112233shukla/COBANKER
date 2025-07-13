const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // We'll handle sessions with JWT
      detectSessionInUrl: false,
    },
  }
);

// Create admin client for service role operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
    
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

// Initialize database tables if they don't exist
const initializeTables = async () => {
  try {
    // This would typically be done through Supabase migrations
    // For now, we'll just log that tables should be created
    logger.info('Database tables should be created via Supabase migrations');
    
    // Example table structure that should exist:
    // - users (id, email, role, bank_id, branch_id, is_active, created_at)
    // - customers (id, name, email, phone, address, bank_id, branch_id, status)
    // - accounts (id, account_number, customer_id, account_type, balance, status)
    // - transactions (id, account_id, type, amount, description, created_at)
    // - branches (id, name, bank_id, address, contact_info)
    // - banks (id, name, code, address, contact_info)
    
  } catch (error) {
    logger.error('Failed to initialize tables:', error);
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  initializeTables,
}; 