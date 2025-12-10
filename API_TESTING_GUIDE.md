# 📚 Hướng dẫn Test API - MiniSocial Backend

File này cung cấp hướng dẫn chi tiết để test tất cả các API endpoints của MiniSocial.

## 📋 Mục lục

1. [Thiết lập cơ bản](#thiết-lập-cơ-bản)
2. [Authentication APIs](#authentication-apis)
3. [User Management APIs](#user-management-apis)
4. [Post APIs](#post-apis)
5. [Comment APIs](#comment-apis)
6. [Friend APIs](#friend-apis)
7. [Story APIs](#story-apis)
8. [Upload APIs](#upload-apis)
9. [System APIs](#system-apis)

---

## 🔧 Thiết lập cơ bản

### Base URL
```
http://localhost:3000/api
```

### Authentication
Hầu hết các API yêu cầu authentication. Sau khi đăng nhập, bạn sẽ nhận được `accessToken`. Sử dụng token này trong header:

```
Authorization: Bearer <accessToken>
```

### Tools để test
- **Postman** (khuyến nghị)
- **Thunder Client** (VS Code extension)
- **cURL** (command line)
- **Insomnia**
- **HTTPie**

---

## 🔐 Authentication APIs

### 1. Health Check
**Kiểm tra server có hoạt động không**

```http
GET /api/health
```

**Response:**
```json
{
  "ok": true
}
```

**cURL:**
```bash
curl http://localhost:3000/api/health
```

---

### 2. Đăng ký tài khoản
**Tạo tài khoản mới và nhận OTP qua email**

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "username": "nguyenvana",
  "email": "nguyenvana@example.com",
  "password": "123456",
  "bio": "Xin chào mọi người!"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully. Please verify your email with the OTP code sent to your email.",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "bio": "Xin chào mọi người!",
    "avatar": "",
    "followersCount": 0,
    "followingCount": 0,
    "isVerified": false,
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "requiresEmailVerification": true
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "password": "123456",
    "bio": "Xin chào mọi người!"
  }'
```

**Test Cases:**
- ✅ Đăng ký thành công
- ❌ Email đã tồn tại (409)
- ❌ Username đã tồn tại (409)
- ❌ Validation error (400) - thiếu field, format sai

---

### 3. Xác thực Email (OTP)
**Verify email bằng mã OTP nhận được qua email**

```http
POST /api/auth/verify-email
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "emailVerified": true,
    "isVerified": false
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nguyenvana@example.com",
    "code": "123456"
  }'
```

**Test Cases:**
- ✅ Verify thành công
- ❌ OTP sai (400)
- ❌ OTP hết hạn (400)
- ❌ Email đã được verify (400)
- ❌ User không tồn tại (404)

---

### 4. Gửi lại OTP
**Yêu cầu gửi lại mã OTP**

```http
POST /api/auth/resend-otp
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com"
}
```

**Response (200):**
```json
{
  "message": "OTP code has been sent to your email. Please check your inbox."
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nguyenvana@example.com"
  }'
```

**Test Cases:**
- ✅ Gửi lại OTP thành công
- ❌ Rate limit (429) - quá 1 lần/phút
- ❌ Email đã được verify (400)
- ❌ User không tồn tại (404)

---

### 5. Đăng nhập
**Đăng nhập vào hệ thống**

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "bio": "Xin chào mọi người!",
    "avatar": "",
    "followersCount": 0,
    "followingCount": 0,
    "postsCount": 0,
    "isVerified": false,
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nguyenvana@example.com",
    "password": "123456"
  }'
```

**Test Cases:**
- ✅ Đăng nhập thành công
- ❌ Email hoặc password sai (401)
- ❌ Tài khoản bị deactivate (403)
- ❌ Validation error (400)

---

### 6. Refresh Token
**Lấy access token mới từ refresh token**

```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Test Cases:**
- ✅ Refresh token thành công
- ❌ Refresh token không hợp lệ (401)
- ❌ Refresh token hết hạn (401)
- ❌ Refresh token trong blacklist (401)

---

### 7. Lấy thông tin user hiện tại
**Lấy thông tin của user đang đăng nhập**

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "bio": "Xin chào mọi người!",
    "avatar": "",
    "followersCount": 0,
    "followingCount": 0,
    "postsCount": 0,
    "isVerified": false,
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy thông tin thành công
- ❌ Token không hợp lệ (401)
- ❌ Token hết hạn (401)
- ❌ User không tồn tại (404)

---

### 8. Đăng xuất
**Đăng xuất và blacklist token**

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Đăng xuất thành công
- ❌ Token không hợp lệ (vẫn trả về success)

---

### 9. Xóa tài khoản (Soft Delete)
**Xóa tài khoản mềm**

```http
DELETE /api/auth/account
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/auth/account \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa tài khoản thành công
- ❌ Token không hợp lệ (401)
- ❌ User không tồn tại (404)

---

### 10. Khôi phục tài khoản
**Khôi phục tài khoản đã bị xóa**

```http
POST /api/auth/restore
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "message": "Account restored successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "email": "nguyenvana@example.com",
    "bio": "Xin chào mọi người!",
    "avatar": "",
    "followersCount": 0,
    "followingCount": 0,
    "postsCount": 0,
    "isVerified": false,
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/restore \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nguyenvana@example.com",
    "password": "123456"
  }'
```

**Test Cases:**
- ✅ Khôi phục thành công
- ❌ Email hoặc password sai (401)
- ❌ Tài khoản không bị xóa (404)

---

## 👤 User Management APIs

### 11. Tìm kiếm user
**Tìm kiếm user theo keyword**

```http
GET /api/users/search?q=keyword&page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `q` (required): Từ khóa tìm kiếm
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": "",
      "followersCount": 10,
      "isFollowing": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/users/search?q=nguyen" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Tìm kiếm thành công
- ✅ Tìm kiếm không có kết quả (empty array)
- ❌ Thiếu query parameter `q` (400)

---

### 12. Lấy gợi ý follow
**Lấy danh sách user gợi ý để follow (mutual friends)**

```http
GET /api/users/suggestions?limit=10
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `limit` (optional): Số kết quả (default: 10, max: 50)

**Response (200):**
```json
{
  "suggestions": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trần Thị B",
      "username": "tranthib",
      "avatar": "",
      "mutualFriendsCount": 5,
      "isFollowing": false
    }
  ]
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/users/suggestions \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy gợi ý thành công
- ✅ Không có gợi ý (empty array)
- ❌ Chưa đăng nhập (401)

---

### 13. Lấy profile user
**Lấy thông tin profile của user cụ thể**

```http
GET /api/users/profile/:userId
Authorization: Bearer <accessToken> (optional)
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "bio": "Xin chào mọi người!",
    "avatar": "",
    "followersCount": 10,
    "followingCount": 5,
    "postsCount": 3,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "isFollowing": false
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/users/profile/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy profile thành công
- ✅ Lấy profile của chính mình
- ❌ User không tồn tại (404)

---

### 14. Cập nhật profile
**Cập nhật thông tin profile (hỗ trợ upload avatar)**

```http
PUT /api/users/profile
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `name` (optional): Tên mới
- `username` (optional): Username mới
- `bio` (optional): Bio mới
- `avatar` (optional): File ảnh avatar

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A Updated",
    "username": "nguyenvana",
    "bio": "Bio mới",
    "avatar": "https://res.cloudinary.com/...",
    "followersCount": 10,
    "followingCount": 5,
    "postsCount": 3,
    "isVerified": false,
    "emailVerified": true,
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <accessToken>" \
  -F "name=Nguyễn Văn A Updated" \
  -F "bio=Bio mới" \
  -F "avatar=@/path/to/image.jpg"
```

**Postman:**
- Method: PUT
- Body → form-data
- Key: `name`, Type: Text, Value: "Nguyễn Văn A Updated"
- Key: `bio`, Type: Text, Value: "Bio mới"
- Key: `avatar`, Type: File, Value: [chọn file]

**Test Cases:**
- ✅ Cập nhật thành công
- ✅ Cập nhật chỉ name
- ✅ Cập nhật chỉ avatar
- ❌ Username đã tồn tại (409)
- ❌ Validation error (400)

---

### 15. Đổi password
**Thay đổi mật khẩu**

```http
PATCH /api/users/password
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/users/password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "123456",
    "newPassword": "newpassword123"
  }'
```

**Test Cases:**
- ✅ Đổi password thành công
- ❌ Current password sai (401)
- ❌ New password quá ngắn (400)
- ❌ Validation error (400)

---

### 16. Lấy posts của user
**Lấy danh sách posts của user cụ thể**

```http
GET /api/users/:userId/posts?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "posts": [
    {
      "id": "507f1f77bcf86cd799439020",
      "content": "Nội dung post",
      "images": [],
      "likesCount": 5,
      "commentsCount": 2,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/users/507f1f77bcf86cd799439011/posts?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy posts thành công
- ✅ User không có posts (empty array)
- ❌ User không tồn tại (404)

---

## 👥 Follow/Unfollow APIs

### 17. Follow user
**Follow một user**

```http
POST /api/users/:userId/follow
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Followed successfully",
  "followStatus": {
    "isFollowing": true,
    "isFollowedBy": false
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/users/507f1f77bcf86cd799439012/follow \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Follow thành công
- ❌ Follow chính mình (400)
- ❌ Đã follow rồi (400)
- ❌ User không tồn tại (404)

---

### 18. Unfollow user
**Unfollow một user**

```http
DELETE /api/users/:userId/unfollow
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Unfollowed successfully",
  "followStatus": {
    "isFollowing": false,
    "isFollowedBy": false
  }
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/users/507f1f77bcf86cd799439012/unfollow \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Unfollow thành công
- ❌ Chưa follow (400)
- ❌ User không tồn tại (404)

---

### 19. Kiểm tra follow status
**Kiểm tra trạng thái follow giữa 2 users**

```http
GET /api/users/:userId/follow-status
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "followStatus": {
    "isFollowing": true,
    "isFollowedBy": false
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/users/507f1f77bcf86cd799439012/follow-status \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Kiểm tra thành công
- ❌ User không tồn tại (404)

---

### 20. Lấy danh sách followers
**Lấy danh sách người follow user này**

```http
GET /api/users/:userId/followers?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "followers": [
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "Trần Thị B",
      "username": "tranthib",
      "avatar": "",
      "isFollowing": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/users/507f1f77bcf86cd799439011/followers?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy followers thành công
- ✅ User không có followers (empty array)
- ❌ User không tồn tại (404)

---

### 21. Lấy danh sách following
**Lấy danh sách người mà user này đang follow**

```http
GET /api/users/:userId/following?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "following": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Lê Văn C",
      "username": "levanc",
      "avatar": "",
      "isFollowing": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/users/507f1f77bcf86cd799439011/following?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy following thành công
- ✅ User không follow ai (empty array)
- ❌ User không tồn tại (404)

---

## 📝 Post APIs

### 22. Tạo post mới
**Tạo một post mới**

```http
POST /api/posts
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Đây là nội dung post của tôi!",
  "images": ["https://res.cloudinary.com/.../image1.jpg"],
  "visibility": "public"
}
```

**Response (201):**
```json
{
  "message": "Post created successfully",
  "post": {
    "id": "507f1f77bcf86cd799439020",
    "content": "Đây là nội dung post của tôi!",
    "images": ["https://res.cloudinary.com/.../image1.jpg"],
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "likesCount": 0,
    "commentsCount": 0,
    "isLiked": false,
    "visibility": "public",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Đây là nội dung post của tôi!",
    "images": ["https://res.cloudinary.com/.../image1.jpg"],
    "visibility": "public"
  }'
```

**Test Cases:**
- ✅ Tạo post thành công
- ✅ Tạo post không có images
- ❌ Validation error (400) - thiếu content
- ❌ Token không hợp lệ (401)

---

### 23. Lấy newsfeed
**Lấy danh sách posts từ users đang follow**

```http
GET /api/posts/feed?page=1&limit=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "posts": [
    {
      "id": "507f1f77bcf86cd799439020",
      "content": "Nội dung post",
      "images": [],
      "author": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Trần Thị B",
        "username": "tranthib",
        "avatar": ""
      },
      "likesCount": 5,
      "commentsCount": 2,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/posts/feed?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy feed thành công
- ✅ Không có posts trong feed (empty array)
- ❌ Chưa đăng nhập (401)

---

### 24. Lấy posts trending
**Lấy danh sách posts trending**

```http
GET /api/posts/trending?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "posts": [
    {
      "id": "507f1f77bcf86cd799439020",
      "content": "Nội dung post trending",
      "images": [],
      "author": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Trần Thị B",
        "username": "tranthib",
        "avatar": ""
      },
      "likesCount": 100,
      "commentsCount": 50,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/posts/trending?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy trending thành công
- ✅ Không có posts trending (empty array)

---

### 25. Lấy chi tiết post
**Lấy thông tin chi tiết của một post**

```http
GET /api/posts/:postId
Authorization: Bearer <accessToken> (optional)
```

**Response (200):**
```json
{
  "post": {
    "id": "507f1f77bcf86cd799439020",
    "content": "Nội dung post",
    "images": ["https://res.cloudinary.com/.../image1.jpg"],
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "likesCount": 5,
    "commentsCount": 2,
    "isLiked": false,
    "visibility": "public",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/posts/507f1f77bcf86cd799439020 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy post thành công
- ❌ Post không tồn tại (404)
- ❌ Post bị xóa (404)

---

### 26. Cập nhật post
**Cập nhật nội dung post**

```http
PUT /api/posts/:postId
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Nội dung đã được cập nhật",
  "images": ["https://res.cloudinary.com/.../image2.jpg"],
  "visibility": "public"
}
```

**Response (200):**
```json
{
  "message": "Post updated successfully",
  "post": {
    "id": "507f1f77bcf86cd799439020",
    "content": "Nội dung đã được cập nhật",
    "images": ["https://res.cloudinary.com/.../image2.jpg"],
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "likesCount": 5,
    "commentsCount": 2,
    "isLiked": false,
    "visibility": "public",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/posts/507f1f77bcf86cd799439020 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Nội dung đã được cập nhật",
    "images": ["https://res.cloudinary.com/.../image2.jpg"],
    "visibility": "public"
  }'
```

**Test Cases:**
- ✅ Cập nhật post thành công
- ❌ Không phải chủ sở hữu (403)
- ❌ Post không tồn tại (404)
- ❌ Validation error (400)

---

### 27. Xóa post
**Xóa một post**

```http
DELETE /api/posts/:postId
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/posts/507f1f77bcf86cd799439020 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa post thành công
- ❌ Không phải chủ sở hữu (403)
- ❌ Post không tồn tại (404)

---

### 28. Like post
**Like một post**

```http
POST /api/posts/:postId/like
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Post liked successfully",
  "likesCount": 6
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/posts/507f1f77bcf86cd799439020/like \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Like post thành công
- ❌ Đã like rồi (400)
- ❌ Post không tồn tại (404)

---

### 29. Unlike post
**Unlike một post**

```http
DELETE /api/posts/:postId/unlike
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Post unliked successfully",
  "likesCount": 5
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/posts/507f1f77bcf86cd799439020/unlike \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Unlike post thành công
- ❌ Chưa like (400)
- ❌ Post không tồn tại (404)

---

### 30. Lấy danh sách users đã like post
**Lấy danh sách users đã like post**

```http
GET /api/posts/:postId/likes?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trần Thị B",
      "username": "tranthib",
      "avatar": "",
      "likedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/posts/507f1f77bcf86cd799439020/likes?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy danh sách likes thành công
- ✅ Post không có likes (empty array)
- ❌ Post không tồn tại (404)

---

## 💬 Comment APIs

### 31. Tạo comment
**Tạo comment cho một post**

```http
POST /api/posts/:postId/comments
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Đây là comment của tôi!",
  "parentCommentId": null
}
```

**Response (201):**
```json
{
  "message": "Comment created successfully",
  "comment": {
    "id": "507f1f77bcf86cd799439030",
    "content": "Đây là comment của tôi!",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "postId": "507f1f77bcf86cd799439020",
    "parentCommentId": null,
    "likesCount": 0,
    "repliesCount": 0,
    "isLiked": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/posts/507f1f77bcf86cd799439020/comments \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Đây là comment của tôi!",
    "parentCommentId": null
  }'
```

**Test Cases:**
- ✅ Tạo comment thành công
- ✅ Tạo reply (nested comment) với `parentCommentId`
- ❌ Post không tồn tại (404)
- ❌ Validation error (400)

---

### 32. Lấy comments của post
**Lấy danh sách comments của một post**

```http
GET /api/posts/:postId/comments?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "comments": [
    {
      "id": "507f1f77bcf86cd799439030",
      "content": "Đây là comment của tôi!",
      "author": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Nguyễn Văn A",
        "username": "nguyenvana",
        "avatar": ""
      },
      "parentCommentId": null,
      "likesCount": 0,
      "repliesCount": 0,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/posts/507f1f77bcf86cd799439020/comments?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy comments thành công
- ✅ Post không có comments (empty array)
- ❌ Post không tồn tại (404)

---

### 33. Cập nhật comment
**Cập nhật nội dung comment**

```http
PUT /api/comments/:commentId
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Nội dung comment đã được cập nhật"
}
```

**Response (200):**
```json
{
  "message": "Comment updated successfully",
  "comment": {
    "id": "507f1f77bcf86cd799439030",
    "content": "Nội dung comment đã được cập nhật",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/comments/507f1f77bcf86cd799439030 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Nội dung comment đã được cập nhật"
  }'
```

**Test Cases:**
- ✅ Cập nhật comment thành công
- ❌ Không phải chủ sở hữu (403)
- ❌ Comment không tồn tại (404)
- ❌ Validation error (400)

---

### 34. Xóa comment
**Xóa một comment**

```http
DELETE /api/comments/:commentId
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Comment deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/comments/507f1f77bcf86cd799439030 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa comment thành công
- ❌ Không phải chủ sở hữu (403)
- ❌ Comment không tồn tại (404)

---

### 35. Like comment
**Like một comment**

```http
POST /api/comments/:commentId/like
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Comment liked successfully",
  "likesCount": 1
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/comments/507f1f77bcf86cd799439030/like \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Like comment thành công
- ❌ Đã like rồi (400)
- ❌ Comment không tồn tại (404)

---

### 36. Unlike comment
**Unlike một comment**

```http
DELETE /api/comments/:commentId/unlike
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Comment unliked successfully",
  "likesCount": 0
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/comments/507f1f77bcf86cd799439030/unlike \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Unlike comment thành công
- ❌ Chưa like (400)
- ❌ Comment không tồn tại (404)

---

### 37. Lấy replies (nested comments)
**Lấy danh sách replies của một comment**

```http
GET /api/comments/:commentId/replies?page=1&limit=20
Authorization: Bearer <accessToken> (optional)
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "replies": [
    {
      "id": "507f1f77bcf86cd799439031",
      "content": "Đây là reply",
      "author": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Trần Thị B",
        "username": "tranthib",
        "avatar": ""
      },
      "parentCommentId": "507f1f77bcf86cd799439030",
      "likesCount": 0,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/comments/507f1f77bcf86cd799439030/replies?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy replies thành công
- ✅ Comment không có replies (empty array)
- ❌ Comment không tồn tại (404)

---

## 👫 Friend APIs

### 38. Gửi lời mời kết bạn
**Gửi friend request**

```http
POST /api/friends/request
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Response (201):**
```json
{
  "message": "Friend request sent successfully",
  "friendRequest": {
    "id": "507f1f77bcf86cd799439040",
    "sender": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "receiver": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trần Thị B",
      "username": "tranthib",
      "avatar": ""
    },
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/friends/request \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "507f1f77bcf86cd799439012"
  }'
```

**Test Cases:**
- ✅ Gửi friend request thành công
- ❌ Gửi cho chính mình (400)
- ❌ Đã là bạn rồi (400)
- ❌ Đã gửi request rồi (400)
- ❌ User không tồn tại (404)

---

### 39. Lấy danh sách friend requests
**Lấy danh sách friend requests (sent hoặc received)**

```http
GET /api/friends/requests?type=sent&page=1&limit=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `type` (required): `sent` hoặc `received`
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "friendRequests": [
    {
      "id": "507f1f77bcf86cd799439040",
      "sender": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Nguyễn Văn A",
        "username": "nguyenvana",
        "avatar": ""
      },
      "receiver": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Trần Thị B",
        "username": "tranthib",
        "avatar": ""
      },
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/friends/requests?type=sent&page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy sent requests thành công
- ✅ Lấy received requests thành công
- ✅ Không có requests (empty array)
- ❌ Thiếu parameter `type` (400)

---

### 40. Chấp nhận friend request
**Chấp nhận lời mời kết bạn**

```http
PUT /api/friends/request/:requestId/accept
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Friend request accepted successfully",
  "friendship": {
    "id": "507f1f77bcf86cd799439050",
    "user1": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana"
    },
    "user2": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trần Thị B",
      "username": "tranthib"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/friends/request/507f1f77bcf86cd799439040/accept \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Chấp nhận thành công
- ❌ Không phải receiver (403)
- ❌ Request không tồn tại (404)
- ❌ Request đã được xử lý (400)

---

### 41. Từ chối/Xóa friend request
**Từ chối hoặc xóa friend request**

```http
DELETE /api/friends/request/:requestId
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Friend request deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/friends/request/507f1f77bcf86cd799439040 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa request thành công
- ❌ Không phải sender/receiver (403)
- ❌ Request không tồn tại (404)

---

### 42. Lấy danh sách bạn bè
**Lấy danh sách bạn bè**

```http
GET /api/friends?page=1&limit=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số kết quả mỗi trang (default: 20, max: 100)

**Response (200):**
```json
{
  "friends": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trần Thị B",
      "username": "tranthib",
      "avatar": "",
      "friendshipDate": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/friends?page=1&limit=20" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy danh sách bạn bè thành công
- ✅ Không có bạn bè (empty array)

---

### 43. Hủy kết bạn
**Hủy kết bạn với một user**

```http
DELETE /api/friends/:friendId
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Unfriended successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/friends/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Hủy kết bạn thành công
- ❌ Không phải bạn bè (400)
- ❌ User không tồn tại (404)

---

## 📸 Story APIs

### 44. Tạo story
**Tạo một story mới (24h)**

```http
POST /api/stories
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "media": "https://res.cloudinary.com/.../story.jpg",
  "mediaType": "image",
  "caption": "Story của tôi!"
}
```

**Response (201):**
```json
{
  "message": "Story created successfully",
  "story": {
    "id": "507f1f77bcf86cd799439060",
    "media": "https://res.cloudinary.com/.../story.jpg",
    "mediaType": "image",
    "caption": "Story của tôi!",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar": ""
    },
    "viewsCount": 0,
    "isViewed": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/stories \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "media": "https://res.cloudinary.com/.../story.jpg",
    "mediaType": "image",
    "caption": "Story của tôi!"
  }'
```

**Test Cases:**
- ✅ Tạo story thành công
- ✅ Tạo story video
- ❌ Validation error (400)
- ❌ Media không hợp lệ (400)

---

### 45. Lấy stories feed
**Lấy danh sách stories từ bạn bè và follow**

```http
GET /api/stories/feed
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "stories": [
    {
      "id": "507f1f77bcf86cd799439060",
      "media": "https://res.cloudinary.com/.../story.jpg",
      "mediaType": "image",
      "caption": "Story của tôi!",
      "author": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Trần Thị B",
        "username": "tranthib",
        "avatar": ""
      },
      "viewsCount": 5,
      "isViewed": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/stories/feed \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy stories feed thành công
- ✅ Không có stories (empty array)
- ❌ Chưa đăng nhập (401)

---

### 46. Lấy stories của user
**Lấy danh sách stories của user cụ thể**

```http
GET /api/stories/:userId
Authorization: Bearer <accessToken> (optional)
```

**Response (200):**
```json
{
  "stories": [
    {
      "id": "507f1f77bcf86cd799439060",
      "media": "https://res.cloudinary.com/.../story.jpg",
      "mediaType": "image",
      "caption": "Story của tôi!",
      "author": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Nguyễn Văn A",
        "username": "nguyenvana",
        "avatar": ""
      },
      "viewsCount": 5,
      "isViewed": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**cURL:**
```bash
curl -X GET http://localhost:3000/api/stories/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Lấy stories thành công
- ✅ User không có stories (empty array)
- ❌ User không tồn tại (404)

---

### 47. Xóa story
**Xóa một story**

```http
DELETE /api/stories/:storyId
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Story deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/stories/507f1f77bcf86cd799439060 \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa story thành công
- ❌ Không phải chủ sở hữu (403)
- ❌ Story không tồn tại (404)

---

### 48. Đánh dấu đã xem story
**Đánh dấu đã xem story**

```http
POST /api/stories/:storyId/view
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Story viewed successfully",
  "viewsCount": 6
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/stories/507f1f77bcf86cd799439060/view \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Đánh dấu xem thành công
- ❌ Story không tồn tại (404)
- ❌ Story đã hết hạn (400)

---

## 📤 Upload APIs

### 49. Upload single image
**Upload một ảnh**

```http
POST /api/upload/image
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `image` (file): File ảnh

**Response (200):**
```json
{
  "message": "Image uploaded successfully",
  "data": {
    "publicId": "minisocial/users/.../img_1234567890",
    "url": "https://res.cloudinary.com/.../image.jpg",
    "secureUrl": "https://res.cloudinary.com/.../image.jpg",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "bytes": 245678
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer <accessToken>" \
  -F "image=@/path/to/image.jpg"
```

**Postman:**
- Method: POST
- Body → form-data
- Key: `image`, Type: File, Value: [chọn file ảnh]

**Test Cases:**
- ✅ Upload ảnh thành công
- ❌ Không có file (400)
- ❌ File không phải ảnh (400)
- ❌ File quá lớn (400)

---

### 50. Upload multiple images
**Upload nhiều ảnh (tối đa 10)**

```http
POST /api/upload/images
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `images` (files): Nhiều file ảnh

**Response (200):**
```json
{
  "message": "Images uploaded successfully",
  "data": [
    {
      "publicId": "minisocial/users/.../img_1234567890",
      "url": "https://res.cloudinary.com/.../image1.jpg",
      "secureUrl": "https://res.cloudinary.com/.../image1.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "bytes": 245678
    },
    {
      "publicId": "minisocial/users/.../img_1234567891",
      "url": "https://res.cloudinary.com/.../image2.jpg",
      "secureUrl": "https://res.cloudinary.com/.../image2.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "bytes": 234567
    }
  ]
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/images \
  -H "Authorization: Bearer <accessToken>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

**Postman:**
- Method: POST
- Body → form-data
- Key: `images`, Type: File, Value: [chọn nhiều file ảnh]

**Test Cases:**
- ✅ Upload nhiều ảnh thành công
- ❌ Không có file (400)
- ❌ Quá 10 ảnh (400)
- ❌ File không phải ảnh (400)

---

### 51. Upload single video
**Upload một video**

```http
POST /api/upload/video
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (file): File video

**Response (200):**
```json
{
  "message": "Video uploaded successfully",
  "data": {
    "publicId": "minisocial/users/.../vid_1234567890",
    "url": "https://res.cloudinary.com/.../video.mp4",
    "secureUrl": "https://res.cloudinary.com/.../video.mp4",
    "width": 1920,
    "height": 1080,
    "format": "mp4",
    "bytes": 5245678,
    "duration": 30.5,
    "thumbnail": "https://res.cloudinary.com/.../thumbnail.jpg"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/video \
  -H "Authorization: Bearer <accessToken>" \
  -F "video=@/path/to/video.mp4"
```

**Postman:**
- Method: POST
- Body → form-data
- Key: `video`, Type: File, Value: [chọn file video]

**Test Cases:**
- ✅ Upload video thành công
- ❌ Không có file (400)
- ❌ File không phải video (400)
- ❌ File quá lớn (400)

---

### 52. Upload avatar
**Upload avatar/profile picture (tự động crop face)**

```http
POST /api/upload/avatar
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar` (file): File ảnh avatar

**Response (200):**
```json
{
  "message": "Avatar uploaded successfully",
  "data": {
    "publicId": "minisocial/users/.../avatar_507f1f77bcf86cd799439011",
    "url": "https://res.cloudinary.com/.../avatar.jpg",
    "secureUrl": "https://res.cloudinary.com/.../avatar.jpg",
    "width": 400,
    "height": 400,
    "format": "jpg",
    "bytes": 45678
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/avatar \
  -H "Authorization: Bearer <accessToken>" \
  -F "avatar=@/path/to/avatar.jpg"
```

**Postman:**
- Method: POST
- Body → form-data
- Key: `avatar`, Type: File, Value: [chọn file ảnh]

**Test Cases:**
- ✅ Upload avatar thành công
- ❌ Không có file (400)
- ❌ File không phải ảnh (400)

---

### 53. Xóa file từ Cloudinary
**Xóa file đã upload**

```http
DELETE /api/upload/:publicId?resourceType=image
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `resourceType` (optional): `image` hoặc `video` (default: `image`)

**Response (200):**
```json
{
  "message": "File deleted successfully",
  "data": {
    "result": "ok"
  }
}
```

**cURL:**
```bash
curl -X DELETE "http://localhost:3000/api/upload/minisocial/users/.../img_1234567890?resourceType=image" \
  -H "Authorization: Bearer <accessToken>"
```

**Test Cases:**
- ✅ Xóa file thành công
- ❌ File không tồn tại (404)
- ❌ Không có quyền xóa (403)

---

## 📊 Tổng kết

### Status Codes thường dùng:
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Token không hợp lệ)
- `403` - Forbidden (Không có quyền)
- `404` - Not Found
- `409` - Conflict (Đã tồn tại)
- `429` - Too Many Requests (Rate limit)
- `500` - Internal Server Error

### Lưu ý khi test:
1. **Authentication**: Hầu hết API cần `Authorization: Bearer <accessToken>`
2. **Rate Limiting**: Auth endpoints có rate limit, không gọi quá nhiều lần
3. **Pagination**: Các API list có pagination, sử dụng `page` và `limit`
4. **File Upload**: Sử dụng `multipart/form-data` cho upload
5. **Validation**: Kiểm tra format dữ liệu trước khi gửi

### Test Flow mẫu:
1. Đăng ký tài khoản → Nhận OTP
2. Verify email với OTP
3. Đăng nhập → Nhận accessToken
4. Cập nhật profile
5. Tạo post
6. Like/comment post
7. Follow user
8. Upload ảnh/video
9. Tạo story
10. Gửi friend request

---

## 🔗 Tài liệu tham khảo

- [README.md](./README.md) - Tổng quan dự án
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Hướng dẫn setup email
- [NEO4J_SETUP.md](./NEO4J_SETUP.md) - Hướng dẫn setup Neo4j

---

**Chúc bạn test thành công! 🚀**

