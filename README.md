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

Biến môi trường: chép `.env.example` thành `.env` (ở thư mục gốc) rồi điền giá trị. **Không commit `.env`.**

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

Mã nguồn nằm trong `src/`, tách thành hai thư mục: **`src/frontend/`** (lớp giao diện, chạy trên trình duyệt) và **`src/backend/`** (API + nghiệp vụ + truy cập dữ liệu, chạy trên Node.js). Frontend chỉ giao tiếp với backend qua REST API (`src/frontend/api/client.js`), không import mã nào của backend. Ánh xạ với sơ đồ kiến trúc (`docs/architecture.drawio`):

| Lớp trong sơ đồ | Thành phần trong sơ đồ | File |
|---|---|---|
| 1. Giao diện (Web UI) | M1, M2, M3 | `src/frontend/` |
| 2. API (Controller) | AuthMiddleware | `src/backend/middlewares/authMiddleware.js` |
| | CustomerController | `src/backend/controllers/customerController.js` |
| | TicketController | `src/backend/controllers/ticketController.js` |
| 3. Nghiệp vụ (Service) | TicketService · ClassifyService · AssignService · StatusService | `src/backend/services/*.js` (+ `authService.js` hỗ trợ đăng nhập) |
| 4. Truy cập dữ liệu (Repository) | Customer · Device · Ticket · IssueCategory · Staff · StatusLog | `src/backend/repositories/*.js` |
| CSDL PostgreSQL | 6 bảng | `db/migrations/001_init_schema.sql` (từ `db/schema.sql` BT1) |

```
237480201is11-warranty-app/
├── src/
│   ├── frontend/             # LỚP 1 – giao diện (HTML + JS thuần, không cần build)
│   │   ├── index.html, main.js, styles.css
│   │   ├── api/              # client.js (nơi duy nhất gọi fetch), ticket.api.js
│   │   ├── components/       # DataState (đang tải · rỗng · lỗi), tiện ích DOM
│   │   └── pages/            # login, M1 tạo phiếu, M2 danh sách, M3 chi tiết
│   └── backend/              # Node.js + Express
│       ├── app.js, server.js # lắp ráp Express, khởi động server, phục vụ ../frontend
│       ├── config/           # đọc .env, connection pool + giao dịch
│       ├── middlewares/      # LỚP 2 – AuthMiddleware, xử lý lỗi
│       ├── controllers/      # LỚP 2 – Customer/TicketController
│       ├── services/         # LỚP 3 – quy tắc BR1–BR6, kiểm tra vai trò
│       ├── repositories/     # LỚP 4 – SQL tham số hoá
│       └── errors/           # mã lỗi theo API contract
├── db/schema.sql             # DDL nộp ở BT1 (tài liệu)
├── db/migrations/            # migration chạy thật: 001, 002…
├── scripts/                  # migrate.js, seed.js, demo-api.sh
├── tests/                    # unit test lớp nghiệp vụ (node:test)
├── package.json, .env.example
└── docs/                     # SRS, sơ đồ .drawio, API contract, nhật ký thay đổi, ảnh kết quả
```

## 5. Cài đặt và chạy

```bash
# 1. Cài thư viện (mọi lệnh chạy ở thư mục gốc của repo)
npm install

# 2. Tạo CSDL (một lần) – đổi mật khẩu theo máy của bạn
psql -U postgres -c "CREATE USER smartcrm WITH PASSWORD 'smartcrm_dev';"
psql -U postgres -c "CREATE DATABASE smartcrm OWNER smartcrm;"
cp .env.example .env          # điền DB_USER, DB_PASSWORD, SECRET_KEY

# 3. Tạo bảng và nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi)
npm run migrate
npm run seed

# 4. Chạy API tại http://localhost:3000 (giao diện src/frontend/ được phục vụ cùng cổng)
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

# Nhật ký thay đổi thiết kế

Luồng L2 – Tiếp nhận và phân loại yêu cầu bảo hành · Track SE

> File này được đọc lại khi chấm BT2 và BT3 (tiêu chí 3: Nhất quán & Tích lũy).
> Mỗi điểm góp ý có đủ bốn dòng: **phản hồi → quyết định → lý do → ảnh hưởng**.
> Khi nhận phản hồi BT2, nối tiếp vào cuối file.

---

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

Điểm BT1: **7.5/10** – Đầy đủ 6.5 · Kỹ thuật 8.5 · Nhất quán 8 · Trình bày 5. Bốn điểm cần khắc phục, cả bốn đều SỬA.

### TD-01 Ghi link GitHub ở trang bìa và cuối bài

- **Phản hồi của GV:** Bài không có link GitHub ở trang bìa và cuối bài nên thầy không kiểm được các file `.drawio` gốc.
- **Quyết định:** SỬA
- **Lý do:** Tiêu chí 3 (Nhất quán & Tích lũy) chấm trên repo; không có link thì mọi file gốc (`.drawio`, `schema.sql`, `srs.md`) không được tính. Bản Markdown `docs/srs.md` đã có link nhưng bản PDF nộp bị sót khi xuất.
- **Ảnh hưởng:** Thêm link repo ở đầu `README.md`. Kiểm tra link ở trang bìa và cuối bài trong `docs/srs.md`. Từ BT2: mở file PDF đã xuất để kiểm link trước khi nộp.

### TD-02 Hoàn thiện phụ lục khai báo AI

- **Phản hồi của GV:** Cột "Em đã chỉnh sửa / kiểm chứng gì" còn chữ mẫu; chưa có dòng cam kết với họ tên, MSSV, ngày; bảng nhắc đặc tả UC03 nhưng bài chỉ đặc tả UC01.
- **Quyết định:** SỬA
- **Lý do:** Phụ lục AI là phần bắt buộc của đề; chữ mẫu còn sót cho thấy chưa kiểm chứng thật, và dòng nhắc UC03 mâu thuẫn với nội dung bài (chỉ có đặc tả UC01).
- **Ảnh hưởng:** `docs/srs.md` phụ lục và `docs/ai-disclosure.md`: thay chữ mẫu bằng nội dung đã kiểm chứng; điền họ tên, MSSV, lớp, ngày dưới dòng cam kết; bảng chỉ còn nhắc đặc tả UC01. Thêm dòng khai báo AI cho Sprint 1 (buổi 8) vào `ai-disclosure.md`.

### TD-03 Điền nguồn BR1, BR3, BR4 và sửa trang bìa

- **Phản hồi của GV:** Cột Nguồn của BR1, BR3, BR4 vẫn là chữ mẫu `<Bảng 9.1 – đối chiếu>`; trang bìa còn ký tự định dạng thừa ở dòng Track và chưa ghi lớp.
- **Quyết định:** SỬA
- **Lý do:** Cột Nguồn phân biệt quy tắc lấy từ case study (BR1, BR3, BR4 – Bảng 9.1) với quy tắc do em phân tích (BR2, BR5, BR6); để chữ mẫu thì không truy vết được. Ký tự thừa trên bìa đến từ dấu `` ` `` của Markdown khi xuất PDF.
- **Ảnh hưởng:** `docs/srs.md` mục 1.5 (cột Nguồn) và trang bìa: bỏ dấu `` ` ``, thêm dòng **Lớp: 261_71ITGR40203_03**, bỏ ngoặc nhọn ở ngày nộp.

### TD-04 Viết test cho BR2

- **Phản hồi của GV (gợi ý BT2):** Viết test cho BR2 – một IMEI chỉ có một phiếu chưa đóng.
- **Quyết định:** SỬA
- **Lý do:** BR2 được bảo vệ ở hai tầng – TicketService kiểm tra trước khi ghi và CSDL có UNIQUE một phần `ux_ticket_open_device` – nên cần test cho cả hai, cộng ca phiếu cũ đã đóng thì được tạo phiếu mới.
- **Ảnh hưởng:** Thêm `tests/br2.db.test.js` (3 ca, chạy với CSDL thật: `npm run test:db`); unit test có sẵn đổi tên thành `tests/ticketService.unit.test.js` (`npm test`). Không đổi ERD hay mã nghiệp vụ.

---

## Quyết định kỹ thuật khi hiện thực Sprint 1 (buổi 8)

### TD-05 Chốt công nghệ hiện thực: Node.js 22 + Express 4 + PostgreSQL 16

- **Bối cảnh:** README mục 3 ở BT1 ghi *"Sẽ cập nhật ở Bài tập 2"*; BT1 chỉ chốt ứng dụng web nguyên khối 4 lớp, REST/JSON, PostgreSQL 16.
- **Quyết định:** Dùng Node.js 22 LTS, Express 4, thư viện `pg` (connection pool, SQL tham số hoá), `jsonwebtoken` cho token đăng nhập, `bcryptjs` để băm mật khẩu.
- **Lý do:** Không dùng ORM để giữ đúng sơ đồ kiến trúc: lớp Repository viết SQL tham số hoá, lọc và phân trang ngay trong CSDL (NFR1). Express đủ nhẹ để ánh xạ một–một Controller → Service → Repository.
- **Ảnh hưởng:** README mục 2 và mục 4; `package.json`. Không đổi ERD hay API contract.

### TD-06 Migration dùng `IF NOT EXISTS`, giữ nguyên `db/schema.sql`

- **Bối cảnh:** `db/schema.sql` của BT1 là bản DDL skeleton để nộp; chạy lại lần hai báo lỗi `relation "customer" already exists`.
- **Quyết định:** Tạo `db/migrations/001_init_schema.sql` cùng nội dung DDL nhưng thêm `IF NOT EXISTS`, kèm bảng `schema_migrations` ghi lại migration đã chạy. `db/schema.sql` giữ nguyên làm tài liệu thiết kế.
- **Lý do:** Chạy `npm run migrate` nhiều lần không lỗi; mọi thay đổi lược đồ sau này là một file migration mới (002, 003…) thay vì sửa file cũ.
- **Ảnh hưởng:** Thêm thư mục `db/migrations/`, `scripts/migrate.js`. Lược đồ (6 bảng, 7 khoá ngoại, các ràng buộc CHECK và index) không thay đổi.

### TD-07 Sinh mã phiếu `BH-YYYY-NNNNNN` bằng khoá tư vấn trong giao dịch

- **Bối cảnh:** API contract T1 yêu cầu hệ thống sinh mã phiếu nhưng ERD không có sequence riêng cho mã phiếu.
- **Quyết định:** Trong giao dịch tạo phiếu, TicketRepository gọi `pg_advisory_xact_lock` rồi lấy số thứ tự lớn nhất của năm hiện tại + 1.
- **Lý do:** Hai nhân viên tiếp nhận tạo phiếu cùng lúc không bị trùng mã; không phải thêm bảng hay cột mới vào ERD.
- **Ảnh hưởng:** Chỉ `src/repositories/ticketRepository.js`. ERD giữ nguyên.
