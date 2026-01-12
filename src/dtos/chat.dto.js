const Joi = require('joi');

const createConversationSchema = Joi.object({
  participantId: Joi.string().required().messages({
    'any.required': 'Participant ID is required',
    'string.empty': 'Participant ID cannot be empty'
  })
});

const sendMessageSchema = Joi.object({
  content: Joi.string().max(5000).required().messages({
    'string.max': 'Message content must not exceed 5000 characters',
    'any.required': 'Content is required',
    'string.empty': 'Content cannot be empty'
  }),
  images: Joi.array().items(Joi.string().uri()).max(10).optional()
});

const queryMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  before: Joi.string().optional() // Message ID for cursor-based pagination
});

const queryConversationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

module.exports = {
  createConversationSchema,
  sendMessageSchema,
  queryMessagesSchema,
  queryConversationsSchema
};

