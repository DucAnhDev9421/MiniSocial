const mongoose = require('mongoose');
const { Schema } = mongoose;

const PostSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
    trim: true
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return v === '' || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid image URL'
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ likesCount: -1 });
PostSchema.index({ visibility: 1 });

// Text index for search
PostSchema.index({ content: 'text' });

// Update updatedAt on save
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if post is liked by user
PostSchema.methods.isLikedBy = function(userId) {
  return this.likedBy.some(id => id.toString() === userId.toString());
};

module.exports = mongoose.model('Post', PostSchema);

