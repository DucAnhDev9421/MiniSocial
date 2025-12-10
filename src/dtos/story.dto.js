const Joi = require('joi');

const createStorySchema = Joi.object({
  media: Joi.string().uri().required().messages({
    'string.uri': 'Media must be a valid URL',
    'any.required': 'Media URL is required'
  }),
  mediaType: Joi.string().valid('image', 'video').default('image'),
  caption: Joi.string().max(200).allow('', null).optional()
});

module.exports = {
  createStorySchema
};

