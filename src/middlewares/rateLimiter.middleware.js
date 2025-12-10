const rateLimit = require('express-rate-limit');

/**
 * Rate limiter cho API endpoints chung
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 requests
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter cho authentication endpoints (đăng ký, đăng nhập)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 requests
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter cho các thao tác write (tạo post, comment)
 */
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 10, // Tối đa 10 requests
  message: 'Too many write operations, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, writeLimiter };

