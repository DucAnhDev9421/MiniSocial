# Mini Social - Backend (Node.js + Express + MongoDB + Neo4j)

Backend API cho ứng dụng mạng xã hội mini sử dụng Node.js, Express, MongoDB (Mongoose) và Neo4j (Graph Database).

## 🏗️ Cấu trúc dự án

```
src/
├── config/              # Cấu hình (DB connection)
├── controllers/         # Xử lý logic request/response
├── dtos/                # Data Transfer Objects (Joi validation)
├── interfaces/          # TypeScript interfaces/JSDoc
├── middlewares/         # Auth, Error handling, Rate limiting, Security
├── models/
│   ├── mongodb/         # MongoDB Models (User, Post, Comment, Story, Chat, Notification)
│   └── neo4j/           # Cypher queries (Follow relationships)
├── routes/              # API endpoints
├── services/            # Business logic & Neo4j services
├── sockets/             # Socket.io cho realtime chat
├── utils/               # Helper functions (JWT, Constants, Logger)
└── index.js             # Entry point
```

## 📦 Dependencies đã cài đặt

### Core
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `neo4j-driver` - Neo4j driver
- `dotenv` - Environment variables

### Security & Auth
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `nodemailer` - Email service (OTP verification)

### Validation & Utilities
- `joi` - Input validation
- `morgan` - HTTP request logger
- `socket.io` - Realtime communication

### File Upload
- `cloudinary` - Cloud-based image and video management
- `multer` - Multipart/form-data handling
- `multer-storage-cloudinary` - Cloudinary storage for Multer

### Development
- `nodemon` - Auto-reload

## 🚀 Setup

1. **Clone và cài đặt dependencies:**
```bash
npm install
```

2. **Cấu hình environment variables:**
   - Copy `env.example` thành `.env`
   - Điền các giá trị cần thiết:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/minisocial
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Cloudinary Configuration (for image/video upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration (for OTP verification)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
# For custom SMTP (when EMAIL_SERVICE=smtp)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
APP_NAME=MiniSocial
```

3. **Khởi động MongoDB và Neo4j:**
   - Đảm bảo MongoDB đang chạy trên port 27017
   - Đảm bảo Neo4j đang chạy trên port 7687

4. **Chạy server:**
```bash
# Development mode (với auto-reload)
npm run dev

# Production mode
npm start
```

## ✨ Tính năng đã triển khai

### ✅ Cấu trúc cơ bản
- [x] Express server với middleware setup
- [x] MongoDB connection
- [x] Neo4j connection
- [x] Error handling middleware
- [x] Rate limiting
- [x] Security headers (Helmet)

### ✅ Authentication & Authorization
- [x] JWT authentication middleware
- [x] Password hashing với bcrypt
- [x] Access token & Refresh token
- [x] Authorization middleware
- [x] Email OTP verification (xác thực email sau đăng ký)
- [x] OTP model với TTL index (tự động xóa sau khi hết hạn)
- [x] Email service (nodemailer) - hỗ trợ Gmail, Outlook, SMTP tùy chỉnh

### ✅ Models (MongoDB)
- [x] User model (với username, bio, avatar, followersCount, followingCount, emailVerified)
- [x] OTP model (với TTL index - tự động xóa sau khi hết hạn)
- [x] Post model
- [x] Comment model (hỗ trợ nested comments)
- [x] Story model (với TTL index 24h)
- [x] Conversation & Message models
- [x] Notification model

### ✅ Models (Neo4j)
- [x] Follow relationships
- [x] Get following/followers IDs
- [x] Follow suggestions (mutual friends)
- [x] User node creation/deletion

### ✅ Validation
- [x] User DTOs (register, login, update profile)
- [x] Post DTOs (create, update, query)
- [x] Comment DTOs
- [x] Follow DTOs
- [x] Joi validation middleware

### ✅ Utilities
- [x] JWT helper functions
- [x] Constants
- [x] Logger
- [x] Socket.io setup (chưa tích hợp vào server)

### ✅ File Upload (Cloudinary)
- [x] Cloudinary configuration
- [x] Image upload service
- [x] Video upload service (với thumbnail generation)
- [x] Multiple files upload
- [x] File deletion
- [x] Image optimization & transformation
- [x] Multer middleware (single/multiple uploads)
- [x] Upload routes (image, video, avatar)

## 📝 API Endpoints (hiện tại)

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
  - Body: `{ name, username, email, password, bio? }`
  - Response: `{ message, user, tokens: { accessToken, refreshToken }, requiresEmailVerification: true }`
  - **Lưu ý:** Sau khi đăng ký, hệ thống sẽ gửi mã OTP 6 chữ số đến email. User cần verify email bằng endpoint `/api/auth/verify-email`
- `POST /api/auth/verify-email` - Xác thực email bằng OTP
  - Body: `{ email, code }` (code: 6 chữ số)
  - Response: `{ message, user: { id, name, username, email, emailVerified } }`
- `POST /api/auth/resend-otp` - Gửi lại mã OTP
  - Body: `{ email }`
  - Response: `{ message }`
  - **Rate limit:** Tối đa 1 lần mỗi phút
- `POST /api/auth/login` - Đăng nhập
  - Body: `{ email, password }`
  - Response: `{ message, user, tokens: { accessToken, refreshToken } }`
- `POST /api/auth/refresh` - Refresh access token
  - Body: `{ refreshToken }`
  - Response: `{ accessToken, refreshToken }`
- `GET /api/auth/me` - Lấy thông tin user hiện tại (yêu cầu authentication)
  - Headers: `Authorization: Bearer <accessToken>`
  - Response: `{ user }` (bao gồm `emailVerified`)
- `POST /api/auth/logout` - Đăng xuất (hủy access token hiện tại)
  - Headers: `Authorization: Bearer <accessToken>`
  - Response: `{ message }`
- `DELETE /api/auth/account` - Xóa tài khoản mềm (soft delete)
  - Headers: `Authorization: Bearer <accessToken>`
  - Response: `{ message }`
- `POST /api/auth/restore` - Khôi phục tài khoản đã bị xóa
  - Body: `{ email, password }`
  - Response: `{ message, user, tokens: { accessToken, refreshToken } }`

### User Management
- `GET /api/users/profile/:userId` - Lấy thông tin profile user (public hoặc authenticated)
- `PUT /api/users/profile` - Cập nhật profile (yêu cầu authentication)
  - Content-Type: `multipart/form-data`
  - Fields: `name`, `username`, `bio` (text) + `avatar` (file, optional) - upload trực tiếp lên Cloudinary
- `PATCH /api/users/password` - Đổi password (yêu cầu authentication)
  - Body: `{ currentPassword, newPassword }`
- `GET /api/users/search?q=keyword` - Tìm kiếm user (public hoặc authenticated)
- `GET /api/users/:userId/posts` - Lấy posts của user (sẽ implement sau)

### Posts
- `POST /api/posts` - Tạo post mới (yêu cầu authentication)
  - Body: `{ content, images?, visibility? }`
- `GET /api/posts/:postId` - Lấy chi tiết post (public hoặc authenticated)
- `PUT /api/posts/:postId` - Cập nhật post (yêu cầu authentication)
  - Body: `{ content?, images?, visibility? }`
- `DELETE /api/posts/:postId` - Xóa post (yêu cầu authentication)
- `GET /api/posts/feed` - Newsfeed (posts từ users đang follow, yêu cầu authentication)
- `GET /api/posts/trending` - Posts trending (public hoặc authenticated)
- `POST /api/posts/:postId/like` - Like post (yêu cầu authentication)
- `DELETE /api/posts/:postId/unlike` - Unlike post (yêu cầu authentication)
- `GET /api/posts/:postId/likes` - Lấy danh sách users đã like (public hoặc authenticated)

### Comments
- `POST /api/posts/:postId/comments` - Tạo comment (yêu cầu authentication)
  - Body: `{ content, parentCommentId? }` (parentCommentId cho nested comments)
- `GET /api/posts/:postId/comments` - Lấy comments của post (public hoặc authenticated)
- `PUT /api/comments/:commentId` - Cập nhật comment (yêu cầu authentication)
  - Body: `{ content }`
- `DELETE /api/comments/:commentId` - Xóa comment (yêu cầu authentication)
- `POST /api/comments/:commentId/like` - Like comment (yêu cầu authentication)
- `DELETE /api/comments/:commentId/unlike` - Unlike comment (yêu cầu authentication)
- `GET /api/comments/:commentId/replies` - Lấy replies (nested comments, public hoặc authenticated)

### Friends
- `POST /api/friends/request` - Gửi lời mời kết bạn (yêu cầu authentication)
  - Body: `{ receiverId }`
- `GET /api/friends/requests?type=sent|received` - Lấy danh sách friend requests (yêu cầu authentication)
- `PUT /api/friends/request/:requestId/accept` - Chấp nhận lời mời kết bạn (yêu cầu authentication)
- `DELETE /api/friends/request/:requestId` - Từ chối/Xóa lời mời kết bạn (yêu cầu authentication)
- `GET /api/friends?page=1&limit=20` - Lấy danh sách bạn bè (yêu cầu authentication)
- `DELETE /api/friends/:friendId` - Hủy kết bạn (yêu cầu authentication)

### Stories (24h)
- `POST /api/stories` - Tạo story (yêu cầu authentication)
  - Body: `{ media, mediaType?, caption? }` (mediaType: 'image' | 'video')
- `GET /api/stories/feed` - Lấy stories từ bạn bè và follow (yêu cầu authentication)
- `GET /api/stories/:userId` - Lấy stories của user cụ thể (public hoặc authenticated)
- `DELETE /api/stories/:storyId` - Xóa story (yêu cầu authentication)
- `POST /api/stories/:storyId/view` - Đánh dấu đã xem story (yêu cầu authentication)

### Follow/Unfollow
- `POST /api/users/:userId/follow` - Follow user (yêu cầu authentication)
- `DELETE /api/users/:userId/unfollow` - Unfollow user (yêu cầu authentication)
- `GET /api/users/:userId/follow-status` - Kiểm tra follow status (yêu cầu authentication)
- `GET /api/users/:userId/followers` - Lấy danh sách followers (public hoặc authenticated)
- `GET /api/users/:userId/following` - Lấy danh sách following (public hoặc authenticated)
- `GET /api/users/suggestions` - Gợi ý follow (mutual friends, yêu cầu authentication)

### Upload (yêu cầu authentication)
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images (max 10)
- `POST /api/upload/video` - Upload single video
- `POST /api/upload/avatar` - Upload avatar/profile picture (auto crop face)
- `DELETE /api/upload/:publicId` - Delete file from Cloudinary

### System
- `GET /api/health` - Health check

## 🔜 Next Steps (cần triển khai)

- [x] Auth controllers (register, login, refresh token, logout) ✅
- [x] User controllers (profile, update profile, search) ✅
- [x] Follow/Unfollow controllers ✅
- [x] Post controllers (CRUD, newsfeed, trending, like) ✅
- [ ] Comment controllers
- [ ] Follow/Unfollow controllers
- [ ] Story controllers
- [ ] Chat/Message controllers
- [ ] Notification system
- [ ] Tích hợp Socket.io vào server
- [ ] Tests
