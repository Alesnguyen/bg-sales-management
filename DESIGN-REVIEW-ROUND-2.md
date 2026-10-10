# Biên bản Duyệt Design — Vòng 2

**Dự án:** BG Sales Management  
**Ngày:** 09/10/2026  
**Bản nguồn:** v0.2.0 (đã có logo gốc và kiểm kê workbook)  
**Bản chuẩn hóa:** v0.2.1  
**Quyết định của chủ dự án:** Duyệt hướng thiết kế và bắt đầu chuẩn hóa.

## 1. Phạm vi quyết định

Quyết định này cho phép lấy hướng thiết kế hiện tại làm nền để chuẩn hóa hệ thống token và component. Không hiểu là nghiệm thu cuối cùng mọi màn hình hay cho phép phát triển chức năng nghiệp vụ.

## 2. Quyết định đã ghi nhận

| Mã | Nội dung | Kết quả | Bằng chứng / điều kiện |
|---|---|---|---|
| DR-01 | Dùng logo BG gốc | Đã chốt | Asset `assets/BG-Logo.jpg`; giữ nguyên ảnh, không redraw |
| DR-02 | Màu thương hiệu | Đã chốt | Vàng `#FFDF1B`, đen `#000000`, trắng `#FFFFFF` |
| DR-03 | Duy trì Light/Dark Mode | Đã chốt | Dùng cùng hệ semantic tokens |
| DR-04 | Chuẩn hóa Design Tokens | Đang thực hiện | JSON là nguồn chuẩn; CSS preview được sinh/đối chiếu bằng script |
| DR-05 | Chuẩn hóa component states | Đang thực hiện | `COMPONENT-SPEC.md`; cần kiểm tra trực quan từng component ở hai theme |
| DR-06 | Splash Screen | Đang review | Prototype timer chỉ minh họa; ứng dụng thật cần tín hiệu AppReady |
| DR-07 | Excel mapping | Chưa duyệt | Cần giải nghĩa/giữ có chủ đích các cột phụ AO:AZ và chốt quy tắc dữ liệu |

## 3. Kiểm tra kỹ thuật trong bản chuẩn hóa

- Chuẩn hóa schema token cho brand, theme, typography, spacing, radius, motion, shadow và layout.
- Thêm semantic status surfaces success/warning/danger/info.
- Tạo script đồng bộ CSS variable block từ JSON cho HTML offline.
- Thêm button/field/status style states ở phạm vi prototype và tài liệu component.
- Loại bỏ lệnh đóng Splash bị lặp trong JavaScript prototype.
- Kiểm tra tự động cần chạy lại trước khi chốt gói bàn giao; kiểm thử trên Windows vẫn là bước riêng.

## 4. Các điều kiện để đóng Vòng 2

1. `tools/sync_design_tokens.py --check` và `tools/validate_package.py` đều PASS.
2. CSS/JS hợp lệ; smoke test Light/Dark, nav, search/filter, empty state, import file picker không lỗi.
3. Review trực quan desktop/mobile; kiểm tra status badge, disabled, focus và reduced motion.
4. Chủ dự án duyệt ảnh cuối cùng cho Tổng quan, Danh sách khách hàng và Import.
5. Rủi ro chưa đóng được ghi rõ; chưa được chuyển thành trạng thái “Hoàn thành” bằng suy đoán.

## 5. Điều kiện không thuộc nghiệm thu Design

- Chưa có build WinUI 3.
- Chưa có SQLite/CRUD/import thật.
- Chưa xác minh portable/backup/restore trên Windows đích.
- Workbook đã kiểm kê, nhưng mapping và quy tắc cập nhật/trùng/xóa chưa được phê duyệt.

**Kết luận tạm thời:** hướng thiết kế được duyệt để chuẩn hóa. Cổng nghiệm thu Design System cuối cùng vẫn mở cho tới khi kiểm thử và review trực quan hoàn tất.
