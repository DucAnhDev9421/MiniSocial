const Joi = require('joi');

const sendFriendRequestSchema = Joi.object({
  receiverId: Joi.string().required().messages({
    'any.required': 'Receiver ID is required'
  })
});

const queryFriendsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

const queryFriendRequestsSchema = Joi.object({
  type: Joi.string().valid('sent', 'received').default('received'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

module.exports = {
  sendFriendRequestSchema,
  queryFriendsSchema,
  queryFriendRequestsSchema
};

