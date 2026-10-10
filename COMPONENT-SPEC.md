# Component Specification — BG Sales Management v0.2.1

**Trạng thái:** Chuẩn hóa thông số; chờ review thành phần cuối cùng.  
**Nguồn token:** `design-tokens.json`.  
**Quy tắc:** không gắn màu trực tiếp trong component; lấy màu semantic token theo theme.

## 1. Ma trận component

| Component | Variant / vai trò | Trạng thái bắt buộc | Quy tắc thiết kế và nghiệm thu |
|---|---|---|---|
| Button | Primary, Secondary, Quiet, Danger | Default, Hover, Pressed, Focus-visible, Disabled, Loading khi có tác vụ dài | Primary dùng accent vàng + chữ đen; Secondary dùng surface + border; Danger dùng semantic danger. Nội dung/chiều rộng không nhảy khi chuyển trạng thái. |
| Text field / Search | Standard, Search | Default, Hover, Focus-visible, Disabled, Invalid | Chiều cao chuẩn 38px; placeholder dùng text-secondary; lỗi có màu danger và thông báo bằng chữ. Không chỉ dựa vào viền đỏ. |
| Select / Filter | Single-select, Filter | Default, Hover, Focus-visible, Disabled, Empty result | Có nhãn rõ ràng; cho phép xóa lọc khi phù hợp; phối hợp được với search và có kết quả rỗng dễ hiểu. |
| Data table | Header, Row, Selected row | Default, Hover, Selected, Empty, Loading, Error | Header phân cấp rõ; con số canh nhất quán; giữ đơn vị/định dạng; row hover không làm giảm độ đọc; cuộn ngang có chủ đích khi cần. |
| Status badge | Success, Warning, Danger, Info, Neutral | Default; trạng thái phải có label | Dùng nền nhạt riêng cho từng trạng thái; luôn kèm từ ngữ/icon, không dùng màu là tín hiệu duy nhất. |
| KPI card | Metric, Progress | Default, Loading, Empty, Error | Nhãn trước số lớn; đơn vị và kỳ dữ liệu rõ; không hiển thị KPI giả như số liệu thật. |
| Navigation | Sidebar item, Active item | Default, Hover, Active, Focus-visible, Disabled nếu có | Active có accent và chữ đen; active được đánh dấu bằng thuộc tính/ngữ nghĩa, không chỉ màu. Trên màn hình nhỏ phải cuộn/hiển thị được. |
| Card / Surface | Standard, Raised, Subtle | Default, Interactive hover nếu clickable | Chỉ dùng raised khi cần phân cấp; shadow tiết chế; không đặt toàn bộ nội dung trong nhiều lớp card lồng nhau. |
| Toast / Notice | Success, Warning, Error, Info | Enter, Visible, Dismiss/Timeout | Nội dung ngắn, nêu điều đã xảy ra và bước tiếp theo nếu cần; toast không thay thế xác nhận quan trọng hoặc thông tin lỗi bền vững. |
| Empty state | No data, No results, Import empty | Visible, Actionable khi có đường thoát | Phân biệt chưa có dữ liệu với bộ lọc không có kết quả; cung cấp hành động hợp lý như xóa lọc hoặc thêm dữ liệu. |
| Dialog / Confirmation | Confirm delete, Unsaved changes, Import confirm | Open, Focus trap, Cancel, Confirm, Error | Chưa triển khai trong HTML preview. Khi dựng thật cần focus management, nút hủy dễ thấy, hành động nguy hiểm không mặc định được chọn. |
| Focus indicator | Tất cả control có thể tương tác | Keyboard focus-visible | Outline 3px và offset 2px theo token; dễ nhìn ở cả hai theme; không bị overflow hoặc thành phần khác che. |

## 2. Kích thước chuẩn

| Thuộc tính | Giá trị chuẩn | Ghi chú |
|---|---:|---|
| Control mặc định | 38px | Button, input, select ở màn hình nghiệp vụ |
| Control compact | 32px | Chỉ dùng trong bảng/toolbar chật và khi vẫn dễ thao tác |
| Control lớn | 44px | Hành động chính hoặc bối cảnh cần vùng chạm lớn hơn |
| Focus outline | 3px | Hiển thị khi dùng bàn phím |
| Focus offset | 2px | Duy trì khoảng trống quanh outline |
| Content max width | 1800px | Theo token layout; có thể đổi khi review responsive |
| Sidebar desktop | 248px | Thu về thanh điều hướng ngang ở breakpoint mobile |

## 3. Màu theo vai trò

| Vai trò | Token | Cách dùng |
|---|---|---|
| Page background | `background` | Nền tổng thể |
| Surface | `surface` | Card, menu, table, field |
| Surface subtle | `surfaceSubtle` | Header bảng, hover nhẹ, khu vực phụ |
| Primary action | `accent` + `onAccent` | Nút chính và mục điều hướng active |
| Focus | `focus` + `focusHalo` | Vòng focus nhìn thấy trên mọi bề mặt |
| Success | `success` + `successSurface` | Kết quả thành công; luôn kèm nhãn |
| Warning | `warning` + `warningSurface` | Cảnh báo; mô tả lý do hoặc việc cần làm |
| Danger | `danger` + `dangerSurface` | Lỗi/hành động nguy hiểm; không chỉ dựa vào màu |
| Info | `info` + `infoSurface` | Thông tin trung tính cần phân biệt |
| Disabled | `disabledText` + `disabledSurface` | Trạng thái không thao tác được; giải thích lý do nếu chưa rõ |

## 4. Tiêu chí duyệt component

Một component chỉ được chuyển sang “Hoàn thành” khi:

1. Có trạng thái cần thiết trên cả Light và Dark.
2. Kích thước/radius/spacing lấy từ token đã duyệt.
3. Focus bằng bàn phím nhìn thấy được và luồng điều khiển hợp lý.
4. Nội dung tiếng Việt không bị cắt ở cỡ cửa sổ hỗ trợ.
5. Không có màu trạng thái đơn lẻ làm nguồn thông tin duy nhất.
6. Có bằng chứng preview/ảnh hoặc kịch bản kiểm thử tương ứng.
7. Các nhánh chưa có trong prototype được ghi “Chưa triển khai”, không được đánh dấu hoàn thành.

## 5. Phạm vi cần phân biệt

- Có preview cơ bản: navigation, card, KPI, table, search/filter, theme toggle, toast, import file picker, status/empty state đơn giản.
- Đã có đặc tả nhưng chưa có luồng thật: CRUD form, confirmation dialog, unsaved-changes dialog, import preview/validation/commit, loading/error từ database, backup/restore.
- Chưa kiểm thử trên ứng dụng native: keyboard accessibility đầy đủ, screen reader, Windows 10/11, WinUI 3.
