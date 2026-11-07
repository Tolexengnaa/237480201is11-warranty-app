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
- **Ảnh hưởng:** Chỉ `src/backend/repositories/ticketRepository.js`. ERD giữ nguyên.

---

## Quyết định kỹ thuật khi hiện thực Sprint 2 (buổi 10, ngày 23/10/2026)

### TD-08 Giao diện dùng HTML + JavaScript thuần (ES modules), Express phục vụ cùng cổng với API

- **Bối cảnh:** Sơ đồ kiến trúc BT1 có lớp Giao diện (M1, M2, M3) nhưng chưa chốt công nghệ; slide buổi 10 yêu cầu ≥ 3 màn hình gọi API thật, có `src/api/client.js` và `*.api.js`, không gọi `fetch(` trong màn hình.
- **Quyết định:** `src/frontend/` gồm `api/` (client.js là nơi duy nhất gọi `fetch`, `ticket.api.js` ánh xạ từng endpoint), `components/DataState.js` (đang tải · rỗng · lỗi), `pages/` (login, M1, M2, M3). Express phục vụ `src/frontend` bằng `express.static` tại `http://localhost:3000/`.
- **Lý do:** Không cần bước build hay cài thêm framework, nên README mục 3 giữ được mỗi bước một lệnh; cùng cổng với API nên không phát sinh lỗi CORS (lỗi tích hợp hay gặp nhất của track SE theo slide buổi 10). Phạm vi chỉ 3 màn hình nên chưa cần React/Vue.
- **Ảnh hưởng:** Thêm `src/frontend/*`, một dòng `express.static` trong `src/backend/app.js`. Không đổi ERD, API contract hay lớp nghiệp vụ.

### TD-09 Thu hẹp phạm vi Sprint 2

- **Bối cảnh:** Slide buổi 10 cho phép cắt phần ngoài luồng chính nếu thiếu thời gian, nhưng phải ghi lại.
- **Quyết định:** Phân trang M2 rút gọn thành nút ‹ / › kèm "trang x / y" thay cho dãy số trang như wireframe; chưa đo NFR1 với 10.000 phiếu (chuyển sang trước buổi 12); chưa làm Docker (buổi 11). Giữ nguyên: đủ 3 màn hình, toàn bộ luồng ngoại lệ UC01 và UC03 trên giao diện, ba trạng thái dữ liệu, bộ lọc hạn xử lý từ – đến.
- **Lý do:** Bảng tiêu chí BT2 chấm luồng chính, test và README chứ không chấm số lượng tính năng; dãy số trang không ảnh hưởng FR4 (lọc, tìm, phân trang vẫn đủ).
- **Ảnh hưởng:** Chỉ `src/frontend/pages/ticketList.js`. README mục 6 ghi hai việc còn lại.

### TD-10 Đổi trạng thái kèm các cột nghiệp vụ trong cùng một câu lệnh UPDATE

- **Bối cảnh:** DDL BT1 có ràng buộc `chk_ticket_classified` (đã phân loại thì bắt buộc danh mục, mức ưu tiên, hạn xử lý) và `chk_ticket_assigned` (đã phân công thì bắt buộc kỹ thuật viên). Nếu đổi trạng thái trước rồi mới ghi các cột này thì CSDL chặn ngay câu lệnh đầu.
- **Quyết định:** `TicketRepository.updateStatus` nhận thêm `fields` (`issueCategoryId`, `priority`, `dueDate`, `assignedTo`) và ghi cùng trạng thái trong một câu UPDATE có điều kiện `status = fromStatus`. StatusService vẫn là nơi duy nhất gọi hàm này và ghi lịch sử trong cùng giao dịch.
- **Lý do:** Giữ nguyên ràng buộc CHECK của BT1 (không nới lỏng CSDL để chiều mã); điều kiện `status = fromStatus` đồng thời xử lý trường hợp hai Điều phối viên thao tác cùng lúc (UC03-4b → 409 `DATA_CHANGED`).
- **Ảnh hưởng:** `src/backend/repositories/ticketRepository.js`, `src/backend/services/statusService.js`. ERD giữ nguyên.

### TD-11 Bổ sung mã lỗi 400 cho T4 và T6; đổi thứ tự mục README

- **Bối cảnh:** API contract BT1 ghi chung "400 thiếu `issueCategoryId` hoặc `priority`" cho T4 và chưa có mã lỗi khi T6 thiếu kỹ thuật viên. Slide buổi 10 gọi phần các bước dựng hệ thống là README **mục 3**, trong khi README buổi 8 để phần này ở mục 5.
- **Quyết định:** Thêm mã `ISSUE_CATEGORY_REQUIRED`, `ISSUE_CATEGORY_INVALID`, `INVALID_PRIORITY` (T4) và `TECHNICIAN_REQUIRED` (T6) vào `docs/api-contract.md`. Đổi README thành: 1 Giới thiệu · 2 Yêu cầu môi trường · 3 Cài đặt và chạy · 4 Phạm vi · 5 Công nghệ · 6 Trạng thái · 7 Tài liệu.
- **Lý do:** Giao diện cần mã lỗi riêng để hiện đúng thông báo; người chấm đọc README theo số mục trong slide.
- **Ảnh hưởng:** `docs/api-contract.md` mục T4, T6; `README.md`. Không đổi endpoint hay dữ liệu trả về khi thành công.

### TD-12 Lớp nghiệp vụ không còn mang mã HTTP (tiêu chí C2)

- **Bối cảnh:** `AppError` trước đây mang `status` (400/403/409…) và các service gọi `badRequest`, `forbidden`… – nghĩa là lớp nghiệp vụ biết tới HTTP.
- **Quyết định:** `AppError` mang `kind` (`INVALID_INPUT`, `NOT_AUTHENTICATED`, `NOT_ALLOWED`, `NOT_FOUND`, `CONFLICT`); hàm tạo lỗi đổi tên theo từ vựng nghiệp vụ (`invalidInput`, `notAuthenticated`, `notAllowed`, `notFound`, `conflict`). Bảng `kind → mã HTTP` nằm duy nhất trong `src/backend/middlewares/errorHandler.js`. Test kiểm `kind` thay vì `status`; thêm `tests/errorHandler.unit.test.js`.
- **Lý do:** Thay giao diện giao tiếp (CLI, hàng đợi…) không phải sửa service; chấm C2 bằng cách tìm `req`, `res`, mã HTTP trong `src/backend/services/` ra rỗng.
- **Ảnh hưởng:** `src/backend/errors/AppError.js`, `src/backend/middlewares/*`, `src/backend/services/*`, `tests/*`. Mã lỗi (`code`) và JSON trả về giữ nguyên.

### TD-13 Bổ sung CRUD khách hàng và thiết bị (tiêu chí S1) – điều chỉnh TD-09

- **Bối cảnh:** BR6 cấm sửa/xoá phiếu nên TD-09 không làm `PUT`/`DELETE` phiếu; như vậy chưa có thực thể nào có CRUD đầy đủ, trong khi S1 yêu cầu ≥ 2 thực thể.
- **Quyết định:** Thêm `MasterDataService` với CRUD cho `customer` và `device` (S1, S2 trong API contract), màn hình M4 *Khách hàng & thiết bị*. Ràng buộc xoá: khách còn thiết bị → 409 `CUSTOMER_HAS_DEVICES`; thiết bị đã có phiếu → 409 `DEVICE_HAS_TICKETS`. Chỉ Nhân viên tiếp nhận được ghi; Điều phối viên được đọc.
- **Lý do:** Đủ S1 mà không phá BR6; ràng buộc xoá bảo vệ khoá ngoại và lịch sử phiếu.
- **Ảnh hưởng:** `src/backend/services/masterDataService.js`, repository customer/device, `src/backend/controllers/customerController.js`, `src/frontend/pages/masterData.js`. Không đổi DDL.

### TD-14 Làm lại giao diện và trả `503` khi mất CSDL

- **Quyết định:** Viết lại `src/frontend/styles.css` (nhận diện Mekong Mobile, font Be Vietnam Pro đóng gói trong `src/frontend/fonts/` theo giấy phép OFL, không gọi mạng ngoài), màu riêng cho từng trạng thái phiếu, thanh điều hướng, bố cục dùng được trên điện thoại. `errorHandler` trả `503 DB_UNAVAILABLE` khi mất kết nối CSDL thay vì `500` chung.
- **Lý do:** Giao diện buổi 10 cố ý tối giản; buổi 12 chấm màn hình có ba trạng thái rõ ràng. Mã id/lớp CSS dùng bởi kiểm thử giữ nguyên.
- **Ảnh hưởng:** `src/frontend/*`, `src/backend/middlewares/errorHandler.js`.

### TD-15 Tách `src/` thành `src/backend` và `src/frontend`

- **Quyết định:** Mã máy chủ (app, config, middlewares, controllers, services, repositories, errors) nằm trong `src/backend/`; giao diện nằm trong `src/frontend/`. `npm start` chạy `src/backend/server.js`; Express phục vụ `src/frontend` bằng `express.static`.
- **Lý do:** Ranh giới giao diện ↔ máy chủ nhìn thấy ngay từ cây thư mục; bốn lớp bên trong backend giữ nguyên.
- **Ảnh hưởng:** Chỉ đổi đường dẫn (`package.json`, `src/backend/app.js`, `require` trong `tests/` và `scripts/`, tài liệu). Không đổi mã nghiệp vụ, API hay CSDL.

---

## Sau phản hồi Bài tập 2 (buổi 14, ngày 06/11/2026)

GV xác nhận bảng 4.2 **đạt đủ các mục chung và mục theo track SE**. Hai điểm cần khắc phục đều thuộc quy trình làm việc, không thuộc mã nguồn; cả hai đều SỬA từ Bài tập 3.

### TD-16 Commit nhỏ, đều đặn, mỗi commit một việc

- **Phản hồi của GV:** Lịch sử commit ít và dồn trong 4 ngày cuối trước hạn nộp BT2.
- **Quyết định:** SỬA
- **Lý do:** Lịch sử commit là minh chứng của CLO5 và được chấm ở tiêu chí 4. Ở BT2 em làm phần lớn trên máy rồi chép cả thư mục vào repo và commit gộp, nên lịch sử không cho thấy tiến độ thật và khó lần lại khi có lỗi. Không viết lại lịch sử cũ (`rebase`/`force push`) vì như vậy là sửa minh chứng.
- **Ảnh hưởng:** Từ buổi 14: mỗi thành phần BT3 (test plan, từng test case kèm ảnh, từng bug, Dockerfile/compose, deployment guide, API docs, checklist bảo mật) là một commit riêng theo Conventional Commits (`docs(test): …`, `fix(ticket): … (BUG-xx)`, `build(docker): …`), commit và push trong ngày làm, rải đều từ buổi 13 đến buổi 16; chỉ `git add` đúng tệp của việc đó, không `git add .`. Không đổi mã nghiệp vụ, API hay CSDL.

### TD-17 Đặt tên tệp PDF đúng quy ước

- **Phản hồi của GV:** Tên tệp PDF nộp BT2 chưa đúng quy ước `BT2_237480201IS11_MINGBOUPPHAXAYKHAM.pdf`.
- **Quyết định:** SỬA
- **Lý do:** Sai tên tệp là lỗi hình thức bị trừ điểm ở tiêu chí 1 và hoàn toàn tránh được; GV lọc bài theo tên tệp.
- **Ảnh hưởng:** BT3 nộp đúng một tệp `BT3_237480201is11_MingbouphaXaykham.pdf` (không dấu, không khoảng trắng). Trước khi nộp: kiểm lại tên tệp, mở lại tệp đã tải lên E-learning để chắc đọc được, và kiểm trang bìa có link repo + tag `v1.0`. Không ảnh hưởng mã nguồn.

---

## Quyết định kỹ thuật khi làm Bài tập 3 (buổi 13–16)

### TD-18 `npm test` chạy toàn bộ bộ kiểm thử bằng một lệnh

- **Bối cảnh:** Ở BT2, `npm test` chỉ chạy unit test, còn test với CSDL phải gọi riêng `npm run test:db`. Tiêu chí C3 của BT3 yêu cầu bộ kiểm thử PASS bằng **một lệnh**, và giảng viên chạy lệnh đó trong môi trường của Deployment Guide.
- **Quyết định:** `npm test` = `node --test --test-concurrency=1 "tests/*.test.js"` (34 unit + 3 integration + 12 API test); thêm `npm run test:unit` (không cần CSDL) và `npm run test:tc` (12 test case của Test Report, in kết quả thực tế). Thư mục `tests/` được đóng vào image Docker để chạy `docker compose exec app npm test`.
- **Lý do:** Chạy tuần tự từng tệp (`--test-concurrency=1`) vì các tệp test cùng ghi vào một CSDL; mỗi test tự dựng và xoá dữ liệu riêng nên không phụ thuộc dữ liệu có sẵn trên máy.
- **Ảnh hưởng:** `package.json`, `Dockerfile`, `.dockerignore`, `tests/api.db.test.js` (mới), README mục 2 và 6. Không đổi mã nghiệp vụ.

### TD-19 Kiểm tra dữ liệu dùng chung `validators.js`; quy ước mốc lọc hạn xử lý

- **Bối cảnh:** TC-08 và TC-09 phát hiện BUG-04 và BUG-05: `ticketService` tự kiểm tra ngày và độ dài theo cách lỏng hơn `masterDataService`, và T2 đẩy nguyên chuỗi `dueFrom`/`dueTo` xuống SQL.
- **Quyết định:** Thêm `src/backend/services/validators.js` (`isCalendarDate`, `parseDueBound`, `MAX_LEN`) dùng chung cho mọi service. API contract T2 ghi rõ: `dueFrom`/`dueTo` nhận `YYYY-MM-DD` theo giờ Việt Nam (từ 00:00 đến hết 23:59:59 của ngày) hoặc ISO 8601 có múi giờ; giá trị khác → 400 `INVALID_FILTER`. T1 và C2 thêm mã `MODEL_TOO_LONG`, `FULL_NAME_TOO_LONG`.
- **Lý do:** Một quy tắc kiểm tra chỉ nằm ở một nơi thì không thể lệch nhau giữa hai màn hình; mốc lọc phải là một thời điểm xác định, không phụ thuộc múi giờ của CSDL.
- **Ảnh hưởng:** `validators.js` (mới), `ticketService.js`, `masterDataService.js`, `docs/api-contract.md` (T1, T2, C2). Giao diện M2 không phải sửa vì vẫn gửi `YYYY-MM-DD`.

### TD-20 Khoá ký token không nằm trong repo

- **Bối cảnh:** TC-11 phát hiện BUG-06 (Critical): `SECRET_KEY` công khai trong `.env.example` và `docker-compose.yml`, ai cũng ký được token giả. Repo BT3 bắt buộc PUBLIC.
- **Quyết định:** Bỏ giá trị khoá khỏi repo. `config/env.js`: không đặt `SECRET_KEY` → sinh khoá ngẫu nhiên 256 bit mỗi lần khởi động; khoá đã công khai hoặc ngắn hơn 32 ký tự → dừng khởi động với hướng dẫn tạo khoá.
- **Lý do:** Không thể "đổi khoá" bằng cách xoá khỏi lịch sử Git của một repo đã công khai; cách chắc chắn là ứng dụng từ chối chính các khoá đó. Đánh đổi: khi không đặt khoá, người dùng phải đăng nhập lại sau mỗi lần khởi động lại – chấp nhận được với prototype.
- **Ảnh hưởng:** `src/backend/config/env.js`, `.env.example`, `docker-compose.yml`, hai unit test bỏ khoá `'test'`; Deployment Guide mục 3.

### TD-21 Healthcheck có kiểm CSDL; giảm thông tin lộ ra ngoài

- **Bối cảnh:** Phép thử máy trắng của BT3 kiểm `docker compose ps` phải báo **healthy** cho mọi dịch vụ; ở BT2 dịch vụ `app` chưa có healthcheck và `/health` luôn trả `ok` kể cả khi mất CSDL. Checklist bảo mật mục 5–6.
- **Quyết định:** `/health` chạy `SELECT 1`, trả `503` khi mất CSDL; thêm healthcheck cho `app` trong `docker-compose.yml` và `Dockerfile`. Tắt header `X-Powered-By`; log lỗi 500 không ghi trường `detail` của PostgreSQL (có thể chứa số điện thoại).
- **Lý do:** "healthy" phải nghĩa là dùng được thật, không chỉ là tiến trình còn sống.
- **Ảnh hưởng:** `src/backend/app.js`, `src/backend/middlewares/errorHandler.js`, `Dockerfile`, `docker-compose.yml`. Không đổi API nghiệp vụ.

### TD-22 Bộ dữ liệu học phần (`dataset/`) giữ làm tham khảo, chưa nạp vào CSDL

- **Bối cảnh:** Thư mục `dataset/` có `issue_categories.csv`, `technicians.csv` và mẫu 1.000 phiếu (`tickets_history.csv`, `ticket_status_log.csv`, chọn ngẫu nhiên với seed 20260901 từ 7.800 phiếu) của bộ dữ liệu học phần.
- **Quyết định:** Chưa nạp vào CSDL ở BT3; dữ liệu mẫu của hệ thống vẫn do `npm run seed` tạo, test tự dựng dữ liệu riêng.
- **Lý do:** Trạng thái trong dataset (`DA_PHAN_CONG`, `DANG_XU_LY`, `CHO_LINH_KIEN`, `HOAN_TAT`, `DA_DONG`) thuộc cả phần sửa chữa sau luồng L2 và không khớp mô hình trạng thái BR6 (`NEW` → `IN_PROGRESS`, `REJECTED`); phiếu tham chiếu `customer_id`, `product_id`, `center_id` không có trong lược đồ BT1. Nạp vào cần một bảng ánh xạ trạng thái – để dành cho Chuyên đề tốt nghiệp 2.
- **Ảnh hưởng:** Không đổi mã nguồn hay lược đồ.
