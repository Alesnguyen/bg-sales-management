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

## Mỗi lần phát hành
Tăng `version` trong `package.json`, ghi `CHANGELOG.md`, commit vào `main`. Nhận file cài ở Releases của kho `-releases`.

## Điều cần biết
- **Bản đã cài trước đây** (v0.8.0 trở về trước) đang trỏ vào kho cũ, nên không tự thấy bản mới. Hãy cài tay bản v0.9.0 một lần; từ đó về sau tự cập nhật. Dữ liệu được giữ nguyên.
- Nếu thiếu `RELEASES_TOKEN`, build dừng ngay với thông báo rõ ràng.
- Thu hồi mã truy cập bất cứ lúc nào ở trang Fine-grained tokens nếu nghi bị lộ.
- Cách khác (không dùng GitHub): đổi `build.publish` trong `package.json` sang `{"provider":"generic","url":"https://địa-chỉ-lưu-trữ-của-bạn/"}` và tải `latest.yml` cùng file `.exe` lên đó (cần máy chủ cho phép tải công khai qua HTTPS).
