const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const commentController = require('../controllers/comment.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { createPostSchema, updatePostSchema } = require('../dtos/post.dto');
const { createCommentSchema } = require('../dtos/comment.dto');

/**
 * Tạo post mới (yêu cầu authentication)
 * POST /api/posts
 */
router.post(
  '/',
  authenticateToken,
  validate(createPostSchema, 'body'),
  postController.createPost
);

/**
 * Newsfeed - Posts từ users đang follow (yêu cầu authentication)
 * GET /api/posts/feed
 */
router.get('/feed', authenticateToken, postController.getFeed);

/**
 * Posts trending (public hoặc authenticated)
 * GET /api/posts/trending
 */
router.get('/trending', optionalAuthenticate, postController.getTrending);

/**
 * Lấy chi tiết post (public hoặc authenticated)
 * GET /api/posts/:postId
 */
router.get('/:postId', optionalAuthenticate, postController.getPost);

/**
 * Cập nhật post (yêu cầu authentication)
 * PUT /api/posts/:postId
 */
router.put(
  '/:postId',
  authenticateToken,
  validate(updatePostSchema, 'body'),
  postController.updatePost
);

/**
 * Xóa post (yêu cầu authentication)
 * DELETE /api/posts/:postId
 */
router.delete('/:postId', authenticateToken, postController.deletePost);

/**
 * Like post (yêu cầu authentication)
 * POST /api/posts/:postId/like
 */
router.post('/:postId/like', authenticateToken, postController.likePost);

/**
 * Unlike post (yêu cầu authentication)
 * DELETE /api/posts/:postId/unlike
 */
router.delete('/:postId/unlike', authenticateToken, postController.unlikePost);

/**
 * Lấy danh sách users đã like post (public hoặc authenticated)
 * GET /api/posts/:postId/likes
 */
router.get('/:postId/likes', optionalAuthenticate, postController.getLikes);

/**
 * Tạo comment mới (yêu cầu authentication)
 * POST /api/posts/:postId/comments
 */
router.post(
  '/:postId/comments',
  authenticateToken,
  validate(createCommentSchema, 'body'),
  commentController.createComment
);

/**
 * Lấy comments của post (public hoặc authenticated)
 * GET /api/posts/:postId/comments
 */
router.get('/:postId/comments', optionalAuthenticate, commentController.getComments);

module.exports = router;

