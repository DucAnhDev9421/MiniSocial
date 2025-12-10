const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const validate = require('../middlewares/validator.middleware');
const { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  restoreAccountSchema,
  verifyEmailSchema,
  resendOTPSchema
} = require('../dtos/user.dto');

/**
 * Đăng ký user mới
 * POST /api/auth/register
 */
router.post(
  '/register',
  authLimiter, // Rate limit cho auth endpoints
  validate(registerSchema, 'body'),
  authController.register
);

/**
 * Đăng nhập
 * POST /api/auth/login
 */
router.post(
  '/login',
  authLimiter, // Rate limit cho auth endpoints
  validate(loginSchema, 'body'),
  authController.login
);

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema, 'body'),
  authController.refreshToken
);

/**
 * Lấy thông tin user hiện tại (yêu cầu authentication)
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * Đăng xuất (yêu cầu authentication)
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * Xóa tài khoản mềm (yêu cầu authentication)
 * DELETE /api/auth/account
 */
router.delete('/account', authenticateToken, authController.deleteAccount);

/**
 * Khôi phục tài khoản (không cần authentication - dùng email + password)
 * POST /api/auth/restore
 */
router.post(
  '/restore',
  authLimiter,
  validate(restoreAccountSchema, 'body'),
  authController.restoreAccount
);

/**
 * Xác thực email bằng OTP
 * POST /api/auth/verify-email
 */
router.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailSchema, 'body'),
  authController.verifyEmail
);

/**
 * Gửi lại OTP để verify email
 * POST /api/auth/resend-otp
 */
router.post(
  '/resend-otp',
  authLimiter,
  validate(resendOTPSchema, 'body'),
  authController.resendOTP
);

module.exports = router;

