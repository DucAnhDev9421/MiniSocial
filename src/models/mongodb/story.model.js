const mongoose = require('mongoose');
const { Schema } = mongoose;

const StorySchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  media: {
    type: String,
    required: true // URL của image hoặc video
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
    default: 'image'
  },
  caption: {
    type: String,
    maxlength: 200,
    default: ''
  },
  views: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  viewsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL: 24 hours (auto-delete after 24h)
  }
});

// Indexes
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL Index - tự động xóa sau 24h

// Method để kiểm tra user đã xem story chưa
StorySchema.methods.hasViewed = function(userId) {
  return this.views.some(view => view.user.toString() === userId.toString());
};

// Method để thêm view
StorySchema.methods.addView = function(userId) {
  if (!this.hasViewed(userId)) {
    this.views.push({ user: userId, viewedAt: new Date() });
    this.viewsCount += 1;
  }
};

module.exports = mongoose.model('Story', StorySchema);

