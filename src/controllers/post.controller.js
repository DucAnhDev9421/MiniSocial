const Post = require('../models/mongodb/post.model');
const User = require('../models/mongodb/user.model');
const neo4jService = require('../services/neo4j.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, VISIBILITY } = require('../utils/constants');

/**
 * Tạo post mới
 * POST /api/posts
 */
async function createPost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { content, images = [], visibility = 'public' } = req.body;

    // Validate images array
    if (images.length > 10) {
      return res.status(400).json({ 
        message: 'Maximum 10 images allowed per post' 
      });
    }

    const post = new Post({
      author: userId,
      content: content.trim(),
      images,
      visibility
    });

    await post.save();

    // Populate author info
    await post.populate('author', 'name username avatar');

    // Tăng postsCount của user
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: post._id,
        content: post.content,
        images: post.images,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        author: {
          id: post.author._id,
          name: post.author.name,
          username: post.author.username,
          avatar: post.author.avatar
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy chi tiết post
 * GET /api/posts/:postId
 */
async function getPost(req, res, next) {
  try {
    const { postId } = req.params;
    const currentUserId = req.user ? req.user.userId : null;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    }).populate('author', 'name username avatar isVerified');

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Kiểm tra visibility
    if (post.visibility === VISIBILITY.PRIVATE && post.author._id.toString() !== currentUserId) {
      return res.status(403).json({ 
        message: 'Post is private' 
      });
    }

    if (post.visibility === VISIBILITY.FRIENDS) {
      if (!currentUserId) {
        return res.status(403).json({ 
          message: 'Authentication required' 
        });
      }
      if (post.author._id.toString() !== currentUserId) {
        // Check if current user follows the author
        try {
          const isFollowing = await neo4jService.checkFollowStatus(currentUserId, post.author._id.toString());
          if (!isFollowing) {
            return res.status(403).json({ 
              message: 'Post is only visible to friends' 
            });
          }
        } catch (error) {
          return res.status(403).json({ 
            message: 'Post is only visible to friends' 
          });
        }
      }
    }

    // Check if current user liked this post
    let isLiked = false;
    if (currentUserId) {
      isLiked = post.isLikedBy(currentUserId);
    }

    res.json({
      post: {
        id: post._id,
        content: post.content,
        images: post.images,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isLiked,
        author: {
          id: post.author._id,
          name: post.author.name,
          username: post.author.username,
          avatar: post.author.avatar,
          isVerified: post.author.isVerified
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật post
 * PUT /api/posts/:postId
 */
async function updatePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, images, visibility } = req.body;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (post.author.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this post' 
      });
    }

    // Validate images
    if (images && images.length > 10) {
      return res.status(400).json({ 
        message: 'Maximum 10 images allowed per post' 
      });
    }

    // Cập nhật
    if (content !== undefined) post.content = content.trim();
    if (images !== undefined) post.images = images;
    if (visibility !== undefined) post.visibility = visibility;

    await post.save();

    res.json({
      message: 'Post updated successfully',
      post: {
        id: post._id,
        content: post.content,
        images: post.images,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa post (soft delete)
 * DELETE /api/posts/:postId
 */
async function deletePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (post.author.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this post' 
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    // Giảm postsCount của user
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

    res.json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Newsfeed - Posts từ users đang follow
 * GET /api/posts/feed
 */
async function getFeed(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Lấy danh sách ID của users đang follow từ Neo4j
    let followingIds = [];
    try {
      followingIds = await neo4jService.getFollowingIds(userId); // Lấy tất cả following IDs
    } catch (error) {
      console.warn('⚠️  Could not get following list from Neo4j:', error.message);
    }

    // Thêm chính user vào danh sách để hiển thị posts của mình
    followingIds.push(userId);

    // Query posts từ MongoDB
    const posts = await Post.find({
      author: { $in: followingIds },
      isDeleted: false,
      visibility: { $in: ['public', 'friends'] } // Chỉ lấy public và friends posts
    })
    .populate('author', 'name username avatar isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    // Thêm isLiked status
    const postsWithLikeStatus = posts.map(post => {
      const isLiked = post.isLikedBy(userId);
      return {
        id: post._id,
        content: post.content,
        images: post.images,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isLiked,
        author: {
          id: post.author._id,
          name: post.author.name,
          username: post.author.username,
          avatar: post.author.avatar,
          isVerified: post.author.isVerified
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      };
    });

    // Count total
    const total = await Post.countDocuments({
      author: { $in: followingIds },
      isDeleted: false,
      visibility: { $in: ['public', 'friends'] }
    });

    res.json({
      posts: postsWithLikeStatus,
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
 * Posts trending (sắp xếp theo likesCount và createdAt)
 * GET /api/posts/trending
 */
async function getTrending(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.userId : null;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Lấy posts trending (sắp xếp theo likesCount và createdAt)
    const posts = await Post.find({
      isDeleted: false,
      visibility: 'public' // Chỉ lấy public posts
    })
    .populate('author', 'name username avatar isVerified')
    .sort({ likesCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    // Thêm isLiked status nếu có currentUserId
    const postsWithLikeStatus = posts.map(post => {
      const isLiked = currentUserId ? post.isLikedBy(currentUserId) : false;
      return {
        id: post._id,
        content: post.content,
        images: post.images,
        visibility: post.visibility,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isLiked,
        author: {
          id: post.author._id,
          name: post.author.name,
          username: post.author.username,
          avatar: post.author.avatar,
          isVerified: post.author.isVerified
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      };
    });

    // Count total
    const total = await Post.countDocuments({
      isDeleted: false,
      visibility: 'public'
    });

    res.json({
      posts: postsWithLikeStatus,
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
 * Like post
 * POST /api/posts/:postId/like
 */
async function likePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Kiểm tra đã like chưa
    if (post.isLikedBy(userId)) {
      return res.status(400).json({ 
        message: 'Post already liked' 
      });
    }

    // Thêm user vào likedBy và tăng likesCount
    post.likedBy.push(userId);
    post.likesCount += 1;
    await post.save();

    res.json({
      message: 'Post liked successfully',
      likesCount: post.likesCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unlike post
 * DELETE /api/posts/:postId/unlike
 */
async function unlikePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Kiểm tra đã like chưa
    if (!post.isLikedBy(userId)) {
      return res.status(400).json({ 
        message: 'Post not liked yet' 
      });
    }

    // Xóa user khỏi likedBy và giảm likesCount
    post.likedBy = post.likedBy.filter(
      id => id.toString() !== userId.toString()
    );
    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();

    res.json({
      message: 'Post unliked successfully',
      likesCount: post.likesCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách users đã like post
 * GET /api/posts/:postId/likes
 */
async function getLikes(req, res, next) {
  try {
    const { postId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    }).select('likedBy');

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Lấy danh sách users đã like với pagination
    const likedUserIds = post.likedBy.slice(skip, skip + limitNum);
    const users = await User.findActive({ 
      _id: { $in: likedUserIds } 
    })
    .select('name username avatar')
    .limit(limitNum);

    // Sắp xếp theo thứ tự trong likedBy array
    const usersMap = new Map(users.map(u => [u._id.toString(), u]));
    const sortedUsers = likedUserIds
      .map(id => usersMap.get(id.toString()))
      .filter(Boolean);

    res.json({
      users: sortedUsers.map(user => ({
        id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: post.likedBy.length,
        pages: Math.ceil(post.likedBy.length / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPost,
  getPost,
  updatePost,
  deletePost,
  getFeed,
  getTrending,
  likePost,
  unlikePost,
  getLikes
};

