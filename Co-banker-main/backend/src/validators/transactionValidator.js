const Joi = require('joi');

const transactionCreateSchema = Joi.object({
  account_id: Joi.string().uuid().required(),
  member_id: Joi.string().uuid().required(),
  type: Joi.string().valid('deposit', 'withdrawal', 'loan_repayment', 'inter_branch_transfer').required(),
  amount: Joi.number().positive().required(),
  metadata: Joi.object().optional(),
});

module.exports = {
  transactionCreateSchema,
}; 