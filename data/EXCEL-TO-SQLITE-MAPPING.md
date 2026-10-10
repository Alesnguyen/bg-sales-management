# Đề xuất mapping Excel → SQLite (bản chờ duyệt)

**Trạng thái:** Đề xuất để review; chưa triển khai import. Nguồn chi tiết nằm trong `EXCEL-SOURCE-AUDIT.md` và `excel-source-profile.json`.

## Bảng khách hàng chính (ứng viên)

Dữ liệu chính nằm ở hàng 7–32. Cột A là tên PTKD/khách hàng theo dữ liệu nguồn, nhưng chưa có bằng chứng trong header cho một mã khách hàng ổn định. Không dùng tên đơn lẻ làm khóa chính nếu chưa duyệt.

| Cột nguồn | Trường nghiệp vụ đề xuất | Kiểu dự kiến | Ghi chú |
|---|---|---|---|
| A | customer_name | TEXT | Tên/nhãn trong hàng; cần xác nhận có khách hàng nào không phải một pháp nhân/đại lý độc lập |
| B | actual_sales_2025 | DECIMAL/INTEGER tiền tệ | Thực tế 2025 |
| C | target_sales_2026 | DECIMAL/INTEGER tiền tệ | Mục tiêu năm 2026 |
| D | average_monthly_target | DECIMAL/INTEGER tiền tệ | Target TB |
| E | growth_rate | REAL/DECIMAL | Xác định quy ước lưu dạng tỷ lệ |
| F | actual_sales_2026 | DECIMAL/INTEGER tiền tệ | Thực tế 2026 |
| G | average_actual | DECIMAL/INTEGER tiền tệ | Trung bình thực tế |
| H | completion_ratio | REAL/DECIMAL | Tiến độ hoàn thành |
| I:J | q1_actual / q1_target | DECIMAL/INTEGER tiền tệ | Cặp cột quý |
| K:L | q2_actual / q2_target | DECIMAL/INTEGER tiền tệ | Cặp cột quý |
| M:N | q3_actual / q3_target | DECIMAL/INTEGER tiền tệ | Cặp cột quý |
| O:P | q4_actual / q4_target | DECIMAL/INTEGER tiền tệ | Cặp cột quý |
| Q:AN | monthly values, year 2025/2026 | DECIMAL/INTEGER tiền tệ | 12 cặp tháng; cần chốt lưu dạng 24 trường hay bảng sales_period |
| AO:AT | auxiliary_source_fields | TEXT/JSON hoặc staging | Không có header đủ rõ; không được loại bỏ trước khi chủ dự án quyết định |
| AU:AZ | auxiliary_analysis | vùng riêng | Có bảng phụ từ hàng 42; không gán vào bảng customer chính khi chưa xác minh |

## Cấu trúc dữ liệu đề xuất

- `customers`: `id` nội bộ (PK), `customer_code` (nullable cho đến khi tìm thấy mã ổn định), `name`, `created_at`, `updated_at`, `is_archived`.
- `customer_sales_summary`: số liệu năm 2025/2026, target, actual, growth, average, completion. Cần quyết định giá trị tổng hợp sẽ được lưu từ Excel hay tính lại từ bảng chi tiết; không nên vừa lưu vừa tính mà không có quy tắc nhất quán.
- `customer_sales_period`: `customer_id`, `year`, `period_type` (month/quarter), `period_number`, `actual_amount`, `target_amount`. Unique key dự kiến gồm customer, năm/loại kỳ/số kỳ.
- `import_batches` và `import_row_issues`: lưu nguồn, thời điểm, số hàng đọc/nhập/bỏ qua và lỗi validation để có thể audit/rollback.
- `source_row_archive` hoặc vùng staging: bảo toàn dữ liệu nguồn/cột chưa ánh xạ, công thức/header phụ trước khi mapping được duyệt.

Đây là khuyến nghị sơ bộ, chưa phải schema được phê duyệt. SQLite lưu số tiền theo INTEGER VND để tránh sai số dấu phẩy động là hướng ưu tiên, nhưng cần kiểm tra quy ước số liệu và phép tính hiện tại trong workbook trước khi quyết định.

## Quy tắc bắt buộc trước khi code

1. **Khóa khách hàng:** chưa xác định; không tự tạo quy tắc trùng bằng tên mà không được duyệt.
2. **Import lặp lại:** chọn rõ `chỉ thêm`, `upsert theo mã`, hoặc preview từng xung đột; mặc định khuyến nghị preview + upsert sau khi có khóa ổn định.
3. **Khách hàng không còn ở file:** không tự xóa; chỉ đánh dấu đề xuất cần review.
4. **KPI/tổng cộng:** không tạo row khách hàng; dữ liệu tổng hợp không được cộng hai lần khi import.
5. **Công thức:** xác định lấy giá trị đã tính sẵn, tự tính lại trong ứng dụng hay giữ công thức dưới dạng metadata. Không coi công thức trong workbook là đã kiểm chứng.
6. **Rollback:** import phải chạy transaction, không làm hỏng database nếu một hàng lỗi hoặc tiến trình bị ngắt.
7. **Cột chưa rõ nghĩa:** giữ raw field và báo rõ trong preview; chưa bỏ bất kỳ cột nào.
