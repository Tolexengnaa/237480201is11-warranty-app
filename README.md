# 237480201is11-warranty-app – Smart CRM · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

**Repo:** https://github.com/Tolexengnaa/237480201is11-warranty-app · **Phiên bản nộp Bài tập 2:** `v0.2`

Đồ án học phần **Chuyên đề tốt nghiệp 1** – Trường Đại học Văn Lang, Khoa Công nghệ Thông tin – Học kỳ 1, năm học 2026 – 2027.

---

## 1. Giới thiệu đề tài

| Mục | Nội dung |
|---|---|
| Case study | Smart CRM – Mekong Mobile |
| Luồng nghiệp vụ | **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** |
| Track | **SE** (Software Engineering) |
| Sinh viên | MINGBOUPPHA XAYKHAM – MSSV 237480201is11 – Lớp 261_71ITGR40203_03 |
| Giảng viên | ThS. Nguyễn Minh Tân |

Mekong Mobile tiếp nhận yêu cầu bảo hành thiết bị tại cửa hàng nhưng còn ghi chép thủ công, nên khó biết phiếu nào đang chờ, phiếu nào trễ hạn và ai đang xử lý. Dự án số hoá đoạn từ lúc khách mang thiết bị đến cửa hàng cho tới khi **phiếu bảo hành** được phân loại, đặt **mức ưu tiên** và giao cho **kỹ thuật viên**.

**Hệ thống làm được gì**

- Nhân viên tiếp nhận tra cứu khách hàng theo số điện thoại, thiết bị theo IMEI và tạo phiếu bảo hành; hệ thống tự cảnh báo thiết bị hết hạn bảo hành và chặn thiết bị đang có phiếu chưa đóng.
- Điều phối viên phân loại phiếu (danh mục lỗi, mức ưu tiên, hạn xử lý tự tính) hoặc từ chối kèm lý do, rồi phân công kỹ thuật viên.
- Kỹ thuật viên chỉ thấy phiếu được giao cho mình và xác nhận nhận phiếu.
- Mọi lần đổi trạng thái đều được ghi vào lịch sử, không ai sửa được lịch sử đó.
- Quản lý khách hàng và thiết bị (xem, thêm, sửa, xoá có ràng buộc).

## 2. Cách chạy nhanh

Có hai cách. Chọn **một**.

### Cách A – Docker (khuyên dùng khi chấm bài, không cần cài Node.js và PostgreSQL)

Cần Docker Desktop đang chạy. Trong thư mục dự án:

```
docker compose up --build
```

Lệnh này dựng PostgreSQL 16 và ứng dụng, tự chạy `npm run migrate` và `npm run seed` (chạy lại nhiều lần không tạo bản ghi trùng), rồi mở **http://localhost:3000**.

| Việc | Lệnh |
|---|---|
| Dừng | `Ctrl+C`, sau đó `docker compose down` |
| Xoá cả dữ liệu để chạy lại từ đầu | `docker compose down -v` |

### Cách B – Chạy trực tiếp trên máy

Mỗi bước một lệnh, chạy lần lượt trong terminal. Lệnh `psql` ở bước 4–5 dùng tài khoản quản trị PostgreSQL của máy bạn (thường là `postgres`; trên Windows có thể cần gọi bằng đường dẫn đầy đủ, ví dụ `& "C:\Program Files\PostgreSQL\16\bin\psql.exe"`).

| # | Việc | Lệnh |
|---|---|---|
| 1 | Lấy mã nguồn bản nộp | `git clone --branch v0.2 https://github.com/Tolexengnaa/237480201is11-warranty-app.git` |
| 2 | Vào thư mục dự án | `cd 237480201is11-warranty-app` |
| 3 | Cài thư viện | `npm install` |
| 4 | Tạo tài khoản CSDL | `psql -U postgres -c "CREATE USER smartcrm WITH PASSWORD 'smartcrm';"` |
| 5 | Tạo CSDL | `psql -U postgres -c "CREATE DATABASE smartcrm OWNER smartcrm;"` |
| 6 | Tạo file cấu hình | `cp .env.example .env` (Windows: `copy .env.example .env`) |
| 7 | Tạo 6 bảng theo DDL BT1 | `npm run migrate` |
| 8 | Nạp dữ liệu mẫu | `npm run seed` |
| 9 | Chạy hệ thống (API + giao diện) | `npm start` → mở **http://localhost:3000** (hoặc `npm run start:open` để tự mở trình duyệt) |
| 10 | Chạy unit test lớp nghiệp vụ (không cần CSDL) | `npm test` |
| 11 | Chạy test với CSDL thật (cần bước 7–8) | `npm run test:db` |
| 12 | Gọi thử toàn bộ API (terminal khác, khi bước 9 đang chạy) | `bash scripts/demo-api.sh` |

`.env.example` dùng sẵn tài khoản `smartcrm / smartcrm` khớp bước 4–5; nếu đặt mật khẩu khác thì sửa `DB_PASSWORD` trong `.env`. Bước 7 và 8 chạy lại nhiều lần không lỗi, không nhân đôi dữ liệu. **Không commit `.env`.**

**Yêu cầu môi trường (Cách B)**

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 20 LTS trở lên (đã chạy với 22) | kèm npm |
| PostgreSQL | 16 | cần quyền tạo database |
| Trình duyệt | Chrome / Edge / Firefox bản mới | giao diện dùng ES modules, không cần build |

**Biến môi trường** (`.env`)

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | địa chỉ CSDL | `localhost`, `5432`, `smartcrm` |
| `DB_USER`, `DB_PASSWORD` | tài khoản PostgreSQL | `smartcrm`, mật khẩu của bạn |
| `APP_PORT` | cổng ứng dụng | `3000` |
| `SECRET_KEY` | khoá ký token đăng nhập | chuỗi ngẫu nhiên dài |
| `TOKEN_EXPIRES_IN` | thời hạn token | `8h` |

## 3. Dùng thử hệ thống

**Tài khoản mẫu** (mật khẩu chung `Matkhau@123`, chỉ dùng ở máy phát triển):

| Tên đăng nhập | Người | Vai trò | Làm được gì trên giao diện |
|---|---|---|---|
| `tn1` | Lê Thu | Nhân viên tiếp nhận | M1 tạo phiếu, M2 danh sách, M3 xem, M4 quản lý khách hàng và thiết bị |
| `dp1` | Trần Minh | Điều phối viên | M3 phân loại / từ chối, phân công; M4 chỉ xem |
| `kt1`, `kt2` | Phạm Huy, Võ Lan | Kỹ thuật viên | M2 chỉ phiếu của mình, M3 xác nhận nhận phiếu |
| `kt3` | Đỗ Nam | Kỹ thuật viên đã khoá | đăng nhập bị từ chối |

**Chạy thử luồng chính (5 phút)**

1. Đăng nhập `tn1` → *+ Tạo phiếu bảo hành* → số điện thoại `0901234567`, IMEI `356789012345678`, nhập mô tả lỗi → *Lưu phiếu*.
2. Đăng xuất, đăng nhập `dp1` → mở phiếu → chọn danh mục lỗi và mức ưu tiên → *Lưu phân loại* → chọn kỹ thuật viên Phạm Huy → *Phân công*.
3. Đăng xuất, đăng nhập `kt1` → mở phiếu → *Xác nhận nhận phiếu*. Lịch sử trạng thái có đủ 4 dòng.

Ảnh kết quả mẫu: `docs/ket-qua/buoi12/` (bản giao diện hiện tại) và `docs/ket-qua/buoi10/`.

**Các màn hình**

| Màn hình | Đường dẫn | Use case |
|---|---|---|
| Đăng nhập | `#/login` | A1 |
| M1 – Tạo phiếu bảo hành | `#/tickets/new` | UC01, UC07 |
| M2 – Danh sách phiếu bảo hành | `#/tickets` | UC04 |
| M3 – Chi tiết phiếu bảo hành | `#/tickets/{mã phiếu}` | UC02, UC03, UC05, UC06 |
| M4 – Khách hàng và thiết bị | `#/data` | CRUD khách hàng, thiết bị |

Mọi vùng dữ liệu đều có ba trạng thái: đang tải, rỗng và lỗi (kèm nút *Thử lại*).

**Lỗi hay gặp**

| Thông báo | Cách xử lý |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL chưa chạy – khởi động dịch vụ PostgreSQL rồi chạy lại bước 7 |
| `password authentication failed for user "smartcrm"` | Mật khẩu ở bước 4 khác `DB_PASSWORD` trong `.env` |
| `Thiếu biến môi trường …` | Chưa làm bước 6 |
| `EADDRINUSE :::3000` | Cổng 3000 đang bận – đổi `APP_PORT` trong `.env` (Docker: tắt tiến trình đang dùng cổng 3000) |
| Giao diện báo `503 DB_UNAVAILABLE` | Ứng dụng đang chạy nhưng mất kết nối CSDL – bật lại PostgreSQL rồi bấm *Thử lại* |

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

**Quy tắc nghiệp vụ chính** (đầy đủ trong `docs/srs.md`): BR1 mỗi phiếu gắn đúng một khách hàng và một thiết bị · BR2 một IMEI chỉ có tối đa một phiếu chưa đóng · BR3 thiết bị tiếp nhận sau ngày hết hạn bảo hành vẫn tạo phiếu nhưng bị đánh dấu *Hết hạn bảo hành* · BR4 hạn xử lý = thời điểm phân loại + 24 giờ (Cao) / 72 giờ (Trung bình) / 120 giờ (Thấp) · BR5 chỉ Điều phối viên phân loại, phân công, từ chối; chỉ phân công cho kỹ thuật viên đang hoạt động · BR6 trạng thái đi theo thứ tự Mới → Đã phân loại → Đã phân công → Đang xử lý, không quay lui; *Từ chối* chỉ khi phiếu đang *Mới* và phải có lý do; phiếu không bao giờ bị xoá.

## 5. Kiến trúc và cấu trúc mã nguồn

Ứng dụng web nguyên khối 4 lớp, REST/JSON: **Node.js + Express 4**, **PostgreSQL 16** qua thư viện `pg` (SQL tham số hoá, không dùng ORM), token đăng nhập `jsonwebtoken`, băm mật khẩu `bcryptjs`. Giao diện: HTML + JavaScript thuần (ES modules), do Express phục vụ cùng cổng với API. Lý do chọn công nghệ: `docs/thay-doi-thiet-ke.md` – TD-05, TD-08.

Thư mục `src/` ánh xạ một–một với sơ đồ kiến trúc (`docs/architecture.drawio`):

| Lớp trong sơ đồ | Thành phần | File |
|---|---|---|
| 1. Giao diện (Web UI) | M1, M2, M3, M4 | `src/frontend/pages/` (màn hình) · `src/frontend/api/` (gọi API) · `src/frontend/components/` (DataState) |
| 2. API (Controller) | AuthMiddleware · CustomerController · TicketController | `src/backend/middlewares/`, `src/backend/controllers/` |
| 3. Nghiệp vụ (Service) | TicketService · ClassifyService · AssignService · StatusService · MasterDataService | `src/backend/services/*.js` |
| 4. Truy cập dữ liệu (Repository) | Customer · Device · Ticket · IssueCategory · Staff · StatusLog | `src/backend/repositories/*.js` |
| CSDL PostgreSQL | 6 bảng | `db/migrations/001_init_schema.sql` (từ `db/schema.sql` BT1) |

**Hai quy ước quan trọng**

- Lớp nghiệp vụ **không biết HTTP**: không dùng `req`, `res` hay mã trạng thái. Service chỉ ném lỗi nghiệp vụ có `kind`; duy nhất `src/backend/middlewares/errorHandler.js` đổi `kind` thành mã HTTP (TD-12).
- Giao diện chỉ gọi `fetch()` trong `src/frontend/api/client.js`. Kiểm tra: `grep -rn "fetch(" src/frontend/pages` phải ra rỗng.

```
237480201is11-warranty-app/
├── src/
│   ├── backend/
│   │   ├── app.js, server.js # lắp ráp Express, khởi động server
│   │   ├── config/           # đọc .env, connection pool + giao dịch
│   │   ├── middlewares/      # AuthMiddleware, xử lý lỗi (kind → mã HTTP)
│   │   ├── controllers/      # Customer/TicketController
│   │   ├── services/         # quy tắc BR1–BR6, kiểm tra vai trò, CRUD khách hàng/thiết bị
│   │   ├── repositories/     # SQL tham số hoá
│   │   └── errors/           # lỗi nghiệp vụ (không mang mã HTTP)
│   └── frontend/             # giao diện (pages/, api/, components/, fonts/)
├── db/schema.sql             # DDL nộp ở BT1 (tài liệu)
├── db/migrations/            # migration chạy thật: 001, 002…
├── scripts/                  # migrate.js, seed.js, demo-api.sh
├── tests/                    # *.unit.test.js (npm test) · *.db.test.js (npm run test:db)
├── docs/                     # SRS, sơ đồ .drawio, API contract, nhật ký thay đổi, bug log, ảnh kết quả
├── Dockerfile, docker-compose.yml, .dockerignore
└── .env.example
```

**API:** 14 endpoint nghiệp vụ ban đầu (A1, C1–C2, D1, T1–T8, L1–L2) cộng CRUD khách hàng và thiết bị (S1, S2). Chi tiết, mã lỗi và quyền từng vai trò: `docs/api-contract.md`.

## 6. Kiểm thử

| Lệnh | Nội dung | Kết quả hiện tại |
|---|---|---|
| `npm test` | 33 unit test lớp nghiệp vụ, không cần CSDL: luồng đúng · giá trị biên · dữ liệu sai; kiểm tra `errorHandler` | 33 / 33 pass |
| `npm run test:db` | 3 test BR2 với CSDL thật | 3 / 3 pass |

`npm run migrate` và `npm run seed` chạy lại nhiều lần không tạo bản ghi trùng. Kết quả chạy và ảnh giao diện: `docs/ket-qua/`.

## 7. Trạng thái hiện tại (Bài tập 2 – phiên bản `v0.2`, 30/10/2026)

- [x] Luồng chính UC01 → UC02 → UC03 → UC05 → UC06 chạy end-to-end trên giao diện, dữ liệu thật
- [x] Quy tắc BR1–BR6, kiểm tra vai trò ở lớp nghiệp vụ, mọi lần đổi trạng thái ghi lịch sử cùng giao dịch
- [x] Lớp nghiệp vụ không chứa `req`/`res`/mã HTTP (TD-12)
- [x] CRUD đầy đủ cho khách hàng và thiết bị, có ràng buộc khi xoá (TD-13)
- [x] Mất kết nối CSDL trả `503 DB_UNAVAILABLE` với thông báo rõ (TD-14)
- [x] Giao diện làm lại, dùng được trên điện thoại
- [x] Tách `src/backend` và `src/frontend` (TD-15)
- [x] Chạy được bằng Docker (`docker compose up --build`)
- [x] `docs/bug-log.md`: 3 lỗi đã tái lập và sửa
- [ ] Chưa đo NFR1 (≤ 2 giây p95 với 10.000 phiếu)

Lưu ý: không có endpoint `PUT`/`DELETE` cho phiếu bảo hành vì BR6 (phiếu không bao giờ bị xoá). Các thay đổi so với thiết kế ban đầu và lý do: `docs/thay-doi-thiet-ke.md`.

## 8. Tài liệu thiết kế

| Tài liệu | File | Cách mở |
|---|---|---|
| SRS rút gọn, Use Case, kiến trúc, mô hình dữ liệu | `docs/srs.md` | Xem trực tiếp trên GitHub |
| Use Case Diagram | `docs/usecase.drawio` | Mở bằng [draw.io](https://app.diagrams.net) (File → Open) hoặc extension *Draw.io Integration* trong VS Code |
| Sơ đồ kiến trúc | `docs/architecture.drawio` | như trên |
| ERD | `docs/erd.drawio` | như trên |
| Wireframe BT1 | `docs/wireframe.png` | Ảnh |
| Giao diện hiện tại | `docs/wireframe-v0.2.png` | Ảnh chụp M1–M3 của bản `v0.2` |
| SQL DDL | `db/schema.sql` | Bản nộp BT1; chạy thật bằng `npm run migrate` |
| API contract | `docs/api-contract.md` | Xem trực tiếp trên GitHub |
| Nhật ký thay đổi thiết kế | `docs/thay-doi-thiet-ke.md` | Xem trực tiếp trên GitHub |
| Nhật ký lỗi | `docs/bug-log.md` | Xem trực tiếp trên GitHub |
| Khai báo sử dụng AI | `docs/ai-disclosure.md` | Xem trực tiếp trên GitHub |
| Kết quả chạy | `docs/ket-qua/` | Ảnh và log gọi API |

**Nhật ký phiên bản**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 09/10/2026 | Nộp Bài tập 1 – Phân tích và Thiết kế |
| 1.1 | 19/10/2026 | Buổi 8 – Sprint 1: khung mã nguồn, migration, CRUD phiếu bảo hành |
| 1.2 | 23/10/2026 | Buổi 10 – Sprint 2: T4–T8, giao diện M1/M2/M3, luồng chính end-to-end |
| 1.3 | 30/10/2026 | Buổi 12 – Bài tập 2 (`v0.2`): tách lớp nghiệp vụ khỏi HTTP, CRUD khách hàng/thiết bị, giao diện mới, mã 503, Docker |
