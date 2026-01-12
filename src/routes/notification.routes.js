const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { queryNotificationsSchema } = require('../dtos/notification.dto');

/**
 * Lấy danh sách notifications của user hiện tại (yêu cầu authentication)
 * GET /api/notifications
 */
router.get(
  '/',
  authenticateToken,
  validate(queryNotificationsSchema, 'query'),
  notificationController.getNotifications
);

/**
 * Lấy số lượng notifications chưa đọc (yêu cầu authentication)
 * GET /api/notifications/unread-count
 */
router.get(
  '/unread-count',
  authenticateToken,
  notificationController.getUnreadCount
);

/**
 * Đánh dấu notification là đã đọc (yêu cầu authentication)
 * PUT /api/notifications/:notificationId/read
 */
router.put(
  '/:notificationId/read',
  authenticateToken,
  notificationController.markAsRead
);

/**
 * Đánh dấu tất cả notifications là đã đọc (yêu cầu authentication)
 * PUT /api/notifications/read-all
 */
router.put(
  '/read-all',
  authenticateToken,
  notificationController.markAllAsRead
);

/**
 * Xóa notification (yêu cầu authentication)
 * DELETE /api/notifications/:notificationId
 */
router.delete(
  '/:notificationId',
  authenticateToken,
  notificationController.deleteNotification
);

module.exports = router;

