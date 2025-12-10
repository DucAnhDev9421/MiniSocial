const Joi = require('joi');

const followUserSchema = Joi.object({
  targetId: Joi.string().required().messages({
    'any.required': 'Target user ID is required'
  })
});

module.exports = {
  followUserSchema
};

