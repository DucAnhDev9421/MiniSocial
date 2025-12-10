# 📧 Hướng dẫn Setup Email cho OTP Verification

## ⚠️ Lỗi thường gặp: "Missing credentials for 'PLAIN'"

Lỗi này xảy ra khi thiếu cấu hình email trong file `.env`. Hãy làm theo các bước sau:

## 🚀 Setup nhanh với Gmail (Khuyến nghị)

### Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào [Google Account](https://myaccount.google.com/)
2. Vào **Security** (Bảo mật)
3. Bật **2-Step Verification** (Xác minh 2 bước) nếu chưa bật
4. Tìm mục **App passwords** (Mật khẩu ứng dụng)
5. Chọn:
   - **App**: Mail
   - **Device**: Other (Custom name) → Nhập "MiniSocial"
6. Click **Generate**
7. **Copy mật khẩu 16 ký tự** (không có khoảng trắng)

### Bước 2: Cấu hình trong `.env`

Tạo hoặc cập nhật file `.env`:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
APP_NAME=MiniSocial
```

**⚠️ Lưu ý quan trọng:**
- `EMAIL_USER`: Email Gmail của bạn (ví dụ: `myemail@gmail.com`)
- `EMAIL_PASSWORD`: **App Password 16 ký tự** (KHÔNG phải mật khẩu Gmail thường)
- Không có khoảng trắng trong App Password

### Bước 3: Khởi động lại server

```bash
npm run dev
```

## 🔍 Kiểm tra cấu hình

Sau khi setup, thử đăng ký tài khoản mới:

```bash
POST http://localhost:3000/api/auth/register
{
  "name": "Test User",
  "username": "testuser",
  "email": "your-email@gmail.com",
  "password": "123456"
}
```

**Nếu thành công:**
- ✅ Bạn sẽ nhận email với mã OTP 6 chữ số
- ✅ Console sẽ hiển thị: `✅ Email sent successfully: <messageId>`

**Nếu lỗi:**
- ❌ Kiểm tra lại App Password đã copy đúng chưa
- ❌ Kiểm tra 2-Step Verification đã bật chưa
- ❌ Kiểm tra file `.env` có đúng format không

## 📧 Các tùy chọn email khác

### Option 2: Outlook/Hotmail

```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-app-password
APP_NAME=MiniSocial
```

Cách lấy App Password cho Outlook:
1. Vào [Microsoft Account Security](https://account.microsoft.com/security)
2. Bật 2-Step Verification
3. Tạo App Password

### Option 3: SMTP tùy chỉnh

```env
EMAIL_SERVICE=smtp
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
APP_NAME=MiniSocial
```

## 🐛 Troubleshooting

### Lỗi: "Missing credentials for 'PLAIN'"

**Nguyên nhân:** Thiếu `EMAIL_USER` hoặc `EMAIL_PASSWORD` trong `.env`

**Giải pháp:**
1. Kiểm tra file `.env` có tồn tại không
2. Kiểm tra các biến `EMAIL_USER` và `EMAIL_PASSWORD` đã được set chưa
3. Khởi động lại server sau khi thay đổi `.env`

### Lỗi: "Invalid login" hoặc "Authentication failed"

**Nguyên nhân:** 
- Dùng mật khẩu Gmail thường thay vì App Password
- App Password đã hết hạn hoặc bị xóa

**Giải pháp:**
1. Tạo lại App Password mới
2. Cập nhật `EMAIL_PASSWORD` trong `.env`
3. Khởi động lại server

### Không nhận được email

**Kiểm tra:**
1. ✅ Email có trong Spam/Junk folder không?
2. ✅ Console có hiển thị lỗi gửi email không?
3. ✅ Email address có đúng không?
4. ✅ Kiểm tra Gmail có bị giới hạn gửi email không (quá nhiều email trong thời gian ngắn)

## 📝 Test Checklist

Sau khi setup, test các tính năng:

- [ ] Đăng ký tài khoản → Nhận email OTP
- [ ] Verify email với OTP đúng → Thành công
- [ ] Verify email với OTP sai → Lỗi
- [ ] Resend OTP → Nhận email mới
- [ ] Resend OTP quá nhanh → Rate limit (1 lần/phút)

## 💡 Tips

1. **Development:** Có thể dùng [Mailtrap](https://mailtrap.io/) hoặc [Ethereal Email](https://ethereal.email/) để test mà không cần gửi email thật
2. **Production:** Nên dùng email service chuyên nghiệp như SendGrid, Mailgun, hoặc AWS SES
3. **Security:** Không commit file `.env` lên Git (đã có trong `.gitignore`)

## 🔗 Tài liệu tham khảo

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Outlook App Passwords](https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed5b-7e5f-00f2-32b9-3aff0ba6142d)

