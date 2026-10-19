# Nhật ký thay đổi thiết kế

Luồng L2 – Tiếp nhận và phân loại yêu cầu bảo hành · Track SE

> File này được đọc lại khi chấm BT2 và BT3 (tiêu chí 3: Nhất quán & Tích lũy).
> Mỗi điểm góp ý có đủ bốn dòng: **phản hồi → quyết định → lý do → ảnh hưởng**.
> Khi nhận phản hồi BT2, nối tiếp vào cuối file.

---

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

<!-- TODO (sinh viên): chép từng điểm góp ý của GV vào các mục TD dưới đây.
     Với mỗi điểm: chọn SỬA hoặc GIỮ NGUYÊN, ghi lý do kỹ thuật gắn với phạm vi,
     rồi cập nhật .drawio / srs.md cho khớp. Thêm TD-04, TD-05… nếu GV góp ý nhiều hơn. -->

### TD-01 `<tóm tắt điểm góp ý 1>`

- **Phản hồi của GV:** `<chép nguyên văn hoặc tóm tắt góp ý>`
- **Quyết định:** `<SỬA / GIỮ NGUYÊN>`
- **Lý do:** `<lý do kỹ thuật cụ thể, gắn với FR / NFR / BR của luồng L2>`
- **Ảnh hưởng:** `<file / mục bị sửa: erd.drawio, srs.md mục …, db/schema.sql …>`

### TD-02 `<tóm tắt điểm góp ý 2>`

- **Phản hồi của GV:** `<…>`
- **Quyết định:** `<SỬA / GIỮ NGUYÊN>`
- **Lý do:** `<…>`
- **Ảnh hưởng:** `<…>`

---

## Quyết định kỹ thuật khi hiện thực Sprint 1 (buổi 8)

### TD-03 Chốt công nghệ hiện thực: Node.js 22 + Express 4 + PostgreSQL 16

- **Bối cảnh:** README mục 3 ở BT1 ghi *"Sẽ cập nhật ở Bài tập 2"*; BT1 chỉ chốt ứng dụng web nguyên khối 4 lớp, REST/JSON, PostgreSQL 16.
- **Quyết định:** Dùng Node.js 22 LTS, Express 4, thư viện `pg` (connection pool, SQL tham số hoá), `jsonwebtoken` cho token đăng nhập, `bcryptjs` để băm mật khẩu.
- **Lý do:** Không dùng ORM để giữ đúng sơ đồ kiến trúc: lớp Repository viết SQL tham số hoá, lọc và phân trang ngay trong CSDL (NFR1). Express đủ nhẹ để ánh xạ một–một Controller → Service → Repository.
- **Ảnh hưởng:** README mục 2 và mục 4; `package.json`. Không đổi ERD hay API contract.

### TD-04 Migration dùng `IF NOT EXISTS`, giữ nguyên `db/schema.sql`

- **Bối cảnh:** `db/schema.sql` của BT1 là bản DDL skeleton để nộp; chạy lại lần hai báo lỗi `relation "customer" already exists`.
- **Quyết định:** Tạo `db/migrations/001_init_schema.sql` cùng nội dung DDL nhưng thêm `IF NOT EXISTS`, kèm bảng `schema_migrations` ghi lại migration đã chạy. `db/schema.sql` giữ nguyên làm tài liệu thiết kế.
- **Lý do:** Chạy `npm run migrate` nhiều lần không lỗi; mọi thay đổi lược đồ sau này là một file migration mới (002, 003…) thay vì sửa file cũ.
- **Ảnh hưởng:** Thêm thư mục `db/migrations/`, `scripts/migrate.js`. Lược đồ (6 bảng, 7 khoá ngoại, các ràng buộc CHECK và index) không thay đổi.

### TD-05 Sinh mã phiếu `BH-YYYY-NNNNNN` bằng khoá tư vấn trong giao dịch

- **Bối cảnh:** API contract T1 yêu cầu hệ thống sinh mã phiếu nhưng ERD không có sequence riêng cho mã phiếu.
- **Quyết định:** Trong giao dịch tạo phiếu, TicketRepository gọi `pg_advisory_xact_lock` rồi lấy số thứ tự lớn nhất của năm hiện tại + 1.
- **Lý do:** Hai nhân viên tiếp nhận tạo phiếu cùng lúc không bị trùng mã; không phải thêm bảng hay cột mới vào ERD.
- **Ảnh hưởng:** Chỉ `src/repositories/ticketRepository.js`. ERD giữ nguyên.
