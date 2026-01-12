const Joi = require('joi');

const queryNotificationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  type: Joi.string().valid('follow', 'like', 'comment', 'mention', 'message').optional(),
  isRead: Joi.boolean().optional()
});

module.exports = {
  queryNotificationsSchema
};

