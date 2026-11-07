# Test Report – Bài tập 3

Luồng **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** · Track SE · MINGBOUPPHA XAYKHAM – 237480201is11 – 261_71ITGR40203_03

Kế hoạch: `docs/test-plan.md`. Mã nguồn của 12 test case: `tests/api.db.test.js` (mỗi test đặt tên đúng mã TC).

## Cách chạy lại một test case

```bash
npm run migrate && npm run seed          # một lần, trên CSDL đã cấu hình trong .env
npm run test:tc                          # chạy TC-01 → TC-12, in "thực tế: …" dưới mỗi ca
node --test --test-name-pattern="TC-05" tests/api.db.test.js   # chạy riêng một ca
# Trong Docker:  docker compose exec app npm run test:tc
```

Mỗi test tự tạo khách hàng/thiết bị riêng (điện thoại `09888xxxxx`, IMEI `98880xxxxxxxxxx`) và xoá sạch trước/sau, nên tiền điều kiện được dựng lại mỗi lần chạy. Tài khoản `tn1` (Nhân viên tiếp nhận), `dp1` (Điều phối viên), `kt1`, `kt2` (Kỹ thuật viên), `kt3` (Kỹ thuật viên đã khoá) đến từ `npm run seed`.

## Lịch sử các lần chạy

| Lần | Ngày | Mã nguồn | Kết quả `npm test` | Ghi chú |
|---|---|---|---|---|
| 1 | 06/11/2026 | commit `test(api): them 12 test case TC-01..TC-12…` | **45/48 PASS, 3 FAIL** (TC-08, TC-09, TC-11) | Ba lỗi thật → BUG-04, BUG-05, BUG-06 trong `docs/bug-log.md` |
| 2 | 06/11/2026 | sau ba commit `fix(…)` (BUG-04, BUG-05, BUG-06) | **48/48 PASS** | 12/12 TC PASS |
| 3 | 06/11/2026 | sau commit bổ sung `fix(customer)…(BUG-04, bo sung)` + 1 unit test | **49/49 PASS** | Ảnh: `docs/screenshots/TC-xx.png`, `docs/screenshots/npm-test-pass.png` |

## Bảng test case (kết quả thực tế của lần chạy cuối; lần FAIL ghi kèm)

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| **TC-01** · BR1 · FR1 · US1 | Khách hàng K và thiết bị D thuộc K; D chưa có phiếu | 1. `tn1` gọi `POST /api/tickets` · 2. đếm phiếu của D · 3. `GET …/history` | `customerId`=K, `imei` của D, mô tả "Màn hình không lên" | 201, mã `BH-YYYY-NNNNNN`, trạng thái `NEW`; số phiếu của D tăng đúng 1; lịch sử 1 dòng `null → NEW` | Cao | 201 `BH-2026-000001`, `NEW`; phiếu của D 0 → 1; lịch sử 1 dòng (null → NEW) | PASS · `TC-01.png` |
| **TC-02** · BR2 | D đã có một phiếu `NEW` chưa đóng | 1. `tn1` tạo phiếu thứ hai cho D · 2. đếm phiếu của D | cùng `imei`, mô tả "Lỗi lần hai" | 409 `TICKET_OPEN_EXISTS`, `details.openTicketCode` = mã phiếu cũ; số phiếu không đổi | Cao | 409 `TICKET_OPEN_EXISTS`, openTicketCode=`BH-2026-000002`; phiếu của D 1 → 1 | PASS · `TC-02.png` |
| **TC-03** · BR3 – biên trong | D hết hạn bảo hành **hôm nay** (giờ VN) | `tn1` tạo phiếu cho D | `warranty_end_date` = 2026-11-06 | 201, `outOfWarranty = false` (ngày cuối còn bảo hành) | Cao | hết hạn 2026-11-06 → 201, `outOfWarranty=false` | PASS · `TC-03.png` |
| **TC-04** · BR3 – biên ngoài | D hết hạn bảo hành **hôm qua** | `tn1` tạo phiếu cho D | `warranty_end_date` = 2026-11-05 | 201, `outOfWarranty = true` (ngày đầu tiên hết bảo hành) | Cao | hết hạn 2026-11-05 → 201, `outOfWarranty=true` | PASS · `TC-04.png` |
| **TC-05** · BR4 · FR2 | Phiếu P ở trạng thái `NEW` | 1. ghi thời điểm gọi t0 · 2. `dp1` gọi `POST …/classify` | `issueCategoryId`=1, `priority`=`HIGH` | 200 `CLASSIFIED`; `dueDate` = thời điểm phân loại + 24 giờ | Cao | 200 `CLASSIFIED`; gọi lúc 08:31:57Z, `dueDate`=2026-11-07T15:31:57+07:00 (lệch 24,000 giờ) | PASS · `TC-05.png` |
| **TC-06** · BR5 · UC03-4b | P đã phân loại; `kt3` đã bị khoá | 1. `dp1` gọi `POST …/assign` · 2. `GET` chi tiết P | `technicianId` = id của `kt3` | 409 `DATA_CHANGED`; P vẫn `CLASSIFIED`, chưa có kỹ thuật viên | Cao | 409 `DATA_CHANGED` "Kỹ thuật viên không còn khả dụng, vui lòng tải lại"; P vẫn `CLASSIFIED`, technician=null | PASS · `TC-06.png` |
| **TC-07** · BR6 | P đã phân loại (lịch sử 2 dòng) | 1. `dp1` gọi `POST …/reject` · 2. đếm lịch sử | `reason` = "Không thuộc bảo hành" | 409 `INVALID_STATUS`, thông báo nêu chỉ từ chối được phiếu *Mới*; lịch sử không thêm dòng | Trung bình | 409 `INVALID_STATUS` "Chỉ phân loại hoặc từ chối phiếu đang ở trạng thái Mới"; lịch sử 2 → 2 dòng | PASS · `TC-07.png` |
| **TC-08** · Dữ liệu sai · UC01-5a | Khách hàng K; IMEI chưa đăng ký | `tn1` tạo phiếu kèm thiết bị mới: (a) ngày sai, (b) model dài | (a) `warrantyEndDate`=`2026-02-30` · (b) `model` = 101 ký tự "A" | 400 kèm mã: (a) `WARRANTY_END_DATE_REQUIRED`, thông báo nêu `YYYY-MM-DD`; (b) `MODEL_TOO_LONG`; không tạo thiết bị | Cao | **Lần 1:** (a) và (b) đều **500** `INTERNAL_ERROR` "Lỗi hệ thống" → **FAIL → BUG-04**. **Lần 2:** (a) 400 `WARRANTY_END_DATE_REQUIRED`; (b) 400 `MODEL_TOO_LONG`; thiết bị 7 → 7 | Lần 1 FAIL · Lần 2 PASS · `TC-08-fail.png`, `TC-08.png` |
| **TC-09** · Dữ liệu sai · FR4 | P đã phân loại `HIGH`, hạn ngày N (giờ VN) | 1. `dp1` gọi `GET /api/tickets?dueFrom=1` · 2. lọc `dueFrom=N&dueTo=N&q=<mã P>` | (1) `dueFrom=1` · (2) N dạng `YYYY-MM-DD` như ô ngày của M2 | (1) 400 `INVALID_FILTER`, thông báo nêu `dueFrom`; (2) 200, danh sách có P | Trung bình | **Lần 1:** (1) **500** `INTERNAL_ERROR`; (2) lọc 2026-11-07 → 2026-11-07 ra **0 phiếu** dù P hạn 2026-11-07 15:28 → **FAIL → BUG-05**. **Lần 2:** (1) 400 `INVALID_FILTER`; (2) thấy 1 phiếu (P, hạn 2026-11-07T15:31:57+07:00) | Lần 1 FAIL · Lần 2 PASS · `TC-09-fail.png`, `TC-09.png` |
| **TC-10** · Bảo mật A01 · NFR4 | P đã phân công cho `kt2` | `kt1` gọi: 1. `GET /api/tickets/P` · 2. `GET …/history` · 3. `POST …/start`; 4. `kt2` gọi `GET /api/tickets/P` | token của `kt1`, `kt2` | 1–3: 403 `FORBIDDEN_ROLE`, không có dữ liệu khách hàng trong phản hồi; 4: 200 | Cao | `kt1`: chi tiết 403 `FORBIDDEN_ROLE`, lịch sử 403, nhận phiếu 403; `kt2`: 200 | PASS · `TC-10.png` |
| **TC-11** · Bảo mật A07 | Hệ thống chạy theo cấu hình trong repo | Ký token giả `{sub: dp1, role: COORDINATOR}` bằng khoá công khai, gọi `GET /api/technicians` | khoá `your_secret_key` (`.env.example`) và `doi-khoa-bi-mat-nay-khi-trien-khai` (`docker-compose.yml` v0.2) | 401 `INVALID_TOKEN` với cả hai khoá | Cao | **Lần 1:** **200** – trả danh sách kỹ thuật viên cho token giả → **FAIL → BUG-06**. **Lần 2:** cả hai khoá → 401 `INVALID_TOKEN`; khởi động với `SECRET_KEY=your_secret_key` bị từ chối với thông báo rõ | Lần 1 FAIL · Lần 2 PASS · `TC-11-fail.png`, `TC-11.png` |
| **TC-12** · Tái lập · C8 | CSDL đã migrate + seed một lần | 1. đếm bản ghi · 2. chạy lại `scripts/migrate.js` và `scripts/seed.js` · 3. đếm lại | – | Không lỗi; số bản ghi `schema_migrations`, `issue_category`, `staff`, khách hàng và thiết bị mẫu không đổi | Cao | trước `{migrations:1, categories:7, staff:5, customers:3, devices:4}` · sau lần hai giống hệt | PASS · `TC-12.png` |

## Tổng kết theo tiêu chí của Test Plan

| Tiêu chí (Test Plan mục 3) | Kết quả |
|---|---|
| 12/12 TC PASS ở lần chạy cuối | **Đạt** – 12/12 |
| 6/6 quy tắc BR1–BR6 có test | **Đạt** – BR1 TC-01 · BR2 TC-02 · BR3 TC-03, TC-04 · BR4 TC-05 · BR5 TC-06 · BR6 TC-07 |
| 0 bug Critical đang mở | **Đạt** – BUG-06 (Critical) đã sửa |
| `npm test` 49/49 bằng một lệnh | **Đạt** – 34 unit + 3 integration + 12 API |
| Phép thử máy trắng ≤ 2 lệnh, cả hai dịch vụ healthy | Xem `docs/deployment-guide.md` mục 5 và ảnh `docs/screenshots/may-trang-*.png` |
| Chạy lại migrate + seed không đổi số bản ghi | **Đạt** – TC-12 |
