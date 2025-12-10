# Hướng dẫn cấu hình Neo4j Desktop

## Các bước cấu hình:

1. **Mở Neo4j Desktop** và đảm bảo database đang chạy (status: Running)

2. **Lấy thông tin connection:**
   - Click vào database của bạn
   - Trong tab "Details", bạn sẽ thấy:
     - **URI**: Thường là `bolt://localhost:7687` hoặc `neo4j://localhost:7687`
     - **Username**: Mặc định là `neo4j`
     - **Password**: Password bạn đã đặt khi tạo database

3. **Cập nhật file `.env`:**
   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-actual-password-here
   ```

4. **Nếu quên password:**
   - Trong Neo4j Desktop, click vào database
   - Chọn "Reset Password" để đặt lại password mới
   - Hoặc tạo database mới với password bạn muốn

5. **Kiểm tra connection:**
   - Đảm bảo database đang ở trạng thái "Running" (màu xanh)
   - Có thể test connection bằng cách mở Neo4j Browser từ Desktop

## Lưu ý:

- Neo4j Desktop thường dùng port **7687** cho Bolt protocol
- URI format: `bolt://localhost:7687` hoặc `neo4j://localhost:7687` (cả 2 đều được)
- Nếu database không chạy, server sẽ vẫn khởi động được nhưng sẽ hiển thị warning

## Troubleshooting:

- **Lỗi "Connection refused"**: Đảm bảo Neo4j Desktop đang chạy và database đã start
- **Lỗi "Authentication failed"**: Kiểm tra lại username và password trong `.env`
- **Lỗi "Unknown scheme"**: Đảm bảo URI bắt đầu bằng `bolt://` hoặc `neo4j://`

