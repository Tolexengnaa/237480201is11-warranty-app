# 237480201is11-warranty-app – Smart CRM · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

**Repo:** https://github.com/Tolexengnaa/237480201is11-warranty-app · **Phiên bản nộp Bài tập 3:** `v1.0` (Bài tập 2: `v0.2`)

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

Cần Docker Desktop đang chạy. **Hai lệnh:**

```
git clone --branch v1.0 https://github.com/Tolexengnaa/237480201is11-warranty-app.git && cd 237480201is11-warranty-app
docker compose up -d --build
```

Lệnh thứ hai dựng PostgreSQL 16 và ứng dụng, tự chạy `npm run migrate` và `npm run seed` (chạy lại nhiều lần không tạo bản ghi trùng). Khi `docker compose ps` báo cả `db` và `app` **healthy**, mở **http://localhost:3000**. Không cần tệp `.env` khi chạy bằng Docker.

| Việc | Lệnh |
|---|---|
| Kiểm tra sức khoẻ | `docker compose ps` · `curl http://localhost:3000/health` → `{"status":"ok","db":"up"}` |
| Chạy toàn bộ kiểm thử trong container | `docker compose exec app npm test` → 49 / 49 pass |
| Dừng | `docker compose down` |
| Xoá cả dữ liệu để chạy lại từ đầu | `docker compose down -v` |

Hướng dẫn đầy đủ (tiếng Anh) và cách kiểm tra hệ thống đã chạy đúng: **`docs/deployment-guide.md`**.

### Cách B – Chạy trực tiếp trên máy

Mỗi bước một lệnh, chạy lần lượt trong terminal. Lệnh `psql` ở bước 4–5 dùng tài khoản quản trị PostgreSQL của máy bạn (thường là `postgres`; trên Windows có thể cần gọi bằng đường dẫn đầy đủ, ví dụ `& "C:\Program Files\PostgreSQL\16\bin\psql.exe"`).

| # | Việc | Lệnh |
|---|---|---|
| 1 | Lấy mã nguồn bản nộp | `git clone --branch v1.0 https://github.com/Tolexengnaa/237480201is11-warranty-app.git` |
| 2 | Vào thư mục dự án | `cd 237480201is11-warranty-app` |
| 3 | Cài thư viện đúng phiên bản trong `package-lock.json` | `npm ci` |
| 4 | Tạo tài khoản CSDL | `psql -U postgres -c "CREATE USER smartcrm WITH PASSWORD 'smartcrm';"` |
| 5 | Tạo CSDL | `psql -U postgres -c "CREATE DATABASE smartcrm OWNER smartcrm;"` |
| 6 | Tạo file cấu hình | `cp .env.example .env` (Windows: `copy .env.example .env`) |
| 7 | Tạo 6 bảng theo DDL BT1 | `npm run migrate` |
| 8 | Nạp dữ liệu mẫu | `npm run seed` |
| 9 | Chạy hệ thống (API + giao diện) | `npm start` → mở **http://localhost:3000** (hoặc `npm run start:open` để tự mở trình duyệt) |
| 10 | Chạy toàn bộ kiểm thử (cần bước 7–8) | `npm test` → 49 / 49 pass |
| 11 | Chỉ chạy unit test (không cần CSDL) | `npm run test:unit` |
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
| `SECRET_KEY` | khoá ký token đăng nhập; **để trống** thì hệ thống tự sinh khoá ngẫu nhiên mỗi lần khởi động; nếu đặt thì ≥ 32 ký tự (khoá ngắn hoặc đã công khai bị từ chối – BUG-06) | *(trống)* |
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
├── tests/                    # *.unit.test.js · *.db.test.js · api.db.test.js (TC-01 → TC-12) – tất cả: npm test
├── dataset/                  # mẫu dữ liệu học phần (1.000 phiếu, seed 20260901) – tham khảo, chưa nạp (TD-22)
├── docs/                     # SRS, sơ đồ .drawio, tài liệu BT3, nhật ký thay đổi, bug log
│   ├── screenshots/          # ảnh chụp kết quả chạy test, sửa bug, phép thử máy trắng
│   └── ket-qua/              # log và ảnh các buổi 8, 10, 12; bt3/ = log chạy thật của Bài tập 3
├── Dockerfile, docker-compose.yml, .dockerignore
└── .env.example
```

**API:** 14 endpoint nghiệp vụ ban đầu (A1, C1–C2, D1, T1–T8, L1–L2) cộng CRUD khách hàng và thiết bị (S1, S2) và `GET /health` – 24 endpoint. Tài liệu tiếng Anh, mỗi endpoint 7 mục kèm ví dụ chạy thật: `docs/api-docs.md`; bản thiết kế gốc tiếng Việt: `docs/api-contract.md`.

## 6. Kiểm thử

| Lệnh | Nội dung | Kết quả hiện tại |
|---|---|---|
| **`npm test`** | **Toàn bộ 49 test bằng một lệnh** (cần CSDL đã migrate + seed) | **49 / 49 pass** |
| `npm run test:unit` | 34 unit test lớp nghiệp vụ, không cần CSDL | 34 / 34 pass |
| `npm run test:db` | 3 integration test BR2 + 12 API test TC-01 → TC-12 | 15 / 15 pass |
| `npm run test:tc` | 12 test case của Test Report, in "thực tế: …" dưới mỗi ca (dùng để chụp ảnh) | 12 / 12 pass |

Kế hoạch và kết quả kiểm thử: `docs/test-plan.md`, `docs/test-report.md`; lỗi đã sửa: `docs/bug-log.md`. `npm run migrate` và `npm run seed` chạy lại nhiều lần không tạo bản ghi trùng (TC-12).

**Kết quả qua các lần chạy (Bài tập 3)**

| Lần | Mã nguồn | `npm test` | Ghi chú |
|---|---|---|---|
| 1 | sau commit thêm 12 test case, chưa sửa bug | 45 / 48 – FAIL TC-08, TC-09, TC-11 | ba lỗi thật → BUG-04, BUG-05, BUG-06 |
| 2 | sau ba commit `fix(…)` | 48 / 48 | |
| 3 | sau commit bổ sung của BUG-04 | **49 / 49** | bản `v1.0` |

**Minh chứng**

| Nội dung | Ảnh (`docs/screenshots/`) | Log chạy thật (`docs/ket-qua/bt3/`) |
|---|---|---|
| Lần chạy 1 – ba ca FAIL | `TC-08-fail.png` | `lan-1-truoc-khi-sua.txt` |
| Sau từng bản sửa bug | `BUG-04-fixed.png`, `BUG-05-fixed.png`, `BUG-06-refuse.png`, `BUG-06-fixed.png` | `sau-bug-04.txt`, `sau-bug-05.txt`, `bug-06-tu-choi.txt`, `sau-bug-06.txt` |
| Toàn bộ test PASS | `npm-test-pass.png` | `npm-test-49.txt` |
| Từng test case | `TC-01.png` … `TC-12.png` | `TC-01.txt` … `TC-12.txt`, `test-tc-ca-12.txt` |
| Checklist bảo mật | `bao-mat-1.png` | `bao-mat-1-env.txt`, `bao-mat-7-audit.txt` |
| Phép thử máy trắng (Docker) | `may-trang-1.png` … `may-trang-4.png` | `may-trang-*.txt` |

## 7. Trạng thái hiện tại (Bài tập 3 – phiên bản `v1.0`)

- [x] Luồng chính UC01 → UC02 → UC03 → UC05 → UC06 chạy end-to-end trên giao diện, dữ liệu thật
- [x] Quy tắc BR1–BR6, kiểm tra vai trò ở lớp nghiệp vụ, mọi lần đổi trạng thái ghi lịch sử cùng giao dịch
- [x] Lớp nghiệp vụ không chứa `req`/`res`/mã HTTP (TD-12)
- [x] CRUD đầy đủ cho khách hàng và thiết bị, có ràng buộc khi xoá (TD-13)
- [x] Mất kết nối CSDL trả `503 DB_UNAVAILABLE` với thông báo rõ (TD-14)
- [x] Giao diện làm lại, dùng được trên điện thoại
- [x] Tách `src/backend` và `src/frontend` (TD-15)
- [x] Đóng gói Docker: lên bằng một lệnh `docker compose up -d --build`, cả hai dịch vụ có healthcheck, dữ liệu mẫu tự nạp
- [x] Test Plan + Test Report 12 test case chạy thật (5 loại), `npm test` 49 / 49 bằng một lệnh
- [x] `docs/bug-log.md`: BUG-04, BUG-05 (Major), BUG-06 (Critical) phát hiện bằng test case, mỗi lỗi một commit sửa riêng; BUG-01 → BUG-03 từ BT2
- [x] Deployment Guide và API docs tiếng Anh; checklist bảo mật 7 mục có minh chứng
- [ ] Chưa đo NFR1 (≤ 2 giây p95 với 10.000 phiếu) – ngoài phạm vi BT3 (xem Test Plan mục 1)
- [ ] Chưa giới hạn số lần đăng nhập sai, chưa có HTTPS – xem `docs/checklist-bao-mat.md`

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
| API contract (thiết kế, tiếng Việt) | `docs/api-contract.md` | Xem trực tiếp trên GitHub |
| API docs (tiếng Anh, BT3) | `docs/api-docs.md` | Xem trực tiếp trên GitHub |
| Test Plan · Test Report | `docs/test-plan.md` · `docs/test-report.md` | Xem trực tiếp trên GitHub; ảnh ở `docs/screenshots/` |
| Deployment Guide (tiếng Anh) | `docs/deployment-guide.md` | Xem trực tiếp trên GitHub |
| Checklist bảo mật | `docs/checklist-bao-mat.md` | Xem trực tiếp trên GitHub |
| Nhật ký thay đổi thiết kế | `docs/thay-doi-thiet-ke.md` | Xem trực tiếp trên GitHub |
| Nhật ký lỗi | `docs/bug-log.md` | Xem trực tiếp trên GitHub |
| Khai báo sử dụng AI | `docs/ai-disclosure.md` | Xem trực tiếp trên GitHub |
| Kết quả chạy | `docs/ket-qua/` | Ảnh và log các buổi 8–12; `docs/ket-qua/bt3/` = log Bài tập 3 |
| Ảnh minh chứng BT3 | `docs/screenshots/` | Ảnh chụp từng test case, sửa bug, phép thử máy trắng |

**Nhật ký phiên bản**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 09/10/2026 | Nộp Bài tập 1 – Phân tích và Thiết kế |
| 1.1 | 19/10/2026 | Buổi 8 – Sprint 1: khung mã nguồn, migration, CRUD phiếu bảo hành |
| 1.2 | 23/10/2026 | Buổi 10 – Sprint 2: T4–T8, giao diện M1/M2/M3, luồng chính end-to-end |
| 1.3 | 30/10/2026 | Buổi 12 – Bài tập 2 (`v0.2`): tách lớp nghiệp vụ khỏi HTTP, CRUD khách hàng/thiết bị, giao diện mới, mã 503, Docker |
| 1.4 | 11/2026 | Bài tập 3 (`v1.0`): kiểm thử 12 test case, sửa BUG-04 → BUG-06, đóng gói Docker có healthcheck, tài liệu tiếng Anh, checklist bảo mật |
