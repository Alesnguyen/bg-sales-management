# Lịch sử phiên bản

## 0.9.0
- **SaleBoots** (chương trình thúc đẩy doanh số), mục con của Khách hàng: chỉ hiện ở thanh bên khi đang ở Khách hàng, được viền (không tô vàng) khi mở. Mỗi chương trình gắn với một khách hàng; trang khách hàng liệt kê các chương trình đã gắn và thêm nhanh chương trình mới.
- Tự tính thực đạt từ số liệu tháng của khách hàng (tháng chưa đủ ngày chia theo tỉ lệ ngày), so với cùng kỳ 2025, tỉ lệ đạt mục tiêu, tiến độ so với thời gian, hiệu quả ngân sách; cảnh báo trùng thời gian, chi vượt ngân sách, thiếu số liệu. Trạng thái tự động theo ngày (sắp diễn ra, đang chạy, đạt hoặc chưa đạt mục tiêu), hoặc tạm dừng / hủy.
- Tổng quan: SaleBoots sắp kết thúc trong 7 ngày xuất hiện ở "Việc cần theo dõi". Sao lưu và khôi phục có cả SaleBoots (cơ sở dữ liệu nâng lên phiên bản 2, tự nâng cấp, dữ liệu cũ được giữ).
- **Sao lưu tự động** (bản cài Windows): lưu vào Tài liệu\BG Sales Management\Sao lưu khi mở ứng dụng, vài phút sau khi có thay đổi và khi đóng ứng dụng; giữ 30 bản; khôi phục từ danh sách trong Cài đặt; không ghi thừa khi dữ liệu không đổi.
- Cập nhật khi kho mã nguồn Private: phát hành sang kho công khai riêng (xem `PHAT-HANH-RIENG-TU.md`).
- Sửa: đổi cột hiển thị ở bảng khách hàng nay phản hồi ngay.

## 0.8.0
- Bảng khách hàng: bấm tiêu đề cột để sắp xếp (tăng/giảm, có `aria-sort`); chọn cột hiển thị (tất cả, chỉ quý, chỉ tháng, ẩn năm 2025, hoặc chọn từng tháng), được ghi nhớ; nút "Tới tháng này".
- Hoàn tác (nút trên thông báo hoặc Ctrl+Z) cho: lưu/lưu trữ khách hàng, thêm/sửa/xóa công việc, nhập Excel.
- Báo lỗi ngay dưới từng ô nhập (có `aria-invalid`, `role="alert"`); cảnh báo mềm khi tổng 12 tháng khác ô tổng; cảnh báo khi đóng ứng dụng lúc còn thay đổi chưa lưu.
- Trợ năng: liên kết "Bỏ qua điều hướng", chú thích và `scope` cho bảng, tiêu đề hộp thoại; công cụ `tools/contrast_check.py` đo tương phản trên giao diện thật ở cả hai chế độ (đạt).
- Hướng dẫn "Bắt đầu nhanh" khi chưa có dữ liệu; nhắc sao lưu sau 14 ngày; bảng phím tắt (nhấn ? hoặc ở Cài đặt): Alt+1–5, Ctrl+K, Ctrl+N, Ctrl+S, Ctrl+Z.
- Tổng quan: biểu đồ cột doanh số theo quý (2025, 2026, mục tiêu) và bảng chi tiết theo quý; hiển thị tốt ở chế độ tối.

## 0.7.0
- Sửa khách hàng là **trang con** của Danh sách khách hàng (không còn popup); có breadcrumb theo thuộc tính (Tổng quan › Danh sách khách hàng › Khu vực › Tên khách hàng) ở mọi trang; cảnh báo khi rời trang có thay đổi chưa lưu.
- Ô nhập số tiền hiển thị đầy đủ có dấu chấm ngăn cách (ví dụ 300.000.000), gợi ý "≈ 300 triệu", dòng tổng 2025/2026 cập nhật trực tiếp.
- Bảng doanh số kiểu Excel: đường kẻ mảnh, số căn phải thẳng với tiêu đề năm, đường kẻ đậm ngăn cách từng tháng; dòng khách hàng chọn được bằng bàn phím (Enter).
- Lịch làm việc từ thứ 2 đến thứ 7 (tự thêm Chủ nhật khi có việc); nút "Thống kê tháng" mở bảng thống kê theo loại, theo tuần, theo khách hàng.
- Giảm dung lượng bản cài bằng cách chỉ giữ ngôn ngữ vi và en-US của Electron.

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
