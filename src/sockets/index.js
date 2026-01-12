/**
 * Socket.io setup cho realtime chat
 * File này sẽ được tích hợp vào server chính
 */

const { verifyAccessToken } = require('../utils/jwt');

function setupSocket(io) {
  // Store active users
  const activeUsers = new Map(); // userId -> socketId

  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Cho phép kết nối nhưng không authenticate (optional)
      socket.userId = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      // Cho phép kết nối nhưng không authenticate
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'UserId:', socket.userId || 'Anonymous');

    // User joins their personal room (yêu cầu authentication)
    socket.on('join', (userId) => {
      if (!socket.userId) {
        return socket.emit('error', { message: 'Authentication required' });
      }

      if (userId && userId === socket.userId) {
        socket.join(`user_${userId}`);
        activeUsers.set(userId, socket.id);
        console.log(`User ${userId} joined room user_${userId}`);
        socket.emit('joined', { userId });
      } else {
        socket.emit('error', { message: 'Invalid user ID' });
      }
    });

    // Handle new message (realtime notification)
    socket.on('new_message', (data) => {
      if (!socket.userId) return;
      
      const { conversationId, recipientId, messageData } = data;
      
      // Emit to recipient's room
      socket.to(`user_${recipientId}`).emit('new_message', {
        conversationId,
        message: messageData,
        senderId: socket.userId
      });
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      if (!socket.userId) return;
      
      const { conversationId, recipientId } = data;
      socket.to(`user_${recipientId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      if (!socket.userId) return;
      
      const { conversationId, recipientId } = data;
      socket.to(`user_${recipientId}`).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle notification (server-side emit, không cần client gửi)
    // Sẽ được gọi từ notification service

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from active users
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}

module.exports = setupSocket;

