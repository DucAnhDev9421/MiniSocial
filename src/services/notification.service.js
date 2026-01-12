const Notification = require('../models/mongodb/notification.model');
const User = require('../models/mongodb/user.model');

/**
 * Service để tự động tạo notifications
 */

/**
 * Tạo notification và emit qua Socket.io nếu user đang online
 */
async function createNotification(data, io = null) {
  try {
    const { recipientId, senderId, type, entityType, entityId, message } = data;

    // Kiểm tra recipient có tồn tại không
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.warn(`⚠️  Recipient ${recipientId} not found for notification`);
      return null;
    }

    // Không tạo notification nếu user tự tương tác với chính mình
    if (recipientId === senderId) {
      return null;
    }

    // Tạo notification
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      entityType,
      entityId,
      message
    });

    await notification.save();

    // Populate sender info
    await notification.populate('sender', 'name username avatar');

    // Emit qua Socket.io nếu có
    if (io) {
      io.to(`user_${recipientId}`).emit('new_notification', {
        id: notification._id,
        type: notification.type,
        sender: {
          id: notification.sender._id,
          name: notification.sender.name,
          username: notification.sender.username,
          avatar: notification.sender.avatar
        },
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
}

/**
 * Tạo notification khi user follow
 */
async function notifyFollow(recipientId, senderId, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  return createNotification({
    recipientId,
    senderId,
    type: 'follow',
    entityType: 'user',
    entityId: senderId,
    message: `${sender.name} started following you`
  }, io);
}

/**
 * Tạo notification khi user like post
 */
async function notifyPostLike(recipientId, senderId, postId, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  return createNotification({
    recipientId,
    senderId,
    type: 'like',
    entityType: 'post',
    entityId: postId,
    message: `${sender.name} liked your post`
  }, io);
}

/**
 * Tạo notification khi user like comment
 */
async function notifyCommentLike(recipientId, senderId, commentId, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  return createNotification({
    recipientId,
    senderId,
    type: 'like',
    entityType: 'comment',
    entityId: commentId,
    message: `${sender.name} liked your comment`
  }, io);
}

/**
 * Tạo notification khi user comment on post
 */
async function notifyPostComment(recipientId, senderId, postId, commentId, commentContent, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  // Rút ngắn comment content nếu quá dài
  const shortContent = commentContent.length > 50 
    ? commentContent.substring(0, 50) + '...' 
    : commentContent;

  return createNotification({
    recipientId,
    senderId,
    type: 'comment',
    entityType: 'post',
    entityId: postId,
    message: `${sender.name} commented on your post: "${shortContent}"`
  }, io);
}

/**
 * Tạo notification khi user reply to comment
 */
async function notifyCommentReply(recipientId, senderId, commentId, replyContent, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  // Rút ngắn reply content nếu quá dài
  const shortContent = replyContent.length > 50 
    ? replyContent.substring(0, 50) + '...' 
    : replyContent;

  return createNotification({
    recipientId,
    senderId,
    type: 'comment',
    entityType: 'comment',
    entityId: commentId,
    message: `${sender.name} replied to your comment: "${shortContent}"`
  }, io);
}

/**
 * Tạo notification khi user nhận message mới
 */
async function notifyNewMessage(recipientId, senderId, conversationId, messageContent, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  // Rút ngắn message content nếu quá dài
  const shortContent = messageContent.length > 50 
    ? messageContent.substring(0, 50) + '...' 
    : messageContent;

  return createNotification({
    recipientId,
    senderId,
    type: 'message',
    entityType: 'message',
    entityId: conversationId,
    message: `${sender.name} sent you a message: "${shortContent}"`
  }, io);
}

/**
 * Tạo notification khi user gửi friend request
 */
async function notifyFriendRequest(recipientId, senderId, friendRequestId, io = null) {
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  // Xóa các thông báo friend request cũ từ cùng người gửi đến cùng người nhận
  // Để đảm bảo chỉ có 1 thông báo friend request từ 1 người
  await Notification.deleteMany({
    recipient: recipientId,
    sender: senderId,
    type: 'friend_request',
    entityType: 'friend_request'
  });

  return createNotification({
    recipientId,
    senderId,
    type: 'friend_request',
    entityType: 'friend_request',
    entityId: friendRequestId,
    message: `${sender.name} sent you a friend request`
  }, io);
}

/**
 * Tạo notification khi user đăng bài mới
 * Gửi cho tất cả followers và những người đang follow (mutual friends)
 */
async function notifyNewPost(senderId, postId, postContent, visibility, io = null) {
  const neo4jService = require('./neo4j.service');
  const sender = await User.findById(senderId).select('name username');
  if (!sender) return null;

  try {
    // Lấy danh sách followers (những người đang follow user này)
    let followerIds = [];
    try {
      followerIds = await neo4jService.getFollowerIds(senderId);
    } catch (error) {
      console.warn('⚠️  Could not get followers list from Neo4j:', error.message);
    }

    // Lấy danh sách following (những người user này đang follow - mutual friends)
    let followingIds = [];
    try {
      followingIds = await neo4jService.getFollowingIds(senderId);
    } catch (error) {
      console.warn('⚠️  Could not get following list from Neo4j:', error.message);
    }

    // Kết hợp followers và following (loại bỏ trùng lặp)
    const recipientIds = [...new Set([...followerIds, ...followingIds])];

    // Rút ngắn post content nếu quá dài
    const shortContent = postContent.length > 50 
      ? postContent.substring(0, 50) + '...' 
      : postContent;

    // Tạo notification cho tất cả recipients
    const notifications = [];
    for (const recipientId of recipientIds) {
      // Chỉ gửi notification nếu post là public hoặc friends
      // (vì nếu là private thì followers cũng không thấy được)
      if (visibility === 'public' || visibility === 'friends') {
        const notification = await createNotification({
          recipientId,
          senderId,
          type: 'post',
          entityType: 'post',
          entityId: postId,
          message: `${sender.name} posted: "${shortContent}"`
        }, io);
        
        if (notification) {
          notifications.push(notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('❌ Error notifying new post:', error);
    return [];
  }
}

module.exports = {
  createNotification,
  notifyFollow,
  notifyPostLike,
  notifyCommentLike,
  notifyPostComment,
  notifyCommentReply,
  notifyNewMessage,
  notifyFriendRequest,
  notifyNewPost
};

