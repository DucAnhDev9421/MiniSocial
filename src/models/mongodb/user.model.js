const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9]+$/
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true,
    select: false // Không trả về password trong query mặc định
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ followersCount: -1 }); // For trending users
UserSchema.index({ deletedAt: 1 }); // For soft delete queries

// Text index for search
UserSchema.index({ username: 'text', name: 'text' });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to convert to JSON without sensitive fields
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Method to soft delete user
UserSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  this.isActive = false;
  await this.save();
  return this;
};

// Method to restore user (undo soft delete)
UserSchema.methods.restore = async function() {
  this.deletedAt = null;
  this.isActive = true;
  await this.save();
  return this;
};

// Static method to query only non-deleted users
UserSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deletedAt: null });
};

UserSchema.statics.findOneActive = function(conditions) {
  return this.findOne({ ...conditions, deletedAt: null });
};

UserSchema.statics.findByIdActive = function(id) {
  return this.findOne({ _id: id, deletedAt: null });
};

// Static method to find deleted user (for restore)
UserSchema.statics.findOneDeleted = function(conditions) {
  return this.findOne({ ...conditions, deletedAt: { $ne: null } });
};

module.exports = mongoose.model('User', UserSchema);

