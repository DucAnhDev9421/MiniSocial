const Joi = require('joi');

const createPostSchema = Joi.object({
  content: Joi.string().max(5000).required().messages({
    'string.max': 'Post content must not exceed 5000 characters',
    'any.required': 'Content is required'
  }),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  visibility: Joi.string().valid('public', 'friends', 'private').default('public')
});

const updatePostSchema = Joi.object({
  content: Joi.string().max(5000).optional(),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  visibility: Joi.string().valid('public', 'friends', 'private').optional()
});

const queryPostsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  userId: Joi.string().optional(),
  cursor: Joi.string().optional() // For cursor-based pagination
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  queryPostsSchema
};

