const FriendRequest = require('../models/mongodb/friendRequest.model');
const User = require('../models/mongodb/user.model');
const neo4jService = require('../services/neo4j.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/constants');

/**
 * Gửi lời mời kết bạn
 * POST /api/friends/request
 */
async function sendFriendRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { receiverId } = req.body;

    if (userId === receiverId) {
      return res.status(400).json({ 
        message: 'Cannot send friend request to yourself' 
      });
    }

    // Kiểm tra receiver tồn tại
    const receiver = await User.findByIdActive(receiverId);
    if (!receiver) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Kiểm tra đã là bạn bè chưa
    try {
      const isFriend = await neo4jService.checkFriendStatus(userId, receiverId);
      if (isFriend) {
        return res.status(400).json({ 
          message: 'Already friends' 
        });
      }
    } catch (error) {
      // Ignore Neo4j errors
    }

    // Kiểm tra đã có request chưa
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.sender.toString() === userId) {
          return res.status(400).json({ 
            message: 'Friend request already sent' 
          });
        } else {
          return res.status(400).json({ 
            message: 'You have a pending friend request from this user' 
          });
        }
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ 
          message: 'Already friends' 
        });
      }
    }

    // Tạo friend request
    const friendRequest = new FriendRequest({
      sender: userId,
      receiver: receiverId,
      status: 'pending'
    });

    await friendRequest.save();

    res.status(201).json({
      message: 'Friend request sent successfully',
      request: {
        id: friendRequest._id,
        senderId: friendRequest.sender,
        receiverId: friendRequest.receiver,
        status: friendRequest.status,
        createdAt: friendRequest.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Chấp nhận lời mời kết bạn
 * PUT /api/friends/request/:requestId/accept
 */
async function acceptFriendRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ 
        message: 'Friend request not found or already processed' 
      });
    }

    // Cập nhật status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Tạo quan hệ bạn bè trong Neo4j
    try {
      await neo4jService.createFriend(
        friendRequest.sender.toString(),
        friendRequest.receiver.toString()
      );
    } catch (error) {
      console.warn('⚠️  Could not create Neo4j friend relationship:', error.message);
    }

    // Tăng friendsCount cho cả 2 users (nếu có field này)
    // Note: Có thể cần thêm field friendsCount vào User model

    res.json({
      message: 'Friend request accepted successfully',
      request: {
        id: friendRequest._id,
        senderId: friendRequest.sender,
        receiverId: friendRequest.receiver,
        status: friendRequest.status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Từ chối/Xóa lời mời kết bạn
 * DELETE /api/friends/request/:requestId
 */
async function deleteFriendRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      $or: [
        { sender: userId },
        { receiver: userId }
      ],
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ 
        message: 'Friend request not found' 
      });
    }

    // Xóa request
    await friendRequest.deleteOne();

    res.json({
      message: 'Friend request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hủy kết bạn
 * DELETE /api/friends/:friendId
 */
async function unfriend(req, res, next) {
  try {
    const userId = req.user.userId;
    const { friendId } = req.params;

    if (userId === friendId) {
      return res.status(400).json({ 
        message: 'Cannot unfriend yourself' 
      });
    }

    // Kiểm tra có phải bạn bè không
    const isFriend = await neo4jService.checkFriendStatus(userId, friendId);
    if (!isFriend) {
      return res.status(400).json({ 
        message: 'Not friends' 
      });
    }

    // Xóa quan hệ bạn bè trong Neo4j
    try {
      await neo4jService.deleteFriend(userId, friendId);
    } catch (error) {
      console.warn('⚠️  Could not delete Neo4j friend relationship:', error.message);
    }

    // Cập nhật status của friend requests thành 'cancelled'
    await FriendRequest.updateMany(
      {
        $or: [
          { sender: userId, receiver: friendId },
          { sender: friendId, receiver: userId }
        ],
        status: 'accepted'
      },
      { status: 'cancelled' }
    );

    // Nếu đang follow, có thể hủy follow (optional)
    try {
      const isFollowing = await neo4jService.checkFollowStatus(userId, friendId);
      if (isFollowing) {
        await neo4jService.unfollowUser(userId, friendId);
        // Giảm counts
        await User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } });
        await User.findByIdAndUpdate(friendId, { $inc: { followersCount: -1 } });
      }
    } catch (error) {
      // Ignore errors
    }

    res.json({
      message: 'Unfriended successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách bạn bè
 * GET /api/friends?page=1&limit=20
 */
async function getFriends(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));

    // Lấy danh sách friend IDs từ Neo4j
    let friendIds = [];
    try {
      friendIds = await neo4jService.getFriends(userId, pageNum, limitNum);
    } catch (error) {
      console.warn('⚠️  Could not get friends from Neo4j:', error.message);
    }

    if (friendIds.length === 0) {
      return res.json({
        friends: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0
        }
      });
    }

    // Lấy thông tin users từ MongoDB
    const friends = await User.findActive({ 
      _id: { $in: friendIds } 
    })
    .select('name username avatar bio followersCount followingCount isVerified')
    .limit(limitNum);

    // Sắp xếp theo thứ tự trong friendIds
    const friendsMap = new Map(friends.map(f => [f._id.toString(), f]));
    const sortedFriends = friendIds
      .map(id => friendsMap.get(id))
      .filter(Boolean);

    // Count total (có thể cần query riêng từ Neo4j)
    // Tạm thời dùng length của friendIds
    const total = friendIds.length; // Cần cải thiện để lấy total chính xác

    res.json({
      friends: sortedFriends.map(friend => ({
        id: friend._id,
        name: friend.name,
        username: friend.username,
        avatar: friend.avatar,
        bio: friend.bio,
        followersCount: friend.followersCount,
        followingCount: friend.followingCount,
        isVerified: friend.isVerified
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách friend requests (sent và received)
 * GET /api/friends/requests?type=sent|received
 */
async function getFriendRequests(req, res, next) {
  try {
    const userId = req.user.userId;
    const { type = 'received', page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'sent') {
      query = { sender: userId, status: 'pending' };
    } else {
      query = { receiver: userId, status: 'pending' };
    }

    const requests = await FriendRequest.find(query)
      .populate(type === 'sent' ? 'receiver' : 'sender', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await FriendRequest.countDocuments(query);

    res.json({
      requests: requests.map(req => ({
        id: req._id,
        [type === 'sent' ? 'receiver' : 'sender']: {
          id: type === 'sent' ? req.receiver._id : req.sender._id,
          name: type === 'sent' ? req.receiver.name : req.sender.name,
          username: type === 'sent' ? req.receiver.username : req.sender.username,
          avatar: type === 'sent' ? req.receiver.avatar : req.sender.avatar
        },
        status: req.status,
        createdAt: req.createdAt
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  unfriend,
  getFriends,
  getFriendRequests
};

