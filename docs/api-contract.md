# API CONTRACT – Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

**Track:** SE · **Phiên bản:** 1.0 (BT1 – thiết kế, chưa hiện thực) · **Kiến trúc:** xem `docs/srs.md` – Mục 3

---

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Giao thức | HTTPS, REST, JSON (`Content-Type: application/json; charset=utf-8`) |
| Tiền tố | `/api` |
| Xác thực | Mọi API trừ `POST /api/auth/login` phải gửi header `Authorization: Bearer <token>`; thiếu hoặc sai token → **401** |
| Phân quyền | Kiểm tra ở lớp nghiệp vụ theo `staff.role` (NFR4); sai vai trò → **403** |
| Tên trường | camelCase; giá trị liệt kê dùng mã trong bảng thuật ngữ: `status` = `NEW`, `CLASSIFIED`, `ASSIGNED`, `IN_PROGRESS`, `REJECTED`; `priority` = `HIGH`, `MEDIUM`, `LOW` |
| Thời gian | ISO 8601 có múi giờ, ví dụ `2026-10-12T14:30:00+07:00` |
| Định danh phiếu | Dùng **mã phiếu** (`ticketCode`, ví dụ `BH-2026-000123`) trên URL |
| Phân trang | `page` (bắt đầu từ 1), `size` mặc định **20**, tối đa 100 |

**Định dạng lỗi chung**

```json
{ "code": "TICKET_OPEN_EXISTS", "message": "Thiết bị đang có phiếu BH-2026-000098 chưa đóng", "details": { "openTicketCode": "BH-2026-000098" } }
```

| HTTP | Khi nào |
|---|---|
| 400 | Dữ liệu sai định dạng hoặc thiếu trường bắt buộc |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Đúng người dùng nhưng sai vai trò (BR5, NFR4) |
| 404 | Không tìm thấy khách hàng, thiết bị hoặc phiếu bảo hành |
| 409 | Vi phạm quy tắc nghiệp vụ hoặc dữ liệu đã bị người khác thay đổi (BR2, BR6, UC03-4b) |

---

## 2. Danh sách endpoint

| # | Method & đường dẫn | Vai trò được gọi | Use case | FR |
|---|---|---|---|---|
| A1 | `POST /api/auth/login` | Mọi nhân viên | — | NFR4 |
| C1 | `GET /api/customers?phone={phone}` | Nhân viên tiếp nhận | UC07 | FR1 |
| C2 | `POST /api/customers` | Nhân viên tiếp nhận | UC07 (3a) | FR1 |
| D1 | `GET /api/devices?imei={imei}` | Nhân viên tiếp nhận | UC01 (bước 5) | FR1 |
| T1 | `POST /api/tickets` | Nhân viên tiếp nhận | UC01 | FR1 |
| T2 | `GET /api/tickets` | Cả ba vai trò | UC04 | FR4 |
| T3 | `GET /api/tickets/{ticketCode}` | Cả ba vai trò | UC02–UC06 (màn hình M3) | FR2–FR5 |
| T4 | `POST /api/tickets/{ticketCode}/classify` | Điều phối viên | UC02 | FR2 |
| T5 | `POST /api/tickets/{ticketCode}/reject` | Điều phối viên | UC02 | FR2 |
| T6 | `POST /api/tickets/{ticketCode}/assign` | Điều phối viên | UC03 | FR3 |
| T7 | `POST /api/tickets/{ticketCode}/start` | Kỹ thuật viên được phân công | UC05 | FR5 |
| T8 | `GET /api/tickets/{ticketCode}/history` | Cả ba vai trò | UC06 | FR5 |
| L1 | `GET /api/issue-categories` | Điều phối viên | UC02 | FR2 |
| L2 | `GET /api/technicians?active=true` | Điều phối viên | UC03 | FR3 |

---

## 3. Chi tiết endpoint

### A1. `POST /api/auth/login`

Request: `{ "username": "dp1", "password": "••••••" }`
Response **200**: `{ "token": "<jwt>", "staff": { "id": 2, "fullName": "Trần Minh", "role": "COORDINATOR" } }`
Lỗi: **401** `INVALID_CREDENTIALS` · **403** `STAFF_INACTIVE` (`staff.is_active = false`).

### C1. `GET /api/customers?phone=0901234567`

Response **200**: `{ "id": 1, "fullName": "Nguyễn Văn A", "phone": "0901234567" }`
Lỗi: **400** `INVALID_PHONE` – *"Số điện thoại không hợp lệ"* (UC01-2a) · **404** `CUSTOMER_NOT_FOUND` – *"Chưa có khách hàng với số điện thoại này"* (UC01-3a).

### C2. `POST /api/customers`

Request: `{ "fullName": "Nguyễn Văn A", "phone": "0901234567" }`
Response **201**: `{ "id": 1, "fullName": "Nguyễn Văn A", "phone": "0901234567" }`
Lỗi: **400** `INVALID_PHONE` / `FULL_NAME_REQUIRED` · **409** `PHONE_EXISTS`.

### D1. `GET /api/devices?imei=356789012345678`

Response **200**:

```json
{ "id": 7, "imei": "356789012345678", "model": "Galaxy A55", "warrantyEndDate": "2026-01-01",
  "customerId": 1, "outOfWarranty": true, "openTicketCode": null }
```

`outOfWarranty` được tính khi trả về (BR3, không lưu); `openTicketCode` khác `null` nghĩa là vi phạm BR2 (UC01-5b).
Lỗi: **400** `INVALID_IMEI` – *"IMEI phải gồm 15 chữ số"* (UC01-4a) · **404** `DEVICE_NOT_FOUND` → giao diện mở ô Model và Ngày hết hạn bảo hành (UC01-5a).

### T1. `POST /api/tickets` – Tạo phiếu bảo hành

Request (thiết bị đã có):

```json
{ "customerId": 1, "imei": "356789012345678", "issueDescription": "Màn hình bị sọc ngang sau khi rơi" }
```

Request (thiết bị mới – UC01-5a) thêm: `"model": "Galaxy A55", "warrantyEndDate": "2026-01-01"`.

Response **201**:

```json
{ "ticketCode": "BH-2026-000123", "status": "NEW", "outOfWarranty": true, "createdAt": "2026-10-09T14:10:00+07:00" }
```

Xử lý: sinh mã phiếu; lưu `ticket` với `status = NEW`; ghi `ticket_status_log` (`null → NEW`) trong cùng một giao dịch (NFR5).
Lỗi: **400** `ISSUE_DESCRIPTION_REQUIRED` – *"Vui lòng nhập mô tả lỗi"* (UC01-7a), `INVALID_IMEI`, `MODEL_REQUIRED` · **403** người gọi không phải Nhân viên tiếp nhận · **409** `TICKET_OPEN_EXISTS` (BR2, UC01-5b).

### T2. `GET /api/tickets` – Danh sách phiếu bảo hành

Query: `status`, `priority`, `dueFrom`, `dueTo`, `q` (mã phiếu hoặc số điện thoại), `page`, `size`.
Response **200**:

```json
{ "page": 1, "size": 20, "total": 10000,
  "items": [ { "ticketCode": "BH-2026-000120", "customerName": "Lê Văn C", "customerPhone": "0987654321",
               "model": "Redmi 12", "status": "ASSIGNED", "priority": "MEDIUM",
               "dueDate": "2026-10-08T14:00:00+07:00", "overdue": true, "technicianName": "Phạm Huy" } ] }
```

Quy tắc: Kỹ thuật viên chỉ nhận phiếu có `assigned_to` = chính mình. Sắp xếp mặc định `dueDate` tăng dần. Lọc và phân trang trong CSDL dùng index `(status, due_date)` – **NFR1: ≤ 2 giây (p95) với 10.000 phiếu**.

### T3. `GET /api/tickets/{ticketCode}` – Chi tiết phiếu bảo hành

Response **200**: toàn bộ trường hiển thị trên màn hình M3 – `ticketCode`, `status`, `priority`, `dueDate`, `issueCategory { id, name }`, `issueDescription`, `outOfWarranty`, `customer { fullName, phone }`, `device { imei, model, warrantyEndDate }`, `technician { id, fullName }`, `createdBy { fullName }`, `createdAt`.
Lỗi: **404** `TICKET_NOT_FOUND` · **403** Kỹ thuật viên xem phiếu không được phân công cho mình.

### T4. `POST /api/tickets/{ticketCode}/classify` – Phân loại

Request: `{ "issueCategoryId": 1, "priority": "MEDIUM" }`
Response **200**: `{ "ticketCode": "BH-2026-000123", "status": "CLASSIFIED", "dueDate": "2026-10-12T14:30:00+07:00" }`
Xử lý: `dueDate` = thời điểm phân loại + 24 / 72 / 120 giờ theo mức ưu tiên (BR4); đổi trạng thái qua StatusService (NFR5).
Lỗi: **400** thiếu `issueCategoryId` hoặc `priority` · **403** `FORBIDDEN_ROLE` · **409** `INVALID_STATUS` (phiếu không ở trạng thái `NEW`).

### T5. `POST /api/tickets/{ticketCode}/reject` – Từ chối

Request: `{ "reason": "Máy bị vào nước, không thuộc diện bảo hành" }`
Response **200**: `{ "ticketCode": "BH-2026-000123", "status": "REJECTED" }` – lý do lưu ở `ticket_status_log.note`.
Lỗi: **400** `REJECT_REASON_REQUIRED` – *"Vui lòng nhập lý do từ chối"* · **403** `FORBIDDEN_ROLE` · **409** `INVALID_STATUS` (chỉ từ chối phiếu `NEW` – BR6).

### T6. `POST /api/tickets/{ticketCode}/assign` – Phân công kỹ thuật viên

Request: `{ "technicianId": 3 }`
Response **200**: `{ "ticketCode": "BH-2026-000123", "status": "ASSIGNED", "technician": { "id": 3, "fullName": "Phạm Huy" } }`
Lỗi:

| HTTP | Mã lỗi | Thông báo | Luồng |
|---|---|---|---|
| 403 | `FORBIDDEN_ROLE` | Bạn không có quyền phân công phiếu | UC03-4a |
| 409 | `TICKET_NOT_CLASSIFIED` | Cần phân loại phiếu trước khi phân công | UC03-1a |
| 409 | `DATA_CHANGED` | Dữ liệu đã thay đổi, vui lòng tải lại | UC03-4b |

### T7. `POST /api/tickets/{ticketCode}/start` – Kỹ thuật viên xác nhận nhận phiếu

Request: không có body. Response **200**: `{ "ticketCode": "BH-2026-000123", "status": "IN_PROGRESS" }`
Lỗi: **403** người gọi không phải kỹ thuật viên được phân công · **409** `INVALID_STATUS` (phiếu không ở trạng thái `ASSIGNED`).

### T8. `GET /api/tickets/{ticketCode}/history` – Lịch sử trạng thái

Response **200**:

```json
[ { "changedAt": "2026-10-09T14:10:00+07:00", "fromStatus": null, "toStatus": "NEW", "changedBy": "Lê Thu", "note": null } ]
```

Sắp xếp theo `changedAt` tăng dần (index `idx_log_ticket_time`). Chỉ đọc – không có API sửa hoặc xoá lịch sử.

### L1. `GET /api/issue-categories`

Response **200**: `[ { "id": 1, "code": "SCREEN", "name": "Màn hình" } ]` – chỉ trả danh mục `is_active = true`.

### L2. `GET /api/technicians?active=true`

Response **200**: `[ { "id": 3, "fullName": "Phạm Huy", "openTicketCount": 3 } ]` – `openTicketCount` tính bằng `COUNT` phiếu `ASSIGNED` + `IN_PROGRESS`, không lưu. Danh sách rỗng → giao diện hiển thị *"Chưa có kỹ thuật viên khả dụng"* (UC03-2a).

---

## 4. Ngoài phạm vi

Không có API cho: gửi SMS (FR6 – WON'T), quản lý tài khoản nhân viên, sửa chữa / linh kiện / trả máy, xoá phiếu (BR6), sửa lịch sử trạng thái.
