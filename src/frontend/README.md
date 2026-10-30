# LỚP GIAO DIỆN (Web UI)

Ba màn hình theo wireframe (`docs/wireframe.png`): **M1** Tạo phiếu bảo hành · **M2** Danh sách phiếu bảo hành · **M3** Chi tiết phiếu bảo hành; thêm **M4** Khách hàng & thiết bị (CRUD, `#/data`).
Lớp này chỉ hiển thị, kiểm tra định dạng nhập (SĐT 10 số, IMEI 15 số) và gọi REST API – không chứa quy tắc nghiệp vụ.

HTML + JavaScript thuần (ES modules), do Express phục vụ tại `http://localhost:3000/` – không có bước build (TD-08).

| Thư mục / file | Vai trò |
|---|---|
| `api/client.js` | Nơi **duy nhất** gọi `fetch()`; gắn Bearer token; nhận 401 → xoá phiên, về trang đăng nhập |
| `api/ticket.api.js` | Hàm gọi từng endpoint A1, C1–C2, D1, T1–T8, L1–L2 theo `docs/api-contract.md` |
| `components/DataState.js` | Bọc vùng dữ liệu với 3 trạng thái: đang tải · rỗng · lỗi (có nút *Thử lại*) |
| `components/dom.js` | Dựng DOM, nhãn trạng thái / mức ưu tiên theo bảng thuật ngữ SRS |
| `pages/login.js` | Đăng nhập |
| `pages/ticketList.js` | M2 – UC04 |
| `pages/ticketCreate.js` | M1 – UC01, UC07 (thông báo 2a, 3a, 4a, 5a, 5b, 5c, 7a) |
| `pages/masterData.js` | M4 – CRUD khách hàng, thiết bị (Điều phối viên chỉ xem) |
| `fonts/` | Font Be Vietnam Pro (giấy phép OFL, xem `LICENSE.txt`) |
| `pages/ticketDetail.js` | M3 – UC02, UC03, UC05, UC06 |
| `main.js` | Thanh tiêu đề và định tuyến `#/login`, `#/tickets`, `#/tickets/new`, `#/tickets/:mã` |

Kiểm tra quy ước "không gọi `fetch(` trong màn hình": `grep -rn "fetch(" src/frontend/pages` phải ra rỗng.
