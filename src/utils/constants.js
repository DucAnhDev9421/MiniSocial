/**
 * Constants cho ứng dụng
 */

module.exports = {
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,

  // Visibility
  VISIBILITY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    PRIVATE: 'private'
  },

  // Notification types
  NOTIFICATION_TYPES: {
    FOLLOW: 'follow',
    LIKE: 'like',
    COMMENT: 'comment',
    MENTION: 'mention',
    MESSAGE: 'message'
  },

  // Story TTL (24 hours in seconds)
  STORY_TTL: 86400,

  // File upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  MAX_IMAGES_PER_POST: 10,
  MAX_VIDEOS_PER_POST: 1
};

