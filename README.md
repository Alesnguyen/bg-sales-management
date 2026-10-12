# BG Sales Management — Demo Project

## Bản cài Windows (v0.6.0) — Electron + electron-builder (NSIS)
Mã nguồn đóng gói nằm ở `package.json`, `main.js`, `build/icon.png`, `.github/workflows/build-windows.yml` (đóng gói `index.html`). Dữ liệu vẫn lưu cục bộ (IndexedDB trong thư mục người dùng) và được giữ nguyên khi cập nhật.

**Cách qua giao diện web GitHub (không cần cài gì):** tạo repository trống `bg-sales-management` (Private), chọn "uploading an existing file", kéo thả toàn bộ nội dung thư mục dự án (kể cả thư mục `.github`) rồi Commit. Mỗi lần đẩy lên nhánh `main`, GitHub tự build; nếu `version` trong `package.json` chưa có bản phát hành thì tự tạo Release `vX.Y.Z` kèm file `.exe`. Cấu hình `owner/repo` đã điền sẵn là `Alesnguyen/bg-sales-management`.

**Cách nhanh nhất:** cài Git, GitHub CLI (`gh`) và Node.js LTS, rồi chạy `powershell -ExecutionPolicy Bypass -File tools\publish-github.ps1` (tự tạo repository Private, đẩy mã, build và tải file `.exe`). Hoặc nhấp đúp `tools\build-local.bat` để build ngay trên máy.

**Cách A — làm tay từng bước:**
1. Tạo repository Private, sửa `owner`/`repo` trong `package.json` (mục `build.publish`).
2. Đẩy mã lên (lệnh bên dưới). Trong tab Actions chạy "Build Windows installer" (hoặc đẩy tag `v0.6.0`) rồi tải file `.exe` ở Artifacts.
3. Sau lần `npm install` đầu tiên, commit `package-lock.json` để khóa phiên bản.

**Cách B — build trên máy Windows có Node.js LTS:** `npm install` rồi `npm run dist`; file cài nằm ở `dist/`.

**Phát hành phiên bản mới (cập nhật cho người dùng):**
1. Sửa mã trong `src/`, chạy `python3 tools/build_app.py` và `python3 tools/smoke_test_app.py <file.xlsx>`.
2. Tăng `version` trong `package.json` và ghi vào `CHANGELOG.md`.
3. `git commit`, rồi `git tag vX.Y.Z && git push --tags`. Workflow build `.exe` và đăng lên GitHub Releases.
4. Máy đã cài sẽ tự kiểm tra khi mở (hoặc bấm "Kiểm tra cập nhật" ở Cài đặt), tải bản mới và hỏi khởi động lại. Dữ liệu (IndexedDB) nằm ngoài thư mục cài đặt nên được giữ nguyên. Khi đổi cấu trúc dữ liệu, thêm bước nâng cấp `onupgradeneeded` trong `src/app.js` thay vì xóa dữ liệu.
Nếu không muốn để Releases công khai, đổi `build.publish` trong `package.json` sang `{"provider":"generic","url":"https://noi-luu-tru-cua-ban/"}` và đặt `latest.yml` cùng file `.exe` ở địa chỉ đó. Tự cập nhật trong app chỉ hoạt động khi người dùng truy cập được Releases (repository công khai, hoặc cần cấu hình thêm token); nếu để Private, hãy gửi file cài mới. Nâng thư viện: `npm update` (trong phạm vi major hiện tại) hoặc `npm install electron@latest electron-builder@latest electron-updater@latest` rồi build thử trước khi phát hành.

Lưu ý: bản cài chưa ký số, nên Windows SmartScreen có thể cảnh báo ("Run anyway") cho tới khi bạn mua chứng chỉ ký mã.

## Ứng dụng (v0.6.0): `index.html`
Mở `index.html` bằng Edge/Chrome (hoặc cài bản Windows) — chạy ngoại tuyến. Giao diện đúng bản vẽ Design System v0.2.1: Tổng quan, Khách hàng, Lịch làm việc, Nhập dữ liệu, Cài đặt (xem `APP-FLOWS.md`).
- Mã nguồn: `src/body.html`, `src/app.js`, `src/extra.css`; khung thiết kế gốc: `design/prototype-v0.2.1.html`; tokens: `design-tokens.json`.
- Sau khi sửa mã: `python3 tools/build_app.py` (dựng index.html), `python3 tools/sync_design_tokens.py --check`, `python3 tools/smoke_test_app.py <file.xlsx>`.
- Dữ liệu lưu trong IndexedDB trên máy, sao lưu bằng .json ở mục Cài đặt.

## Chạy bản trải nghiệm giao diện cũ
1. Giải nén thư mục.
2. Mở `index.html` bằng Microsoft Edge hoặc Google Chrome.
3. Dùng thanh điều hướng để trải nghiệm các màn hình, chuyển Light/Dark và thử tìm kiếm.

Không cần cài đặt hoặc kết nối Internet.

## Trạng thái trung thực
Đây là **prototype giao diện** để đánh giá trải nghiệm, không phải bản app vận hành chính thức.
- Danh sách hiện có thể chứa dữ liệu minh họa.
- Chọn file ở màn hình nhập liệu chưa đọc workbook, chưa import và chưa ghi database.
- Chưa có SQLite/CRUD thật, backup/restore hoặc bộ cài Windows.

## Dữ liệu kinh doanh
Không đưa workbook khách hàng thật lên repository công khai. Dữ liệu khách hàng/doanh số cần được giữ cục bộ hoặc chỉ đưa vào repository private sau khi xác nhận quyền truy cập.

## Cấu trúc
- `index.html`: prototype chạy offline.
- `assets/BG-Logo.jpg`: logo BG gốc.
- `design-tokens.json`: token thiết kế nguồn chuẩn.
- `data/`: kiểm kê workbook và mapping dự thảo.
- `tools/`: công cụ kiểm tra/đồng bộ token.
- `QA-REPORT.md`: kiểm thử đã thực hiện và giới hạn.

## Bước phát triển tiếp theo
1. Chốt review giao diện.
2. Chọn khóa định danh khách hàng và quy tắc cập nhật khi nhập Excel.
3. Triển khai data layer và CRUD.
4. Xây luồng import có preview, báo lỗi, transaction/rollback.
5. Kiểm thử trên Windows 10/11 và đóng gói app.


## Phát hành khi kho mã nguồn để Private
Xem `PHAT-HANH-RIENG-TU.md` (tách kho công khai chỉ chứa file cài).
