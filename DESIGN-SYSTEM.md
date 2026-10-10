# BG Sales Management — Design System Foundation v0.2.1

**Ngày cập nhật:** 09/10/2026  
**Vòng:** 2 — Duyệt hướng thiết kế và chuẩn hóa  
**Trạng thái:** Hướng thiết kế đã được chủ dự án duyệt để chuẩn hóa; chờ nghiệm thu cuối cùng sau review component và kiểm thử trên Windows.

## 1. Phạm vi của bản này

Bản `v0.2.1` chuẩn hóa nền tảng `v0.2.0`, không phải bản thiết kế lại. Kết quả gồm:

- `design-tokens.json` là nguồn dữ liệu chuẩn của token.
- `tools/sync_design_tokens.py` sinh/đồng bộ CSS variables nhúng trong HTML để preview vẫn mở offline bằng một tệp.
- `index.html` dùng tên token ngữ nghĩa cho màu, typography, spacing, radius, shadow, motion và các kích thước điều khiển dùng chung.
- `COMPONENT-SPEC.md` định nghĩa variant, trạng thái và tiêu chí cho component dùng chung.
- `DESIGN-REVIEW-ROUND-2.md` lưu quyết định thiết kế, kiểm tra đã thực hiện và các việc chưa được nghiệm thu.

Bản này chưa phải ứng dụng Windows, bộ cài, hệ thống CRUD, database hoặc import Excel thật.

## 2. Quy tắc thương hiệu

- Màu thương hiệu: vàng `#FFDF1B`, đen `#000000`, trắng `#FFFFFF`.
- Logo phải dùng asset gốc `assets/BG-Logo.jpg`, giữ nguyên tỉ lệ; không vẽ lại, bóp méo, recolor hoặc cắt mất biểu tượng.
- Nền trắng quanh logo trong ảnh là một phần asset hình ảnh; không tự động tách nền.
- Màu vàng là điểm nhấn, nền nhấn và nút chính dùng chữ đen. Không dùng vàng thương hiệu làm chữ nhỏ trên nền trắng.
- Mọi màu giao diện cần dùng semantic tokens; không đặt mã màu riêng lẻ trong component trừ màu logo/asset hoặc ví dụ tài liệu.

## 3. Nguồn token và quy tắc cập nhật

`design-tokens.json` là nguồn chuẩn. Không sửa trực tiếp CSS variables trong `index.html` bằng tay. Sau khi chỉnh token, chạy:

```bash
python tools/sync_design_tokens.py
python tools/sync_design_tokens.py --check
python tools/validate_package.py
```

CSS variable block trong `index.html` phải khớp với JSON. Cấu trúc token chia thành:

- **Brand primitives:** vàng, đen, trắng.
- **Semantic theme tokens:** nền, surface, text, border, accent, focus, success, warning, danger, info và disabled.
- **Foundation tokens:** typography, spacing, radius, motion, shadow và layout.
- **Component contracts:** trạng thái/variant cần hỗ trợ của button, field, table, status và focus.

Khi chuyển sang WinUI 3, ánh xạ token sang resource dictionary dùng chung. Không duy trì một bộ màu riêng ở từng màn hình.

## 4. Light/Dark Mode

- Theme chỉ thay đổi presentation; không thay đổi dữ liệu, trạng thái nghiệp vụ hoặc kết quả bộ lọc.
- Giữ tương phản của chữ, nhãn trạng thái, đường viền tương tác và focus ở cả hai theme.
- Component lấy màu từ cùng tên token ngữ nghĩa. Không viết hai bộ component tách biệt cho Light và Dark.
- Ưu tiên surface phẳng, đường viền rõ, shadow tiết chế; không dùng shadow để thay thế đường viền cần thiết.

## 5. Typography, spacing và radius

- Font ưu tiên `Segoe UI`, fallback `Arial`, sau đó `sans-serif`.
- Dùng các cấp typography từ token: xs, sm, md, lg, xl, 2xl; hạn chế thêm kích cỡ mới nếu chưa có lý do.
- Dùng spacing scale trong token cho khoảng cách tái sử dụng. Sai khác cục bộ chỉ được giữ khi cần cho icon, căn chỉnh quang học hoặc bố cục đặc thù.
- Control, table và card dùng radius theo token tương ứng; không tạo radius mới tùy hứng giữa các màn hình.

## 6. Hành vi component

Button, field, table, status badge, navigation, card, toast, empty state và focus phải theo `COMPONENT-SPEC.md`. Tối thiểu cần định nghĩa default, hover, pressed, focus-visible và disabled cho thành phần tương tác. Các nhánh invalid/loading/empty/success/error phải có mô tả khi liên quan.

Việc có CSS class hoặc mô tả trong tài liệu không đồng nghĩa component đã được kiểm thử đầy đủ. Trạng thái không xuất hiện trên preview phải được ghi là đặc tả, không phải chức năng đã xác nhận.

## 7. Splash / Startup

- Prototype hiển thị Splash với thời gian tối thiểu khoảng 1,4 giây và thanh chuyển động không có phần trăm giả.
- Đây là hiệu ứng trình diễn. HTML không có tín hiệu sẵn sàng từ database.
- Ứng dụng thật chỉ đóng Splash khi `AppReady AND MinimumDisplayTimeReached`.
- Nếu đọc dữ liệu lỗi, hiển thị lỗi và hành động phù hợp; không tự chuyển sang trạng thái thành công.
- Phải tôn trọng `prefers-reduced-motion`.

## 8. Accessibility và nghiệm thu

- Mục tiêu tương phản: tối thiểu 4,5:1 cho chữ thường và 3:1 cho chữ lớn.
- Focus bằng bàn phím phải nhìn thấy được.
- Không truyền đạt trạng thái chỉ bằng màu: thêm nhãn, icon hoặc nội dung phù hợp.
- Disabled cần dễ nhận biết, nhưng cũng không được làm nội dung không cần thiết trở nên khó đọc.
- Kiểm tra tự động là một phần của QA, không thay thế kiểm tra bàn phím, screen reader, visual review hoặc kiểm thử trên Windows.

## 9. Phạm vi preview và dữ liệu

Các màn hình preview gồm Tổng quan, Danh sách khách hàng, Lịch làm việc, Nhập dữ liệu và Cài đặt. Dữ liệu hiển thị trong preview vẫn là dữ liệu minh họa; chức năng import chỉ trình diễn chọn tệp, không đọc workbook và không ghi database.

Workbook nguồn được kiểm kê tại `data/EXCEL-SOURCE-AUDIT.md`; mapping dự thảo tại `data/EXCEL-TO-SQLITE-MAPPING.md`. Không đưa dữ liệu kinh doanh thật vào bảng demo khi chưa có yêu cầu rõ và quy tắc data mapping được duyệt.

## 10. Cổng nghiệm thu

Được phép: chuẩn hóa token và component, review prototype, góp ý trên bản `v0.2.1`.

Chưa được phép: đóng Vòng 2 là nghiệm thu cuối cùng, bắt đầu phát triển chức năng nghiệp vụ/import thật hoặc tuyên bố có build Windows. Các mục còn mở nằm trong `DESIGN-REVIEW-ROUND-2.md` và `PROJECT-STATUS.md`.
