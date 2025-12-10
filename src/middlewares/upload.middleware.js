const multer = require('multer');
const { MAX_FILE_SIZE, MAX_VIDEO_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } = require('../utils/constants');

/**
 * Multer memory storage (lưu file vào memory buffer để upload lên Cloudinary)
 */
const storage = multer.memoryStorage();

/**
 * File filter cho images
 */
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${ALLOWED_IMAGE_TYPES.join(', ')} are allowed.`), false);
  }
};

/**
 * File filter cho videos
 */
const videoFilter = (req, file, cb) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${ALLOWED_VIDEO_TYPES.join(', ')} are allowed.`), false);
  }
};

/**
 * File filter cho cả images và videos
 */
const mediaFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only images (${ALLOWED_IMAGE_TYPES.join(', ')}) and videos (${ALLOWED_VIDEO_TYPES.join(', ')}) are allowed.`), false);
  }
};

/**
 * Multer upload middleware cho single image
 */
const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: imageFilter
}).single('image');

/**
 * Multer upload middleware cho multiple images
 */
const uploadMultipleImages = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Tối đa 10 files
  },
  fileFilter: imageFilter
}).array('images', 10);

/**
 * Multer upload middleware cho single video
 */
const uploadSingleVideo = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE
  },
  fileFilter: videoFilter
}).single('video');

/**
 * Multer upload middleware cho avatar/profile picture
 */
const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: imageFilter
}).single('avatar');

/**
 * Multer upload middleware cho media (images hoặc videos)
 */
const uploadMedia = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Cho phép size lớn nhất
    files: 10
  },
  fileFilter: mediaFilter
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

/**
 * Wrapper function để handle multer errors
 */
function handleUploadError(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Too many files' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Unexpected file field' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
}

module.exports = {
  uploadSingleImage: handleUploadError(uploadSingleImage),
  uploadMultipleImages: handleUploadError(uploadMultipleImages),
  uploadSingleVideo: handleUploadError(uploadSingleVideo),
  uploadAvatar: handleUploadError(uploadAvatar),
  uploadMedia: handleUploadError(uploadMedia)
};

