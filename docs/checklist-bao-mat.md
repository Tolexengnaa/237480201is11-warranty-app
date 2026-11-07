# Checklist bảo mật – Bài tập 3 (tự đánh giá)

Luồng L2 · Track SE · MINGBOUPPHA XAYKHAM – 237480201is11 · Đánh giá bằng cách **chạy thử** ngày 06/11/2026 trên mã nguồn tag `v1.0`.

Mỗi mục ghi một trong ba giá trị **ĐÃ LÀM / CHƯA LÀM / KHÔNG ÁP DỤNG**, kèm một dòng minh chứng (lệnh đã chạy + kết quả, hoặc tệp/test). Ảnh chụp: `docs/screenshots/bao-mat-*.png`.

| # | Mục | Giá trị | Minh chứng |
|---|---|---|---|
| 1 | Không có secret nào trong repo | **ĐÃ LÀM** | `git ls-files \| grep -i "\.env"` → chỉ `.env.example`. Khoá ký token đã bỏ khỏi `docker-compose.yml` và `.env.example`; hai khoá từng công khai còn trong lịch sử Git bị ứng dụng **từ chối khởi động** (BUG-06, TC-11: token ký bằng chúng → 401). Các giá trị còn lại trong repo là mặc định cho máy phát triển, không phải secret thật: mật khẩu CSDL `smartcrm` của container `db` (không mở cổng ra ngoài máy – `docker-compose.yml` không có `ports` cho `db`) và mật khẩu tài khoản mẫu `Matkhau@123` trong `scripts/seed.js` (Deployment Guide mục 4 yêu cầu đổi khi dùng thật). |
| 2 | Dữ liệu vào được kiểm ở tầng ứng dụng | **ĐÃ LÀM** | Kiểm trong lớp service trước khi chạm CSDL, dùng chung `src/backend/services/validators.js`; SQL luôn tham số hoá (`$1, $2…`, không nối chuỗi). TC-08 (ngày 2026-02-30, model 101 ký tự → 400), TC-09 (`dueFrom=1` → 400), unit test S1 biên/sai (`masterData.unit.test.js`). |
| 3 | Kiểm soát truy cập theo chủ sở hữu | **ĐÃ LÀM** | `ticketService.getTicket`, `getHistory`, `startTicket` so `ticket.assignedTo` với người gọi; T2 lọc `assignedTo` cho kỹ thuật viên. TC-10: `kt1` xem / xem lịch sử / nhận phiếu của `kt2` → 403 `FORBIDDEN_ROLE`, `kt2` → 200. Quyền theo vai trò kiểm ở service (NFR4), không dựa vào ẩn nút. |
| 4 | Mật khẩu và dữ liệu nhạy cảm được băm hoặc mã hoá | **ĐÃ LÀM** | `psql … -c "select username, left(password_hash,7), length(password_hash) from staff"` → cả 5 tài khoản `$2b$10$…`, dài 60 (bcrypt, cost 10). So khớp bằng `bcrypt.compare` (`authService.js`); API không bao giờ trả `password_hash`. |
| 5 | Thông báo lỗi không lộ cấu trúc bên trong | **ĐÃ LÀM** | Lỗi lạ trả `500 {"code":"INTERNAL_ERROR","message":"Lỗi hệ thống, vui lòng thử lại"}` – không stack, không tên bảng, không SQL (xem kết quả lần 1 của TC-08, TC-09). Mất CSDL → `503 DB_UNAVAILABLE`. `curl -sI http://localhost:3000/api/tickets \| grep -i x-powered` → không còn dòng nào (đã tắt `X-Powered-By`). Đăng nhập sai tên hay sai mật khẩu cùng một thông báo. |
| 6 | Nhật ký không ghi secret hay dữ liệu cá nhân không cần thiết | **ĐÃ LÀM** | Ứng dụng không ghi body request, mật khẩu hay token. Lỗi 500 chỉ ghi `[tên mã] thông điệp + stack`, bỏ trường `detail` của PostgreSQL vì có thể chứa số điện thoại (`errorHandler.js`). Kiểm: `grep -rn "console\." src/backend` → chỉ 4 lời gọi ghi log: dòng khởi động (`server.js`), cảnh báo thiếu `SECRET_KEY` (`env.js`), mất kết nối CSDL – chỉ mã lỗi, và lỗi 500 (`errorHandler.js`); dòng thứ năm grep thấy là chuỗi hướng dẫn tạo khoá trong thông báo lỗi. |
| 7 | Phụ thuộc được ghim phiên bản và đã kiểm cảnh báo lỗ hổng cơ bản | **ĐÃ LÀM** | `package-lock.json` được commit; Docker cài bằng `npm ci --omit=dev` (đúng phiên bản trong lock). `npm audit --omit=dev` → `found 0 vulnerabilities`. Phiên bản: express 4.22.3, pg 8.23.1, jsonwebtoken 9.0.3, bcryptjs 3.0.3, dotenv 18.0.8. Ảnh nền ghim `node:22-alpine`, `postgres:16-alpine`. |

## Giới hạn đã biết (CHƯA LÀM – ghi trung thực, ngoài 7 mục trên)

| Giới hạn | Rủi ro | Hướng xử lý nếu triển khai thật |
|---|---|---|
| Không giới hạn số lần đăng nhập sai | Dò mật khẩu bằng vét cạn | Thêm rate limit (ví dụ `express-rate-limit`) cho `/api/auth/login`. |
| Không có HTTPS | Token đi dạng rõ trên mạng | Đặt sau reverse proxy có TLS (Nginx, Caddy) hoặc nền tảng PaaS có HTTPS. |
| Không thu hồi được token trước khi hết hạn (8 giờ) | Token bị lộ dùng được tới khi hết hạn | Tài khoản bị khoá đã bị chặn ngay (đọc lại CSDL mỗi lần gọi); muốn thu hồi từng token cần danh sách đen. |
| Không có CSP / các header bảo mật khác cho giao diện | Giảm lớp phòng thủ XSS | Thêm `helmet`; giao diện hiện không dùng `innerHTML` (`grep -rn innerHTML src/frontend` → rỗng). |
