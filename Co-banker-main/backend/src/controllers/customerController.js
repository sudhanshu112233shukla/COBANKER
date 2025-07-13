const { supabase } = require('../config/database');
const { customerCreateSchema, customerUpdateSchema } = require('../validators/customerValidator');
const { logger } = require('../utils/logger');

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const { error: validationError, value } = customerCreateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Check for unique phone/email
    const { data: existing, error: existErr } = await supabase
      .from('customers')
      .select('customer_id')
      .or(`phone.eq.${value.phone},email.eq.${value.email}`)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Phone or email already exists.' });
    }
    const { data, error } = await supabase
      .from('customers')
      .insert([value])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Create customer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get customer by ID error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = customerUpdateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Prevent updating to duplicate phone/email
    if (value.phone || value.email) {
      const { data: existing } = await supabase
        .from('customers')
        .select('customer_id')
        .or(`phone.eq.${value.phone || ''},email.eq.${value.email || ''}`)
        .neq('customer_id', id)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ success: false, error: 'Phone or email already exists.' });
      }
    }
    const { data, error } = await supabase
      .from('customers')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('customer_id', id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Customer not found or update failed' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Update customer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Deactivate (soft delete) customer
exports.deactivateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('customers')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('customer_id', id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Customer not found or already inactive' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Deactivate customer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 