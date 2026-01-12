const cloudinary = require('cloudinary').v2;

/**
 * Khởi tạo Cloudinary với credentials từ environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Sử dụng HTTPS
  timeout: 300000, // 300 seconds (5 minutes) timeout cho API calls (tăng lên cho video)
  chunk_size: 6000000, // 6MB chunks for large files
  api_proxy: process.env.CLOUDINARY_API_PROXY || undefined, // Optional proxy
});

/**
 * Verify Cloudinary configuration
 */
function verifyConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary configuration missing. Please check environment variables.');
  }
  console.log('Cloudinary configured successfully');
  return true;
}

module.exports = {
  cloudinary,
  verifyConfig
};

