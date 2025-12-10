const Comment = require('../models/mongodb/comment.model');
const Post = require('../models/mongodb/post.model');
const User = require('../models/mongodb/user.model');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/constants');

/**
 * Tạo comment mới
 * POST /api/posts/:postId/comments
 */
async function createComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    // Kiểm tra post tồn tại
    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Nếu là reply (nested comment), kiểm tra parent comment tồn tại
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({ 
        _id: parentCommentId, 
        isDeleted: false,
        post: postId // Đảm bảo parent comment thuộc về post này
      });

      if (!parentComment) {
        return res.status(404).json({ 
          message: 'Parent comment not found' 
        });
      }
    }

    // Tạo comment
    const comment = new Comment({
      author: userId,
      post: postId,
      content: content.trim(),
      parentComment: parentCommentId || null
    });

    await comment.save();

    // Tăng commentsCount của post
    post.commentsCount += 1;
    await post.save();

    // Nếu là reply, tăng repliesCount của parent comment
    if (parentComment) {
      parentComment.repliesCount += 1;
      await parentComment.save();
    }

    // Populate author info
    await comment.populate('author', 'name username avatar');

    res.status(201).json({
      message: 'Comment created successfully',
      comment: {
        id: comment._id,
        content: comment.content,
        author: {
          id: comment.author._id,
          name: comment.author.name,
          username: comment.author.username,
          avatar: comment.author.avatar
        },
        parentCommentId: comment.parentComment || null,
        likesCount: comment.likesCount,
        repliesCount: comment.repliesCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy comments của post
 * GET /api/posts/:postId/comments
 */
async function getComments(req, res, next) {
  try {
    const { postId } = req.params;
    const currentUserId = req.user ? req.user.userId : null;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Kiểm tra post tồn tại
    const post = await Post.findOne({ 
      _id: postId, 
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found' 
      });
    }

    // Lấy top-level comments (không phải reply)
    const comments = await Comment.find({
      post: postId,
      parentComment: null, // Chỉ lấy top-level comments
      isDeleted: false
    })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    // Thêm isLiked status
    const commentsWithLikeStatus = comments.map(comment => {
      const isLiked = currentUserId ? comment.isLikedBy(currentUserId) : false;
      return {
        id: comment._id,
        content: comment.content,
        author: {
          id: comment.author._id,
          name: comment.author.name,
          username: comment.author.username,
          avatar: comment.author.avatar
        },
        likesCount: comment.likesCount,
        repliesCount: comment.repliesCount,
        isLiked,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      };
    });

    // Count total top-level comments
    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false
    });

    res.json({
      comments: commentsWithLikeStatus,
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
 * Cập nhật comment
 * PUT /api/comments/:commentId
 */
async function updateComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findOne({ 
      _id: commentId, 
      isDeleted: false 
    });

    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this comment' 
      });
    }

    // Cập nhật
    comment.content = content.trim();
    await comment.save();

    res.json({
      message: 'Comment updated successfully',
      comment: {
        id: comment._id,
        content: comment.content,
        updatedAt: comment.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa comment (soft delete)
 * DELETE /api/comments/:commentId
 */
async function deleteComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    const comment = await Comment.findOne({ 
      _id: commentId, 
      isDeleted: false 
    }).populate('post');

    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this comment' 
      });
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    // Giảm commentsCount của post
    if (comment.post && !comment.post.isDeleted) {
      comment.post.commentsCount = Math.max(0, comment.post.commentsCount - 1);
      await comment.post.save();
    }

    // Nếu là reply, giảm repliesCount của parent comment
    if (comment.parentComment) {
      const parentComment = await Comment.findById(comment.parentComment);
      if (parentComment) {
        parentComment.repliesCount = Math.max(0, parentComment.repliesCount - 1);
        await parentComment.save();
      }
    }

    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Like comment
 * POST /api/comments/:commentId/like
 */
async function likeComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    const comment = await Comment.findOne({ 
      _id: commentId, 
      isDeleted: false 
    });

    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found' 
      });
    }

    // Kiểm tra đã like chưa
    if (comment.isLikedBy(userId)) {
      return res.status(400).json({ 
        message: 'Comment already liked' 
      });
    }

    // Thêm user vào likedBy và tăng likesCount
    comment.likedBy.push(userId);
    comment.likesCount += 1;
    await comment.save();

    res.json({
      message: 'Comment liked successfully',
      likesCount: comment.likesCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unlike comment
 * DELETE /api/comments/:commentId/unlike
 */
async function unlikeComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    const comment = await Comment.findOne({ 
      _id: commentId, 
      isDeleted: false 
    });

    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found' 
      });
    }

    // Kiểm tra đã like chưa
    if (!comment.isLikedBy(userId)) {
      return res.status(400).json({ 
        message: 'Comment not liked yet' 
      });
    }

    // Xóa user khỏi likedBy và giảm likesCount
    comment.likedBy = comment.likedBy.filter(
      id => id.toString() !== userId.toString()
    );
    comment.likesCount = Math.max(0, comment.likesCount - 1);
    await comment.save();

    res.json({
      message: 'Comment unliked successfully',
      likesCount: comment.likesCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy replies (nested comments)
 * GET /api/comments/:commentId/replies
 */
async function getReplies(req, res, next) {
  try {
    const { commentId } = req.params;
    const currentUserId = req.user ? req.user.userId : null;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Kiểm tra parent comment tồn tại
    const parentComment = await Comment.findOne({ 
      _id: commentId, 
      isDeleted: false 
    });

    if (!parentComment) {
      return res.status(404).json({ 
        message: 'Comment not found' 
      });
    }

    // Lấy replies
    const replies = await Comment.find({
      parentComment: commentId,
      isDeleted: false
    })
    .populate('author', 'name username avatar')
    .sort({ createdAt: 1 }) // Sắp xếp theo thời gian tạo (cũ nhất trước)
    .skip(skip)
    .limit(limitNum);

    // Thêm isLiked status
    const repliesWithLikeStatus = replies.map(reply => {
      const isLiked = currentUserId ? reply.isLikedBy(currentUserId) : false;
      return {
        id: reply._id,
        content: reply.content,
        author: {
          id: reply.author._id,
          name: reply.author.name,
          username: reply.author.username,
          avatar: reply.author.avatar
        },
        likesCount: reply.likesCount,
        isLiked,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt
      };
    });

    // Count total replies
    const total = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: false
    });

    res.json({
      replies: repliesWithLikeStatus,
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
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getReplies
};

