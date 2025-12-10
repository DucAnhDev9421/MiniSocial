const User = require('../models/mongodb/user.model');
const TokenBlacklist = require('../models/mongodb/tokenBlacklist.model');
const OTP = require('../models/mongodb/otp.model');
const neo4jService = require('../services/neo4j.service');
const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOTPEmail, sendVerificationSuccessEmail } = require('../services/email.service');

/**
 * Đăng ký user mới
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, username, email, password, bio } = req.body;

    // Kiểm tra email đã tồn tại chưa (chỉ check user chưa bị xóa)
    const existingUserByEmail = await User.findOneActive({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(409).json({ 
        message: 'Email already exists' 
      });
    }

    // Kiểm tra username đã tồn tại chưa (chỉ check user chưa bị xóa)
    const existingUserByUsername = await User.findOneActive({ username: username.toLowerCase() });
    if (existingUserByUsername) {
      return res.status(409).json({ 
        message: 'Username already exists' 
      });
    }

    // Tạo user mới (password sẽ được hash tự động trong pre-save hook)
    const user = new User({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      bio: bio || ''
    });

    await user.save();

    // Tạo node tương ứng trong Neo4j (optional - nếu Neo4j không available thì bỏ qua)
    try {
      await neo4jService.createUserNode({
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email
      });
    } catch (neo4jError) {
      // Nếu Neo4j không available, chỉ log warning nhưng vẫn cho phép đăng ký
      console.warn('⚠️  Could not create Neo4j node (Neo4j may not be configured):', neo4jError.message);
      // Không rollback - user vẫn được tạo trong MongoDB
      // Nếu muốn strict, có thể uncomment dòng dưới:
      // await User.findByIdAndDelete(user._id);
      // throw new Error('Failed to create user. Please try again.');
    }

    // Tạo mã OTP (6 chữ số)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // Xóa các OTP cũ của user này (nếu có)
    await OTP.invalidateUserOTPs(user._id, 'email_verification');

    // Lưu OTP vào database
    const otp = new OTP({
      email: user.email,
      code: otpCode,
      userId: user._id,
      type: 'email_verification',
      expiresAt
    });
    await otp.save();

    // Gửi email OTP
    let emailSent = false;
    let emailError = null;
    try {
      await sendOTPEmail(user.email, otpCode, user.name);
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      console.error('❌ Error sending OTP email:', err);
      // Không throw error - user vẫn được tạo, có thể resend OTP sau
    }

    // Tạo tokens (user vẫn có thể đăng nhập nhưng cần verify email)
    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    });

    // Trả về user và tokens (thông báo cần verify email)
    const responseMessage = emailSent
      ? 'User registered successfully. Please verify your email with the OTP code sent to your email.'
      : 'User registered successfully. However, we could not send the OTP email. Please use /api/auth/resend-otp to receive the verification code.';

    res.status(201).json({
      message: responseMessage,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      tokens,
      requiresEmailVerification: true,
      ...(emailError && { emailError: 'Email service is not configured. Please check your .env file.' })
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng nhập
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Tìm user và include password (vì mặc định select: false) - chỉ tìm user chưa bị xóa
    const user = await User.findOneActive({ email: email.toLowerCase() })
      .select('+password');

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Account is deactivated' 
      });
    }

    // So sánh password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Tạo tokens
    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    });

    // Trả về user và tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      tokens
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        message: 'Refresh token is required' 
      });
    }

    // Kiểm tra refresh token có trong blacklist không
    const isBlacklisted = await TokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      return res.status(401).json({ 
        message: 'Refresh token has been revoked' 
      });
    }

    // Verify refresh token
    const { verifyRefreshToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    // Tìm user (chỉ tìm user chưa bị xóa)
    const user = await User.findByIdActive(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        message: 'Invalid refresh token' 
      });
    }

    // Tạo access token mới
    const { generateAccessToken } = require('../utils/jwt');
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken // Giữ nguyên refresh token (có thể tạo mới nếu muốn)
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Invalid or expired refresh token' 
      });
    }
    next(error);
  }
}

/**
 * Lấy thông tin user hiện tại (sau khi đã authenticate)
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    // Chỉ tìm user chưa bị xóa
    const user = await User.findByIdActive(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng xuất - Thêm token vào blacklist
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({ 
        message: 'Token is required' 
      });
    }

    // Verify token để lấy thông tin (kiểm tra xem token có hợp lệ không)
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // Nếu token đã hết hạn hoặc không hợp lệ, vẫn cho phép logout (client có thể xóa token)
      return res.json({
        message: 'Logged out successfully'
      });
    }

    // Tính toán thời gian hết hạn của token (từ payload exp)
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);

    // Thêm token vào blacklist
    await TokenBlacklist.blacklistToken(
      token,
      'access',
      decoded.userId,
      expiresAt
    );

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa tài khoản mềm (soft delete)
 * DELETE /api/auth/account
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.userId;

    // Tìm user (chỉ tìm user chưa bị xóa)
    const user = await User.findByIdActive(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Soft delete user
    await user.softDelete();

    // Xóa node trong Neo4j (nếu có)
    try {
      await neo4jService.deleteUserNode(userId);
    } catch (neo4jError) {
      // Log warning nhưng không fail request nếu Neo4j lỗi
      console.warn('⚠️  Could not delete Neo4j node:', neo4jError.message);
    }

    // Blacklist tất cả tokens của user này bằng cách thêm access token hiện tại vào blacklist
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
        await TokenBlacklist.blacklistToken(
          token,
          'access',
          userId,
          expiresAt
        );
      } catch (error) {
        // Ignore if token is invalid
      }
    }

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Khôi phục tài khoản (restore soft deleted account)
 * POST /api/auth/restore
 */
async function restoreAccount(req, res, next) {
  try {
    const { email, password } = req.body;

    // Tìm user đã bị xóa (deletedAt không null)
    const user = await User.findOneDeleted({ email: email.toLowerCase() })
      .select('+password');

    if (!user) {
      return res.status(404).json({ 
        message: 'Account not found or already active' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Restore user
    await user.restore();

    // Tạo lại node trong Neo4j (nếu chưa có)
    try {
      await neo4jService.createUserNode({
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email
      });
    } catch (neo4jError) {
      // Log warning nhưng không fail request nếu Neo4j lỗi
      console.warn('⚠️  Could not create Neo4j node:', neo4jError.message);
    }

    // Tạo tokens mới
    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    });

    res.json({
      message: 'Account restored successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      tokens
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xác thực OTP để verify email
 * POST /api/auth/verify-email
 */
async function verifyEmail(req, res, next) {
  try {
    const { email, code } = req.body;

    // Tìm user
    const user = await User.findOneActive({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Kiểm tra email đã được verify chưa
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified'
      });
    }

    // Tìm OTP hợp lệ
    const otp = await OTP.findValidOTP(email.toLowerCase(), code, user._id);
    if (!otp) {
      return res.status(400).json({
        message: 'Invalid or expired OTP code'
      });
    }

    // Đánh dấu OTP đã sử dụng
    await otp.markAsUsed();

    // Cập nhật user: đánh dấu email đã verified
    user.emailVerified = true;
    await user.save();

    // Gửi email thông báo xác thực thành công (không block nếu lỗi)
    try {
      await sendVerificationSuccessEmail(user.email, user.name);
    } catch (emailError) {
      console.warn('⚠️  Could not send verification success email:', emailError.message);
    }

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gửi lại OTP để verify email
 * POST /api/auth/resend-otp
 */
async function resendOTP(req, res, next) {
  try {
    const { email } = req.body;

    // Tìm user
    const user = await User.findOneActive({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Kiểm tra email đã được verify chưa
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified'
      });
    }

    // Kiểm tra rate limit: không cho gửi lại OTP quá nhiều lần trong thời gian ngắn
    const recentOTP = await OTP.findOne({
      userId: user._id,
      type: 'email_verification',
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // 1 phút
    });

    if (recentOTP) {
      return res.status(429).json({
        message: 'Please wait before requesting a new OTP code. You can request again in 1 minute.'
      });
    }

    // Tạo mã OTP mới
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // Xóa các OTP cũ của user này
    await OTP.invalidateUserOTPs(user._id, 'email_verification');

    // Lưu OTP mới vào database
    const otp = new OTP({
      email: user.email,
      code: otpCode,
      userId: user._id,
      type: 'email_verification',
      expiresAt
    });
    await otp.save();

    // Gửi email OTP
    try {
      await sendOTPEmail(user.email, otpCode, user.name);
      res.json({
        message: 'OTP code has been sent to your email. Please check your inbox.'
      });
    } catch (emailError) {
      console.error('❌ Error sending OTP email:', emailError);
      
      // Kiểm tra nếu là lỗi config
      const isConfigError = emailError.message.includes('Email configuration is missing') || 
                           emailError.message.includes('Missing credentials');
      
      res.status(500).json({
        message: isConfigError 
          ? 'Email service is not configured. Please contact administrator or check your email configuration in .env file.'
          : 'Failed to send OTP email. Please try again later.',
        ...(isConfigError && { 
          error: emailError.message,
          hint: 'Make sure EMAIL_USER and EMAIL_PASSWORD are set in your .env file'
        })
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  deleteAccount,
  restoreAccount,
  verifyEmail,
  resendOTP
};

