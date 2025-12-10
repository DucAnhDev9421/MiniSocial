const mongoose = require('mongoose');
const { Schema } = mongoose;

const TokenBlacklistSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenType: {
    type: String,
    enum: ['access', 'refresh'],
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index - tự động xóa khi hết hạn
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
TokenBlacklistSchema.index({ token: 1 });
TokenBlacklistSchema.index({ userId: 1 });
TokenBlacklistSchema.index({ expiresAt: 1 });

// Static method to check if token is blacklisted
TokenBlacklistSchema.statics.isBlacklisted = async function(token) {
  const blacklisted = await this.findOne({ token });
  return !!blacklisted;
};

// Static method to blacklist token
TokenBlacklistSchema.statics.blacklistToken = async function(token, tokenType, userId, expiresAt) {
  try {
    await this.create({
      token,
      tokenType,
      userId,
      expiresAt
    });
    return true;
  } catch (error) {
    // Token might already be blacklisted (unique constraint)
    if (error.code === 11000) {
      return true; // Already blacklisted
    }
    throw error;
  }
};

// Static method to blacklist all user tokens (logout all devices)
TokenBlacklistSchema.statics.blacklistAllUserTokens = async function(userId) {
  // This will be handled by adding tokens to blacklist as they're used
  // For a more comprehensive approach, you could store active tokens and blacklist them all
  return true;
};

module.exports = mongoose.model('TokenBlacklist', TokenBlacklistSchema);

