const { cloudinary } = require('../config/cloudinary.config');
const { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } = require('../utils/constants');

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer hoặc file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadImage(file, options = {}) {
  const {
    folder = 'minisocial/images',
    publicId = null,
    transformation = [],
    resourceType = 'image'
  } = options;

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
    ...(publicId && { public_id: publicId }),
    ...(transformation.length > 0 && { transformation })
  };

  try {
    let result;
    if (Buffer.isBuffer(file)) {
      // Upload từ buffer (multer) với timeout
      result = await Promise.race([
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took too long')), 60000) // 60 seconds timeout
        )
      ]);
    } else {
      // Upload từ file path với timeout
      result = await Promise.race([
        cloudinary.uploader.upload(file, uploadOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took too long')), 60000) // 60 seconds timeout
        )
      ]);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

/**
 * Upload video to Cloudinary
 * @param {Buffer|string} file - File buffer hoặc file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadVideo(file, options = {}) {
  const {
    folder = 'minisocial/videos',
    publicId = null,
    transformation = [],
    resourceType = 'video'
  } = options;

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
    ...(publicId && { public_id: publicId }),
    ...(transformation.length > 0 && { transformation }),
    // Video-specific options
    chunk_size: 6000000, // 6MB chunks
    eager: [
      { width: 400, height: 300, crop: 'fill', format: 'jpg' } // Generate thumbnail
    ],
    eager_async: true
  };

  try {
    let result;
    if (Buffer.isBuffer(file)) {
      // Upload từ buffer với timeout (120s cho video)
      result = await Promise.race([
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took too long')), 120000) // 120 seconds cho video
        )
      ]);
    } else {
      // Upload từ file path với timeout
      result = await Promise.race([
        cloudinary.uploader.upload(file, uploadOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took too long')), 120000) // 120 seconds cho video
        )
      ]);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      duration: result.duration,
      resourceType: result.resource_type,
      thumbnail: result.eager && result.eager[0] ? result.eager[0].secure_url : null
    };
  } catch (error) {
    throw new Error(`Cloudinary video upload failed: ${error.message}`);
  }
}

/**
 * Upload multiple images
 * @param {Array<Buffer>} files - Array of file buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array<Object>>} Array of upload results
 */
async function uploadMultipleImages(files, options = {}) {
  try {
    const uploadPromises = files.map((file, index) => 
      uploadImage(file, { ...options, publicId: options.publicId ? `${options.publicId}_${index}` : null })
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(`Failed to upload multiple images: ${error.message}`);
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID của file trên Cloudinary
 * @param {string} resourceType - 'image' hoặc 'video'
 * @returns {Promise<Object>} Deletion result
 */
async function deleteFile(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
}

/**
 * Delete multiple files
 * @param {Array<string>} publicIds - Array of public IDs
 * @param {string} resourceType - 'image' hoặc 'video'
 * @returns {Promise<Object>} Deletion result
 */
async function deleteMultipleFiles(publicIds, resourceType = 'image') {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete multiple files: ${error.message}`);
  }
}

/**
 * Transform image URL (resize, crop, etc.)
 * @param {string} publicId - Public ID của image
 * @param {Object} transformation - Transformation options
 * @returns {string} Transformed URL
 */
function getTransformedUrl(publicId, transformation = {}) {
  return cloudinary.url(publicId, {
    ...transformation,
    secure: true
  });
}

/**
 * Generate optimized image URL với auto format và quality
 * @param {string} publicId - Public ID của image
 * @param {number} width - Width (optional)
 * @param {number} height - Height (optional)
 * @returns {string} Optimized URL
 */
function getOptimizedImageUrl(publicId, width = null, height = null) {
  const transformation = {
    fetch_format: 'auto',
    quality: 'auto',
    ...(width && { width }),
    ...(height && { height }),
    ...(width && height && { crop: 'fill' })
  };
  return getTransformedUrl(publicId, transformation);
}

module.exports = {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  deleteFile,
  deleteMultipleFiles,
  getTransformedUrl,
  getOptimizedImageUrl
};

