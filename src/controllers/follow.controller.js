const User = require('../models/mongodb/user.model');
const neo4jService = require('../services/neo4j.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/constants');

/**
 * Follow user
 * POST /api/users/:userId/follow
 */
async function followUser(req, res, next) {
  try {
    const followerId = req.user.userId;
    const { userId: targetId } = req.params;

    // Không cho phép follow chính mình
    if (followerId === targetId) {
      return res.status(400).json({ 
        message: 'Cannot follow yourself' 
      });
    }

    // Kiểm tra target user có tồn tại không
    const targetUser = await User.findByIdActive(targetId);
    if (!targetUser) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Kiểm tra đã follow chưa
    const isAlreadyFollowing = await neo4jService.checkFollowStatus(followerId, targetId);
    if (isAlreadyFollowing) {
      return res.status(409).json({ 
        message: 'Already following this user' 
      });
    }

    // Tạo relationship trong Neo4j
    await neo4jService.followUser(followerId, targetId);

    // Cập nhật counts trong MongoDB
    await Promise.all([
      User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } })
    ]);

    // TODO: Tạo notification cho target user

    res.json({
      message: 'Followed successfully',
      following: true
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unfollow user
 * DELETE /api/users/:userId/unfollow
 */
async function unfollowUser(req, res, next) {
  try {
    const followerId = req.user.userId;
    const { userId: targetId } = req.params;

    // Kiểm tra target user có tồn tại không
    const targetUser = await User.findByIdActive(targetId);
    if (!targetUser) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Kiểm tra đã follow chưa
    const isFollowing = await neo4jService.checkFollowStatus(followerId, targetId);
    if (!isFollowing) {
      return res.status(409).json({ 
        message: 'Not following this user' 
      });
    }

    // Xóa relationship trong Neo4j
    await neo4jService.unfollowUser(followerId, targetId);

    // Cập nhật counts trong MongoDB
    await Promise.all([
      User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } })
    ]);

    res.json({
      message: 'Unfollowed successfully',
      following: false
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Kiểm tra follow status
 * GET /api/users/:userId/follow-status
 */
async function getFollowStatus(req, res, next) {
  try {
    const followerId = req.user.userId;
    const { userId: targetId } = req.params;

    // Kiểm tra target user có tồn tại không
    const targetUser = await User.findByIdActive(targetId);
    if (!targetUser) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    const isFollowing = await neo4jService.checkFollowStatus(followerId, targetId);

    res.json({
      isFollowing,
      userId: targetId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách followers
 * GET /api/users/:userId/followers?page=1&limit=20
 */
async function getFollowers(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const currentUserId = req.user ? req.user.userId : null;

    // Kiểm tra user có tồn tại không
    const user = await User.findByIdActive(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Lấy follower IDs từ Neo4j
    const followerIds = await neo4jService.getFollowerIds(userId);

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const paginatedIds = followerIds.slice(skip, skip + limitNum);

    // Lấy thông tin users từ MongoDB
    const followers = await User.find({
      _id: { $in: paginatedIds },
      deletedAt: null
    })
    .select('name username avatar bio followersCount isVerified')
    .sort({ followersCount: -1 });

    // Map theo thứ tự từ Neo4j và thêm follow status nếu có currentUserId
    let followersWithStatus = followers.map(follower => ({
      id: follower._id,
      name: follower.name,
      username: follower.username,
      avatar: follower.avatar,
      bio: follower.bio,
      followersCount: follower.followersCount,
      isVerified: follower.isVerified
    }));

    if (currentUserId) {
      const followStatuses = await Promise.all(
        followers.map(async (follower) => {
          const id = follower._id.toString();
          if (id === currentUserId) return { userId: id, isFollowing: null };
          try {
            const isFollowing = await neo4jService.checkFollowStatus(currentUserId, id);
            return { userId: id, isFollowing };
          } catch (error) {
            return { userId: id, isFollowing: false };
          }
        })
      );

      followersWithStatus = followersWithStatus.map(follower => {
        const status = followStatuses.find(s => s.userId === follower.id.toString());
        return {
          ...follower,
          isFollowing: status ? status.isFollowing : null
        };
      });
    }

    res.json({
      followers: followersWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: followerIds.length,
        pages: Math.ceil(followerIds.length / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách following
 * GET /api/users/:userId/following?page=1&limit=20
 */
async function getFollowing(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const currentUserId = req.user ? req.user.userId : null;

    // Kiểm tra user có tồn tại không
    const user = await User.findByIdActive(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Lấy following IDs từ Neo4j
    const followingIds = await neo4jService.getFollowingIds(userId);

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const paginatedIds = followingIds.slice(skip, skip + limitNum);

    // Lấy thông tin users từ MongoDB
    const following = await User.find({
      _id: { $in: paginatedIds },
      deletedAt: null
    })
    .select('name username avatar bio followersCount isVerified')
    .sort({ followersCount: -1 });

    // Map theo thứ tự từ Neo4j và thêm follow status nếu có currentUserId
    let followingWithStatus = following.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount: user.followersCount,
      isVerified: user.isVerified
    }));

    if (currentUserId) {
      const followStatuses = await Promise.all(
        following.map(async (user) => {
          const id = user._id.toString();
          if (id === currentUserId) return { userId: id, isFollowing: null };
          try {
            const isFollowing = await neo4jService.checkFollowStatus(currentUserId, id);
            return { userId: id, isFollowing };
          } catch (error) {
            return { userId: id, isFollowing: false };
          }
        })
      );

      followingWithStatus = followingWithStatus.map(user => {
        const status = followStatuses.find(s => s.userId === user.id.toString());
        return {
          ...user,
          isFollowing: status ? status.isFollowing : null
        };
      });
    }

    res.json({
      following: followingWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: followingIds.length,
        pages: Math.ceil(followingIds.length / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy gợi ý follow (mutual friends)
 * GET /api/users/suggestions?limit=10
 */
async function getFollowSuggestions(req, res, next) {
  try {
    const currentUserId = req.user.userId;
    const { limit = 10 } = req.query;
    // Đảm bảo limit là integer và trong khoảng hợp lệ
    const limitNum = Math.floor(Math.min(20, Math.max(1, parseInt(limit, 10) || 10)));

    // Lấy suggestions từ Neo4j
    const suggestions = await neo4jService.getFollowSuggestions(currentUserId, limitNum);

    if (suggestions.length === 0) {
      return res.json({
        suggestions: []
      });
    }

    // Lấy thông tin users từ MongoDB
    const userIds = suggestions.map(s => s.id);
    const users = await User.find({
      _id: { $in: userIds },
      deletedAt: null
    })
    .select('name username avatar bio followersCount isVerified');

    // Map với mutualCount từ suggestions
    const suggestionsWithInfo = suggestions.map(suggestion => {
      const user = users.find(u => u._id.toString() === suggestion.id);
      if (!user) return null;
      
      return {
        id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followersCount,
        isVerified: user.isVerified,
        mutualCount: suggestion.mutualCount
      };
    }).filter(Boolean);

    res.json({
      suggestions: suggestionsWithInfo
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getFollowSuggestions
};

