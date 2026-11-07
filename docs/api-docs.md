# API Documentation – Smart CRM, Warranty Ticket Intake (flow L2)

Version **1.0.0** (Git tag `v1.0`) · Base URL `http://localhost:3000` · Format: JSON (UTF-8)

Every example below was copied from a real run against a freshly seeded database on 06/11/2026 (`npm run migrate && npm run seed`, then the calls in order). Tokens are shortened with `…`. User-facing messages are in Vietnamese because the system is used by Vietnamese staff; `code` is the stable value for programs.

## Conventions (apply to every endpoint)

| Topic | Rule |
|---|---|
| Authentication | `POST /api/auth/login` returns a JWT. Every other `/api/*` call needs `Authorization: Bearer <token>`. Missing token → `401 UNAUTHENTICATED`; invalid, expired or forged token → `401 INVALID_TOKEN`. The token expires after `TOKEN_EXPIRES_IN` (default 8 h). |
| Roles | `RECEPTIONIST` (Nhân viên tiếp nhận), `COORDINATOR` (Điều phối viên), `TECHNICIAN` (Kỹ thuật viên). Role checks run in the service layer (NFR4); calling an endpoint with the wrong role → `403 FORBIDDEN_ROLE`. |
| Error body | `{ "code": "TICKET_OPEN_EXISTS", "message": "…", "details": { … } }` – `details` only when useful. |
| System errors | `400 INVALID_JSON` (body is not valid JSON) · `404 NOT_FOUND` (unknown path) · `503 DB_UNAVAILABLE` (database unreachable) · `500 INTERNAL_ERROR` (unexpected; no stack trace or SQL is returned). |
| Time | All timestamps are ISO 8601 with Vietnam offset `+07:00`. Dates (`warrantyEndDate`) are `YYYY-MM-DD`. |
| Ticket status | `NEW` → `CLASSIFIED` → `ASSIGNED` → `IN_PROGRESS`; `REJECTED` only from `NEW` (BR6). |

Seed accounts (development only, shared password `Matkhau@123`): `tn1` RECEPTIONIST, `dp1` COORDINATOR, `kt1`, `kt2` TECHNICIAN, `kt3` TECHNICIAN (locked).

## Endpoint index

| ID | Method & path | Roles |
|---|---|---|
| H | `GET /health` | public |
| A1 | `POST /api/auth/login` | public |
| C1 | `GET /api/customers?phone=` | RECEPTIONIST |
| C2 | `POST /api/customers` | RECEPTIONIST |
| S1a–d | `GET /api/customers`, `GET/PUT/DELETE /api/customers/{id}` | read: RECEPTIONIST, COORDINATOR · write: RECEPTIONIST |
| D1 | `GET /api/devices?imei=` | RECEPTIONIST |
| S2a–e | `GET /api/devices`, `POST /api/devices`, `GET/PUT/DELETE /api/devices/{id}` | read: RECEPTIONIST, COORDINATOR · write: RECEPTIONIST |
| T1 | `POST /api/tickets` | RECEPTIONIST |
| T2 | `GET /api/tickets` | all three roles (TECHNICIAN sees own tickets only) |
| T3 | `GET /api/tickets/{ticketCode}` | all three roles (TECHNICIAN: own tickets only) |
| T4 | `POST /api/tickets/{ticketCode}/classify` | COORDINATOR |
| T5 | `POST /api/tickets/{ticketCode}/reject` | COORDINATOR |
| T6 | `POST /api/tickets/{ticketCode}/assign` | COORDINATOR |
| T7 | `POST /api/tickets/{ticketCode}/start` | TECHNICIAN (assigned one) |
| T8 | `GET /api/tickets/{ticketCode}/history` | all three roles (TECHNICIAN: own tickets only) |
| L1 | `GET /api/issue-categories` | COORDINATOR |
| L2 | `GET /api/technicians` | COORDINATOR |

Each endpoint below lists seven items: **(1) method & path · (2) business purpose · (3) authentication · (4) parameters & body · (5) success response · (6) error codes · (7) limitations** – followed by a real example.

---

## H. Health check

1. `GET /health`
2. Used by Docker healthcheck and operators: "ok" only when the app **and** the database answer.
3. None.
4. None.
5. `200 { "status": "ok", "db": "up" }`
6. `503 { "status": "error", "db": "down" }` when the database is unreachable.
7. Does not check disk space or other services.

```http
GET /health
→ 200
{"status":"ok","db":"up"}
```

## A1. Log in

1. `POST /api/auth/login`
2. Staff sign in to get a token for all other calls.
3. None.
4. Body `{ "username": string, "password": string }` – both required.
5. `200 { "token": string, "staff": { "id", "fullName", "role" } }`
6. `400 CREDENTIALS_REQUIRED` · `401 INVALID_CREDENTIALS` (wrong username or password – same message for both, so usernames cannot be probed) · `403 STAFF_INACTIVE` (account locked).
7. No rate limiting or lockout after repeated failures (see `docs/checklist-bao-mat.md`). Token cannot be revoked before it expires, but a locked account is rejected on the next call because the token is re-checked against the database.

```http
POST /api/auth/login
{"username":"tn1","password":"Matkhau@123"}
→ 200
{"token":"eyJhbGciOiJIUzI1NiIs…","staff":{"id":1,"fullName":"Lê Thu","role":"RECEPTIONIST"}}

POST /api/auth/login
{"username":"tn1","password":"sai-mat-khau"}
→ 401
{"code":"INVALID_CREDENTIALS","message":"Sai tên đăng nhập hoặc mật khẩu"}

GET /api/tickets            (no Authorization header)
→ 401
{"code":"UNAUTHENTICATED","message":"Vui lòng đăng nhập"}
```

---

## C1. Find customer by phone

1. `GET /api/customers?phone={phone}`
2. Step 1 of ticket intake (UC07): find the customer who brings the device.
3. Bearer · RECEPTIONIST.
4. Query `phone` – exactly 10 digits.
5. `200 { "id", "fullName", "phone" }`
6. `400 INVALID_PHONE` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND`.
7. Exact match only. Without `phone`, the same path lists customers (S1a).

```http
GET /api/customers?phone=0901234567
→ 200
{"id":1,"fullName":"Nguyễn Văn A","phone":"0901234567"}

GET /api/customers?phone=0900000000
→ 404
{"code":"CUSTOMER_NOT_FOUND","message":"Chưa có khách hàng với số điện thoại này"}
```

## C2. Create customer

1. `POST /api/customers`
2. Register a new customer during intake when C1 finds none.
3. Bearer · RECEPTIONIST.
4. Body `{ "fullName": string (1–100 chars, trimmed), "phone": string (10 digits) }`.
5. `201 { "id", "fullName", "phone" }`
6. `400 FULL_NAME_REQUIRED | FULL_NAME_TOO_LONG | INVALID_PHONE` · `403 FORBIDDEN_ROLE` · `409 PHONE_EXISTS`.
7. Phone must be unique; no email or address fields.

```http
POST /api/customers
{"fullName":"Phạm Thị D","phone":"0933444555"}
→ 201
{"id":4,"fullName":"Phạm Thị D","phone":"0933444555"}

POST /api/customers            (same phone again)
→ 409
{"code":"PHONE_EXISTS","message":"Số điện thoại đã thuộc về một khách hàng khác"}
```

## S1a. List customers

1. `GET /api/customers` (no `phone` parameter)
2. Customer management screen M4.
3. Bearer · RECEPTIONIST or COORDINATOR.
4. Query `q` (optional; substring of the name, case-insensitive, or of the phone), `limit` 1–200 (default 50), `offset` ≥ 0 (default 0).
5. `200` array of `{ "id", "fullName", "phone", "deviceCount" }`, ordered by `id`.
6. `400 INVALID_PAGING` · `403 FORBIDDEN_ROLE`.
7. No total count in the response; page with `limit`/`offset`.

```http
GET /api/customers?q=Nguy&limit=10&offset=0
→ 200
[{"id":1,"fullName":"Nguyễn Văn A","phone":"0901234567","deviceCount":1}]
```

## S1b. Get customer

1. `GET /api/customers/{id}`
2. Open one customer in M4.
3. Bearer · RECEPTIONIST or COORDINATOR.
4. Path `id` – positive integer.
5. `200 { "id", "fullName", "phone" }`
6. `400 INVALID_CUSTOMER_ID` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND`.
7. Does not embed the customer's devices (use S2a with `customerId`).

```http
GET /api/customers/4
→ 200
{"id":4,"fullName":"Phạm Thị D","phone":"0933444555"}
```

## S1c. Update customer

1. `PUT /api/customers/{id}`
2. Correct a customer's name or phone.
3. Bearer · RECEPTIONIST.
4. Path `id`; body `{ "fullName", "phone" }` – both required (full replacement).
5. `200 { "id", "fullName", "phone" }`
6. `400 INVALID_CUSTOMER_ID | FULL_NAME_REQUIRED | FULL_NAME_TOO_LONG | INVALID_PHONE` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND` · `409 PHONE_EXISTS`.
7. No partial update (`PATCH`); no edit history.

```http
PUT /api/customers/4
{"fullName":"Phạm Thị Dung","phone":"0933444555"}
→ 200
{"id":4,"fullName":"Phạm Thị Dung","phone":"0933444555"}
```

## S1d. Delete customer

1. `DELETE /api/customers/{id}`
2. Remove a customer entered by mistake.
3. Bearer · RECEPTIONIST.
4. Path `id`.
5. `204` (no body).
6. `400 INVALID_CUSTOMER_ID` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND` · `409 CUSTOMER_HAS_DEVICES`.
7. A customer who still owns devices cannot be deleted; delete the devices first (which is blocked once they have tickets).

```http
DELETE /api/customers/4        (customer still has a device)
→ 409
{"code":"CUSTOMER_HAS_DEVICES","message":"Khách hàng còn thiết bị, hãy xoá hoặc chuyển thiết bị trước"}

DELETE /api/customers/4        (after deleting the device)
→ 204
```

---

## D1. Find device by IMEI

1. `GET /api/devices?imei={imei}`
2. Step 5 of intake (UC01): check the device, its warranty (BR3) and whether it already has an open ticket (BR2).
3. Bearer · RECEPTIONIST.
4. Query `imei` – exactly 15 digits.
5. `200 { "id", "customerId", "imei", "model", "warrantyEndDate", "outOfWarranty", "openTicketCode" }` – `outOfWarranty` is computed (not stored); `openTicketCode` is not `null` when BR2 would block a new ticket.
6. `400 INVALID_IMEI` · `403 FORBIDDEN_ROLE` · `404 DEVICE_NOT_FOUND`.
7. Without `imei`, the same path lists devices (S2a).

```http
GET /api/devices?imei=356789012345678
→ 200
{"id":1,"customerId":1,"imei":"356789012345678","model":"Galaxy A55","warrantyEndDate":"2027-03-15","outOfWarranty":false,"openTicketCode":null}

GET /api/devices?imei=000000000000000
→ 404
{"code":"DEVICE_NOT_FOUND","message":"Chưa có thiết bị với IMEI này"}
```

## S2a. List devices

1. `GET /api/devices` (no `imei` parameter)
2. Device list in M4, optionally for one customer.
3. Bearer · RECEPTIONIST or COORDINATOR.
4. Query `customerId` (optional), `limit` 1–200 (default 50), `offset` ≥ 0.
5. `200` array of `{ "id", "customerId", "imei", "model", "warrantyEndDate" }`, ordered by `id`.
6. `400 INVALID_CUSTOMER_ID | INVALID_PAGING` · `403 FORBIDDEN_ROLE`.
7. No total count; no `outOfWarranty` flag in the list (use D1).

```http
GET /api/devices?customerId=1&limit=10
→ 200
[{"id":1,"customerId":1,"imei":"356789012345678","model":"Galaxy A55","warrantyEndDate":"2027-03-15"}]
```

## S2b. Create device

1. `POST /api/devices`
2. Register a device for an existing customer outside the intake flow.
3. Bearer · RECEPTIONIST.
4. Body `{ "customerId": int, "imei": 15 digits, "model": 1–100 chars, "warrantyEndDate": "YYYY-MM-DD" (a real calendar date) }`.
5. `201 { "id", "customerId", "imei", "model", "warrantyEndDate" }`
6. `400 INVALID_CUSTOMER_ID | INVALID_IMEI | MODEL_REQUIRED | MODEL_TOO_LONG | INVALID_WARRANTY_DATE` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND` · `409 IMEI_EXISTS`.
7. IMEI is globally unique and cannot be changed later.

```http
POST /api/devices
{"customerId":4,"imei":"352000111222333","model":"Galaxy S24","warrantyEndDate":"2027-12-31"}
→ 201
{"id":4,"customerId":4,"imei":"352000111222333","model":"Galaxy S24","warrantyEndDate":"2027-12-31"}

POST /api/devices
{"customerId":4,"imei":"352000111222334","model":"Galaxy S24","warrantyEndDate":"2027-02-30"}
→ 400
{"code":"INVALID_WARRANTY_DATE","message":"Ngày hết hạn bảo hành phải có dạng YYYY-MM-DD"}
```

## S2c. Get device

1. `GET /api/devices/{id}`
2. Open one device in M4.
3. Bearer · RECEPTIONIST or COORDINATOR.
4. Path `id`.
5. `200 { "id", "customerId", "imei", "model", "warrantyEndDate" }`
6. `400 INVALID_DEVICE_ID` · `403 FORBIDDEN_ROLE` · `404 DEVICE_NOT_FOUND`.
7. Ticket list of the device is not included.

```http
GET /api/devices/4
→ 200
{"id":4,"customerId":4,"imei":"352000111222333","model":"Galaxy S24","warrantyEndDate":"2027-12-31"}
```

## S2d. Update device

1. `PUT /api/devices/{id}`
2. Correct model or warranty end date.
3. Bearer · RECEPTIONIST.
4. Path `id`; body `{ "model", "warrantyEndDate" }` – both required.
5. `200 { "id", "customerId", "imei", "model", "warrantyEndDate" }`
6. `400 INVALID_DEVICE_ID | MODEL_REQUIRED | MODEL_TOO_LONG | INVALID_WARRANTY_DATE` · `403 FORBIDDEN_ROLE` · `404 DEVICE_NOT_FOUND`.
7. `imei` and `customerId` cannot be changed. Changing the warranty date changes `outOfWarranty` of existing tickets, because it is computed on read.

```http
PUT /api/devices/4
{"model":"Galaxy S24 Ultra","warrantyEndDate":"2028-01-31"}
→ 200
{"id":4,"customerId":4,"imei":"352000111222333","model":"Galaxy S24 Ultra","warrantyEndDate":"2028-01-31"}
```

## S2e. Delete device

1. `DELETE /api/devices/{id}`
2. Remove a device entered by mistake.
3. Bearer · RECEPTIONIST.
4. Path `id`.
5. `204` (no body).
6. `400 INVALID_DEVICE_ID` · `403 FORBIDDEN_ROLE` · `404 DEVICE_NOT_FOUND` · `409 DEVICE_HAS_TICKETS`.
7. A device with any ticket (open or closed) is never deleted, to keep ticket history (BR6).

```http
DELETE /api/devices/1          (device has a ticket)
→ 409
{"code":"DEVICE_HAS_TICKETS","message":"Thiết bị đã có phiếu bảo hành nên không xoá được (BR6: giữ lịch sử)"}

DELETE /api/devices/4
→ 204
```

---

## T1. Create warranty ticket

1. `POST /api/tickets`
2. Core of the flow (UC01, FR1): receive a device and open a ticket in status `NEW`. If the IMEI is new, the device is registered in the same transaction.
3. Bearer · RECEPTIONIST.
4. Body `{ "customerId": int, "imei": 15 digits, "issueDescription": non-blank string, "model"?: 1–100 chars, "warrantyEndDate"?: "YYYY-MM-DD" }` – `model` and `warrantyEndDate` are required only when the IMEI is not registered yet.
5. `201 { "ticketCode": "BH-YYYY-NNNNNN", "status": "NEW", "outOfWarranty": bool, "createdAt" }` and one history row `null → NEW` (NFR5).
6. `400 CUSTOMER_ID_REQUIRED | INVALID_IMEI | ISSUE_DESCRIPTION_REQUIRED | MODEL_REQUIRED | MODEL_TOO_LONG | WARRANTY_END_DATE_REQUIRED` · `403 FORBIDDEN_ROLE` · `404 CUSTOMER_NOT_FOUND` · `409 DEVICE_OWNER_MISMATCH` (BR1: IMEI belongs to another customer) · `409 TICKET_OPEN_EXISTS` (BR2, with `details.openTicketCode`).
7. An out-of-warranty device still gets a ticket (flag `outOfWarranty: true`); there is no paid-repair quote in this flow. Ticket codes restart each calendar year (Vietnam time).

```http
POST /api/tickets
{"customerId":1,"imei":"356789012345678","issueDescription":"Màn hình nhấp nháy, cảm ứng không nhận"}
→ 201
{"ticketCode":"BH-2026-000001","status":"NEW","outOfWarranty":false,"createdAt":"2026-11-06T15:34:33+07:00"}

POST /api/tickets              (new IMEI, warranty already ended)
{"customerId":3,"imei":"351234567890999","model":"Redmi Note 13","warrantyEndDate":"2026-10-31","issueDescription":"Không sạc được pin"}
→ 201
{"ticketCode":"BH-2026-000002","status":"NEW","outOfWarranty":true,"createdAt":"2026-11-06T15:34:33+07:00"}

POST /api/tickets              (same device again)
{"customerId":1,"imei":"356789012345678","issueDescription":"Lỗi khác"}
→ 409
{"code":"TICKET_OPEN_EXISTS","message":"Thiết bị đang có phiếu BH-2026-000001 chưa đóng","details":{"openTicketCode":"BH-2026-000001"}}

POST /api/tickets              (as dp1 – COORDINATOR)
→ 403
{"code":"FORBIDDEN_ROLE","message":"Chỉ Nhân viên tiếp nhận được tạo phiếu bảo hành"}
```

## T2. List tickets

1. `GET /api/tickets`
2. Ticket queue screen M2 (UC04, FR4): filter, search and page through tickets; flag overdue ones.
3. Bearer · RECEPTIONIST, COORDINATOR, TECHNICIAN. A TECHNICIAN only receives tickets assigned to them.
4. Query (all optional): `status` (`NEW|CLASSIFIED|ASSIGNED|IN_PROGRESS|REJECTED`), `priority` (`HIGH|MEDIUM|LOW`), `dueFrom`, `dueTo` (`YYYY-MM-DD` read in Vietnam time – `dueFrom` from 00:00, `dueTo` until 23:59:59 – or ISO 8601 **with** offset), `q` (exact ticket code or customer phone), `page` ≥ 1 (default 1), `size` 1–100 (default 20).
5. `200 { "page", "size", "total", "items": [ { "ticketCode", "customerName", "customerPhone", "model", "status", "priority", "dueDate", "overdue", "technicianName" } ] }`, ordered by due date (empty last), then creation time.
6. `400 INVALID_PAGE | INVALID_FILTER` · `403 FORBIDDEN_ROLE`.
7. `q` is exact match, not partial search. `overdue` is computed at query time and is never stored.

```http
GET /api/tickets?status=NEW&page=1&size=20
→ 200
{"page":1,"size":20,"total":2,"items":[
 {"ticketCode":"BH-2026-000001","customerName":"Nguyễn Văn A","customerPhone":"0901234567","model":"Galaxy A55","status":"NEW","priority":null,"dueDate":null,"overdue":false,"technicianName":null},
 {"ticketCode":"BH-2026-000002","customerName":"Lê Văn C","customerPhone":"0987654321","model":"Redmi Note 13","status":"NEW","priority":null,"dueDate":null,"overdue":false,"technicianName":null}]}

GET /api/tickets?dueFrom=1
→ 400
{"code":"INVALID_FILTER","message":"dueFrom phải là ngày YYYY-MM-DD hoặc thời gian ISO 8601 có múi giờ (ví dụ 2026-11-07T08:00:00+07:00)"}
```

## T3. Get ticket detail

1. `GET /api/tickets/{ticketCode}`
2. Ticket detail screen M3.
3. Bearer · all three roles; a TECHNICIAN only for tickets assigned to them (OWASP A01).
4. Path `ticketCode`, e.g. `BH-2026-000001`.
5. `200 { "ticketCode", "status", "priority", "dueDate", "issueCategory", "issueDescription", "outOfWarranty", "customer", "device", "technician", "createdBy", "createdAt" }`
6. `403 FORBIDDEN_ROLE` · `404 TICKET_NOT_FOUND`.
7. Status history is a separate call (T8).

```http
GET /api/tickets/BH-2026-000001
→ 200
{"ticketCode":"BH-2026-000001","status":"NEW","priority":null,"dueDate":null,"issueCategory":null,"issueDescription":"Màn hình nhấp nháy, cảm ứng không nhận","outOfWarranty":false,"customer":{"fullName":"Nguyễn Văn A","phone":"0901234567"},"device":{"imei":"356789012345678","model":"Galaxy A55","warrantyEndDate":"2027-03-15"},"technician":null,"createdBy":{"fullName":"Lê Thu"},"createdAt":"2026-11-06T15:34:33+07:00"}

GET /api/tickets/BH-2026-999999
→ 404
{"code":"TICKET_NOT_FOUND","message":"Không tìm thấy phiếu bảo hành"}
```

## T4. Classify ticket

1. `POST /api/tickets/{ticketCode}/classify`
2. UC02, FR2: the coordinator picks an issue category and a priority; the due date is computed by BR4 (HIGH + 24 h, MEDIUM + 72 h, LOW + 120 h, calendar hours).
3. Bearer · COORDINATOR.
4. Body `{ "issueCategoryId": int (active category from L1), "priority": "HIGH"|"MEDIUM"|"LOW" }`.
5. `200 { "ticketCode", "status": "CLASSIFIED", "dueDate" }`; status, category, priority, due date and one history row are written in one transaction.
6. `400 ISSUE_CATEGORY_REQUIRED | ISSUE_CATEGORY_INVALID | INVALID_PRIORITY` · `403 FORBIDDEN_ROLE` · `404 TICKET_NOT_FOUND` · `409 INVALID_STATUS` (ticket is not `NEW`) · `409 DATA_CHANGED` (changed by someone else at the same time).
7. A classification cannot be changed afterwards (BR6, no going back).

```http
POST /api/tickets/BH-2026-000001/classify
{"issueCategoryId":1,"priority":"HIGH"}
→ 200
{"ticketCode":"BH-2026-000001","status":"CLASSIFIED","dueDate":"2026-11-07T15:34:33+07:00"}

POST /api/tickets/BH-2026-000001/classify
{"issueCategoryId":1,"priority":"URGENT"}
→ 400
{"code":"INVALID_PRIORITY","message":"Mức ưu tiên phải là HIGH, MEDIUM hoặc LOW"}

POST /api/tickets/BH-2026-000001/classify      (already CLASSIFIED)
→ 409
{"code":"INVALID_STATUS","message":"Chỉ phân loại hoặc từ chối phiếu đang ở trạng thái Mới"}
```

## T5. Reject ticket

1. `POST /api/tickets/{ticketCode}/reject`
2. UC02 alternative: the coordinator refuses a ticket that is not eligible; the reason is stored in history.
3. Bearer · COORDINATOR.
4. Body `{ "reason": non-blank string }`.
5. `200 { "ticketCode", "status": "REJECTED" }`
6. `400 REJECT_REASON_REQUIRED` · `403 FORBIDDEN_ROLE` · `404 TICKET_NOT_FOUND` · `409 INVALID_STATUS` (only from `NEW`, BR6) · `409 DATA_CHANGED`.
7. A rejected ticket is closed; the device can get a new ticket (BR2).

```http
POST /api/tickets/BH-2026-000003/reject
{"reason":""}
→ 400
{"code":"REJECT_REASON_REQUIRED","message":"Vui lòng nhập lý do từ chối"}

POST /api/tickets/BH-2026-000003/reject
{"reason":"Máy rơi vỡ – không thuộc điều kiện bảo hành"}
→ 200
{"ticketCode":"BH-2026-000003","status":"REJECTED"}
```

## T6. Assign technician

1. `POST /api/tickets/{ticketCode}/assign`
2. UC03, FR3: give a classified ticket to an active technician (BR5).
3. Bearer · COORDINATOR.
4. Body `{ "technicianId": int }` – an id from L2.
5. `200 { "ticketCode", "status": "ASSIGNED", "technician": { "id", "fullName" } }`
6. `400 TECHNICIAN_REQUIRED` · `403 FORBIDDEN_ROLE` · `404 TICKET_NOT_FOUND` · `409 TICKET_NOT_CLASSIFIED` (still `NEW`) · `409 DATA_CHANGED` (ticket already moved on, or technician locked / not a technician).
7. No re-assignment once `ASSIGNED`; no workload limit per technician.

```http
POST /api/tickets/BH-2026-000001/assign
{"technicianId":5}             (kt3 – locked)
→ 409
{"code":"DATA_CHANGED","message":"Kỹ thuật viên không còn khả dụng, vui lòng tải lại"}

POST /api/tickets/BH-2026-000001/assign
{"technicianId":4}
→ 200
{"ticketCode":"BH-2026-000001","status":"ASSIGNED","technician":{"id":4,"fullName":"Võ Lan"}}
```

## T7. Technician starts work

1. `POST /api/tickets/{ticketCode}/start`
2. UC05: the assigned technician accepts the ticket (`ASSIGNED` → `IN_PROGRESS`).
3. Bearer · TECHNICIAN, and only the one assigned to the ticket.
4. No body.
5. `200 { "ticketCode", "status": "IN_PROGRESS" }`
6. `403 FORBIDDEN_ROLE` (other role or another technician's ticket) · `404 TICKET_NOT_FOUND` · `409 INVALID_STATUS` · `409 DATA_CHANGED`.
7. Repair, parts and closing a ticket are outside flow L2.

```http
POST /api/tickets/BH-2026-000001/start         (as kt1 – not assigned)
→ 403
{"code":"FORBIDDEN_ROLE","message":"Phiếu này không được phân công cho bạn"}

POST /api/tickets/BH-2026-000001/start         (as kt2)
→ 200
{"ticketCode":"BH-2026-000001","status":"IN_PROGRESS"}
```

## T8. Status history

1. `GET /api/tickets/{ticketCode}/history`
2. UC06, FR5: show who changed the status and when, oldest first.
3. Bearer · all three roles; a TECHNICIAN only for own tickets.
4. Path `ticketCode`.
5. `200` array of `{ "changedAt", "fromStatus", "toStatus", "changedBy", "note" }` (`note` holds the reject reason).
6. `403 FORBIDDEN_ROLE` · `404 TICKET_NOT_FOUND`.
7. Read-only; history rows are never edited or deleted.

```http
GET /api/tickets/BH-2026-000001/history        (as kt2)
→ 200
[{"changedAt":"2026-11-06T15:34:33+07:00","fromStatus":null,"toStatus":"NEW","changedBy":"Lê Thu","note":null},
 {"changedAt":"2026-11-06T15:34:33+07:00","fromStatus":"NEW","toStatus":"CLASSIFIED","changedBy":"Trần Minh","note":null},
 {"changedAt":"2026-11-06T15:34:33+07:00","fromStatus":"CLASSIFIED","toStatus":"ASSIGNED","changedBy":"Trần Minh","note":null},
 {"changedAt":"2026-11-06T15:34:33+07:00","fromStatus":"ASSIGNED","toStatus":"IN_PROGRESS","changedBy":"Võ Lan","note":null}]
```

---

## L1. Issue categories

1. `GET /api/issue-categories`
2. Fill the category drop-down when classifying (T4).
3. Bearer · COORDINATOR.
4. None.
5. `200` array of `{ "id", "code", "name" }` – active categories only.
6. `403 FORBIDDEN_ROLE`.
7. Categories are managed by `npm run seed` only; there is no API to add or disable them.

```http
GET /api/issue-categories
→ 200
[{"id":1,"code":"SCREEN","name":"Màn hình"},{"id":2,"code":"BATTERY","name":"Pin"},{"id":3,"code":"POWER","name":"Nguồn"},{"id":4,"code":"CHARGING","name":"Sạc"},{"id":5,"code":"SOFTWARE","name":"Phần mềm"},{"id":6,"code":"WATER","name":"Vào nước"},{"id":7,"code":"OTHER","name":"Khác"}]
```

## L2. Active technicians

1. `GET /api/technicians`
2. Fill the technician drop-down when assigning (T6), with current workload.
3. Bearer · COORDINATOR.
4. None.
5. `200` array of `{ "id", "fullName", "openTicketCount" }`, least busy first; locked accounts are excluded (BR5).
6. `403 FORBIDDEN_ROLE`.
7. `openTicketCount` counts `ASSIGNED` and `IN_PROGRESS` tickets; there is no skill matching.

```http
GET /api/technicians
→ 200
[{"id":3,"fullName":"Phạm Huy","openTicketCount":0},{"id":4,"fullName":"Võ Lan","openTicketCount":0}]
```
