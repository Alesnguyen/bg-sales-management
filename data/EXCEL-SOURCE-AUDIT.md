# Kiểm kê workbook nguồn — BG Sales Management

**Ngày kiểm kê:** 09/10/2026  
**File nguồn:** `ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx`  
**SHA-256:** `95b50b6a702570e46dc85c839956fff40e7070bcac695f42842d4813aa25a26c`  
**Kết quả:** Đã mở workbook và kiểm tra metadata/các ô của sheet mục tiêu bằng `artifact_tool`. File nguồn được giữ nguyên; không sửa nội dung/công thức.

## 1. Sheet được chọn

Tên người dùng chỉ định: `Doanh số KH 2026`.  
Tên thực tế trong workbook: **`DOANH SỐ KH 2026`**.  
Vùng sử dụng được ghi nhận: **`A1:AZ53` (53 hàng × 52 cột)**.  
Số ô công thức phát hiện trong vùng: **196**.

| Sheet trong workbook | Vùng sử dụng | Chọn để import |
|---|---:|---|
| `DOANH SỐ KH 2026` | `A1:AZ53` | Có |
| `Plan số liệu KIA Bắc Ninh ` | `A1:AB12` | Không — bỏ qua |
| `Khu vực KH` | `A1:H20` | Không — bỏ qua |
| `DS Thaco PVD 2025` | `A1:AA13` | Không — bỏ qua |
| `Doanh số tính lương` | `A1:M18` | Không — bỏ qua |
| `DOANH SỐ KH 2024` | `A1:AN51` | Không — bỏ qua |
| `Cập nhật khách hàng` | `A1:AD12` | Không — bỏ qua |

Chỉ sheet `DOANH SỐ KH 2026` nằm trong phạm vi dự kiến. Các sheet khác chỉ được liệt kê để kiểm kê, không đưa vào import.

## 2. Phân loại hàng đã xác minh

| Hàng/vùng | Phân loại | Cách xử lý đề xuất |
|---|---|---|
| 1–3 | Nhãn nhóm doanh số (>=1,2 tỉ; <=1 tỉ; chưa phát sinh/ít) | Metadata/nhãn nhóm; không phải khách hàng |
| 4 | Header nhiều tầng | Dùng làm đầu vào mapping; header quý/tháng không nằm ở một hàng đơn lẻ |
| 5 | Dòng tổng/summary `ALES`; kèm phụ đề 2025/2026 của cột tháng | Không import thành khách hàng |
| 6 | Hàng trống phân cách | Bỏ qua khi import, giữ nguyên trong workbook nguồn |
| 7–32 | **26 hàng có tên ở cột A** | Ứng viên khách hàng; cần duyệt data mapping/khóa định danh trước khi import |
| 33 | `TỔNG CỘNG` | Dòng tổng; không import thành khách hàng |
| 34 | `TÍNH KPI` | Dòng KPI; không import thành khách hàng |
| 35–41 | Công thức/tính toán hỗ trợ | Giữ trong workbook nguồn; không ghép vào bảng khách hàng |
| 42–53 | Bảng phụ, mục tiêu, chênh lệch và ghi chú | Giữ nguyên và xem là vùng riêng, không import thành khách hàng |

**Lưu ý:** 26 hàng là số hàng ứng viên theo vị trí/giá trị ở cột A, chưa phải xác nhận cuối cùng về khóa khách hàng hay quy tắc định danh. Không suy ra mã khách hàng từ tên.

## 3. Các phát hiện cần lưu ý

- Header chính nằm ở hàng 4; các cột tháng dùng cấu trúc cặp cột 2025/2026 với nhãn tháng trên hàng 4 và năm trên hàng 5.
- Các cột `AO:AT` và các ô phụ rải rác không có header đủ rõ. `AU:AZ` có bảng phụ rõ từ hàng 42. Không được tự ý loại bỏ hoặc gộp các cột này.
- Sheet có công thức; kiểm kê không tính lại công thức và không xác nhận tính đúng của từng công thức. Cần xác minh cách lấy giá trị công thức/cached value khi triển khai thư viện đọc Excel.
- Cách phân loại hàng và mapping hiện là đề xuất kỹ thuật. Chưa chạy import, chưa tạo/cập nhật bất kỳ record database nào.

## 4. Bảng kiểm kê từng cột (toàn bộ A:AZ)

| Cột | Header hàng 4 | Phụ đề hàng 5 | Ô không trống | Ô công thức | Vai trò/mapping đề xuất |
|---|---|---|---:|---:|---|
| A | PTKD | ALES | 33 | 0 | Tên PTKD/khách hàng hoặc nhãn tổng hợp; chỉ dùng làm tên record cho các hàng đã phân loại là khách hàng. |
| B | Thực tế 2025 | 7864111376 | 28 | 14 | Doanh số thực tế năm 2025. |
| C | Mục tiêu 2026 | 10122000000 | 38 | 13 | Mục tiêu doanh số năm 2026. |
| D | Target TB | — | 35 | 4 | Target trung bình tháng. |
| E | Tỉ lệ gia tăng | — | 21 | 15 | Tỉ lệ gia tăng. |
| F | Thực tế 2026 | 6346518557 | 28 | 14 | Doanh số thực tế năm 2026. |
| G | TB thực tế | — | 35 | 7 | Trung bình thực tế. |
| H | Tiến độ hoàn thành | 0.627002426101561 | 37 | 14 | Tiến độ hoàn thành mục tiêu. |
| I | Q1 | 1770599131 | 20 | 11 | Q1 — giá trị thực tế theo cấu trúc tiêu đề cặp quý. |
| J | — | 1800000000 | 9 | 1 | Q1 — target theo cấu trúc tiêu đề cặp quý. |
| K | Q2 | 2263380594 | 34 | 17 | Q2 — giá trị thực tế theo cấu trúc tiêu đề cặp quý. |
| L | — | 2200000000 | 2 | 1 | Q2 — target theo cấu trúc tiêu đề cặp quý. |
| M | Q3 | 2312538832 | 29 | 10 | Q3 — giá trị thực tế theo cấu trúc tiêu đề cặp quý. |
| N | — | 2450000000 | 3 | 2 | Q3 — target theo cấu trúc tiêu đề cặp quý. |
| O | Q4 | 0 | 21 | 9 | Q4 — giá trị thực tế theo cấu trúc tiêu đề cặp quý. |
| P | — | 2650000000 | 10 | 8 | Q4 — target theo cấu trúc tiêu đề cặp quý. |
| Q | Tháng 1 | 2025 | 20 | 6 | Tháng 1 — cột năm 2025 theo hàng phụ đề năm. |
| R | — | 2026 | 25 | 8 | Tháng 1 — cột năm 2026 theo hàng phụ đề năm. |
| S | Tháng 2 | 2025 | 18 | 2 | Tháng 2 — cột năm 2025 theo hàng phụ đề năm. |
| T | — | 2026 | 17 | 4 | Tháng 2 — cột năm 2026 theo hàng phụ đề năm. |
| U | Tháng 3 | 2025 | 16 | 0 | Tháng 3 — cột năm 2025 theo hàng phụ đề năm. |
| V | — | 2026 | 16 | 3 | Tháng 3 — cột năm 2026 theo hàng phụ đề năm. |
| W | Tháng 4 | 2025 | 14 | 0 | Tháng 4 — cột năm 2025 theo hàng phụ đề năm. |
| X | — | 2026 | 17 | 2 | Tháng 4 — cột năm 2026 theo hàng phụ đề năm. |
| Y | Tháng 5 | 2025 | 17 | 1 | Tháng 5 — cột năm 2025 theo hàng phụ đề năm. |
| Z | — | 2026 | 14 | 2 | Tháng 5 — cột năm 2026 theo hàng phụ đề năm. |
| AA | Tháng 6 | 2025 | 14 | 0 | Tháng 6 — cột năm 2025 theo hàng phụ đề năm. |
| AB | — | 2026 | 17 | 1 | Tháng 6 — cột năm 2026 theo hàng phụ đề năm. |
| AC | Tháng 7 | 2025 | 15 | 0 | Tháng 7 — cột năm 2025 theo hàng phụ đề năm. |
| AD | — | 2026 | 19 | 2 | Tháng 7 — cột năm 2026 theo hàng phụ đề năm. |
| AE | Tháng 8 | 2025 | 15 | 0 | Tháng 8 — cột năm 2025 theo hàng phụ đề năm. |
| AF | — | 2026 | 19 | 2 | Tháng 8 — cột năm 2026 theo hàng phụ đề năm. |
| AG | Tháng 9 | 2025 | 15 | 0 | Tháng 9 — cột năm 2025 theo hàng phụ đề năm. |
| AH | — | 2026 | 11 | 2 | Tháng 9 — cột năm 2026 theo hàng phụ đề năm. |
| AI | Tháng 10 | 2025 | 15 | 0 | Tháng 10 — cột năm 2025 theo hàng phụ đề năm. |
| AJ | — | 2026 | 9 | 2 | Tháng 10 — cột năm 2026 theo hàng phụ đề năm. |
| AK | Tháng 11 | 2025 | 18 | 0 | Tháng 11 — cột năm 2025 theo hàng phụ đề năm. |
| AL | — | 2026 | 12 | 2 | Tháng 11 — cột năm 2026 theo hàng phụ đề năm. |
| AM | Tháng 12 | 2025 | 15 | 0 | Tháng 12 — cột năm 2025 theo hàng phụ đề năm. |
| AN | — | 2026 | 11 | 2 | Tháng 12 — cột năm 2026 theo hàng phụ đề năm. |
| AO | — | — | 0 | 0 | Trường phụ/ô tính toán không có header rõ ở hàng 4; giữ nguyên dữ liệu thô và chưa ánh xạ nghiệp vụ. |
| AP | — | — | 4 | 3 | Trường phụ không có header rõ; có ghi chú ở một số hàng và giá trị dạng số ở hàng khác; giữ nguyên, cần xác minh ý nghĩa. |
| AQ | — | — | 0 | 0 | Trường phụ/ô tính toán không có header rõ ở hàng 4; giữ nguyên dữ liệu thô và chưa ánh xạ nghiệp vụ. |
| AR | — | — | 0 | 0 | Trường phụ/ô tính toán không có header rõ ở hàng 4; giữ nguyên dữ liệu thô và chưa ánh xạ nghiệp vụ. |
| AS | — | — | 2 | 0 | Trường phụ/ô tính toán không có header rõ ở hàng 4; giữ nguyên dữ liệu thô và chưa ánh xạ nghiệp vụ. |
| AT | — | — | 2 | 0 | Trường phụ/ô tính toán không có header rõ ở hàng 4; giữ nguyên dữ liệu thô và chưa ánh xạ nghiệp vụ. |
| AU | — | — | 8 | 0 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |
| AV | — | — | 9 | 1 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |
| AW | — | — | 9 | 3 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |
| AX | — | — | 9 | 6 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |
| AY | — | — | 7 | 1 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |
| AZ | — | — | 6 | 1 | Vùng bảng phân tích phụ xuất hiện rõ từ hàng 42; không phải cột của bảng khách hàng chính. Giữ riêng theo vùng nguồn. |

## 5. Gate trước khi lập trình import

1. Chủ dự án duyệt 26 hàng ứng viên và quy tắc phân loại.
2. Chốt khóa định danh, cách thêm/cập nhật khi import lần sau và xử lý khách hàng vắng mặt khỏi file mới.
3. Chốt xử lý các cột/phần phụ không có header rõ, đặc biệt `AO:AT` và bảng `AU:AZ`.
4. Chọn quy tắc dữ liệu cho ô công thức, ô trống, lỗi kiểu dữ liệu và giá trị số âm.
5. Chỉ sau các xác nhận trên mới viết import có preview, validation, transaction/rollback và báo cáo kết quả.
