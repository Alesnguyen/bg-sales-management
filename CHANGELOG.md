# Lịch sử phiên bản

## 0.6.1
- Bảng khách hàng: khối "tên + mã + trạng thái" xuống dòng gọn (tối đa 2 dòng), mọi dòng cao bằng nhau; các cột cố định gọn lại (626 px thay vì 730 px) và vùng số liệu trượt rộng hơn; trang Khách hàng dùng toàn bộ chiều ngang; nút "Mở rộng bảng" ẩn thanh bên (Esc để thoát).
- Việt hóa 100%: bỏ chữ Theme/Light/Dark/Design System; nút chọn tệp Excel bằng tiếng Việt; mọi thông báo lỗi và lỗi cập nhật hiển thị tiếng Việt; giao diện hệ thống của ứng dụng đặt tiếng Việt.
- Sửa lỗi: nút "Khởi động lại để cập nhật" hiện sai khi chưa có bản cập nhật.
- Quy trình phát hành tự tạo `latest.yml` để tính năng tự cập nhật hoạt động; `index.html` được dựng tự động trong quy trình build.

## 0.6.0
- Tổng quan: lời chào cá nhân (tên đặt ở Cài đặt) + câu động viên đổi hằng ngày, bộ lọc khu vực cho KPI và biểu đồ, biểu đồ đường doanh số theo tháng (2025 so với 2026) kèm 3 chỉ số phân tích, Top 5 khách hàng.
- Khách hàng: bảng trượt ngang cố định 6 cột đầu, thêm Q1–Q4 2026 và 12 tháng (2025/2026); trạng thái chuyển vào cột Khách hàng cạnh mã; nhập và sửa tay mã, quý, tháng; nút tính lại quý và tổng từ tháng; lưu trữ trong hộp thoại sửa; CSV có đủ quý/tháng.
- Bản cài Windows: mục "Cập nhật ứng dụng" trong Cài đặt (kiểm tra, tải, khởi động lại để cập nhật); dữ liệu được giữ nguyên.
- Sao lưu gồm cả tên hiển thị.

## 0.5.0
Giao diện theo bản vẽ Design System v0.2.1 với chức năng thật: nhập Excel, khách hàng, lịch làm việc, cài đặt, sao lưu.
