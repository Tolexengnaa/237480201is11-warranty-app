# Test Plan rút gọn – Bài tập 3

Luồng **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** · Track SE · MINGBOUPPHA XAYKHAM – 237480201is11 – 261_71ITGR40203_03

## 1. Phạm vi kiểm thử và phần CHỦ Ý KHÔNG kiểm

**Kiểm:** sáu quy tắc nghiệp vụ đã hiện thực (BR1–BR6) qua API thật T1–T8; kiểm tra dữ liệu đầu vào của T1 (tạo phiếu) và T2 (lọc danh sách); phân quyền theo vai trò và theo chủ sở hữu phiếu (NFR4, OWASP A01); xác thực token (OWASP A07); tính tái lập của `migrate` + `seed`.

| Không kiểm | Lý do |
|---|---|
| Bố cục, màu sắc giao diện M1–M4 | Không chứa quy tắc nghiệp vụ; ba trạng thái đang tải · rỗng · lỗi đã có ảnh minh chứng ở BT2 (`docs/ket-qua/buoi12/`). |
| NFR1 – danh sách < 2 giây với 10.000 phiếu | Kiểm thử hiệu năng không thuộc phạm vi BT3 (đề mục 1, "KHÔNG yêu cầu"). |
| NFR2 – nhân viên mới tạo phiếu ≤ 3 phút | Cần 5 người dùng thật bấm giờ; không làm được trong phạm vi cá nhân. |
| Hai Điều phối viên thao tác cùng lúc (409 `DATA_CHANGED`) | Đã có unit test với đối tượng giả; tái hiện tranh chấp thật qua API không ổn định nên không đưa vào Test Report. |
| CRUD khách hàng/thiết bị (M4) | Không thuộc luồng chính L2; quy tắc chặn xoá đã có 10 unit test ở BT2. |

**Kỹ thuật chọn dữ liệu:** phân vùng tương đương (hợp lệ / không hợp lệ) cho ngày tháng và bộ lọc; giá trị biên hai phía cho BR3 – thiết bị hết hạn bảo hành **hôm nay** (còn bảo hành) và **hôm qua** (hết bảo hành).

## 2. Loại test và số lượng mỗi tầng

| Tầng | Tệp | Số lượng | Chạy với |
|---|---|---|---|
| Unit test (lớp service, đối tượng giả) | `tests/*.unit.test.js` | 34 | Không cần CSDL |
| Integration test (service + PostgreSQL thật) | `tests/br2.db.test.js` | 3 | CSDL thật |
| API test (HTTP → controller → service → repository → CSDL) | `tests/api.db.test.js` | **12** – chính là TC-01 → TC-12 của Test Report | CSDL thật |
| **Tổng** | | **49** | `npm test` (một lệnh) |

Phân bổ 12 test case của Test Report theo năm loại của đề:

| Loại | Số TC | Mã |
|---|---|---|
| Luồng đúng – mỗi quy tắc ≥ 1 test | 5 | TC-01 (BR1), TC-02 (BR2), TC-05 (BR4), TC-06 (BR5), TC-07 (BR6) |
| Giá trị biên – hai phía cùng một ranh giới | 2 | TC-03, TC-04 (BR3) |
| Dữ liệu sai – kiểm cả mã trạng thái và thông báo | 2 | TC-08, TC-09 |
| Bảo mật | 2 | TC-10 (A01 – chủ sở hữu phiếu), TC-11 (A07 – token giả) |
| Tái lập | 1 | TC-12 |

## 3. Tiêu chí thành công ĐO ĐƯỢC

1. **12/12** test case trong Test Report PASS ở lần chạy cuối; mọi lần FAIL trước đó có mục Bug Log tương ứng.
2. **6/6** quy tắc nghiệp vụ BR1–BR6 có ít nhất một test case.
3. **0** bug mức Critical đang mở.
4. `npm test` chạy **49/49** test PASS bằng một lệnh, không phụ thuộc dữ liệu có sẵn trên máy.
5. Phép thử máy trắng: hệ thống lên bằng **≤ 2 lệnh** theo `docs/deployment-guide.md`, `docker compose ps` báo cả hai dịch vụ `healthy`.
6. Chạy lại `migrate` + `seed` lần hai: số bản ghi của 4 bảng danh mục **không đổi**.

## 4. Môi trường và dữ liệu thử

- **Môi trường:** Docker Compose (`postgres:16-alpine` + `node:22-alpine`), chạy test bằng `docker compose exec app npm test`. Có thể chạy ngoài Docker với Node.js 22 + PostgreSQL 16 theo README.
- **Dữ liệu nền:** `npm run seed` – 7 danh mục lỗi, 5 nhân viên (`tn1` tiếp nhận, `dp1` điều phối, `kt1`, `kt2` kỹ thuật viên đang hoạt động, `kt3` đã khoá), 3 khách hàng, 3 thiết bị. Mật khẩu chung chỉ dùng cho máy phát triển.
- **Dữ liệu riêng của test:** mỗi test tự tạo khách hàng/thiết bị với số điện thoại `09888xxxxx` và IMEI `98880xxxxxxxxxx` không trùng dữ liệu mẫu; xoá sạch trước và sau khi chạy (`cleanup()` trong `tests/api.db.test.js`). Không dùng dữ liệu còn sót trên máy.
- **Ảnh chụp:** kết quả mỗi lần chạy lưu ở `docs/screenshots/TC-xx.png`.
