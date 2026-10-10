# QA Report — BG Sales Management Design System v0.2.1

**Ngày:** 09/10/2026  
**Đối tượng:** design token package + standalone HTML prototype; không phải ứng dụng Windows.  
**Kết luận:** các kiểm tra tự động, cú pháp JS và Chromium smoke test trong phạm vi chạy đã PASS. Đây là bản review để chuẩn hóa; chưa phải nghiệm thu cuối Design System hay nghiệm thu ứng dụng.

## 1. Kiểm tra package / nguồn token

- PASS: các tệp bắt buộc có mặt và JSON parse hợp lệ.
- PASS: màu thương hiệu là vàng `#FFDF1B`, đen `#000000`, trắng `#FFFFFF`.
- PASS: `tools/sync_design_tokens.py --check` xác nhận CSS variable block khớp `design-tokens.json`.
- PASS: validator xác nhận 5 màn hình, PF-00 đến PF-11, asset logo, workbook profile, yêu cầu offline và component spec.
- PASS: các khai báo màu CSS ngoài generated token block không phát hiện màu hard-code.
- PASS: workbook trong gói khớp file Excel nguồn ở môi trường kiểm tra; workbook chỉ được sao chép/kiểm kê, không sửa.

## 2. Contrast ratios theo token

Mục tiêu cho chữ thường là >= 4.5:1.

| Theme | Cặp token | Tỷ lệ |
|---|---|---:|
| Light | text / background | 16.58:1 |
| Light | text / surface | 17.93:1 |
| Light | textSecondary / background | 8.87:1 |
| Light | textSecondary / surface | 9.59:1 |
| Light | onAccent / accent | 15.82:1 |
| Light | success / successSurface | 4.69:1 |
| Light | warning / warningSurface | 5.88:1 |
| Light | danger / dangerSurface | 5.75:1 |
| Light | info / infoSurface | 5.96:1 |
| Dark | text / background | 17.92:1 |
| Dark | text / surface | 16.56:1 |
| Dark | textSecondary / background | 10.91:1 |
| Dark | textSecondary / surface | 10.08:1 |
| Dark | onAccent / accent | 15.82:1 |
| Dark | success / successSurface | 7.54:1 |
| Dark | warning / warningSurface | 8.53:1 |
| Dark | danger / dangerSurface | 7.51:1 |
| Dark | info / infoSurface | 8.16:1 |

Các số trên là tính toán đối với token pairs được kiểm tra; không phải chứng nhận accessibility cho mọi phần tử hoặc mọi trạng thái UI. Disabled được báo riêng. Tương phản focus cần review trực quan theo nền thực tế.

## 3. JavaScript và Chromium smoke test

- PASS: `node --check` cho JavaScript nhúng.
- PASS: logo gốc tải được trong phiên chạy smoke test.
- PASS: Splash prototype tự đóng; chỉ còn một lệnh đóng Splash trong mã.
- PASS: đổi Light/Dark từ điều khiển trên cùng và từ Cài đặt.
- PASS: điều hướng tới Danh sách khách hàng.
- PASS: tìm kiếm không có kết quả hiển thị empty state; xóa lọc khôi phục hàng mẫu.
- PASS: chọn tệp hiển thị thông báo preview-only; không đọc hoặc import workbook.
- PASS: viewport 390px không có horizontal overflow.
- PASS: không có lỗi JavaScript hoặc console error trong các thao tác đã chạy.
- PASS: tạo ảnh `preview-desktop.png`, `preview-desktop-dark.png`, `preview-mobile.png`.

### Giới hạn môi trường

Việc điều hướng Chromium trực tiếp tới URL `file://` bị môi trường kiểm tra chặn với `ERR_BLOCKED_BY_ADMINISTRATOR`. Vì vậy, smoke test đã nạp nội dung HTML vào Chromium bằng `set_content` và nhúng logo dưới dạng data URI trong phiên test. Cách này kiểm tra CSS/JS/hành vi prototype nhưng **không chứng minh thao tác mở trực tiếp `index.html` bằng Edge/Chrome trên máy Windows đích**. Việc đó cần kiểm tra ở máy người dùng.

## 4. Workbook và dữ liệu

- Workbook nguồn: `source-data/ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx`.
- Sheet: `DOANH SỐ KH 2026`; vùng `A1:AZ53`; 53 hàng, 52 cột, 196 ô công thức.
- 26 hàng ứng viên khách hàng ở hàng 7–32; KPI/tổng hợp và bảng phụ giữ ngoài vùng nhập khách hàng.
- `data/EXCEL-TO-SQLITE-MAPPING.md` vẫn là đề xuất chưa được phê duyệt. Không có dữ liệu nào được import vào SQLite.

## 5. Ngoài phạm vi / chưa nghiệm thu

- Mở trực tiếp HTML trên Windows 10/11 mục tiêu.
- Build C#/.NET + WinUI 3, SQLite và CRUD thật.
- Import workbook thật, validate header, duplicate/upsert, transaction/rollback.
- Backup/restore, portable folder và chuyển máy.
- Screen reader, keyboard review toàn bộ, native accessibility, visual regression chuyên sâu.
- Xác nhận quy tắc khóa khách hàng, hàng bị loại khỏi Excel và ý nghĩa các cột phụ.

## 6. Quyết định QA

**Cho phép:** tiếp tục chuẩn hóa token/component và review prototype.

**Chưa cho phép:** đánh dấu Design System nghiệm thu cuối, bắt đầu import/CRUD thật hoặc tuyên bố ứng dụng Windows sẵn sàng. Cần review trực quan cuối và đóng các điểm mở trong `DESIGN-REVIEW-ROUND-2.md`.
