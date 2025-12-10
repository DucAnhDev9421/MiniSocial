const User = require('../models/mongodb/user.model');
const neo4jService = require('../services/neo4j.service');
const { uploadImage, deleteFile } = require('../services/cloudinary.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/constants');

/**
 * Lấy thông tin profile của user
 * GET /api/users/profile/:userId
 */
async function getProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user ? req.user.userId : null; // Optional - có thể là guest

    const user = await User.findByIdActive(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Kiểm tra follow status nếu có currentUserId
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      try {
        isFollowing = await neo4jService.checkFollowStatus(currentUserId, userId);
      } catch (error) {
        // Ignore Neo4j errors
      }
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        isFollowing // Chỉ hiển thị nếu đã login
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật profile
 * PUT /api/users/profile
 * Chỉ hỗ trợ multipart/form-data (upload file trực tiếp)
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, username, bio } = req.body; // Chỉ nhận text fields
    const avatarFile = req.file; // avatar từ file upload (optional)

    const user = await User.findByIdActive(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Xử lý upload avatar nếu có file
    if (avatarFile) {
      try {
        // Kiểm tra file size (đã được validate bởi multer, nhưng double check)
        const fileSizeMB = avatarFile.size / (1024 * 1024);
        if (fileSizeMB > 10) { // Max 10MB
          return res.status(400).json({ 
            message: 'File too large. Maximum size is 10MB' 
          });
        }

        // Xóa avatar cũ trên Cloudinary nếu có (async, không block upload mới)
        if (user.avatar && user.avatar.includes('cloudinary.com')) {
          // Chạy async, không đợi kết quả
          (async () => {
            try {
              // Extract publicId từ Cloudinary URL
              const urlPatterns = [
                /\/upload\/v\d+\/(.+)$/, // With version
                /\/upload\/(.+)$/ // Without version
              ];
              
              let publicId = null;
              for (const pattern of urlPatterns) {
                const match = user.avatar.match(pattern);
                if (match) {
                  publicId = match[1].replace(/\.[^/.]+$/, ''); // Remove extension
                  break;
                }
              }
              
              if (publicId) {
                await deleteFile(publicId, 'image');
              }
            } catch (error) {
              // Ignore error khi xóa file cũ
              console.warn('Could not delete old avatar:', error.message);
            }
          })();
        }

        // Upload avatar mới lên Cloudinary
        const uploadResult = await uploadImage(avatarFile.buffer, {
          folder: `minisocial/users/${userId}/avatars`,
          publicId: `avatar_${userId}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto crop face
            { quality: 'auto', fetch_format: 'auto' }
          ]
        });

        user.avatar = uploadResult.url;
      } catch (error) {
        // Cải thiện error message
        let errorMessage = 'Failed to upload avatar';
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timeout: Please check your internet connection and try again';
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
          errorMessage = 'Cannot connect to Cloudinary. Please check your network connection';
        } else {
          errorMessage = error.message;
        }
        
        return res.status(500).json({ 
          message: errorMessage,
          error: error.message 
        });
      }
    }
    
    // Validation các fields text (skip validation nếu dùng form-data)
    if (name !== undefined && name !== '') {
      if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
        return res.status(400).json({ 
          message: 'Name must be between 2 and 100 characters' 
        });
      }
    }
    
    if (username !== undefined && username !== '') {
      if (!/^[a-zA-Z0-9]+$/.test(username) || username.length < 3 || username.length > 30) {
        return res.status(400).json({ 
          message: 'Username must be alphanumeric and between 3 and 30 characters' 
        });
      }
    }
    
    if (bio !== undefined && bio !== null && bio !== '') {
      if (typeof bio !== 'string' || bio.length > 500) {
        return res.status(400).json({ 
          message: 'Bio must not exceed 500 characters' 
        });
      }
    }

    // Nếu update username, kiểm tra username đã tồn tại chưa
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOneActive({ 
        username: username.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(409).json({ 
          message: 'Username already exists' 
        });
      }
      
      user.username = username.toLowerCase();
      
      // Cập nhật username trong Neo4j
      try {
        // Neo4j chỉ lưu id, name, email - username update trong query
        // Có thể cần update node trong Neo4j nếu cần
      } catch (error) {
        // Ignore Neo4j errors
      }
    }

    // Cập nhật các fields khác
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio || '';

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isVerified: user.isVerified,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đổi password
 * PATCH /api/users/password
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByIdActive(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Update password (sẽ được hash tự động trong pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tìm kiếm user
 * GET /api/users/search?q=keyword&page=1&limit=20
 */
async function searchUsers(req, res, next) {
  try {
    const { q, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const currentUserId = req.user ? req.user.userId : null;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Search query is required' 
      });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Regex search (không cần text index, hoạt động ngay)
    const searchQuery = q.trim();
    // Escape special regex characters để tránh lỗi
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i'); // Case-insensitive
    
    const users = await User.findActive({
      $or: [
        { username: regex },
        { name: regex }
      ]
    })
    .select('name username avatar bio followersCount isVerified')
    .skip(skip)
    .limit(limitNum)
    .sort({ followersCount: -1, createdAt: -1 });

    // Nếu có currentUserId, check follow status cho mỗi user
    let usersWithFollowStatus = users.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount: user.followersCount,
      isVerified: user.isVerified
    }));

    if (currentUserId) {
      const userIds = users.map(u => u._id.toString());
      const followStatuses = await Promise.all(
        userIds.map(async (id) => {
          if (id === currentUserId) return { userId: id, isFollowing: null };
          try {
            const isFollowing = await neo4jService.checkFollowStatus(currentUserId, id);
            return { userId: id, isFollowing };
          } catch (error) {
            return { userId: id, isFollowing: false };
          }
        })
      );

      usersWithFollowStatus = usersWithFollowStatus.map(user => {
        const status = followStatuses.find(s => s.userId === user.id.toString());
        return {
          ...user,
          isFollowing: status ? status.isFollowing : null
        };
      });
    }

    // Count total results (dùng lại regex đã tạo ở trên)
    const total = await User.countDocuments({
      $or: [
        { username: regex },
        { name: regex }
      ],
      deletedAt: null
    });

    res.json({
      users: usersWithFollowStatus,
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
 * Lấy danh sách posts của user (sẽ implement sau khi có Post controller)
 * GET /api/users/:userId/posts
 */
async function getUserPosts(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;

    // Verify user exists
    const user = await User.findByIdActive(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // TODO: Implement khi có Post model/service
    res.json({
      message: 'Feature coming soon',
      posts: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  searchUsers,
  getUserPosts
};

