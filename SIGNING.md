# Ký số bản cài Windows

Hiện bản cài **chưa ký**, nên Windows SmartScreen hiện cảnh báo "nhà phát hành không xác định". Ký số giúp hiện đúng tên nhà phát hành và giảm dần cảnh báo (độ tin cậy SmartScreen vẫn tích lũy theo thời gian, kể cả khi đã ký).

Ký số cần một chứng thư **do tổ chức cấp chứng thư xác minh danh tính của bạn hoặc công ty bạn**. Việc này không thể tự tạo thay bạn. Các lựa chọn (theo tài liệu Microsoft và Electron, kiểm tra lại giá và điều kiện trước khi mua):

| Lựa chọn | Chi phí tham khảo | Ghi chú |
|---|---|---|
| Azure Artifact Signing (trước đây Trusted Signing) | khoảng 9,99 USD/tháng | Tổ chức: Mỹ, Canada, EU, Anh. Cá nhân: chỉ Mỹ và Canada. **Nếu ở Việt Nam thì hiện chưa dùng được.** |
| Chứng thư OV từ tổ chức cấp chứng thư (DigiCert, Sectigo, SSL.com, Certum...) | khoảng 150–300 USD/năm | Dùng được ở mọi nơi. Chứng thư mới hiện có hạn tối đa 460 ngày, khóa riêng nằm trên thiết bị/đám mây của nhà cấp. |
| Chứng thư EV | cao hơn OV | Không còn "tin cậy ngay" như trước. |

## Cách gắn vào quy trình build (khi đã có chứng thư)
1. Chứng thư có khóa trên đám mây (DigiCert KeyLocker, SSL.com eSigner...) hoặc Azure: làm theo hướng dẫn của nhà cấp để ký bằng GitHub Actions. Lưu mọi bí mật trong **Settings → Secrets and variables → Actions** của repository, tuyệt đối không ghi vào mã nguồn.
2. Với Azure Artifact Signing, thêm vào `package.json` mục `build.win.azureSignOptions` (endpoint, tên tài khoản, tên hồ sơ chứng thư) và đặt các biến `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` ở bước build. Xem tài liệu electron-builder về `azureSignOptions`.
3. Với tệp `.pfx` (chỉ có ở một số loại chứng thư): mã hóa base64, lưu vào secret `WIN_CSC_LINK` và mật khẩu vào `WIN_CSC_KEY_PASSWORD`, rồi ở bước `electron-builder` thêm `CSC_LINK: ${{ secrets.WIN_CSC_LINK }}` và `CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}`.
4. Sau khi ký, kiểm tra bằng cách nhấp phải file `.exe` → Properties → Digital Signatures.

## Dùng nội bộ trên vài máy của bạn
Có thể tạo chứng thư tự ký và cài vào "Trusted Root" trên từng máy. Cách này chỉ có tác dụng trên các máy đã cài chứng thư đó, không thay thế chữ ký công khai.
