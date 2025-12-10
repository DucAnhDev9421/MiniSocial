const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const friendRoutes = require('./friend.routes');
const storyRoutes = require('./story.routes');
const uploadRoutes = require('./upload.routes');

// Health check
router.get('/health', (req, res) => res.json({ ok: true }));

// Auth routes (register, login, refresh token)
router.use('/auth', authRoutes);

// User routes (profile, search, follow/unfollow)
router.use('/users', userRoutes);

// Post routes (CRUD, feed, trending, like)
router.use('/posts', postRoutes);

// Comment routes (CRUD, like, replies)
router.use('/comments', commentRoutes);

// Friend routes (friend requests, friends list)
router.use('/friends', friendRoutes);

// Story routes (24h stories)
router.use('/stories', storyRoutes);

// Upload routes (yêu cầu authentication)
router.use('/upload', uploadRoutes);

module.exports = router;
