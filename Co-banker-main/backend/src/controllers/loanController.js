const { supabase } = require('../config/database');
const { loanCreateSchema, loanUpdateSchema } = require('../validators/loanValidator');
const { logger } = require('../utils/logger');

// Create a new loan
exports.createLoan = async (req, res) => {
  try {
    const { error: validationError, value } = loanCreateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Check if member exists and is active
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('member_id, status')
      .eq('member_id', value.member_id)
      .single();
    if (memberError || !member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    if (member.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Member is not active' });
    }
    // Prevent over-lending: check for ongoing loans
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('loan_id')
      .eq('member_id', value.member_id)
      .eq('repayment_status', 'ongoing');
    if (activeLoans && activeLoans.length > 0) {
      return res.status(400).json({ success: false, error: 'Member has ongoing loans' });
    }
    // Insert loan
    const { data, error } = await supabase
      .from('loans')
      .insert([value])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Create loan error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all loans (with optional filters)
exports.getLoans = async (req, res) => {
  try {
    const { member_id, branch_id, status, repayment_status, loan_type } = req.query;
    let query = supabase.from('loans').select('*');
    if (member_id) query = query.eq('member_id', member_id);
    if (branch_id) query = query.eq('branch_id', branch_id);
    if (status) query = query.eq('status', status);
    if (repayment_status) query = query.eq('repayment_status', repayment_status);
    if (loan_type) query = query.eq('loan_type', loan_type);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get loans error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get loan by ID
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('loan_id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get loan by ID error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Update loan (status, fields)
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = loanUpdateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    const { data, error } = await supabase
      .from('loans')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('loan_id', id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Loan not found or update failed' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Update loan error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Add a guarantor to a loan
exports.addGuarantor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, contact, financial_standing } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Guarantor name is required' });
    }
    // Check if loan exists
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('loan_id')
      .eq('loan_id', id)
      .single();
    if (loanError || !loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    // Insert guarantor
    const { data, error } = await supabase
      .from('guarantors')
      .insert([{ loan_id: id, name, relationship, contact, financial_standing }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Add guarantor error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all guarantors for a loan
exports.getGuarantors = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('guarantors')
      .select('*')
      .eq('loan_id', id);
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get guarantors error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 