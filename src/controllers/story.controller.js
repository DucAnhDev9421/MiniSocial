const Story = require('../models/mongodb/story.model');
const User = require('../models/mongodb/user.model');
const neo4jService = require('../services/neo4j.service');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/constants');

/**
 * Tạo story mới
 * POST /api/stories
 */
async function createStory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { media, mediaType = 'image', caption = '' } = req.body;

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return res.status(400).json({ 
        message: 'mediaType must be either "image" or "video"' 
      });
    }

    // Tạo story
    const story = new Story({
      author: userId,
      media,
      mediaType,
      caption: caption.trim()
    });

    await story.save();

    // Populate author info
    await story.populate('author', 'name username avatar');

    res.status(201).json({
      message: 'Story created successfully',
      story: {
        id: story._id,
        media: story.media,
        mediaType: story.mediaType,
        caption: story.caption,
        viewsCount: story.viewsCount,
        author: {
          id: story.author._id,
          name: story.author.name,
          username: story.author.username,
          avatar: story.author.avatar
        },
        createdAt: story.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy stories feed (từ bạn bè và follow)
 * GET /api/stories/feed
 */
async function getStoriesFeed(req, res, next) {
  try {
    const userId = req.user.userId;

    // Lấy danh sách bạn bè từ Neo4j
    let friendIds = [];
    try {
      friendIds = await neo4jService.getFriends(userId, 1, 1000);
    } catch (error) {
      console.warn('⚠️  Could not get friends from Neo4j:', error.message);
    }

    // Lấy danh sách following từ Neo4j
    let followingIds = [];
    try {
      followingIds = await neo4jService.getFollowingIds(userId);
    } catch (error) {
      console.warn('⚠️  Could not get following from Neo4j:', error.message);
    }

    // Kết hợp bạn bè và following (loại bỏ duplicate)
    const allUserIds = [...new Set([...friendIds, ...followingIds, userId])];

    // Lấy stories từ những users này (chỉ lấy stories trong 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
      author: { $in: allUserIds },
      createdAt: { $gte: oneDayAgo }
    })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 });

    // Group stories by author
    const storiesByAuthor = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!storiesByAuthor[authorId]) {
        storiesByAuthor[authorId] = {
          author: {
            id: story.author._id,
            name: story.author.name,
            username: story.author.username,
            avatar: story.author.avatar
          },
          stories: []
        };
      }

      // Kiểm tra user đã xem story chưa
      const hasViewed = story.hasViewed(userId);

      storiesByAuthor[authorId].stories.push({
        id: story._id,
        media: story.media,
        mediaType: story.mediaType,
        caption: story.caption,
        viewsCount: story.viewsCount,
        hasViewed,
        createdAt: story.createdAt
      });
    });

    // Convert to array
    const feed = Object.values(storiesByAuthor);

    res.json({
      feed,
      total: feed.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy stories của user cụ thể
 * GET /api/stories/:userId
 */
async function getUserStories(req, res, next) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user ? req.user.userId : null;

    // Kiểm tra user tồn tại
    const user = await User.findByIdActive(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Lấy stories của user (chỉ trong 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
      author: userId,
      createdAt: { $gte: oneDayAgo }
    })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 });

    // Thêm hasViewed status nếu có currentUserId
    const storiesWithViewStatus = stories.map(story => {
      const hasViewed = currentUserId ? story.hasViewed(currentUserId) : false;
      return {
        id: story._id,
        media: story.media,
        mediaType: story.mediaType,
        caption: story.caption,
        viewsCount: story.viewsCount,
        hasViewed,
        createdAt: story.createdAt
      };
    });

    res.json({
      author: {
        id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar
      },
      stories: storiesWithViewStatus,
      total: storiesWithViewStatus.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa story
 * DELETE /api/stories/:storyId
 */
async function deleteStory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { storyId } = req.params;

    const story = await Story.findOne({ _id: storyId });

    if (!story) {
      return res.status(404).json({ 
        message: 'Story not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (story.author.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this story' 
      });
    }

    // Xóa story (MongoDB sẽ tự động xóa sau 24h, nhưng có thể xóa ngay)
    await story.deleteOne();

    res.json({
      message: 'Story deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đánh dấu đã xem story
 * POST /api/stories/:storyId/view
 */
async function viewStory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { storyId } = req.params;

    const story = await Story.findOne({ _id: storyId });

    if (!story) {
      return res.status(404).json({ 
        message: 'Story not found' 
      });
    }

    // Kiểm tra đã xem chưa
    if (story.hasViewed(userId)) {
      return res.json({
        message: 'Story already viewed',
        viewsCount: story.viewsCount
      });
    }

    // Thêm view
    story.addView(userId);
    await story.save();

    res.json({
      message: 'Story viewed successfully',
      viewsCount: story.viewsCount
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStory,
  getStoriesFeed,
  getUserStories,
  deleteStory,
  viewStory
};

