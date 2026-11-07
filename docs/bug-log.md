# Nhật ký lỗi (Bug Log)

Luồng L2 – Tiếp nhận và phân loại yêu cầu bảo hành · Track SE · Sinh viên: MINGBOUPPHA XAYKHAM – 237480201is11 – 261_71ITGR40203_03

Mỗi lỗi ghi đủ **bảy dòng**: mã và mức độ · phát hiện bởi · triệu chứng · cách tái lập · nguyên nhân · cách sửa · commit và xác nhận. Gỡ theo bốn bước của buổi 11: **tái lập → khoanh vùng → sửa nguyên nhân → xác nhận**. Mỗi lỗi sửa trong **một commit riêng** kèm test chứng minh.

Mức độ theo đề BT3 mục 2.3: **Critical** – hệ thống không dùng được, dữ liệu sai hoặc có lỗ hổng bảo mật · **Major** – chức năng quan trọng sai nhưng có cách làm khác · **Minor** – ảnh hưởng trải nghiệm, nghiệp vụ vẫn đúng.

| Mã | Mức độ | Phát hiện bởi | Trạng thái |
|---|---|---|---|
| BUG-04 | Major | TC-08 | Đã sửa |
| BUG-05 | Major | TC-09 | Đã sửa |
| BUG-06 | **Critical** | TC-11 | Đã sửa |
| BUG-01 → BUG-03 | – | Giai đoạn 2 (BT2) | Đã sửa, giữ lại để truy vết |

---

# Giai đoạn 3 – Bài tập 3 (phát hiện khi chạy Test Report ngày 06/11/2026)

## BUG-04 – Tạo phiếu với ngày không có thật hoặc model quá dài trả 500 "Lỗi hệ thống"

1. **Mã và mức độ:** BUG-04 · **Major** – Nhân viên tiếp nhận gõ nhầm ngày (30/02) hay dán model quá dài thì chỉ thấy "Lỗi hệ thống, vui lòng thử lại", không biết ô nào sai. Dữ liệu không hỏng vì giao dịch bị huỷ, và có cách làm khác: nhập lại đúng ngày.
2. **Phát hiện bởi:** TC-08 (dữ liệu sai), lần chạy 1 – mong đợi 400, thực tế 500.
3. **Triệu chứng:** `POST /api/tickets` với thiết bị mới, `warrantyEndDate` = `2026-02-30` → **500** `INTERNAL_ERROR`; `model` dài 101 ký tự → **500** `INTERNAL_ERROR`. Log máy chủ: `date/time field value out of range: "2026-02-30"` và `value too long for type character varying(100)`. Khi viết tài liệu API, phát hiện thêm cùng triệu chứng ở `POST /api/customers` (C2) với họ tên 101 ký tự → **500**.
4. **Cách tái lập:** đăng nhập `tn1`, gọi
   `POST /api/tickets` body `{"customerId":1,"imei":"111111111111111","model":"X","warrantyEndDate":"2026-02-30","issueDescription":"loi"}` → 500. Hoặc chạy `node --test --test-name-pattern="TC-08" tests/api.db.test.js` ở commit `test(api): them 12 test case…`.
5. **Nguyên nhân:** `createTicket` trong `ticketService.js` tự kiểm tra ngày bằng `DATE_RE` + `Date.parse`, mà **V8 chấp nhận `Date.parse('2026-02-30')`** (tự đổi thành 02/03/2026), nên giá trị lọt xuống PostgreSQL và bị cột `DATE` từ chối. Hàm này cũng không kiểm độ dài `model` trong khi cột là `VARCHAR(100)`. Gốc rễ: **hai service kiểm cùng một trường theo hai cách** – `masterDataService.js` (CRUD khách hàng/thiết bị) đã kiểm ngày có thật và giới hạn 100 ký tự, còn `ticketService.js` (T1 và C2) thì không, nên lỗi DB không phải `AppError` và rơi vào nhánh 500 của `errorHandler`.
6. **Cách sửa:** Tạo `src/backend/services/validators.js` – nơi duy nhất có `isCalendarDate()` (so lại chuỗi ISO sau khi parse) và `MAX_LEN` (khớp `VARCHAR` của migration). `ticketService` (T1, C2) và `masterDataService` cùng dùng: ngày không có thật → 400 `WARRANTY_END_DATE_REQUIRED`; model > 100 ký tự → 400 `MODEL_TOO_LONG`; họ tên > 100 ký tự → 400 `FULL_NAME_TOO_LONG`. Bổ sung các mã vào `docs/api-contract.md` mục T1 và C2.
7. **Commit và xác nhận:** (a) `fix(ticket): kiem tra ngay co that va do dai model khi tao phieu, dung chung validators (BUG-04)` – ⟨DÁN LINK COMMIT⟩ → TC-08 PASS (400 `WARRANTY_END_DATE_REQUIRED`, 400 `MODEL_TOO_LONG`, số thiết bị 7 → 7), `npm test` 46/48 (TC-09, TC-11 chờ sửa). (b) `fix(customer): gioi han ho ten 100 ky tu khi tao khach hang C2 (BUG-04, bo sung)` – ⟨DÁN LINK COMMIT⟩ → unit test `BUG-04 (C2, biên)`: 100 ký tự nhận, 101 ký tự → 400 `FULL_NAME_TOO_LONG`; `npm test` 49/49 → ảnh `docs/screenshots/BUG-04-fixed.png`.

---

## BUG-05 – Lọc hạn xử lý theo ngày bỏ sót phiếu hạn trong ngày; giá trị sai trả 500

1. **Mã và mức độ:** BUG-05 · **Major** – Điều phối viên lọc "hạn xử lý từ 07/11 đến 07/11" trên màn hình M2 để tìm phiếu sắp đến hạn thì **không thấy phiếu hạn 15:28 ngày 07/11**, dễ bỏ sót phiếu sắp quá hạn. Có cách làm khác: chọn mốc "đến" là ngày hôm sau.
2. **Phát hiện bởi:** TC-09 (dữ liệu sai), lần chạy 1 – `dueFrom=1` trả 500; khi khoanh vùng phát hiện thêm phân vùng hợp lệ cũng sai.
3. **Triệu chứng:** (a) `GET /api/tickets?dueFrom=1` → **500** `INTERNAL_ERROR`, log `invalid input syntax for type timestamp with time zone: "1"`. (b) Phiếu `BH-2026-000001` hạn `2026-11-07T15:28:57+07:00`, lọc `dueFrom=2026-11-07&dueTo=2026-11-07` → `total = 0`.
4. **Cách tái lập:** đăng nhập `dp1`; tạo và phân loại một phiếu mức `HIGH` (hạn = ngày mai); gọi `GET /api/tickets?dueFrom=<ngày mai>&dueTo=<ngày mai>&q=<mã phiếu>` → `total: 0`. Gọi `GET /api/tickets?dueFrom=1` → 500.
5. **Nguyên nhân:** `listTickets` chỉ kiểm `Date.parse(query.dueFrom)` (V8 chấp nhận cả `"1"` – hiểu là năm 2001) rồi **đẩy nguyên chuỗi người dùng nhập xuống SQL** `t.due_date <= $n`. PostgreSQL tự diễn giải chuỗi đó: `"1"` thì báo lỗi; `"2026-11-07"` thì hiểu là **00:00 đầu ngày theo múi giờ phiên CSDL (UTC)** = 07:00 sáng 07/11 giờ VN, nên mốc "đến" cắt mất phần còn lại của ngày. Service không chuyển mốc lọc thành một thời điểm xác định.
6. **Cách sửa:** Thêm `parseDueBound()` vào `validators.js`: chỉ nhận `YYYY-MM-DD` (ngày có thật, hiểu theo giờ Việt Nam; `dueFrom` = 00:00:00, `dueTo` = 23:59:59.999) hoặc ISO 8601 **có múi giờ**; trả `Date` cho repository. Giá trị khác → 400 `INVALID_FILTER` với thông báo nêu định dạng đúng. Ghi quy ước vào `docs/api-contract.md` mục T2. Màn hình M2 không phải sửa.
7. **Commit và xác nhận:** `fix(ticket): bo loc han xu ly hieu ngay theo gio Viet Nam va tu choi gia tri sai (BUG-05)` – ⟨DÁN LINK COMMIT⟩. Sau khi sửa: TC-09 PASS (`dueFrom=1` → 400 `INVALID_FILTER`; lọc 07/11 → 07/11 thấy 1 phiếu); `npm test` 47/48 → ảnh `docs/screenshots/BUG-05-fixed.png`.

---

## BUG-06 – Khoá ký token nằm công khai trong repo: ai cũng giả mạo được Điều phối viên

1. **Mã và mức độ:** BUG-06 · **Critical** – lỗ hổng bảo mật (OWASP A07 / A02). Repo để PUBLIC, nên bất kỳ ai đọc `docker-compose.yml` đều tự ký được token với vai trò bất kỳ trên mọi bản chạy bằng `docker compose up`, rồi phân loại, phân công, xem dữ liệu khách hàng mà không cần mật khẩu.
2. **Phát hiện bởi:** TC-11 (bảo mật), lần chạy 1 – mong đợi 401, thực tế 200.
3. **Triệu chứng:** token tự ký `jwt.sign({sub:'2', role:'COORDINATOR'}, 'your_secret_key')` gọi `GET /api/technicians` → **200** và trả danh sách kỹ thuật viên. Tương tự với khoá `doi-khoa-bi-mat-nay-khi-trien-khai` ghi trong `docker-compose.yml` v0.2.
4. **Cách tái lập:** chạy hệ thống với `.env` sao chép từ `.env.example` (hoặc `docker compose up`), rồi:
   `node -e "console.log(require('jsonwebtoken').sign({sub:'2',role:'COORDINATOR'},'your_secret_key'))"` → dùng chuỗi in ra làm `Authorization: Bearer …` cho `GET /api/technicians` → 200.
5. **Nguyên nhân:** `config/env.js` chỉ kiểm `SECRET_KEY` **có giá trị**, không kiểm giá trị đó có bí mật hay không; trong khi chính repo cung cấp sẵn hai giá trị công khai – `SECRET_KEY=your_secret_key` trong `.env.example` và `SECRET_KEY: doi-khoa-bi-mat-nay-khi-trien-khai` trong `docker-compose.yml`. Ai chạy theo hướng dẫn đều dùng khoá ai cũng biết, nên chữ ký JWT không còn chứng minh được gì.
6. **Cách sửa:** (1) Xoá khoá khỏi `docker-compose.yml` (chỉ còn `${SECRET_KEY:-}`) và để trống trong `.env.example`. (2) `env.js`: thiếu khoá → tự sinh khoá ngẫu nhiên 256 bit cho lần chạy (cảnh báo phải đăng nhập lại sau khởi động lại); khoá nằm trong danh sách đã công khai hoặc ngắn hơn 32 ký tự → **dừng khởi động** với thông báo hướng dẫn tạo khoá. (3) Bỏ khoá `'test'` trong unit test. Hai khoá cũ vẫn còn trong lịch sử Git nhưng đã **vô hiệu**: ứng dụng từ chối khởi động với chúng (đây chính là bước "đổi khoá" theo đề).
7. **Commit và xác nhận:** `fix(security): bo khoa bi mat khoi repo, tu choi SECRET_KEY yeu hoac da cong khai (BUG-06)` – ⟨DÁN LINK COMMIT⟩. Sau khi sửa: TC-11 PASS (cả hai khoá → 401 `INVALID_TOKEN`); khởi động với `SECRET_KEY=your_secret_key` → dừng với thông báo "SECRET_KEY không an toàn…"; `npm test` 48/48 (trước commit bổ sung của BUG-04) → ảnh `docs/screenshots/BUG-06-fixed.png`.

---

# Giai đoạn 2 – Bài tập 2 (giữ lại để truy vết)

Ghi theo quy trình gỡ lỗi của buổi 11, kết quả chạy ngày 30/10/2026. Phân loại theo buổi 10: lỗi **hợp đồng dữ liệu** hoặc lỗi **logic**.

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
