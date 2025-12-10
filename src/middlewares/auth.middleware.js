const { verifyAccessToken } = require('../utils/jwt');
const TokenBlacklist = require('../models/mongodb/tokenBlacklist.model');

/**
 * Middleware xác thực JWT token (required)
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Kiểm tra token có trong blacklist không
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded; // Lưu thông tin user vào request (userId, email, username)
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    return res.status(403).json({ message: 'Token verification failed' });
  }
}

/**
 * Middleware xác thực JWT token (optional - không bắt buộc)
 * Nếu có token thì verify, không có thì để req.user = null
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    // Nếu token không hợp lệ, bỏ qua (không block request)
    req.user = null;
    next();
  }
}

/**
 * Middleware kiểm tra user có phải là chủ sở hữu resource không
 */
function authorizeOwner(req, res, next) {
  const resourceUserId = req.params.userId || req.body.userId;
  const currentUserId = req.user.userId;

  if (resourceUserId && resourceUserId !== currentUserId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
}

module.exports = { authenticateToken, optionalAuthenticate, authorizeOwner };

