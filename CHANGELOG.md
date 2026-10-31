# Lịch sử phiên bản

## 0.11.1
- Khách hàng: KPI 2026 từng tháng là MỘT con số cho cả tháng do bạn tự nhập, không phải KPI từng khách hàng. Nhập ngay ở ô KPI 2026 của hàng Tổng cộng (bấm vào ô; gõ 700000000, 700tr hoặc 1,2 tỷ; Enter hoặc Tab sang tháng kế; Esc hủy) hoặc ở nút “KPI từng tháng…” (nhập cả 12 tháng, có tổng và so với KPI cả năm ở Tổng quan).
- Khách hàng: mỗi khách hàng hiện % doanh số 2026 của tháng so với KPI tháng đã đặt (khách đóng góp bao nhiêu % vào KPI), có thanh tiến độ như cột Tiến độ. Hàng Tổng cộng hiện KPI tháng và % đạt của cả tháng. Cột KPI sắp xếp được theo %.
- Bỏ ô KPI từng khách trong trang sửa khách hàng.
- Giữ nguyên: hàng Tổng cộng cộng doanh số 2025, 2026 từng tháng; ẩn hiện cột KPI và hàng Tổng cộng trong “Chọn cột hiển thị”.

## 0.11.0
- Khách hàng: thêm cột “KPI 2026” cho từng tháng, nhập tay. Bấm vào ô để nhập (gõ 120000000, 120tr hoặc 1,5 tỷ), Enter lưu và xuống dòng, Tab sang tháng kế, Esc hủy, để trống để xóa. Có thể nhập cả trong trang sửa khách hàng (kèm tổng KPI 12 tháng và cảnh báo nếu lệch ô Mục tiêu 2026). Có thể sắp xếp theo cột KPI.
- Khách hàng: thêm hàng “Tổng cộng” cố định ở cuối bảng, cộng doanh số 2025, 2026 và KPI 2026 của từng tháng (và các cột khác) cho các khách hàng đang hiển thị theo bộ lọc.
- Khách hàng: hai mục mới trong “Chọn cột hiển thị” để ẩn hiện cột KPI 2026 và hàng Tổng cộng.
- Nhập lại file Excel không làm mất KPI đã nhập tay.

## 0.10.1
- Tờ đề xuất Excel (SaleBoots): chữ ký Tổng Giám Đốc, Kế toán, Phụ trách phòng BG, Phụ trách kinh doanh chia 4 khối đều nhau, căn giữa, cách đều trên cùng một dòng. Độ rộng cột bảng được cân lại cho khớp.

## 0.10.0
- SaleBoots: chọn kỳ chương trình theo tháng (nút T1–T12 và Quý 1–4, tự đồng bộ ngày bắt đầu, kết thúc), có ô tên kỳ ghi trên tờ đề xuất (tự tạo “Quý 4”, “T10, T11, T12”, sửa tay được).
- SaleBoots: đề xuất hai mức thưởng (Mức 1, Mức 2: mục tiêu doanh số cả kỳ và tiền thưởng), tự tính trung bình mỗi tháng.
- SaleBoots: xem trước tờ đề xuất và nút “Xuất đề xuất Excel” theo mẫu có token. Các cột tháng là doanh số thực tế của 6 tháng liền trước tháng đầu tiên của chương trình (Quý 4 thì hiện T4 đến T9), cột Tổng là tổng 6 tháng đó.

## 0.9.9
- Tổng quan: hiệu ứng chỉ chạy khi vào trang (mở ứng dụng hoặc quay lại từ trang khác). Bấm vào tỉnh trên bản đồ, đổi khu vực lọc, sửa KPI hay đổi tab không còn chạy lại hiệu ứng.

## 0.9.8
- Tổng quan: bỏ hiệu ứng sóng và nháy viền ở bản đồ (bản đồ chỉ mờ dần nhẹ). Viền tỉnh khi rê chuột, chọn, focus mảnh và nhẹ hơn.
- Tổng quan: hiệu ứng chạy theo từng phần tử đúng lúc cuộn tới (thẻ chỉ số, bản đồ, vành khuyên, từng dòng bảng, từng thanh, biểu đồ), không còn chạy cùng lúc khi vào trang. Phần đã hiện không chạy lại khi cuộn ngược.

## 0.9.7
- Tổng quan: thêm animation cho các biểu đồ. Thẻ chỉ số nảy lên và số đếm tăng dần; bản đồ hiện dần từ Bắc vào Nam rồi các tỉnh có khách hàng nháy viền; vành khuyên vẽ nối tiếp; thanh tiến độ chạy dài kèm vệt sáng; biểu đồ đường lộ dần kèm vùng tô; biểu đồ cột quý mọc lên; bảng và danh sách trượt vào.
- Hiệu ứng chỉ bắt đầu khi thẻ cuộn vào tầm nhìn, chỉ chạy khi vào trang, đổi khu vực lọc hoặc số liệu thay đổi (không chạy lại khi đổi tab, rê chuột). Thêm hiệu ứng khi rê chuột vào thẻ, thanh, cung vành khuyên, cột và điểm. Tự tắt khi Windows bật “giảm chuyển động”.

## 0.9.6
- Sửa lỗi ở Lịch làm việc: sau khi xóa một công việc, ô “Nội dung” khi thêm hoặc sửa công việc không gõ được (chữ gõ lạc ra góc trái màn hình). Nguyên nhân là hộp thoại xác nhận gốc của hệ điều hành; nay mọi xác nhận (xóa công việc, xóa chương trình, rời trang khi chưa lưu, khôi phục sao lưu, xóa toàn bộ dữ liệu) dùng hộp thoại ngay trong ứng dụng.
- Tổng quan: biểu tượng của thẻ “Bản đồ khách hàng theo khu vực” là icon ghim vị trí rõ ràng.

## 0.9.5
- Tổng quan: thẻ “Bản đồ khách hàng theo khu vực” bố cục lại cho dễ dùng: bản đồ 63 tỉnh, thành lớn bên trái; bên phải là vành khuyên tỷ lệ doanh số và danh sách khu vực có tab (Tất cả, Đang hoạt động, Cần theo dõi). Rê chuột sáng tỉnh, bấm tỉnh để lọc Tổng quan, có nút bỏ lọc.
- Tổng quan: bỏ 4 thẻ số liệu trùng lặp trong thẻ bản đồ.
- Tổng quan: “Mục tiêu doanh số năm” chỉnh tay, gồm cả KPI từng quý (nhập đủ 4 quý thì KPI năm tự bằng tổng; có nút Chia đều). Tiến độ, biểu đồ và bảng quý tính theo KPI này. Nút “Chỉnh KPI quý” ngay trên bảng quý.
- Tổng quan: “Top 5 khách hàng 2026” hiển thị lại: số thứ tự, tên dài tối đa 2 dòng, số tiền không ngắt dòng, tự co giãn theo độ rộng khung.
- Khách hàng: nhận diện khu vực từ tên cho cả 63 tỉnh, thành khi nhập Excel.
- Sửa lỗi logo không hiển thị: logo được nhúng thẳng vào ứng dụng.

## 0.9.2
- **Sửa cập nhật tự động:** bản phát hành trước thiếu file cài và `latest.yml` nên ứng dụng báo "chưa có thông tin bản cập nhật". Quy trình build nay tự đăng đủ file cài, `latest.yml` và blockmap lên kho phát hành, kèm ghi chú lấy từ CHANGELOG, và tự bổ sung nếu một bản đã đăng bị thiếu file.
- Ứng dụng kiểm tra bản mới khi mở và 6 giờ một lần; bấm "Kiểm tra cập nhật" hiện ngay phiên bản mới và nội dung "Có gì mới"; tự tải về và hiện nút "Khởi động lại để cập nhật".
- **Chuông thông báo** cạnh nút sáng/tối: huy hiệu số chưa đọc; bảng thông báo có nhóm Mới / Đã xem, nút hành động, ẩn từng thông báo, "Đánh dấu đã đọc", đóng bằng Esc, đọc được bằng trình đọc màn hình. Loại thông báo: bản cập nhật, công việc trễ hạn và công việc hôm nay, SaleBoots sắp kết thúc hoặc chậm tiến độ, nhắc sao lưu và lỗi sao lưu. Bật/tắt từng loại ở Cài đặt.

## 0.9.1
- Sửa lỗi ô số tiền: khi gõ hoặc xóa, ứng dụng không còn tự chèn dấu chấm và đổi nội dung ô (có thể xung đột với bộ gõ tiếng Việt, làm chữ số "5" tự xuất hiện). Nay ô giữ nguyên khi đang gõ; dòng gợi ý bên dưới hiện ngay số đầy đủ có dấu chấm (= 500.000.000 ≈ 500 triệu); rời ô thì ô được định dạng. Chặn chữ và ký tự lạ; dán số có dấu chấm vẫn đúng.
- Sửa lỗi tính SaleBoots đang chạy: trước đây "Cùng kỳ 2025" lấy cả thời gian chương trình trong khi "Thực đạt" mới có đến hôm nay, nên Doanh số tăng thêm và Tăng trưởng bị âm sai. Nay chương trình đang chạy chỉ so sánh phần đã diễn ra với đúng khoảng thời gian đó của 2025.
- Thêm giải thích: chú thích khi rê chuột, dòng thông báo khoảng thời gian đang so sánh, và mục "Cách tính các con số này" kèm số liệu thật.

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
