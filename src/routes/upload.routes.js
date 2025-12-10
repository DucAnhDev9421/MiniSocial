const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const { uploadSingleImage, uploadMultipleImages, uploadSingleVideo, uploadAvatar } = require('../middlewares/upload.middleware');
const { uploadImage, uploadVideo, uploadMultipleImages: uploadMultipleImagesToCloudinary, deleteFile } = require('../services/cloudinary.service');

/**
 * Upload single image
 * POST /api/upload/image
 */
router.post('/image', authenticateToken, uploadSingleImage, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const result = await uploadImage(req.file.buffer, {
      folder: `minisocial/users/${req.user.userId}/images`,
      publicId: `img_${Date.now()}`
    });

    res.json({
      message: 'Image uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload multiple images
 * POST /api/upload/images
 */
router.post('/images', authenticateToken, uploadMultipleImages, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const files = req.files.map(file => file.buffer);
    const results = await uploadMultipleImagesToCloudinary(files, {
      folder: `minisocial/users/${req.user.userId}/images`
    });

    res.json({
      message: 'Images uploaded successfully',
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload single video
 * POST /api/upload/video
 */
router.post('/video', authenticateToken, uploadSingleVideo, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const result = await uploadVideo(req.file.buffer, {
      folder: `minisocial/users/${req.user.userId}/videos`,
      publicId: `vid_${Date.now()}`
    });

    res.json({
      message: 'Video uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload avatar/profile picture
 * POST /api/upload/avatar
 */
router.post('/avatar', authenticateToken, uploadAvatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file provided' });
    }

    const result = await uploadImage(req.file.buffer, {
      folder: `minisocial/users/${req.user.userId}/avatars`,
      publicId: `avatar_${req.user.userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto crop face
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    res.json({
      message: 'Avatar uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete file from Cloudinary
 * DELETE /api/upload/:publicId
 */
router.delete('/:publicId', authenticateToken, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    const result = await deleteFile(publicId, resourceType);

    res.json({
      message: 'File deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

