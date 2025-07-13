const Joi = require('joi');

const memberCreateSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  membership_type: Joi.string().valid('regular', 'lifetime', 'honorary').required(),
  voting_eligibility: Joi.boolean().default(false),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  joining_date: Joi.date().iso().optional(),
});

const memberUpdateSchema = Joi.object({
  membership_type: Joi.string().valid('regular', 'lifetime', 'honorary'),
  voting_eligibility: Joi.boolean(),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
  joining_date: Joi.date().iso(),
});

module.exports = {
  memberCreateSchema,
  memberUpdateSchema,
}; 