const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { createCommentSchema, updateCommentSchema } = require('../dtos/comment.dto');

/**
 * Cập nhật comment (yêu cầu authentication)
 * PUT /api/comments/:commentId
 */
router.put(
  '/:commentId',
  authenticateToken,
  validate(updateCommentSchema, 'body'),
  commentController.updateComment
);

/**
 * Xóa comment (yêu cầu authentication)
 * DELETE /api/comments/:commentId
 */
router.delete('/:commentId', authenticateToken, commentController.deleteComment);

/**
 * Like comment (yêu cầu authentication)
 * POST /api/comments/:commentId/like
 */
router.post('/:commentId/like', authenticateToken, commentController.likeComment);

/**
 * Unlike comment (yêu cầu authentication)
 * DELETE /api/comments/:commentId/unlike
 */
router.delete('/:commentId/unlike', authenticateToken, commentController.unlikeComment);

/**
 * Lấy replies (nested comments) (public hoặc authenticated)
 * GET /api/comments/:commentId/replies
 */
router.get('/:commentId/replies', optionalAuthenticate, commentController.getReplies);

module.exports = router;

