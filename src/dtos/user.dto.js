const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required'
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username must not exceed 30 characters',
    'any.required': 'Username is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.max': 'Password must not exceed 100 characters',
    'any.required': 'Password is required'
  }),
  bio: Joi.string().max(500).allow('', null).optional(),
  avatar: Joi.string().uri().allow('', null).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

// Schema cho update profile - chỉ hỗ trợ form-data
// Note: Avatar là file upload, không phải URL
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().allow(''),
  username: Joi.string().alphanum().min(3).max(30).optional().allow(''),
  bio: Joi.string().max(500).allow('', null).optional()
}).unknown(true); // Cho phép các fields khác (như file upload)

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(100).required()
});

const restoreAccountSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  }),
  code: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.length': 'OTP code must be 6 digits',
    'string.pattern.base': 'OTP code must contain only numbers',
    'any.required': 'OTP code is required'
  })
});

const resendOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  restoreAccountSchema,
  verifyEmailSchema,
  resendOTPSchema
};
