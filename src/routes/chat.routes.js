const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const {
  createConversationSchema,
  sendMessageSchema,
  queryMessagesSchema,
  queryConversationsSchema
} = require('../dtos/chat.dto');

/**
 * Lấy danh sách conversations của user hiện tại (yêu cầu authentication)
 * GET /api/conversations
 */
router.get(
  '/',
  authenticateToken,
  validate(queryConversationsSchema, 'query'),
  chatController.getConversations
);

/**
 * Lấy hoặc tạo conversation với user khác (yêu cầu authentication)
 * GET /api/conversations/:userId
 */
router.get(
  '/:userId',
  authenticateToken,
  chatController.getOrCreateConversation
);

/**
 * Lấy messages của conversation (yêu cầu authentication)
 * GET /api/conversations/:conversationId/messages
 */
router.get(
  '/:conversationId/messages',
  authenticateToken,
  validate(queryMessagesSchema, 'query'),
  chatController.getMessages
);

/**
 * Gửi message mới (yêu cầu authentication)
 * POST /api/conversations/:conversationId/messages
 */
router.post(
  '/:conversationId/messages',
  authenticateToken,
  validate(sendMessageSchema, 'body'),
  chatController.sendMessage
);

/**
 * Đánh dấu messages là đã đọc (yêu cầu authentication)
 * PUT /api/conversations/:conversationId/read
 */
router.put(
  '/:conversationId/read',
  authenticateToken,
  chatController.markAsRead
);

/**
 * Xóa message (yêu cầu authentication)
 * DELETE /api/messages/:messageId
 */
router.delete(
  '/messages/:messageId',
  authenticateToken,
  chatController.deleteMessage
);

module.exports = router;

