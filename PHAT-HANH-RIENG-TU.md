# Cập nhật ứng dụng khi kho mã nguồn để Private

## Vấn đề
Ứng dụng đã cài tự kiểm tra bản mới trên GitHub mà **không có mật khẩu**, nên không đọc được kho Private.
Không nên nhúng mã truy cập vào ứng dụng, vì ai có file cài đều lấy được.

## Cách làm: tách hai kho
- `bg-sales-management` (**Private**): chứa mã nguồn, tài liệu, số liệu thiết kế.
- `bg-sales-management-releases` (**Public**, chỉ có một README): chỉ chứa file cài `.exe` và `latest.yml`. Ứng dụng đọc bản mới từ đây.

Quy trình build chạy trong kho Private và đăng file cài sang kho Public bằng một mã truy cập riêng, chỉ có quyền ghi vào kho Public.
Lưu ý: ai cũng tải được file cài (không có dữ liệu của bạn trong đó, nhưng có mã giao diện).

## Thiết lập một lần (làm theo thứ tự, TRƯỚC khi tải bản 0.9.0 lên)
1. Tạo kho **Public** tên `bg-sales-management-releases`, tick "Add a README file" (kho phải có ít nhất một commit).
2. Tạo mã truy cập: GitHub → ảnh đại diện → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: *Only select repositories* → chọn `bg-sales-management-releases`.
   - Permissions → Repository permissions → **Contents: Read and write**.
   - Expiration: chọn thời hạn dài nhất cho phép và ghi nhớ ngày hết hạn (hết hạn thì build báo lỗi, tạo lại mã mới và cập nhật secret).
   - Sao chép mã (chỉ hiện một lần).
3. Trong kho **bg-sales-management** → **Settings → Secrets and variables → Actions → New repository secret**: tên `RELEASES_TOKEN`, dán mã vào.
4. Thay nội dung `.github/workflows/build-windows.yml` bằng file `build-windows.yml` đi kèm (sửa trên web bằng nút cây bút).
5. Tải gói v0.9.0 lên như thường lệ. Bản `v0.9.0` sẽ xuất hiện ở **Releases của kho bg-sales-management-releases**.
6. Sau khi xác nhận build chạy tốt, chuyển `bg-sales-management` sang **Private** (Settings → Danger Zone → Change visibility).

## Quy trình tự động làm gì (từ v0.16.5: cập nhật nhẹ)
Mỗi lần commit vào `main`, quy trình tự chạy bộ kiểm thử rồi **phân loại** thay đổi:

| Bạn đã sửa | Quy trình làm | Người dùng phải tải |
|---|---|---|
| Chỉ giao diện (`src/`, rồi `index.html`), `CHANGELOG.md` | Chỉ đăng **bản giao diện** lên nhánh `ui` của kho `-releases` | Một tệp ~440 KB (nén còn ~100 KB), áp dụng ngay không cần cài đặt |
| Phần lõi: `main.js`, `preload.js`, `backup.js`, `amis.js`, `amis-core.js`, `uiupdate.js`, `build/icon.png`, `assets/`, mục `dependencies` / `devDependencies` / `build` của `package.json` (kể cả nâng Electron) | Build **bộ cài** (~90 MB), đăng lên Releases như trước, rồi đăng luôn bản giao diện | Bộ cài, tự cài ngầm |

Việc phân loại tự động (so mã băm của phần lõi với lần phát hành trước, lưu trong `ui.json`). Bạn không phải chọn.

## Mỗi lần phát hành
1. Sửa mã trong `src/`, chạy `python3 tools/build_app.py` (**bắt buộc**: quy trình từ chối đăng nếu `index.html` chưa dựng lại cho đúng `version`).
2. Tăng `version` trong `package.json` (mọi lần phát hành, kể cả chỉ đổi giao diện) và ghi mục `## <version>` trong `CHANGELOG.md` (nội dung này hiện làm ghi chú trong ứng dụng).
3. (Tùy chọn, trên máy bạn) `npm test`.
4. Commit vào `main`. Xem tab Actions: dòng "Phát hiện thay đổi phần lõi" cho biết lần này đăng bộ cài hay chỉ giao diện.

**Quy tắc cần nhớ:** nếu bạn sửa phần lõi thì **phải tăng `version`**. Nếu không, bộ cài cùng số phiên bản đã có sẵn sẽ không được đăng lại (quy trình in cảnh báo màu vàng) và người dùng sẽ không nhận được thay đổi lõi.

## Cập nhật nhẹ hoạt động thế nào
- Ứng dụng đã cài (từ v0.16.5) mỗi lần mở và vài giờ một lần đọc `ui.json` từ nhánh `ui` của kho `-releases`.
- Có bản giao diện mới và tương thích với bộ cài đang dùng: tải ngầm, kiểm tra kích thước và mã SHA-512, ghi vào thư mục dữ liệu người dùng, rồi báo ở chuông và ở Cài đặt. Bấm **Khởi động lại**: sao lưu như khi đóng ứng dụng (hỏi nếu còn thay đổi chưa lưu) rồi nạp giao diện mới trong khoảng 1 giây, không chạy bộ cài. Không bấm thì lần mở sau tự dùng bản mới.
- Bản giao diện đòi lõi mới hơn bản đang cài: không dùng, ứng dụng chuyển sang cập nhật bộ cài như cũ (tải chênh lệch nếu có thể, cài ngầm, tự mở lại; đóng ứng dụng cũng tự cài).
- **Tự bảo vệ:** giao diện tải về phải báo "đã khởi động xong" trong 30 giây. Nếu không (lỗi nạp trang, sập tiến trình hiển thị...), ứng dụng quay về giao diện đi kèm bộ cài, ghi nhớ bản lỗi để không dùng lại, và vẫn tự tải bản sửa lỗi sau đó mà không cần cài lại.
- Dữ liệu (IndexedDB, theo địa chỉ `file://`) không đổi khi đổi giao diện, và không bị xóa trong mọi trường hợp trên.
- **Lưu ý khi nâng phiên bản IndexedDB** (như v3 của AMIS): việc quay về giao diện gốc không hạ cấp được cấu trúc dữ liệu. Giao diện đi kèm bộ cài cũ hơn có thể báo không mở được kho dữ liệu (dữ liệu vẫn còn nguyên, bản sửa tải về sau đó dùng lại bình thường). Vì vậy khi nâng phiên bản IndexedDB, hãy phát hành kèm bộ cài (sửa một dòng chú thích trong `main.js` để quy trình build bộ cài) để giao diện đi kèm luôn mới bằng giao diện tải về.
- `amis-core.js` được dùng cả ở tiến trình chính (`main.js`) lẫn nhúng trong `index.html`, nên được tính là phần lõi: đổi nó thì phát hành bộ cài, tránh giao diện mới chạy với logic AMIS cũ ở tiến trình chính.

## Lần chuyển đổi đầu tiên
Máy đang chạy bản trước v0.16.5 chưa có cơ chế này, nên **v0.16.5 vẫn là một lần cập nhật bộ cài đầy đủ** (như mọi lần trước). Từ v0.16.5 trở đi, các bản chỉ đổi giao diện mới là bản nhẹ.

## Kiểm thử
`npm test` chạy các bộ kiểm thử (đều không cần mạng, Electron hay GitHub), gồm ba bộ cập nhật nhẹ và các bộ của AMIS/sao lưu: `tools/test_uiupdate.js` (tải, xác thực, từ chối tệp hỏng), `tools/test_ci_ui.js` (phân loại lõi/giao diện, tạo bản đăng) và `tools/test_main_flow.js` (chạy `main.js` với Electron giả lập qua các tình huống: áp dụng bản mới, quay về giao diện gốc khi lỗi, cài bộ cài ngầm...). Quy trình tự động cũng chạy chúng trước khi build. Các bộ này **không thay thế** việc thử trên một máy Windows thật sau mỗi lần đổi phần lõi.

## Điều cần biết
- **Bản đã cài trước đây** (v0.8.0 trở về trước) đang trỏ vào kho cũ, nên không tự thấy bản mới. Hãy cài tay bản v0.9.0 một lần; từ đó về sau tự cập nhật. Dữ liệu được giữ nguyên.
- Nếu thiếu `RELEASES_TOKEN`, build dừng ngay với thông báo rõ ràng.
- Nhánh `ui` của kho `-releases` được tạo và ghi đè tự động (chỉ có `ui.json`, `index-<phiên bản>.html`, README); đừng sửa tay. Mã truy cập `RELEASES_TOKEN` cần quyền ghi (đã có sẵn theo hướng dẫn trên).
- Thu hồi mã truy cập bất cứ lúc nào ở trang Fine-grained tokens nếu nghi bị lộ.
- Cách khác (không dùng GitHub): đổi `build.publish` trong `package.json` sang `{"provider":"generic","url":"https://địa-chỉ-lưu-trữ-của-bạn/"}` và tải `latest.yml` cùng file `.exe` lên đó (cần máy chủ cho phép tải công khai qua HTTPS).
