/**
 * Socket.io setup cho realtime chat
 * File này sẽ được tích hợp vào server chính
 */

function setupSocket(io) {
  // Store active users
  const activeUsers = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins their personal room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        activeUsers.set(userId, socket.id);
        console.log(`User ${userId} joined room user_${userId}`);
      }
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      const { conversationId, recipientId, message } = data;
      
      // Emit to recipient's room
      socket.to(`user_${recipientId}`).emit('new_message', {
        conversationId,
        message,
        senderId: socket.userId
      });
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId, recipientId } = data;
      socket.to(`user_${recipientId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { conversationId, recipientId } = data;
      socket.to(`user_${recipientId}`).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle notification
    socket.on('notification', (data) => {
      const { recipientId, notification } = data;
      socket.to(`user_${recipientId}`).emit('new_notification', notification);
    });

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

