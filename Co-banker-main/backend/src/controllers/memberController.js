const { supabase } = require('../config/database');
const { memberCreateSchema, memberUpdateSchema } = require('../validators/memberValidator');
const { logger } = require('../utils/logger');

// Create a new member
exports.createMember = async (req, res) => {
  try {
    const { error: validationError, value } = memberCreateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id, status')
      .eq('customer_id', value.customer_id)
      .single();
    if (customerError || !customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    if (customer.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Customer is not active' });
    }
    // Prevent duplicate member
    const { data: existing } = await supabase
      .from('members')
      .select('member_id')
      .eq('customer_id', value.customer_id)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Customer is already a member' });
    }
    const { data, error } = await supabase
      .from('members')
      .insert([value])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Create member error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all members
exports.getMembers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get members error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get member by ID
exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('member_id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get member by ID error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = memberUpdateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    const { data, error } = await supabase
      .from('members')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('member_id', id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Member not found or update failed' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Update member error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 