const Joi = require('joi');

const customerCreateSchema = Joi.object({
  full_name: Joi.string().max(255).required(),
  date_of_birth: Joi.date().iso().required(),
  address: Joi.string().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{10,20}$/).required(),
  email: Joi.string().email().max(255).required(),
  branch_id: Joi.string().uuid().required(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const customerUpdateSchema = Joi.object({
  full_name: Joi.string().max(255),
  date_of_birth: Joi.date().iso(),
  address: Joi.string().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{10,20}$/),
  email: Joi.string().email().max(255),
  branch_id: Joi.string().uuid(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed'),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
}; 