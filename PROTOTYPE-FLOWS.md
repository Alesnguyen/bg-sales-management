# Prototype Flows — v0.2.1

**Trạng thái:** các luồng dưới đây là đặc tả và checklist; vòng này ưu tiên chuẩn hóa cách mô tả state và tiêu chí nghiệm thu. Luồng được gắn nhãn “Preview” chỉ được trình diễn trong HTML; chưa phải nghiệp vụ đã lập trình hoặc kiểm thử với dữ liệu thật.

## PF-00 — Splash / Startup (Preview)
- **TRIGGER:** Người dùng mở `index.html`.
- **ACTION:** Prototype hiển thị Splash tối thiểu khoảng 1.4 giây.
- **SYSTEM RESPONSE:** Hiển thị thanh tiến trình indeterminate, không giả phần trăm; đây chỉ là mô phỏng.
- **NEXT STATE:** Hiển thị Tổng quan mẫu.
- **Điều kiện cho ứng dụng thật:** chỉ đóng Splash sau `AppReady AND MinimumDisplayTimeReached`; lỗi tải dữ liệu phải được biểu diễn riêng.

## PF-01 — Light / Dark Mode (Preview)
- **TRIGGER:** Nhấn điều khiển giao diện.
- **ACTION:** Chuyển theme.
- **SYSTEM RESPONSE:** Màu nền, chữ, viền, nút và component chuyển theo semantic tokens; lưu lựa chọn trong trình duyệt nếu local storage khả dụng.
- **NEXT STATE:** Giữ nguyên màn hình hiện tại ở theme mới.

## PF-02 — Điều hướng (Preview)
- **TRIGGER:** Nhấn một mục trong sidebar.
- **ACTION:** Chọn Tổng quan / Khách hàng / Lịch / Nhập dữ liệu / Cài đặt.
- **SYSTEM RESPONSE:** Hiển thị màn hình tương ứng và cập nhật mục đang chọn.
- **NEXT STATE:** Người dùng tiếp tục trong màn hình đã chọn.

## PF-03 — Tìm kiếm khách hàng (Preview)
- **TRIGGER:** Nhập từ khóa.
- **ACTION:** Lọc các hàng dữ liệu mẫu theo tên/khu vực.
- **SYSTEM RESPONSE:** Cập nhật bảng tức thời; hiển thị empty state nếu không có hàng phù hợp.
- **NEXT STATE:** Người dùng chỉnh từ khóa hoặc mở màn hình khác.

## PF-04 — Lọc khu vực (Preview)
- **TRIGGER:** Chọn khu vực.
- **ACTION:** Áp dụng bộ lọc lên dữ liệu mẫu.
- **SYSTEM RESPONSE:** Bảng cập nhật và có thể kết hợp tìm kiếm.
- **NEXT STATE:** Chọn khu vực khác hoặc xóa bộ lọc.

## PF-05 — Import Excel (Preview only)
- **TRIGGER:** Chọn tệp Excel trên màn hình Nhập dữ liệu.
- **ACTION:** Chọn tệp `.xlsx`/`.xls` để minh họa bước đầu.
- **SYSTEM RESPONSE:** Hiển thị tên tệp và giải thích rằng preview chưa đọc nội dung.
- **NEXT STATE:** Chưa import gì; chờ module import thật và quy tắc dữ liệu được duyệt.
- **Acceptance ứng dụng thật:** đúng sheet đã chốt; validate header/kiểu dữ liệu/hàng KPI/trùng lặp; preview; chỉ ghi sau xác nhận; giao dịch an toàn; summary chính xác; không làm hỏng dữ liệu nếu lỗi.

## PF-06 — Thêm / sửa / xóa khách hàng (Chưa triển khai)
- **TRIGGER:** Người dùng yêu cầu tạo, sửa hoặc xóa.
- **ACTION:** Validate dữ liệu; với xóa phải xác nhận; với dữ liệu chưa lưu phải hỏi Lưu / Không lưu / Ở lại.
- **SYSTEM RESPONSE:** Chỉ ghi thay đổi sau xác nhận, hiển thị lỗi lưu nếu có.
- **NEXT STATE:** Trở lại danh sách/hồ sơ với dữ liệu nhất quán.
- **Chặn nghiệm thu:** chưa có quy tắc mã khách hàng và xử lý trùng/xóa được duyệt.

## PF-07 — Hồ sơ khách hàng (Chưa triển khai)
- **TRIGGER:** Chọn một khách hàng.
- **ACTION:** Tải hồ sơ theo khóa định danh.
- **SYSTEM RESPONSE:** Hiển thị các trường đã được ánh xạ và lưu, không dùng dữ liệu minh họa để giả lập record thật.
- **NEXT STATE:** Xem/sửa hoặc quay lại danh sách.

## PF-08 — Lịch làm việc (Preview bố cục)
- **TRIGGER:** Mở Lịch làm việc.
- **ACTION:** Xem tuần và các thẻ công việc minh họa.
- **SYSTEM RESPONSE:** Cho thấy bố cục và trạng thái mẫu; chưa lưu công việc.
- **NEXT STATE:** Chờ thiết kế tương tác thêm/sửa/trạng thái và data model được duyệt.

## PF-09 — System states (Đặc tả)
- **TRIGGER:** Tải dữ liệu / không có dữ liệu / thành công / gặp lỗi / offline.
- **ACTION:** Ứng dụng hiển thị trạng thái thực tương ứng.
- **SYSTEM RESPONSE:** Loading, Empty, Success, Error và Offline có nội dung, icon/nhãn và hành động phù hợp.
- **NEXT STATE:** Retry / sửa dữ liệu / tiếp tục; không giả vờ thành công khi có lỗi.

## PF-10 — Focus, keyboard, reduced motion (Cần kiểm thử)
- **TRIGGER:** Dùng Tab/Shift+Tab/Enter/Space hoặc bật tùy chọn giảm chuyển động của hệ điều hành.
- **ACTION:** Di chuyển và kích hoạt điều khiển; áp dụng reduced motion.
- **SYSTEM RESPONSE:** Focus rõ ràng; thứ tự hợp lý; animation được giảm/tắt khi cần.
- **NEXT STATE:** Người dùng thao tác tiếp mà không phụ thuộc chuột hoặc màu sắc đơn lẻ.

## PF-11 — Backup / Restore (Chưa triển khai)
- **TRIGGER:** Người dùng yêu cầu sao lưu hoặc khôi phục.
- **ACTION:** Chọn đích backup hoặc tệp hợp lệ để restore.
- **SYSTEM RESPONSE:** Xác nhận đường dẫn, kiểm tra khả năng đọc, cảnh báo trước khi ghi đè và thông báo kết quả.
- **NEXT STATE:** Database được xác minh hoặc không bị thay đổi khi thao tác thất bại.
