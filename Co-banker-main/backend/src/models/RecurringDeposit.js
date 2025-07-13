const { supabase } = require('../config/database');

// Recurring Deposit Model
const RecurringDeposit = {
  async create(data) {
    return await supabase.from('recurring_deposits').insert([data]).select().single();
  },
  async findById(id) {
    return await supabase.from('recurring_deposits').select('*').eq('id', id).single();
  },
  async findByAccount(account_id) {
    return await supabase.from('recurring_deposits').select('*').eq('account_id', account_id);
  },
  async update(id, updates) {
    return await supabase.from('recurring_deposits').update(updates).eq('id', id).select().single();
  },
  async listByMember(member_id) {
    return await supabase.from('recurring_deposits').select('*').eq('member_id', member_id);
  },
};

// Penalty calculation for missed payments
const PENALTY_RATE = 0.01; // 1% of installment per missed payment (example)

RecurringDeposit.calculatePenalty = async function(rd_id) {
  // Get all missed payments for this RD
  const { data: payments } = await RecurringDepositPayment.listByRD(rd_id);
  if (!payments) return 0;
  let penalty = 0;
  payments.forEach(payment => {
    if (payment.status === 'missed') {
      penalty += Number(payment.amount) * PENALTY_RATE;
    }
  });
  return penalty;
};

// Early closure logic
RecurringDeposit.closeEarly = async function(rd_id) {
  // Fetch RD
  const { data: rd } = await RecurringDeposit.findById(rd_id);
  if (!rd) return { error: 'RD not found' };
  // Calculate penalty for early closure (e.g., 2% of total principal)
  const totalPrincipal = Number(rd.amount_per_installment) * Number(rd.total_installments);
  const earlyClosurePenalty = totalPrincipal * 0.02; // 2% penalty
  // Update RD status
  await RecurringDeposit.update(rd_id, { status: 'closed' });
  return { penalty: earlyClosurePenalty };
};

// Recurring Deposit Payment Model
const RecurringDepositPayment = {
  async create(data) {
    return await supabase.from('recurring_deposit_payments').insert([data]).select().single();
  },
  async findById(id) {
    return await supabase.from('recurring_deposit_payments').select('*').eq('id', id).single();
  },
  async listByRD(rd_id) {
    return await supabase.from('recurring_deposit_payments').select('*').eq('rd_id', rd_id);
  },
  async update(id, updates) {
    return await supabase.from('recurring_deposit_payments').update(updates).eq('id', id).select().single();
  },
};

module.exports = { RecurringDeposit, RecurringDepositPayment }; 