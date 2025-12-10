const mongoose = require('mongoose');
const { Schema } = mongoose;

const OTPSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index - tự động xóa sau khi hết hạn
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index để tìm OTP chưa sử dụng và chưa hết hạn
OTPSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });
OTPSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });

// Method để kiểm tra OTP có hợp lệ không
OTPSchema.methods.isValid = function() {
  return !this.isUsed && this.expiresAt > new Date();
};

// Method để đánh dấu OTP đã sử dụng
OTPSchema.methods.markAsUsed = async function() {
  this.isUsed = true;
  await this.save();
};

// Static method để tìm OTP hợp lệ
OTPSchema.statics.findValidOTP = function(email, code, userId = null) {
  const query = {
    email: email.toLowerCase(),
    code,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  };
  
  if (userId) {
    query.userId = userId;
  }
  
  return this.findOne(query);
};

// Static method để xóa tất cả OTP cũ của user (trước khi tạo mới)
OTPSchema.statics.invalidateUserOTPs = function(userId, type = 'email_verification') {
  return this.updateMany(
    { userId, type, isUsed: false },
    { isUsed: true }
  );
};

module.exports = mongoose.model('OTP', OTPSchema);

