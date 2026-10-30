# Nhật ký lỗi (bug log) – Giai đoạn 2

Luồng L2 – Tiếp nhận và phân loại yêu cầu bảo hành · Track SE · Sinh viên: MINGBOUPPHA XAYKHAM – 237480201is11 – 261_71ITGR40203_03

Mỗi lỗi ghi đủ 7 dòng theo quy trình gỡ lỗi của buổi 11: **tái lập → khoanh vùng → sửa nguyên nhân → xác nhận**. Mọi lệnh tái lập chạy được trên dữ liệu mẫu (`npm run migrate`, `npm run seed`) và không để lại dữ liệu. Kết quả ghi bên dưới là kết quả thật của lần chạy ngày 30/10/2026.

Phân loại theo buổi 10: lỗi **hợp đồng dữ liệu** (hai bên hiểu khác nhau về hình dạng dữ liệu) hoặc lỗi **logic**.

---

## BUG-01 – Phân loại phiếu bị CSDL từ chối vì ghi trạng thái trước các cột bắt buộc

- **Loại:** Logic – thứ tự ghi dữ liệu mâu thuẫn với ràng buộc CHECK của CSDL.
- **Triệu chứng:** Chuyển phiếu từ Mới (`NEW`) sang Đã phân loại (`CLASSIFIED`) bị CSDL từ chối bằng lỗi `23514 … violates check constraint "chk_ticket_classified"` khi trạng thái được đổi trước, còn danh mục lỗi, mức ưu tiên, hạn xử lý ghi sau.
- **Tái lập:** Chạy lệnh sau (giao dịch tự huỷ, không để lại phiếu):
  `psql "postgresql://smartcrm:smartcrm@localhost/smartcrm" -c "BEGIN; INSERT INTO ticket (ticket_code, device_id, issue_description, created_by) VALUES ('BH-2099-000001', 1, 'repro', 1); UPDATE ticket SET status = 'CLASSIFIED' WHERE ticket_code = 'BH-2099-000001'; ROLLBACK;"`
  Kết quả: `ERROR: new row for relation "ticket" violates check constraint "chk_ticket_classified"`.
- **Khoanh vùng:** Lỗi nằm ở CSDL, không phải giao diện hay controller: thông báo nêu đúng tên ràng buộc. Trong `db/migrations/001_init_schema.sql`, `chk_ticket_classified` bắt buộc phiếu đã phân loại trở đi phải có `issue_category_id`, `priority`, `due_date`; còn `chk_ticket_assigned` bắt buộc phiếu đã phân công phải có `assigned_to`. Câu UPDATE chỉ đổi `status` vi phạm ngay tại câu lệnh đầu.
- **Nguyên nhân gốc và cách sửa:** Giữ nguyên ràng buộc của BT1, không nới lỏng CSDL. Hàm `updateStatus` trong `ticketRepository.js` nhận thêm `fields` (`issueCategoryId`, `priority`, `dueDate`, `assignedTo`) và ghi cùng trạng thái trong **một** câu UPDATE có điều kiện `status = fromStatus`; `StatusService` là nơi duy nhất gọi hàm này và ghi lịch sử trong cùng giao dịch. Điều kiện `status = fromStatus` còn chặn trường hợp hai Điều phối viên thao tác cùng lúc (409 `DATA_CHANGED`). Ghi nhận ở TD-10 trong `docs/thay-doi-thiet-ke.md`.
- **Xác nhận:** Cách đúng (cùng một câu UPDATE kèm danh mục, mức ưu tiên, hạn xử lý) trả `rowCount = 1`. Unit test FR2 và FR3 trong `statusFlow.unit.test.js` xác nhận service truyền `fields` cùng lần đổi trạng thái. Trên CSDL thật, luồng phân loại và phân công chạy qua giao diện: ảnh `07-m3-da-phan-loai.png` và `08-m3-da-phan-cong.png` trong `docs/ket-qua/buoi10/`.
- **Commit:** `feat: phân loại, từ chối, phân công, nhận phiếu và lịch sử (T4–T8)`

---

## BUG-02 – Cột BIGINT trả về dạng chuỗi nên so sánh id luôn sai

- **Loại:** Hợp đồng dữ liệu – PostgreSQL và JavaScript hiểu khác nhau về kiểu của `id`.
- **Triệu chứng:** Thư viện `pg` trả cột `BIGINT` (`id`, `customer_id`, …) dạng chuỗi `"1"`, không phải số `1`. Phép so sánh nghiêm ngặt `"1" !== 1` luôn đúng, nên quy tắc BR1 (`device.customerId !== customerId` trong `ticketService.js`) sẽ coi thiết bị đúng chủ là của khách khác và trả 409 `DEVICE_OWNER_MISMATCH`; `id` trong JSON cũng sai kiểu so với API contract.
- **Tái lập:** Chạy trong thư mục dự án (đã `npm install`):
  `node -e "const {Pool}=require('pg'); const p=new Pool(require('./src/backend/config/env').db); p.query('SELECT id FROM customer ORDER BY id LIMIT 1').then(r=>{const id=r.rows[0].id; console.log(typeof id, id===1); return p.end();})"`
  Kết quả: `string false`.
- **Khoanh vùng:** Logic BR1 đúng; lỗi nằm ở biên CSDL → service. In `typeof` của `id` ngay sau truy vấn cho thấy là `string`. Theo quy tắc chung của buổi 10, lệch kiểu như vậy là lỗi hợp đồng dữ liệu, không phải lỗi logic.
- **Nguyên nhân gốc và cách sửa:** Mặc định `pg` trả kiểu `int8` (OID 20) dạng chuỗi vì giá trị có thể vượt 2^53. Id của hệ thống nhỏ hơn 2^53 nên đăng ký `types.setTypeParser(20, (value) => Number.parseInt(value, 10))` trong `db.js` (lớp config, dùng chung cho mọi Repository).
- **Xác nhận:** Sau khi nạp `db.js`, cùng truy vấn trả kiểu số: `node -e "const {pool}=require('./src/backend/config/db'); pool.query('SELECT id FROM customer ORDER BY id LIMIT 1').then(r=>{const id=r.rows[0].id; console.log(typeof id, id===1); return pool.end();})"` cho kết quả `number true`. Trên dữ liệu mẫu, tạo phiếu cho khách 1 với IMEI `356789012345678` (thiết bị của khách 1) thành công, mã `BH-2026-000001` (xem `docs/ket-qua/buoi10-api.txt`).
- **Commit:** `feat: CRUD phiếu bảo hành qua 3 lớp controller/service/repository`

---

## BUG-03 – API contract thiếu mã lỗi nên giao diện không phân biệt được lỗi 400

- **Loại:** Hợp đồng dữ liệu – tài liệu API contract và mã nguồn hiểu khác nhau.
- **Triệu chứng:** API contract của BT1 ghi chung cho T4 "400 thiếu `issueCategoryId` hoặc `priority`" và không có mã lỗi nào cho T6 khi thiếu kỹ thuật viên. Giao diện cần mã riêng để hiện đúng thông báo, nhưng contract không cho biết mã nào.
- **Tái lập:** Tìm commit thêm và commit bỏ dòng ghi chung này, rồi xem lại bản cũ của contract:

  ```
  git log --format='%h %s' -S'thiếu `issueCategoryId` hoặc `priority`' -- docs/api-contract.md
  git show <mã commit thêm dòng>:docs/api-contract.md | grep -n 'issueCategoryId` hoặc'
  ```

  Kết quả: mục T4 chỉ có dòng "400 thiếu `issueCategoryId` hoặc `priority`", và T6 không có mã lỗi nào cho trường hợp thiếu kỹ thuật viên.
- **Khoanh vùng:** Mã nguồn đã trả mã lỗi riêng cho từng trường hợp (`classifyService.js`, `assignService.js`) nhưng tài liệu chưa ghi, nên giao diện và tài liệu lệch nhau. Đây là lỗi tài liệu hợp đồng, không phải lỗi logic.
- **Nguyên nhân gốc và cách sửa:** Bổ sung vào `docs/api-contract.md`: T4 có `ISSUE_CATEGORY_REQUIRED`, `ISSUE_CATEGORY_INVALID`, `INVALID_PRIORITY`; T6 có `TECHNICIAN_REQUIRED`. Giao diện hiện thông báo theo mã. Ghi nhận ở TD-11 trong `docs/thay-doi-thiet-ke.md`.
- **Xác nhận:** Unit test `BR4 (dữ liệu sai): mức ưu tiên ngoài HIGH/MEDIUM/LOW → 400 INVALID_PRIORITY` trong `statusFlow.unit.test.js` pass; `npm test` cho 18/18 test pass. Bảng mã lỗi của T4 và T6 trong `docs/api-contract.md` khớp với mã nguồn.
- **Commit:** `feat: phân loại, từ chối, phân công, nhận phiếu và lịch sử (T4–T8)` (mã nguồn) và `docs: README mục 3 mỗi bước một lệnh, trạng thái buổi 10, TD-08 → TD-11` (contract).
