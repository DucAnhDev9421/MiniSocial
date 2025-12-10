const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friend.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { sendFriendRequestSchema } = require('../dtos/friend.dto');

/**
 * Gửi lời mời kết bạn (yêu cầu authentication)
 * POST /api/friends/request
 */
router.post(
  '/request',
  authenticateToken,
  validate(sendFriendRequestSchema, 'body'),
  friendController.sendFriendRequest
);

/**
 * Lấy danh sách friend requests (yêu cầu authentication)
 * GET /api/friends/requests?type=sent|received
 */
router.get('/requests', authenticateToken, friendController.getFriendRequests);

/**
 * Chấp nhận lời mời kết bạn (yêu cầu authentication)
 * PUT /api/friends/request/:requestId/accept
 */
router.put('/request/:requestId/accept', authenticateToken, friendController.acceptFriendRequest);

/**
 * Từ chối/Xóa lời mời kết bạn (yêu cầu authentication)
 * DELETE /api/friends/request/:requestId
 */
router.delete('/request/:requestId', authenticateToken, friendController.deleteFriendRequest);

/**
 * Lấy danh sách bạn bè (yêu cầu authentication)
 * GET /api/friends?page=1&limit=20
 */
router.get('/', authenticateToken, friendController.getFriends);

/**
 * Hủy kết bạn (yêu cầu authentication)
 * DELETE /api/friends/:friendId
 */
router.delete('/:friendId', authenticateToken, friendController.unfriend);

module.exports = router;

