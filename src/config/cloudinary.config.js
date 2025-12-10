const cloudinary = require('cloudinary').v2;

/**
 * Khởi tạo Cloudinary với credentials từ environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Sử dụng HTTPS
  timeout: 60000 // 60 seconds timeout cho API calls
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

