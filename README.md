# 237480201is11-warranty-app – Smart CRM · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Đồ án học phần **Chuyên đề tốt nghiệp 1** – Trường Đại học Văn Lang, Khoa Công nghệ Thông tin – Học kỳ 1, năm học 2026 – 2027.

---

## 1. Giới thiệu đề tài

| Mục | Nội dung |
|---|---|
| Case study | Smart CRM – Mekong Mobile |
| Luồng nghiệp vụ | **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** |
| Track | **SE** (Software Engineering) |
| Sinh viên | `MINGBOUPPHA XAYKHAM` – `237480201is11` – `261_71ITGR40203_03` |
| Giảng viên | `Nguyễn Minh Tân` |

Mekong Mobile tiếp nhận yêu cầu bảo hành thiết bị tại cửa hàng nhưng còn ghi chép thủ công, nên khó biết phiếu nào đang chờ, phiếu nào trễ hạn và ai đang xử lý. Dự án số hoá đoạn từ lúc khách mang thiết bị đến cửa hàng cho tới khi **phiếu bảo hành** được phân loại, đặt **mức ưu tiên** và giao cho **kỹ thuật viên**.

## 2. Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 20 LTS trở lên (đã chạy với 22.22) | kèm npm 10 |
| PostgreSQL | 16 | máy cục bộ; cần quyền tạo database |
| curl hoặc Postman | bất kỳ | gọi thử API (`scripts/demo-api.sh` dùng curl + bash) |

Biến môi trường: chép `.env.example` thành `.env` rồi điền giá trị. **Không commit `.env`.**

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | địa chỉ CSDL | `localhost`, `5432`, `smartcrm` |
| `DB_USER`, `DB_PASSWORD` | tài khoản PostgreSQL | `smartcrm`, mật khẩu của bạn |
| `APP_PORT` | cổng API | `3000` |
| `SECRET_KEY` | khoá ký token đăng nhập | chuỗi ngẫu nhiên dài |
| `TOKEN_EXPIRES_IN` | thời hạn token | `8h` |

## 3. Phạm vi

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

## 4. Công nghệ và cấu trúc mã nguồn

Ứng dụng web nguyên khối 4 lớp, REST/JSON: **Node.js + Express 4**, **PostgreSQL 16** qua thư viện `pg` (SQL tham số hoá, không dùng ORM), token đăng nhập `jsonwebtoken`, băm mật khẩu `bcryptjs`. Lý do chọn: `docs/thay-doi-thiet-ke.md` – TD-03.

Thư mục `src/` ánh xạ một–một với sơ đồ kiến trúc (`docs/architecture.drawio`):

| Lớp trong sơ đồ | Thành phần trong sơ đồ | File |
|---|---|---|
| 1. Giao diện (Web UI) | M1, M2, M3 | `src/ui/` (từ buổi 9) |
| 2. API (Controller) | AuthMiddleware | `src/middlewares/authMiddleware.js` |
| | CustomerController | `src/controllers/customerController.js` |
| | TicketController | `src/controllers/ticketController.js` |
| 3. Nghiệp vụ (Service) | TicketService · ClassifyService · AssignService · StatusService | `src/services/*.js` (+ `authService.js` hỗ trợ đăng nhập) |
| 4. Truy cập dữ liệu (Repository) | Customer · Device · Ticket · IssueCategory · Staff · StatusLog | `src/repositories/*.js` |
| CSDL PostgreSQL | 6 bảng | `db/migrations/001_init_schema.sql` (từ `db/schema.sql` BT1) |

```
237480201is11-warranty-app/
├── src/
│   ├── app.js, server.js     # lắp ráp Express, khởi động server
│   ├── config/               # đọc .env, connection pool + giao dịch
│   ├── ui/                   # LỚP 1 – giao diện (buổi 9)
│   ├── middlewares/          # LỚP 2 – AuthMiddleware, xử lý lỗi
│   ├── controllers/          # LỚP 2 – Customer/TicketController
│   ├── services/             # LỚP 3 – quy tắc BR1–BR6, kiểm tra vai trò
│   ├── repositories/         # LỚP 4 – SQL tham số hoá
│   └── errors/               # mã lỗi theo API contract
├── db/schema.sql             # DDL nộp ở BT1 (tài liệu)
├── db/migrations/            # migration chạy thật: 001, 002…
├── scripts/                  # migrate.js, seed.js, demo-api.sh
├── tests/                    # unit test lớp nghiệp vụ (node:test)
└── docs/                     # SRS, sơ đồ .drawio, API contract, nhật ký thay đổi, ảnh kết quả
```

## 5. Cài đặt và chạy

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

# 4. Chạy API tại http://localhost:3000
npm start

# 5. Gọi thử toàn bộ endpoint (terminal khác) và chạy unit test
bash scripts/demo-api.sh
npm test
```

Tài khoản mẫu (mật khẩu chung `Matkhau@123`, chỉ dùng ở máy phát triển): `tn1` Nhân viên tiếp nhận · `dp1` Điều phối viên · `kt1`, `kt2` Kỹ thuật viên · `kt3` Kỹ thuật viên đã khoá.

## 6. Trạng thái hiện tại (buổi 8 – 19/10/2026)

- [x] Ghi nhật ký điều chỉnh thiết kế `docs/thay-doi-thiet-ke.md` (TD-03 → TD-05)
- [ ] Điền phản hồi của GV về BT1 vào TD-01, TD-02 và cập nhật `.drawio` / `srs.md` cho khớp
- [x] Khung `src/` theo sơ đồ kiến trúc 4 lớp
- [x] Migration 001 tạo 6 bảng theo DDL BT1; seed danh mục lỗi, nhân viên, khách hàng, thiết bị mẫu
- [x] CRUD phiếu bảo hành qua controller → service → repository: tạo (T1), danh sách lọc + phân trang (T2), chi tiết (T3)
- [x] API phụ trợ: đăng nhập (A1), khách hàng (C1, C2), thiết bị (D1), danh mục lỗi (L1), kỹ thuật viên (L2)
- [x] Kiểm tra vai trò ở lớp nghiệp vụ (NFR4); tạo phiếu ghi lịch sử `null → NEW` cùng giao dịch (NFR5)
- [x] 8 unit test lớp nghiệp vụ (`npm test`) – FR1, BR1, BR2, BR3, BR6, NFR4
- [x] Kết quả gọi thử API: `docs/ket-qua/buoi08-api.png`, `docs/ket-qua/buoi08-api.txt`
- [ ] Phân loại / từ chối (T4, T5 – FR2, BR4) – Sprint 2
- [ ] Phân công, nhận phiếu, lịch sử (T6, T7, T8 – FR3, FR5) – Sprint 2
- [ ] Giao diện M1, M2, M3 – từ buổi 9
- [ ] Đo NFR1 với 10.000 phiếu – trước buổi 12
- Ghi chú: endpoint `PUT`/`DELETE` phiếu không có vì BR6 (phiếu không bao giờ bị xoá; trạng thái chỉ đổi qua StatusService).

## 7. Tài liệu thiết kế

| Tài liệu | File | Cách mở |
|---|---|---|
| SRS rút gọn, Use Case, kiến trúc, mô hình dữ liệu, wireframe | `docs/srs.md` | Xem trực tiếp trên GitHub |
| Use Case Diagram | `docs/usecase.drawio` | Mở bằng [draw.io](https://app.diagrams.net) (File → Open) hoặc extension *Draw.io Integration* trong VS Code |
| Sơ đồ kiến trúc | `docs/architecture.drawio` | như trên |
| ERD | `docs/erd.drawio` | như trên |
| Wireframe | `docs/wireframe.drawio`, `docs/wireframe.png` | như trên |
| SQL DDL | `db/schema.sql` | Bản nộp BT1; chạy thật bằng `npm run migrate` (mục 5) |
| Nhật ký thay đổi thiết kế | `docs/thay-doi-thiet-ke.md` | Xem trực tiếp trên GitHub |
| API contract | `docs/api-contract.md` | Xem trực tiếp trên GitHub |
| Khai báo sử dụng AI | `docs/ai-disclosure.md` | Xem trực tiếp trên GitHub |

**Nhật ký phiên bản**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | `<09/10/2026>` | Nộp Bài tập 1 – Phân tích và Thiết kế |
| 1.1 | 19/10/2026 | Buổi 8 – Sprint 1: khung mã nguồn, migration, CRUD phiếu bảo hành |
