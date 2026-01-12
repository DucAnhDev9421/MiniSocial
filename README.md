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
   - Copy `.env.example` thành `.env`
   - Điền các giá trị cần thiết (xem file `.env.example` để biết chi tiết)
   - **Lưu ý về CORS_ORIGIN:** 
     - Mặc định: `CORS_ORIGIN=*` (cho phép tất cả - chỉ dùng khi development)
     - Khi dùng ngrok: `CORS_ORIGIN=https://xxxx-xx-xx-xx-xx.ngrok-free.app,http://localhost:3000`

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

## 🌐 Test trên máy thật với ngrok

Để test ứng dụng trên máy thật (không phải emulator), bạn có thể dùng ngrok để expose API ra internet:

1. **Cài đặt ngrok:**
   ```bash
   # Tải từ https://ngrok.com/download
   # Hoặc dùng npm
   npm install -g ngrok
   ```

2. **Chạy ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

3. **Copy ngrok URL** (ví dụ: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)

4. **Cập nhật `.env`:**
   ```env
   CORS_ORIGIN=https://xxxx-xx-xx-xx-xx.ngrok-free.app,http://localhost:3000
   ```

5. **Cập nhật Flutter app:**
   - Mở file `lib/core/config/app_config.dart`
   - Thay đổi `baseUrl` thành ngrok URL:
   ```dart
   static const String baseUrl = 'https://xxxx-xx-xx-xx-xx.ngrok-free.app';
   ```

6. **Khởi động lại server và test trên máy thật**

**Lưu ý:**
- Ngrok URL thay đổi mỗi lần chạy (trừ khi dùng tài khoản trả phí)
- Cần cập nhật lại URL trong Flutter app mỗi lần chạy ngrok mới
- Ngrok miễn phí có giới hạn traffic và có warning page
