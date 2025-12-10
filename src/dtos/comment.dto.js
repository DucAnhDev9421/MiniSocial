const Joi = require('joi');

const createCommentSchema = Joi.object({
  content: Joi.string().max(1000).required().messages({
    'string.max': 'Comment must not exceed 1000 characters',
    'any.required': 'Content is required'
  }),
  parentCommentId: Joi.string().allow(null, '').optional() // For nested comments (optional)
});

const updateCommentSchema = Joi.object({
  content: Joi.string().max(1000).required()
});

const queryCommentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  postId: Joi.string().required()
});

module.exports = {
  createCommentSchema,
  updateCommentSchema,
  queryCommentsSchema
};

