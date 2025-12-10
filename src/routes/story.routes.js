const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { createStorySchema } = require('../dtos/story.dto');

/**
 * Tạo story mới (yêu cầu authentication)
 * POST /api/stories
 */
router.post(
  '/',
  authenticateToken,
  validate(createStorySchema, 'body'),
  storyController.createStory
);

/**
 * Lấy stories feed (từ bạn bè và follow, yêu cầu authentication)
 * GET /api/stories/feed
 */
router.get('/feed', authenticateToken, storyController.getStoriesFeed);

/**
 * Lấy stories của user cụ thể (public hoặc authenticated)
 * GET /api/stories/:userId
 */
router.get('/:userId', optionalAuthenticate, storyController.getUserStories);

/**
 * Xóa story (yêu cầu authentication)
 * DELETE /api/stories/:storyId
 */
router.delete('/:storyId', authenticateToken, storyController.deleteStory);

/**
 * Đánh dấu đã xem story (yêu cầu authentication)
 * POST /api/stories/:storyId/view
 */
router.post('/:storyId/view', authenticateToken, storyController.viewStory);

module.exports = router;

