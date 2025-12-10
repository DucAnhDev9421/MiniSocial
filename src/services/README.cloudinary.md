# Cloudinary Service - Hướng dẫn sử dụng

## Cấu hình

Thêm các biến môi trường sau vào file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Lấy credentials từ: https://cloudinary.com/console

## Sử dụng trong Controller

### Upload Single Image

```javascript
const { uploadImage } = require('../services/cloudinary.service');

// Trong controller sau khi multer middleware xử lý file
const result = await uploadImage(req.file.buffer, {
  folder: 'minisocial/posts',
  publicId: `post_${Date.now()}`,
  transformation: [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' }
  ]
});

// result.url - URL của image đã upload
// result.publicId - Public ID để delete sau này
```

### Upload Multiple Images

```javascript
const { uploadMultipleImages } = require('../services/cloudinary.service');

const files = req.files.map(file => file.buffer);
const results = await uploadMultipleImages(files, {
  folder: 'minisocial/posts'
});

// results là array các object upload result
```

### Upload Video

```javascript
const { uploadVideo } = require('../services/cloudinary.service');

const result = await uploadVideo(req.file.buffer, {
  folder: 'minisocial/posts/videos',
  publicId: `video_${Date.now()}`
});

// result.url - URL của video
// result.thumbnail - URL của thumbnail được tự động generate
// result.duration - Thời lượng video (seconds)
```

### Delete File

```javascript
const { deleteFile } = require('../services/cloudinary.service');

await deleteFile(publicId, 'image'); // hoặc 'video'
```

### Transform Image URL

```javascript
const { getTransformedUrl, getOptimizedImageUrl } = require('../services/cloudinary.service');

// Custom transformation
const url = getTransformedUrl(publicId, {
  width: 400,
  height: 400,
  crop: 'fill',
  gravity: 'face'
});

// Auto-optimized (format auto, quality auto)
const optimizedUrl = getOptimizedImageUrl(publicId, 400, 400);
```

## Sử dụng với Multer Middleware

### Trong Route

```javascript
const { uploadSingleImage, uploadMultipleImages } = require('../middlewares/upload.middleware');
const { uploadImage } = require('../services/cloudinary.service');

router.post('/upload', 
  authenticateToken,
  uploadSingleImage,
  async (req, res, next) => {
    try {
      const result = await uploadImage(req.file.buffer, {
        folder: `minisocial/users/${req.user.userId}`
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);
```

## File Size Limits

- **Images**: Tối đa 5MB
- **Videos**: Tối đa 100MB
- **Multiple Images**: Tối đa 10 files

## Allowed File Types

### Images
- image/jpeg
- image/png
- image/gif
- image/webp

### Videos
- video/mp4
- video/quicktime
- video/x-msvideo
- video/webm

## Folder Structure trên Cloudinary

```
minisocial/
├── users/
│   └── {userId}/
│       ├── avatars/
│       ├── images/
│       └── videos/
├── posts/
│   ├── images/
│   └── videos/
└── stories/
```

## Tips

1. **Auto format & quality**: Sử dụng `quality: 'auto'` và `fetch_format: 'auto'` để tối ưu tự động
2. **Face detection**: Dùng `gravity: 'face'` với `crop: 'fill'` để auto crop ảnh avatar theo khuôn mặt
3. **Lazy loading**: Sử dụng transformation để tạo thumbnail cho lazy loading
4. **Delete old files**: Nhớ xóa file cũ khi update (ví dụ: update avatar thì xóa avatar cũ)

