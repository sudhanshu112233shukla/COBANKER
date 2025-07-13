const Joi = require('joi');

const repaymentCreateSchema = Joi.object({
  loan_id: Joi.string().uuid().required(),
  installment_number: Joi.number().integer().positive().required(),
  paid_amount: Joi.number().positive().required(),
  paid_date: Joi.date().iso().required(),
  penalty: Joi.number().min(0).optional(),
  transaction_id: Joi.string().uuid().optional(),
});

const repaymentUpdateSchema = Joi.object({
  paid_amount: Joi.number().positive(),
  paid_date: Joi.date().iso(),
  penalty: Joi.number().min(0),
  status: Joi.string().valid('pending', 'paid', 'overdue', 'partial'),
  transaction_id: Joi.string().uuid(),
});

module.exports = {
  repaymentCreateSchema,
  repaymentUpdateSchema,
}; 