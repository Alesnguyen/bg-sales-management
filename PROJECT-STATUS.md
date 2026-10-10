# Project Status — BG Sales Management

**Ngày báo cáo:** 09/10/2026  
**Bản:** v0.2.1 — Round 2 Design Normalization  
**Quyết định chủ dự án:** Duyệt hướng thiết kế để bắt đầu chuẩn hóa.  
**Trạng thái tổng thể:** Đang thực hiện — chuẩn hóa token/component; chờ QA và nghiệm thu thiết kế cuối.

## 1. Trạng thái công việc

| Mã | Công việc | Trạng thái | Kết quả / điều kiện |
|---|---|---|---|
| PM-01 | Kiểm kê gói v0.2.0 | Hoàn thành | Gói cũ là nguồn nâng cấp; không tạo lại từ đầu |
| PM-02 | Chốt logo và màu thương hiệu | Hoàn thành | Logo BG gốc; vàng `#FFDF1B`, đen, trắng |
| PM-03 | Chuẩn hóa Design Tokens | Đang thực hiện | JSON là nguồn chuẩn; CSS offline được sinh/kiểm tra bởi script |
| PM-04 | Kiểm kê workbook | Hoàn thành | `DOANH SỐ KH 2026`, `A1:AZ53`, 52 cột, 196 công thức, 26 hàng ứng viên; xem audit |
| PM-05 | Chuẩn hóa Splash | Đang thực hiện | Prototype timer đã bỏ lệnh đóng trùng; chưa có AppReady thật |
| PM-06 | Nghiệm thu thiết kế vòng 2 | Đang chờ | Cần test/review trực quan cuối trên desktop/mobile và cả hai theme |
| DS-01 | Chuẩn hóa component specification | Đang thực hiện | `COMPONENT-SPEC.md` đã xác định variants/states/acceptance criteria |
| DS-02 | Đồng bộ JSON → CSS | Đang thực hiện | `sync_design_tokens.py`; cần pass kiểm tra drift |
| DEV-01 | Data model / mapping Excel → SQLite | Đang chờ | Mapping dự thảo chưa duyệt; cần chốt khóa và quy tắc upsert |
| DEV-02 | Khung ứng dụng Windows | Chưa bắt đầu | Chưa có WinUI 3 build |
| DEV-03 | CRUD khách hàng thật | Chưa bắt đầu | Chưa có SQLite |
| DEV-04 | Import Excel thật | Chưa bắt đầu | HTML preview không đọc workbook, không ghi database |
| DEV-05 | Backup/restore và QA Windows | Chưa bắt đầu | Chưa có app/database để kiểm thử |

## 2. Tiêu chí chuẩn hóa Vòng 2

- `design-tokens.json` là nguồn chuẩn; CSS variables trong HTML preview phải đồng bộ.
- Mọi component dùng chung lấy màu từ semantic tokens theo theme.
- Typography, spacing, radius, shadow, motion và kích thước control có scale rõ.
- Component có state matrix và tiêu chí nghiệm thu; đặc tả không được đánh dấu là chức năng đã triển khai.
- QA gồm validator, kiểm tra JSON/CSS/JavaScript, contrast tokens, Chromium smoke test, ảnh desktop/mobile và ghi rõ giới hạn.

## 3. Rủi ro/điểm mở

1. Review trực quan của chủ dự án chưa hoàn tất cho từng màn hình/component.
2. Kiểm tra keyboard/screen reader chuyên sâu và mở trực tiếp trên Windows đích chưa thực hiện trong native app.
3. Chưa có khóa khách hàng ổn định được xác minh; không dùng tên làm khóa chính tự động.
4. Chưa chốt khách hàng trùng, khách vắng mặt trong file mới, xóa/archive, backup/restore.
5. Cần làm rõ hoặc giữ nguyên có chủ đích các cột phụ AO:AT và bảng phụ AU:AZ.

## 4. Quyết định cổng hiện tại

**Cho phép:** tiếp tục chuẩn hóa design tokens, components và prototype flows.

**Chưa cho phép:** đóng nghiệm thu Design System cuối cùng, bắt đầu import/CRUD thật hoặc tuyên bố ứng dụng Windows sẵn sàng. Việc phát triển app vẫn cần cổng dữ liệu/kiến trúc riêng.

## 5. Kế hoạch tiếp theo

| Ưu tiên | Công việc | Đầu ra | Điều kiện hoàn thành |
|---|---|---|---|
| P0 | Chạy lại token sync/validator/JS/Chromium | QA-REPORT.md | PASS; ghi rõ phạm vi và giới hạn |
| P0 | Review preview ở Light/Dark và desktop/mobile | Ảnh + biên bản review | Logo, hierarchy, focus, status và responsive được kiểm tra |
| P0 | Đóng các góp ý design | Bản chuẩn hóa cập nhật | Không còn lỗi blocker; lỗi hoãn có lý do |
| P1 | Duyệt mapping dữ liệu | Mapping được ký duyệt | 52 cột/vùng phụ có diễn giải hoặc được bảo toàn có chủ đích |
| P1 | Chốt quy tắc khóa/import | Quy tắc nghiệp vụ | Khách mới/trùng/vắng mặt/hủy/lỗi được quy định |
| P2 | Spike WinUI 3 + SQLite | Build thử | Chạy offline trên Windows đích và xác minh runtime/portable |
