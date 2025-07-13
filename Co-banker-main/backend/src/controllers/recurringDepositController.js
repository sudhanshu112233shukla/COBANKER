const { RecurringDeposit, RecurringDepositPayment } = require('../models/RecurringDeposit');
const Joi = require('joi');

// Helper: Generate payment schedule
function generateSchedule(startDate, frequency, totalInstallments, amount) {
  const schedule = [];
  let current = new Date(startDate);
  for (let i = 0; i < totalInstallments; i++) {
    schedule.push({
      due_date: new Date(current),
      amount,
      status: 'due',
    });
    if (frequency === 'monthly') current.setMonth(current.getMonth() + 1);
    else if (frequency === 'weekly') current.setDate(current.getDate() + 7);
  }
  return schedule;
}

module.exports = {
  // Create a new RD and generate payment schedule
  async createRecurringDeposit(req, res) {
    const schema = Joi.object({
      account_id: Joi.string().required(),
      member_id: Joi.string().required(),
      start_date: Joi.date().required(),
      amount_per_installment: Joi.number().positive().required(),
      frequency: Joi.string().valid('monthly', 'weekly').required(),
      total_installments: Joi.number().integer().positive().required(),
      interest_rate: Joi.number().positive().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    // Calculate end date
    let endDate = new Date(value.start_date);
    if (value.frequency === 'monthly') endDate.setMonth(endDate.getMonth() + value.total_installments);
    else if (value.frequency === 'weekly') endDate.setDate(endDate.getDate() + 7 * value.total_installments);

    // Create RD
    const { data: rd, error: rdError } = await RecurringDeposit.create({
      ...value,
      end_date: endDate,
      status: 'active',
    });
    if (rdError) return res.status(500).json({ success: false, error: rdError.message });

    // Generate payment schedule
    const schedule = generateSchedule(value.start_date, value.frequency, value.total_installments, value.amount_per_installment);
    for (const payment of schedule) {
      await RecurringDepositPayment.create({
        rd_id: rd.id,
        due_date: payment.due_date,
        amount: payment.amount,
        status: payment.status,
      });
    }
    return res.status(201).json({ success: true, data: rd });
  },

  // Get RD by ID
  async getRecurringDeposit(req, res) {
    const { id } = req.params;
    const { data: rd, error } = await RecurringDeposit.findById(id);
    if (error || !rd) return res.status(404).json({ success: false, error: 'RD not found' });
    return res.json({ success: true, data: rd });
  },

  // List RDs by member
  async listByMember(req, res) {
    const { member_id } = req.query;
    const { data, error } = await RecurringDeposit.listByMember(member_id);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  },

  // Make a payment
  async payInstallment(req, res) {
    const schema = Joi.object({ payment_id: Joi.string().required() });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });
    // Mark payment as paid
    const { data: payment, error: payError } = await RecurringDepositPayment.update(value.payment_id, { paid_date: new Date(), status: 'paid' });
    if (payError) return res.status(500).json({ success: false, error: payError.message });
    return res.json({ success: true, data: payment });
  },

  // Close RD early (with penalty)
  async closeEarly(req, res) {
    const { id } = req.params;
    const result = await RecurringDeposit.closeEarly(id);
    if (result.error) return res.status(404).json({ success: false, error: result.error });
    return res.json({ success: true, penalty: result.penalty });
  },

  // Calculate penalty for missed payments
  async calculatePenalty(req, res) {
    const { id } = req.params;
    const penalty = await RecurringDeposit.calculatePenalty(id);
    return res.json({ success: true, penalty });
  },
}; 