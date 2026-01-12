const Conversation = require('../models/mongodb/conversation.model');
const Message = require('../models/mongodb/message.model');
const User = require('../models/mongodb/user.model');
const notificationService = require('../services/notification.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT } = require('../utils/constants');

/**
 * Lấy danh sách conversations của user hiện tại
 * GET /api/conversations
 */
async function getConversations(req, res, next) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    // Tìm conversations mà user là participant
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name username avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response - lấy thông tin user còn lại (không phải current user)
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.participants.find(
        p => p._id.toString() !== userId
      );
      // Handle unreadCount - could be Map (with .get) or plain object (with [])
      const unreadCount = conv.unreadCount 
        ? (conv.unreadCount.get ? conv.unreadCount.get(userId) : conv.unreadCount[userId]) || 0
        : 0;

      return {
        id: conv._id,
        otherUser: otherUser ? {
          id: otherUser._id,
          name: otherUser.name,
          username: otherUser.username,
          avatar: otherUser.avatar
        } : null,
        lastMessage: conv.lastMessage ? {
          id: conv.lastMessage._id,
          content: conv.lastMessage.content,
          senderId: conv.lastMessage.sender?.toString(),
          createdAt: conv.lastMessage.createdAt
        } : null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    // Đếm tổng số conversations
    const total = await Conversation.countDocuments({
      participants: userId
    });

    res.json({
      conversations: formattedConversations,
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
 * Lấy hoặc tạo conversation giữa 2 users
 * GET /api/conversations/:userId
 */
async function getOrCreateConversation(req, res, next) {
  try {
    const userId = req.user.userId;
    const { userId: otherUserId } = req.params;

    if (userId === otherUserId) {
      return res.status(400).json({
        message: 'Cannot create conversation with yourself'
      });
    }

    // Kiểm tra user tồn tại
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Tìm conversation đã tồn tại
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId], $size: 2 }
    })
      .populate('participants', 'name username avatar')
      .populate('lastMessage')
      .lean();

    // Nếu chưa có, tạo mới
    if (!conversation) {
      const newConversation = new Conversation({
        participants: [userId, otherUserId]
      });
      await newConversation.save();

      conversation = await Conversation.findById(newConversation._id)
        .populate('participants', 'name username avatar')
        .lean();
    }

    // Format response
    const otherUserData = conversation.participants.find(
      p => p._id.toString() !== userId
    );
    // Handle unreadCount - could be Map (with .get) or plain object (with [])
    const unreadCount = conversation.unreadCount 
      ? (conversation.unreadCount.get ? conversation.unreadCount.get(userId) : conversation.unreadCount[userId]) || 0
      : 0;

    res.json({
      conversation: {
        id: conversation._id,
        otherUser: otherUserData ? {
          id: otherUserData._id,
          name: otherUserData.name,
          username: otherUserData.username,
          avatar: otherUserData.avatar
        } : null,
        lastMessage: conversation.lastMessage ? {
          id: conversation.lastMessage._id,
          content: conversation.lastMessage.content,
          senderId: conversation.lastMessage.sender?.toString(),
          createdAt: conversation.lastMessage.createdAt
        } : null,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy messages của conversation
 * GET /api/conversations/:conversationId/messages
 */
async function getMessages(req, res, next) {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { before } = req.query; // Cursor-based pagination

    // Kiểm tra user có trong conversation không
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Build query
    const query = {
      conversation: conversationId,
      isDeleted: false
    };

    // Cursor-based pagination: lấy messages trước message có ID = before
    if (before) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // Lấy messages
    const messages = await Message.find(query)
      .populate('sender', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(before ? 0 : skip)
      .lean();

    // Format response
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      content: msg.content,
      images: msg.images || [],
      sender: {
        id: msg.sender._id,
        name: msg.sender.name,
        username: msg.sender.username,
        avatar: msg.sender.avatar
      },
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt
    })).reverse(); // Reverse để hiển thị từ cũ đến mới

    // Đánh dấu messages chưa đọc là đã đọc
    const unreadMessageIds = messages
      .filter(msg => !msg.isRead && msg.sender._id.toString() !== userId)
      .map(msg => msg._id);

    if (unreadMessageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $set: { isRead: true, readAt: new Date() } }
      );

      // Cập nhật unreadCount trong conversation
      const unreadCount = conversation.unreadCount?.get(userId) || 0;
      const newUnreadCount = Math.max(0, unreadCount - unreadMessageIds.length);
      conversation.unreadCount.set(userId, newUnreadCount);
      await conversation.save();
    }

    res.json({
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gửi message mới
 * POST /api/conversations/:conversationId/messages
 */
async function sendMessage(req, res, next) {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { content, images = [] } = req.body;

    // Kiểm tra conversation tồn tại và user có trong conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Validate images
    if (images.length > 10) {
      return res.status(400).json({
        message: 'Maximum 10 images allowed per message'
      });
    }

    // Tạo message mới
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content: content.trim(),
      images
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'name username avatar');

    // Cập nhật conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    // Tăng unreadCount cho user còn lại (không phải sender)
    const otherUserId = conversation.participants.find(
      p => p.toString() !== userId
    );
    if (otherUserId) {
      const currentUnreadCount = conversation.unreadCount?.get(otherUserId.toString()) || 0;
      conversation.unreadCount.set(otherUserId.toString(), currentUnreadCount + 1);
      
      // Tạo notification cho recipient
      const io = req.app.get('io');
      await notificationService.notifyNewMessage(
        otherUserId.toString(),
        userId,
        conversationId,
        content.trim(),
        io
      );
    }

    await conversation.save();

    // Emit realtime message qua Socket.io
    const io = req.app.get('io');
    if (io && otherUserId) {
      io.to(`user_${otherUserId.toString()}`).emit('new_message', {
        conversationId,
        message: {
          id: message._id,
          content: message.content,
          images: message.images,
          sender: {
            id: message.sender._id,
            name: message.sender.name,
            username: message.sender.username,
            avatar: message.sender.avatar
          },
          isRead: message.isRead,
          createdAt: message.createdAt
        },
        senderId: userId
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: message._id,
        content: message.content,
        images: message.images,
        sender: {
          id: message.sender._id,
          name: message.sender.name,
          username: message.sender.username,
          avatar: message.sender.avatar
        },
        isRead: message.isRead,
        readAt: message.readAt,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đánh dấu messages là đã đọc
 * PUT /api/conversations/:conversationId/read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    // Kiểm tra conversation tồn tại và user có trong conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Đánh dấu tất cả messages chưa đọc (không phải của user) là đã đọc
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    // Reset unreadCount
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    res.json({
      message: 'Messages marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa message (soft delete)
 * DELETE /api/messages/:messageId
 */
async function deleteMessage(req, res, next) {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found'
      });
    }

    // Chỉ sender mới có thể xóa message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete
    message.isDeleted = true;
    await message.save();

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage
};

