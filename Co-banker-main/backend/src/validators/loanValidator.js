const Joi = require('joi');

const loanCreateSchema = Joi.object({
  member_id: Joi.string().uuid().required(),
  branch_id: Joi.string().uuid().required(),
  loan_type: Joi.string().valid('personal', 'business', 'gold', 'education', 'vehicle', 'home').required(),
  loan_amount: Joi.number().positive().required(),
  interest_rate: Joi.number().positive().required(),
  repayment_term: Joi.number().integer().positive().required(),
  maturity_date: Joi.date().iso().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'disbursed', 'closed').optional(),
  repayment_status: Joi.string().valid('ongoing', 'completed', 'defaulted').optional(),
});

const loanUpdateSchema = Joi.object({
  loan_type: Joi.string().valid('personal', 'business', 'gold', 'education', 'vehicle', 'home'),
  loan_amount: Joi.number().positive(),
  interest_rate: Joi.number().positive(),
  repayment_term: Joi.number().integer().positive(),
  maturity_date: Joi.date().iso(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'disbursed', 'closed'),
  repayment_status: Joi.string().valid('ongoing', 'completed', 'defaulted'),
});

module.exports = {
  loanCreateSchema,
  loanUpdateSchema,
}; 