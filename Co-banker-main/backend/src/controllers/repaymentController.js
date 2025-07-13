const { supabase } = require('../config/database');
const { repaymentCreateSchema, repaymentUpdateSchema } = require('../validators/repaymentValidator');
const { logger } = require('../utils/logger');

// Record a new repayment
exports.createRepayment = async (req, res) => {
  try {
    const { error: validationError, value } = repaymentCreateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError.details[0].message });
    }
    // Check if loan and installment exist
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('loan_id, status')
      .eq('loan_id', value.loan_id)
      .single();
    if (loanError || !loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    if (loan.status !== 'disbursed' && loan.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Repayments can only be recorded for disbursed or approved loans' });
    }
    // Find the repayment schedule entry
    const { data: schedule, error: scheduleError } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', value.loan_id)
      .eq('installment_number', value.installment_number)
      .single();
    if (scheduleError || !schedule) {
      return res.status(404).json({ success: false, error: 'Repayment schedule entry not found' });
    }
    // Update repayment entry
    const { data, error } = await supabase
      .from('loan_repayments')
      .update({
        paid_amount: value.paid_amount,
        paid_date: value.paid_date,
        penalty: value.penalty || 0,
        status: value.paid_amount >= schedule.emi_amount ? 'paid' : 'partial',
        transaction_id: value.transaction_id,
      })
      .eq('repayment_id', schedule.repayment_id)
      .select()
      .single();
    if (error || !data) {
      return res.status(400).json({ success: false, error: 'Failed to record repayment' });
    }
    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Create repayment error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all repayments for a loan
exports.getRepaymentsByLoan = async (req, res) => {
  try {
    const { loan_id } = req.params;
    const { data, error } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', loan_id)
      .order('installment_number', { ascending: true });
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get repayments by loan error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 