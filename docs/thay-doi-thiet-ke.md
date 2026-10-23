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

---

## Quyết định kỹ thuật khi hiện thực Sprint 2 (buổi 10, ngày 23/10/2026)

### TD-08 Giao diện dùng HTML + JavaScript thuần (ES modules), Express phục vụ cùng cổng với API

- **Bối cảnh:** Sơ đồ kiến trúc BT1 có lớp Giao diện (M1, M2, M3) nhưng chưa chốt công nghệ; slide buổi 10 yêu cầu ≥ 3 màn hình gọi API thật, có `src/api/client.js` và `*.api.js`, không gọi `fetch(` trong màn hình.
- **Quyết định:** `src/ui/` gồm `api/` (client.js là nơi duy nhất gọi `fetch`, `ticket.api.js` ánh xạ từng endpoint), `components/DataState.js` (đang tải · rỗng · lỗi), `pages/` (login, M1, M2, M3). Express phục vụ `src/ui` bằng `express.static` tại `http://localhost:3000/`.
- **Lý do:** Không cần bước build hay cài thêm framework, nên README mục 3 giữ được mỗi bước một lệnh; cùng cổng với API nên không phát sinh lỗi CORS (lỗi tích hợp hay gặp nhất của track SE theo slide buổi 10). Phạm vi chỉ 3 màn hình nên chưa cần React/Vue.
- **Ảnh hưởng:** Thêm `src/ui/*`, một dòng `express.static` trong `src/app.js`. Không đổi ERD, API contract hay lớp nghiệp vụ.

### TD-09 Thu hẹp phạm vi Sprint 2

- **Bối cảnh:** Slide buổi 10 cho phép cắt phần ngoài luồng chính nếu thiếu thời gian, nhưng phải ghi lại.
- **Quyết định:** Phân trang M2 rút gọn thành nút ‹ / › kèm "trang x / y" thay cho dãy số trang như wireframe; chưa đo NFR1 với 10.000 phiếu (chuyển sang trước buổi 12); chưa làm Docker (buổi 11). Giữ nguyên: đủ 3 màn hình, toàn bộ luồng ngoại lệ UC01 và UC03 trên giao diện, ba trạng thái dữ liệu, bộ lọc hạn xử lý từ – đến.
- **Lý do:** Bảng tiêu chí BT2 chấm luồng chính, test và README chứ không chấm số lượng tính năng; dãy số trang không ảnh hưởng FR4 (lọc, tìm, phân trang vẫn đủ).
- **Ảnh hưởng:** Chỉ `src/ui/pages/ticketList.js`. README mục 6 ghi hai việc còn lại.

### TD-10 Đổi trạng thái kèm các cột nghiệp vụ trong cùng một câu lệnh UPDATE

- **Bối cảnh:** DDL BT1 có ràng buộc `chk_ticket_classified` (đã phân loại thì bắt buộc danh mục, mức ưu tiên, hạn xử lý) và `chk_ticket_assigned` (đã phân công thì bắt buộc kỹ thuật viên). Nếu đổi trạng thái trước rồi mới ghi các cột này thì CSDL chặn ngay câu lệnh đầu.
- **Quyết định:** `TicketRepository.updateStatus` nhận thêm `fields` (`issueCategoryId`, `priority`, `dueDate`, `assignedTo`) và ghi cùng trạng thái trong một câu UPDATE có điều kiện `status = fromStatus`. StatusService vẫn là nơi duy nhất gọi hàm này và ghi lịch sử trong cùng giao dịch.
- **Lý do:** Giữ nguyên ràng buộc CHECK của BT1 (không nới lỏng CSDL để chiều mã); điều kiện `status = fromStatus` đồng thời xử lý trường hợp hai Điều phối viên thao tác cùng lúc (UC03-4b → 409 `DATA_CHANGED`).
- **Ảnh hưởng:** `src/repositories/ticketRepository.js`, `src/services/statusService.js`. ERD giữ nguyên.

### TD-11 Bổ sung mã lỗi 400 cho T4 và T6; đổi thứ tự mục README

- **Bối cảnh:** API contract BT1 ghi chung "400 thiếu `issueCategoryId` hoặc `priority`" cho T4 và chưa có mã lỗi khi T6 thiếu kỹ thuật viên. Slide buổi 10 gọi phần các bước dựng hệ thống là README **mục 3**, trong khi README buổi 8 để phần này ở mục 5.
- **Quyết định:** Thêm mã `ISSUE_CATEGORY_REQUIRED`, `ISSUE_CATEGORY_INVALID`, `INVALID_PRIORITY` (T4) và `TECHNICIAN_REQUIRED` (T6) vào `docs/api-contract.md`. Đổi README thành: 1 Giới thiệu · 2 Yêu cầu môi trường · 3 Cài đặt và chạy · 4 Phạm vi · 5 Công nghệ · 6 Trạng thái · 7 Tài liệu.
- **Lý do:** Giao diện cần mã lỗi riêng để hiện đúng thông báo; người chấm đọc README theo số mục trong slide.
- **Ảnh hưởng:** `docs/api-contract.md` mục T4, T6; `README.md`. Không đổi endpoint hay dữ liệu trả về khi thành công.

### TD-12 Tách mã nguồn trong `src/` thành hai thư mục `src/frontend/` và `src/backend/`

- **Bối cảnh:** Theo TD-08, giao diện nằm trong `src/ui/`, lẫn với mã Express và lớp nghiệp vụ trong cùng thư mục `src/`, khó nhận ra ranh giới giữa phần chạy trên trình duyệt và phần chạy trên server.
- **Quyết định:** Chuyển `src/ui/*` sang `src/frontend/`; chuyển mã Express và các lớp nghiệp vụ (`src/app.js`, `src/server.js`, `src/config/`, `src/controllers/`, …) sang `src/backend/`. `db/`, `scripts/`, `tests/`, `package.json`, `.env.example` giữ ở thư mục gốc. Backend vẫn phục vụ `src/frontend/` bằng `express.static` tại `http://localhost:3000/`.
- **Lý do:** Ranh giới rõ ràng: frontend chỉ gọi backend qua REST API, không import mã backend; vẫn giữ cùng cổng nên không phát sinh CORS và không cần bước build.
- **Ảnh hưởng:** Đường dẫn file trong README mục 4; `package.json` (`start`, `dev` trỏ tới `src/backend/server.js`); đường dẫn `require` trong `scripts/` và `tests/`; một dòng `express.static` trong `src/backend/app.js`. Không đổi mã nghiệp vụ, ERD hay API contract. Các mục TD cũ giữ nguyên đường dẫn tại thời điểm ghi.
