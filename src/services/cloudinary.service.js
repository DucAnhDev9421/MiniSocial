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

  // Kiểm tra Cloudinary config
  if (!cloudinary.config().cloud_name || !cloudinary.config().api_key) {
    throw new Error('Cloudinary is not configured. Please check environment variables.');
  }

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
    chunk_size: 6000000, // 6MB chunks for better reliability
    async: false, // Synchronous upload (faster for small files)
    ...(publicId && { public_id: publicId }),
    ...(transformation.length > 0 && { transformation })
  };

  try {
    let result;
    if (Buffer.isBuffer(file)) {
      // Upload từ buffer (multer) với timeout và retry logic
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          result = await Promise.race([
            new Promise((resolve, reject) => {
              let isResolved = false;
              const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                  if (isResolved) return; // Prevent multiple callbacks
                  isResolved = true;
                  
                  if (error) {
                    console.error(`Cloudinary upload error (attempt ${retries + 1}):`, {
                      message: error.message,
                      http_code: error.http_code,
                      name: error.name
                    });
                    reject(error);
                  } else {
                    resolve(result);
                  }
                }
              );
              
              // Handle stream errors
              uploadStream.on('error', (error) => {
                if (!isResolved) {
                  isResolved = true;
                  console.error(`Upload stream error (attempt ${retries + 1}):`, error);
                  reject(error);
                }
              });
              
              uploadStream.end(file);
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout: Request took more than 180 seconds')), 180000) // 180 seconds timeout
            )
          ]);
          break; // Success, exit retry loop
        } catch (error) {
          // Don't retry on certain errors
          if (error.http_code === 400 || error.http_code === 401 || error.http_code === 403) {
            throw error; // Don't retry on auth/config errors
          }
          
          if (retries >= maxRetries) {
            throw error; // Max retries reached, throw error
          }
          retries++;
          console.log(`Retrying upload (attempt ${retries + 1}/${maxRetries + 1})...`);
          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
      }
    } else {
      // Upload từ file path với timeout
      result = await Promise.race([
        cloudinary.uploader.upload(file, uploadOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took more than 120 seconds')), 120000) // 120 seconds timeout
        )
      ]);
    }

    if (!result || !result.secure_url) {
      throw new Error('Upload succeeded but no URL returned');
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
    console.error('Cloudinary upload error details:', {
      message: error.message,
      folder,
      fileSize: Buffer.isBuffer(file) ? file.length : 'N/A'
    });
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
      // Upload từ buffer với timeout và retry logic (tương tự uploadImage)
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          result = await Promise.race([
            new Promise((resolve, reject) => {
              let isResolved = false;
              const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                  if (isResolved) return; // Prevent multiple callbacks
                  isResolved = true;
                  
                  if (error) {
                    console.error(`Cloudinary video upload error (attempt ${retries + 1}):`, {
                      message: error.message,
                      http_code: error.http_code,
                      name: error.name
                    });
                    reject(error);
                  } else {
                    resolve(result);
                  }
                }
              );
              
              // Handle stream errors
              uploadStream.on('error', (error) => {
                if (!isResolved) {
                  isResolved = true;
                  console.error(`Video upload stream error (attempt ${retries + 1}):`, error);
                  reject(error);
                }
              });
              
              uploadStream.end(file);
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout: Request took more than 180 seconds')), 180000) // 180 seconds timeout cho video
            )
          ]);
          break; // Success, exit retry loop
        } catch (error) {
          // Don't retry on certain errors
          if (error.message && (
            error.message.includes('Invalid') ||
            error.message.includes('Authentication') ||
            error.message.includes('Invalid API')
          )) {
            throw error; // Don't retry on auth/config errors
          }
          
          if (retries >= maxRetries) {
            throw error; // Max retries reached, throw error
          }
          retries++;
          console.log(`Retrying video upload (attempt ${retries + 1}/${maxRetries + 1})...`);
          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
      }
    } else {
      // Upload từ file path với timeout
      result = await Promise.race([
        cloudinary.uploader.upload(file, uploadOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout: Request took more than 180 seconds')), 180000) // 180 seconds timeout cho video
        )
      ]);
    }

    if (!result || !result.secure_url) {
      throw new Error('Upload succeeded but no URL returned');
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
    console.error('Cloudinary video upload error details:', {
      message: error.message,
      folder,
      fileSize: Buffer.isBuffer(file) ? file.length : 'N/A'
    });
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
  if (!files || files.length === 0) {
    return [];
  }

  try {
    // Upload tuần tự để tránh quá tải và dễ debug
    const results = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadImage(files[i], { 
          ...options, 
          publicId: options.publicId ? `${options.publicId}_${i}` : null 
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}/${files.length}:`, error.message);
        // Nếu một image fail, vẫn tiếp tục upload các image khác
        // Nhưng throw error để caller biết
        throw new Error(`Failed to upload image ${i + 1}/${files.length}: ${error.message}`);
      }
    }
    return results;
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

