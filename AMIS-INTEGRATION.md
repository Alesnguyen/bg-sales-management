# Tích hợp AMIS CRM (v0.17.0)

Một chiều **AMIS CRM → BG Sales Management**. Chỉ đọc **tổng giá trị đơn hàng trước thuế**.

## Việc cần làm trước khi dùng thật (P0 trong đề xuất)
Các mục này phụ thuộc phản hồi thật của MISA nên **chưa được đoán** trong mã:

| Mã | Cần xác nhận | Cách làm trong BG |
|---|---|---|
| API-02 | Tên trường ID đơn, ID khách, mã khách, ngày đơn, ngày sửa đổi, trạng thái, tổng trước thuế | Mở **AMIS CRM → Kết nối & cấu hình**, nhập khóa, bấm *Xem cấu trúc phản hồi SaleOrders*, chọn trường ở mục 3. Mặc định chỉ điền sẵn `sale_order_no` và `account_name` (đã thấy trong tài liệu MISA). |
| Trường kinh doanh, Ký gửi | Tên trường “nhân viên kinh doanh”, trường/cờ Ký gửi và giá trị của nó | Chọn ở bảng ánh xạ rồi bấm *Quét* (xem mục “Đơn Ký gửi và xác nhận tên kinh doanh”). |
| API-03/04 | Đơn trạng thái nào được tính | Đồng bộ một lần, rồi tích các trạng thái hợp lệ ở mục 3. Chưa tích thì chưa đơn nào được cộng. |
| API-05 | Bộ lọc theo ngày sửa đổi | BG sắp xếp `orderBy=modified_date`, giảm dần và dừng khi qua mốc đã đồng bộ (lùi 1 giờ). Nếu MISA dùng tên khác, sửa ô “Sắp xếp khi đọc”. |
| BG-03 | Doanh số Excel và AMIS có trùng nhau không | Đặt “Chỉ ghi nhận đơn từ ngày” = ngày bắt đầu dùng AMIS làm nguồn doanh số. Đơn trước ngày này không vào sổ. |
| AUTH | Đường dẫn lấy token, tên header | Dùng `POST {base}/Account` với header `api-key` và body `client_id`, `client_secret`; gọi dữ liệu với `Authorization: Bearer`, `api-key`, `ClientId`. Nếu MISA khác, sửa trong `amis.js` (hàm `token`, `get`). Nút *Kiểm tra kết nối* cho biết ngay. |

Địa chỉ gốc mặc định: `https://developer.misa.vn/apis/amiscrm/v1` (đổi trong `amis.js`, hằng `DEFAULT_BASE`; chỉ cho phép tên miền `developer.misa.vn`).

## Đơn Ký gửi và xác nhận tên kinh doanh (v0.17.0)

**Ký gửi.** Kinh doanh chọn Ký gửi trên AMIS; BG chỉ đọc. Trong *Kết nối & cấu hình*:
1. Ở bảng ánh xạ, chọn trường Ký gửi (sau khi bấm *Xem cấu trúc phản hồi SaleOrders* sẽ thấy tên trường thật).
2. Bấm *Quét…*, rồi tích các giá trị nghĩa là Ký gửi (vd `true`, hoặc “Ký gửi” nếu là danh sách chọn). Không tích giá trị nào thì BG cảnh báo và coi mọi đơn là không ký gửi.
3. Đơn Ký gửi: lưu trong sổ đơn nhưng **không cộng doanh số**. Bỏ Ký gửi trên AMIS thì lần đồng bộ sau tự cộng.

**Tên kinh doanh.** Khóa API MISA được cấp cho *ứng dụng* đăng ký trên MISA Developer Portal (trong file đề xuất: ứng dụng “BG Sales Management”), không gắn với một người dùng cụ thể. Vì vậy với nhóm 11 người, cùng một khóa có thể đọc được đơn của cả nhóm (còn tùy quyền của tài khoản đăng ký; MISA không công bố rõ nên **đừng giả định**, hãy dùng nút *Quét*: nếu thấy nhiều tên là khóa đọc được cả nhóm, nếu chỉ thấy một tên là khóa bị giới hạn). BG xử lý như sau:
- Chọn trường “Nhân viên kinh doanh” trong bảng ánh xạ, bấm *Quét*, tích đúng tên của bạn. Chưa tích thì không đồng bộ.
- Chỉ đơn của tên đã tích được lưu vào BG; đơn của người khác bị loại ngay khi đọc (không lưu, không vào danh sách chờ, không hiện khách của họ).
- Mỗi người dùng BG trên máy của mình, tích tên của mình. Có thể dùng chung một khóa API hoặc mỗi người một khóa; BG không phụ thuộc vào điều đó.
- Khóa API cho phép đọc đơn cả nhóm nên cần giữ kín. BG lưu khóa đã mã hóa theo máy và không đưa vào sao lưu.
- Quét chỉ đọc tối đa 40 trang (~4.000 đơn) gần nhất; nếu tên của bạn không có trong đó, dùng *Thêm tên* để nhập tay.

**Quy tắc ghi nhận hiện tại** của một đơn: đúng kinh doanh đã xác nhận **và** không Ký gửi **và** trạng thái được chọn **và** từ ngày bắt đầu ghi nhận **và** khách hàng đã được duyệt/ghép.

## Luồng xử lý
1. Tiến trình chính (`amis.js`) lấy token, đọc SaleOrders theo trang, chuẩn hóa đơn theo bảng ánh xạ, trả về giao diện.
2. Giao diện (`amis-core.js`) cập nhật **sổ đơn** (mỗi đơn AMIS một dòng, khóa = ID đơn), đối chiếu khách hàng, rồi ghi **một giao dịch IndexedDB** gồm khách hàng, sổ đơn, liên kết, danh sách chờ, nhật ký và mốc đồng bộ.
3. Doanh số của khách = số gốc (Excel/nhập tay) + phần AMIS. Phần AMIS luôn được **tính lại từ sổ đơn** và lưu ở `c.amisAdd` (theo tháng `YYYY-MM`); chỉ phần chênh lệch được cộng vào `m` (tháng), `q` (quý 2026), `a26`/`a25`.

## Quy tắc đối chiếu khách hàng
- Đã liên kết (ID khách AMIS ↔ khách BG) → dùng liên kết.
- Chưa liên kết, tên trùng chính xác với đúng một khách BG và bật “Tự ghép” → tự liên kết.
- Còn lại → **Chờ xác nhận** (kèm gợi ý tên gần giống: bỏ “Công ty/TNHH/Cổ phần…”, chứa nhau, hoặc trùng ≥ một nửa từ).
- Duyệt: *Đồng ý thêm* (chỉ Tên + Mã AMIS), *Ghép*, *Bỏ qua*. Đơn của khách chờ/bỏ qua **không** cộng doanh số.

## Giới hạn đã biết
- Đồng bộ chỉ chạy khi BG đang mở (chưa có Webhook, đúng phạm vi bản đầu).
- Đơn bị **xóa** hẳn trên AMIS (không phải hủy) không có dấu hiệu trong polling nên phần doanh số đã cộng vẫn còn; dùng “Đồng bộ lại toàn bộ” không xóa được. Nên hủy đơn thay vì xóa, hoặc điều chỉnh tay.
- Mô hình dữ liệu BG chỉ có hai năm 2025 và 2026; đơn ngoài hai năm này không được cộng.
- Nhập lại Excel sẽ hiện các khách có doanh số AMIS là “Cập nhật” (vì số trong app đã gồm phần AMIS); đây là bình thường, phần AMIS được cộng lại sau khi nhập.
- Chưa kiểm thử với máy chủ MISA thật (không có khóa API); đã kiểm thử bằng MISA giả lập.
