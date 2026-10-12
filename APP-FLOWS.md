# Luồng người dùng của ứng dụng (v0.6.0)

Bản vẽ giao diện: `design/prototype-v0.2.1.html` (5 màn hình). Ứng dụng: `index.html` = bản vẽ + `src/body.html` + `src/app.js` (dựng bằng `python3 tools/build_app.py`).

| Luồng | Các bước | Quy tắc |
|---|---|---|
| Nhập Excel | Chọn .xlsx → kiểm tra cấu trúc (sheet, dòng PTKD, người phụ trách) → xem trước Mới/Cập nhật/Không đổi → xác nhận | Khóa = tên chuẩn hóa; upsert; không xóa khách vắng mặt; giữ khu vực/mã/ghi chú/lưu trữ đã nhập tay; ghi trong một giao dịch (lỗi thì không đổi gì); bỏ dòng TỔNG CỘNG/TÍNH KPI |
| Khách hàng | Tìm / lọc khu vực → nhấp dòng để sửa → Lưu; Thêm; Lưu trữ / Khôi phục; Xuất CSV | Không xóa cứng; tên trùng bị chặn; khu vực tự đoán từ tên, sửa được |
| Lịch làm việc | Xem tuần (T2–T6, tự mở rộng T7–CN nếu có việc) → thêm theo ngày → nhấp để sửa/đổi trạng thái/xóa | Trạng thái: Dự kiến / Hoàn thành / Hủy; việc "Dự kiến" quá ngày hiện "Trễ hạn" |
| Tổng quan | KPI, tiến độ theo khu vực, việc cần theo dõi 7 ngày | Số liệu tính từ khách hàng chưa lưu trữ |
| Cài đặt | Đổi giao diện sáng/tối (được nhớ), sao lưu/khôi phục .json, xóa dữ liệu (xác nhận 2 lần) | Đổi giao diện không đổi dữ liệu |

Quy ước dữ liệu: cột quý J/L/N/P ở dòng khách hàng là tỉ lệ nên không dùng làm mục tiêu quý; 12 cặp tháng 2025/2026 được lưu và hiển thị trong hộp thoại sửa khách hàng. Cột phụ AO:AT và bảng phụ AU:AZ chưa được đọc.

## Bổ sung v0.6.0
- **Tổng quan:** lời chào theo giờ + tên hiển thị; bộ lọc khu vực áp dụng cho KPI, biểu đồ đường và Top 5 (thanh theo khu vực luôn hiện tất cả khu vực).
- **Khách hàng → Sửa:** nhập tay mã, quý (thực tế 2026) và 12 tháng (2025/2026). "Tính lại" lấy tổng 2025/2026 và các quý 2026 từ số liệu tháng, người dùng bấm Lưu để ghi. Nhập Excel lại sẽ ghi đè số liệu quý/tháng của khách có trong file, và giữ mã, khu vực, ghi chú, lưu trữ.
- **Cập nhật:** Cài đặt → Cập nhật ứng dụng (chỉ hoạt động trong bản cài Windows).

## Bổ sung v0.7.0
- **Khách hàng → trang sửa:** nhấp một dòng (hoặc Enter) mở trang con có breadcrumb; "Quay lại danh sách" hoặc breadcrumb đều hỏi xác nhận nếu có thay đổi chưa lưu. Số tiền nhập có dấu chấm ngăn cách.
- **Lịch làm việc:** thứ 2 đến thứ 7; "Thống kê tháng" tính theo trạng thái (Hoàn thành / Dự kiến / Trễ hạn / Hủy) và tỉ lệ hoàn thành = Hoàn thành chia (Tổng trừ Hủy).

## Bổ sung v0.8.0
- **Hoàn tác:** thông báo có nút "Hoàn tác" trong 8 giây (hoặc Ctrl+Z khi không đang gõ). Hoàn tác nhập Excel khôi phục đúng danh sách khách hàng trước đó và xóa khách mới thêm.
- **Cột bảng:** lựa chọn cột lưu trong cài đặt cá nhân (cùng nơi lưu tên hiển thị); sắp xếp không được lưu và quay về "Thực tế 2026 giảm dần" mỗi lần mở.
- **Mục tiêu theo quý** lấy từ dòng người phụ trách trong Excel, nên không hiển thị khi đang lọc theo khu vực.

## Bổ sung v0.9.0
- **SaleBoots:** mục con của Khách hàng (thanh bên chỉ hiện khi ở Khách hàng hoặc các trang con). Dữ liệu liên kết bằng mã khách hàng (không sao chép tên), nên đổi tên khách hàng không làm mất liên kết; khách hàng chỉ lưu trữ chứ không xóa.
- **Thực đạt** = số nhập tay nếu có, nếu không thì tổng doanh số tháng của khách hàng trong kỳ (tháng chưa đủ ngày chia theo ngày). **Cùng kỳ 2025** chỉ tính khi chương trình nằm trọn trong 2026. **Hiệu quả ngân sách** = (thực đạt trừ cùng kỳ 2025) chia cho số đã chi.
- **Sao lưu tự động:** chỉ ghi khi dữ liệu thay đổi (so sánh dấu vân tay nội dung), ghi tệp tạm rồi đổi tên để không để lại tệp dở dang, tối đa chờ 5 giây khi đóng ứng dụng.
