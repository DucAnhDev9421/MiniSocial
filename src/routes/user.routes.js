const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const followController = require('../controllers/follow.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validator.middleware');
const { updateProfileSchema, changePasswordSchema } = require('../dtos/user.dto');

/**
 * Tìm kiếm user (public hoặc authenticated)
 * GET /api/users/search?q=keyword
 */
router.get('/search', optionalAuthenticate, userController.searchUsers);

/**
 * Lấy gợi ý follow (yêu cầu authentication)
 * GET /api/users/suggestions
 */
router.get('/suggestions', authenticateToken, followController.getFollowSuggestions);

/**
 * Lấy thông tin profile user (public hoặc authenticated)
 * GET /api/users/profile/:userId
 */
router.get('/profile/:userId', optionalAuthenticate, userController.getProfile);

/**
 * Cập nhật profile (yêu cầu authentication)
 * PUT /api/users/profile
 * Chỉ hỗ trợ multipart/form-data: name, username, bio (text) + avatar (file) - upload file trực tiếp
 */
router.put(
  '/profile',
  authenticateToken,
  uploadAvatar, // Middleware upload file (optional - không bắt buộc)
  userController.updateProfile
);

/**
 * Đổi password (yêu cầu authentication)
 * PATCH /api/users/password
 */
router.patch(
  '/password',
  authenticateToken,
  validate(changePasswordSchema, 'body'),
  userController.changePassword
);

/**
 * Lấy posts của user (sẽ implement sau)
 * GET /api/users/:userId/posts
 */
router.get('/:userId/posts', optionalAuthenticate, userController.getUserPosts);

/**
 * Follow user (yêu cầu authentication)
 * POST /api/users/:userId/follow
 */
router.post('/:userId/follow', authenticateToken, followController.followUser);

/**
 * Unfollow user (yêu cầu authentication)
 * DELETE /api/users/:userId/unfollow
 */
router.delete('/:userId/unfollow', authenticateToken, followController.unfollowUser);

/**
 * Kiểm tra follow status (yêu cầu authentication)
 * GET /api/users/:userId/follow-status
 */
router.get('/:userId/follow-status', authenticateToken, followController.getFollowStatus);

/**
 * Lấy danh sách followers (public hoặc authenticated)
 * GET /api/users/:userId/followers
 */
router.get('/:userId/followers', optionalAuthenticate, followController.getFollowers);

/**
 * Lấy danh sách following (public hoặc authenticated)
 * GET /api/users/:userId/following
 */
router.get('/:userId/following', optionalAuthenticate, followController.getFollowing);

module.exports = router;
