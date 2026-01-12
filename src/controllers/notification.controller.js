const Notification = require('../models/mongodb/notification.model');
const { DEFAULT_PAGE, DEFAULT_LIMIT } = require('../utils/constants');
const neo4jService = require('../services/neo4j.service');

/**
 * Lấy danh sách notifications của user hiện tại
 * GET /api/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const { type, isRead } = req.query;

    // Build query
    const query = { recipient: userId };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Lấy notifications
    let notifications = await Notification.find(query)
      .populate('sender', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit * 2) // Lấy nhiều hơn để bù cho việc lọc
      .lean();

    // Lấy danh sách bạn bè để kiểm tra và lọc bỏ thông báo friend_request nếu đã là bạn
    let friendIdsSet = new Set();
    try {
      const friendIds = await neo4jService.getFriends(userId, 1, 1000);
      friendIdsSet = new Set(friendIds);
    } catch (error) {
      console.warn('⚠️  Could not get friends list:', error.message);
    }

    // Lọc bỏ thông báo friend_request nếu sender đã là bạn
    notifications = notifications.filter(notif => {
      if (notif.type === 'friend_request' && notif.sender) {
        const senderId = notif.sender._id.toString();
        return !friendIdsSet.has(senderId);
      }
      return true;
    });

    // Giới hạn lại số lượng sau khi lọc
    notifications = notifications.slice(0, limit);

    // Format response
    const formattedNotifications = notifications.map(notif => ({
      id: notif._id,
      type: notif.type,
      sender: notif.sender ? {
        id: notif.sender._id,
        name: notif.sender.name,
        username: notif.sender.username,
        avatar: notif.sender.avatar
      } : null,
      message: notif.message,
      entityType: notif.entityType,
      entityId: notif.entityId,
      isRead: notif.isRead,
      readAt: notif.readAt,
      createdAt: notif.createdAt
    }));

    // Đếm tổng số notifications
    const totalQuery = { recipient: userId };
    if (type) {
      totalQuery.type = type;
    }
    if (isRead !== undefined) {
      totalQuery.isRead = isRead === 'true';
    }

    const total = await Notification.countDocuments(totalQuery);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({
      notifications: formattedNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy số lượng notifications chưa đọc
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.userId;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({
      unreadCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đánh dấu notification là đã đọc
 * PUT /api/notifications/:notificationId/read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    // Kiểm tra user có phải là recipient không
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Đánh dấu đã đọc
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đánh dấu tất cả notifications là đã đọc
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    res.json({
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa notification
 * DELETE /api/notifications/:notificationId
 */
async function deleteNotification(req, res, next) {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    // Kiểm tra user có phải là recipient không
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};

