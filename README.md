# Smart CRM · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Đồ án học phần **Chuyên đề tốt nghiệp 1**, Trường Đại học Văn Lang, Khoa Công nghệ Thông tin, Học kỳ 1 năm học 2026 – 2027.

**GitHub repo:** https://github.com/Tolexengnaa/237480201is11-warranty-app

---

## 1. Giới thiệu đề tài

| Mục | Nội dung |
|---|---|
| Case study | Smart CRM – Mekong Mobile |
| Luồng nghiệp vụ | **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** |
| Track | **SE** (Software Engineering) |
| Sinh viên | MINGBOUPPHA XAYKHAM – MSSV 237480201is11 |
| Lớp | 261_71ITGR40203_03 |
| Giảng viên | Nguyễn Minh Tân |

Mekong Mobile tiếp nhận yêu cầu bảo hành thiết bị tại cửa hàng nhưng còn ghi chép thủ công, nên khó biết phiếu nào đang chờ, phiếu nào trễ hạn và ai đang xử lý. Dự án số hoá đoạn từ lúc khách mang thiết bị đến cửa hàng cho tới khi **phiếu bảo hành** được phân loại, đặt **mức ưu tiên** và giao cho **kỹ thuật viên**.

## 2. Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 20 trở lên (đã chạy với 22 LTS và 24) | kèm npm 10 |
| PostgreSQL | 16 | máy cục bộ, cần quyền tạo database |
| bash + curl | bất kỳ | chạy `scripts/demo-api.sh` (trên Windows dùng Git Bash); có thể thay bằng Postman |

**Biến môi trường:** chép `.env.example` thành `.env` ở thư mục gốc rồi điền giá trị. **Không commit `.env`.**

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | địa chỉ CSDL | `localhost`, `5432`, `smartcrm` |
| `DB_USER`, `DB_PASSWORD` | tài khoản PostgreSQL | `smartcrm`, mật khẩu của bạn |
| `APP_PORT` | cổng chạy API và giao diện | `3000` |
| `SECRET_KEY` | khoá ký token đăng nhập | chuỗi ngẫu nhiên dài |
| `TOKEN_EXPIRES_IN` | thời hạn token | `8h` |

## 3. Cài đặt và chạy

Mọi lệnh chạy ở **thư mục gốc** của repo.

```bash
# 1. Cài thư viện
npm install

# 2. Tạo CSDL (một lần) – đổi mật khẩu theo máy của bạn
psql -U postgres -c "CREATE USER smartcrm WITH PASSWORD 'smartcrm_dev';"
psql -U postgres -c "CREATE DATABASE smartcrm OWNER smartcrm;"
cp .env.example .env          # điền DB_USER, DB_PASSWORD, SECRET_KEY

# 3. Tạo bảng và nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi)
npm run migrate
npm run seed

# 4. Chạy ứng dụng – API và giao diện cùng ở http://localhost:3000
npm start

# 5. (terminal khác) Gọi thử toàn bộ endpoint
bash scripts/demo-api.sh
```

**Các lệnh npm**

| Lệnh | Tác dụng |
|---|---|
| `npm start` | chạy server (`src/backend/server.js`) |
| `npm run dev` | chạy server, tự khởi động lại khi sửa mã |
| `npm run migrate` | chạy các file trong `db/migrations/` chưa được áp dụng |
| `npm run seed` | nạp danh mục lỗi, nhân viên, khách hàng, thiết bị mẫu |
| `npm test` | unit test lớp nghiệp vụ (`tests/*.unit.test.js`), không cần CSDL |
| `npm run test:db` | test với CSDL thật (`tests/*.db.test.js`), cần chạy `migrate` trước |

**Tài khoản mẫu** (mật khẩu chung `Matkhau@123`, chỉ dùng ở máy phát triển):

| Tài khoản | Vai trò |
|---|---|
| `tn1` | Nhân viên tiếp nhận |
| `dp1` | Điều phối viên |
| `kt1`, `kt2` | Kỹ thuật viên |
| `kt3` | Kỹ thuật viên đã bị khoá |

**Lỗi thường gặp**

| Thông báo | Nguyên nhân | Cách xử lý |
|---|---|---|
| `EADDRINUSE: address already in use :::3000` | đã có một server khác (thường là `npm start` ở terminal khác) đang dùng cổng 3000 | dừng server cũ bằng `Ctrl+C`, hoặc đổi `APP_PORT` trong `.env` |
| `Thiếu biến môi trường ...` | chưa tạo `.env` hoặc thiếu biến | chép `.env.example` thành `.env` và điền đủ |
| `password authentication failed` | sai `DB_USER` / `DB_PASSWORD` | kiểm tra lại tài khoản PostgreSQL ở bước 2 |

## 4. Phạm vi

**Trong phạm vi**

| Mã | Chức năng | MoSCoW |
|---|---|---|
| FR1 | Tạo phiếu bảo hành từ số điện thoại khách hàng và IMEI thiết bị | MUST |
| FR2 | Phân loại theo danh mục lỗi, đặt mức ưu tiên (hoặc Từ chối kèm lý do) | MUST |
| FR3 | Phân công kỹ thuật viên | MUST |
| FR4 | Tra cứu danh sách phiếu: lọc, tìm, phân trang | SHOULD |
| FR5 | Cập nhật trạng thái và lưu lịch sử trạng thái | SHOULD |

**Ngoài phạm vi (WON'T):** gửi SMS cho khách hàng (FR6); sửa chữa, linh kiện, trả máy; tính phí; khách tự tạo phiếu trực tuyến; báo cáo thống kê.

**Vai trò:** Nhân viên tiếp nhận · Điều phối viên · Kỹ thuật viên.

## 5. Công nghệ và cấu trúc mã nguồn

Ứng dụng web nguyên khối 4 lớp, REST/JSON:

- **Backend:** Node.js + Express 4; PostgreSQL 16 qua thư viện `pg` (SQL tham số hoá, không dùng ORM); `jsonwebtoken` cho token đăng nhập; `bcryptjs` để băm mật khẩu. Lý do chọn: TD-05.
- **Frontend:** HTML + JavaScript thuần (ES modules), không cần bước build; Express phục vụ cùng cổng với API nên không phát sinh CORS. Lý do chọn: TD-08.

Frontend chỉ giao tiếp với backend qua REST API (`src/frontend/api/client.js`), không import mã nào của backend (TD-12).

```
237480201is11-warranty-app/
├── src/
│   ├── frontend/                 # LỚP 1 – giao diện, chạy trên trình duyệt
│   │   ├── index.html, main.js, styles.css
│   │   ├── api/                  # client.js (nơi duy nhất gọi fetch), ticket.api.js
│   │   ├── components/           # DataState (đang tải · rỗng · lỗi), tiện ích DOM
│   │   └── pages/                # login, M1 tạo phiếu, M2 danh sách, M3 chi tiết
│   └── backend/                  # chạy trên Node.js
│       ├── app.js, server.js     # lắp ráp Express, khởi động server, phục vụ ../frontend
│       ├── config/               # đọc .env, connection pool + giao dịch
│       ├── middlewares/          # LỚP 2 – AuthMiddleware, xử lý lỗi
│       ├── controllers/          # LỚP 2 – CustomerController, TicketController
│       ├── services/             # LỚP 3 – quy tắc BR1–BR6, kiểm tra vai trò
│       ├── repositories/         # LỚP 4 – SQL tham số hoá
│       └── errors/               # mã lỗi theo API contract
├── db/
│   ├── migrations/               # migration chạy thật: 001, 002…
│   ├── schema.sql                # DDL PostgreSQL nộp ở BT1 (tài liệu)
│   └── schema_sqlserver.sql      # bản DDL tương đương cho SQL Server (tài liệu)
├── scripts/                      # migrate.js, seed.js, demo-api.sh
├── tests/                        # *.unit.test.js, *.db.test.js (node:test)
├── docs/                         # SRS, sơ đồ .drawio, API contract, nhật ký thay đổi
├── package.json
└── .env.example
```

**Ánh xạ với sơ đồ kiến trúc** (`docs/architecture.drawio`)

| Lớp trong sơ đồ | Thành phần | File |
|---|---|---|
| 1. Giao diện (Web UI) | M1, M2, M3 | `src/frontend/` |
| 2. API (Controller) | AuthMiddleware | `src/backend/middlewares/authMiddleware.js` |
| | CustomerController | `src/backend/controllers/customerController.js` |
| | TicketController | `src/backend/controllers/ticketController.js` |
| 3. Nghiệp vụ (Service) | TicketService · ClassifyService · AssignService · StatusService | `src/backend/services/*.js` (+ `authService.js` hỗ trợ đăng nhập) |
| 4. Truy cập dữ liệu (Repository) | Customer · Device · Ticket · IssueCategory · Staff · StatusLog | `src/backend/repositories/*.js` |
| CSDL PostgreSQL | 6 bảng | `db/migrations/001_init_schema.sql` (từ `db/schema.sql` BT1) |

**Endpoint đã hiện thực** (chi tiết: `docs/api-contract.md`)

| Nhóm | Endpoint |
|---|---|
| Đăng nhập | A1 `POST /api/auth/login` |
| Khách hàng, thiết bị | C1 `GET /api/customers` · C2 `POST /api/customers` · D1 `GET /api/devices` |
| Phiếu bảo hành | T1 tạo · T2 danh sách · T3 chi tiết · T4 phân loại · T5 từ chối · T6 phân công · T7 bắt đầu xử lý · T8 lịch sử |
| Danh mục | L1 `GET /api/issue-categories` · L2 `GET /api/technicians` |

Không có endpoint `PUT` / `DELETE` phiếu vì BR6: phiếu không bao giờ bị xoá, trạng thái chỉ đổi qua StatusService.

## 6. Trạng thái hiện tại (buổi 10 – 23/10/2026)

**Đã xong**

- [x] Khung `src/` theo sơ đồ kiến trúc 4 lớp, tách `src/frontend/` và `src/backend/` (TD-12)
- [x] Migration 001 tạo 6 bảng theo DDL BT1; seed dữ liệu mẫu
- [x] Tạo phiếu (T1), danh sách lọc + phân trang (T2), chi tiết (T3) – FR1, FR4
- [x] Phân loại, từ chối (T4, T5), phân công (T6), bắt đầu xử lý (T7), lịch sử trạng thái (T8) – FR2, FR3, FR5
- [x] API phụ trợ: đăng nhập (A1), khách hàng (C1, C2), thiết bị (D1), danh mục lỗi (L1), kỹ thuật viên (L2)
- [x] Kiểm tra vai trò ở lớp nghiệp vụ (NFR4); đổi trạng thái và ghi lịch sử trong cùng giao dịch (NFR5)
- [x] Giao diện 3 màn hình M1, M2, M3 gọi API thật, có ba trạng thái dữ liệu (đang tải · rỗng · lỗi)
- [x] 23 unit test (`npm test`) và 3 test BR2 với CSDL thật (`npm run test:db`)
- [x] Nhật ký điều chỉnh thiết kế theo phản hồi BT1 và hai sprint (TD-01 → TD-12)

**Còn lại**

- [ ] Docker – buổi 11
- [ ] Đo NFR1 với 10.000 phiếu – trước buổi 12
- [ ] Phân trang M2 dạng dãy số trang như wireframe (hiện rút gọn thành ‹ / ›, xem TD-09)

## 7. Tài liệu thiết kế

| Tài liệu | File |
|---|---|
| SRS rút gọn: Use Case, kiến trúc, mô hình dữ liệu, wireframe | `docs/srs.md` |
| Use Case Diagram | `docs/usecase.drawio` |
| Sơ đồ kiến trúc | `docs/architecture.drawio` |
| ERD | `docs/erd.drawio` |
| Wireframe | `docs/wireframe.png` |
| SQL DDL | `db/schema.sql` (chạy thật bằng `npm run migrate`, mục 3) |
| API contract | `docs/api-contract.md` |
| Nhật ký thay đổi thiết kế | `docs/thay-doi-thiet-ke.md` |
| Khai báo sử dụng AI | `docs/ai-disclosure.md` |

File `.md` xem trực tiếp trên GitHub. File `.drawio` mở bằng [draw.io](https://app.diagrams.net) (File → Open) hoặc extension *Draw.io Integration* trong VS Code.

**Nhật ký phiên bản**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 09/10/2026 | Nộp Bài tập 1 – Phân tích và Thiết kế |
| 1.1 | 19/10/2026 | Buổi 8 – Sprint 1: khung mã nguồn, migration, CRUD phiếu bảo hành `src/backend`|
| 1.2 | 23/10/2026 | Buổi 10 – Sprint 2: phân loại, phân công, lịch sử trạng thái, giao diện M1–M3; tách `src/frontend` |
