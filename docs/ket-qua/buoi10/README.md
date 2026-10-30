# Kết quả chạy luồng chính end-to-end – buổi 10 (Sprint 2)

Chạy ngày 23/10/2026 trên máy cục bộ: Node.js 22, PostgreSQL 16, dữ liệu mẫu từ `npm run seed`, giao diện tại `http://localhost:3000/`.
Luồng chính lấy từ đặc tả **UC01** (BT1) nối tiếp **UC02 → UC03 → UC05 → UC06**.

## Đầu vào

| Bước | Người dùng | Thao tác trên giao diện |
|---|---|---|
| 1 | `tn1` – Lê Thu, Nhân viên tiếp nhận | M1: SĐT `0912345678` → Trần Thị B; IMEI `359876543210987` → iPhone 13 (hết hạn bảo hành 01/01/2026); mô tả "Máy sạc không vào pin, cắm sạc không báo"; Lưu phiếu |
| 2 | `dp1` – Trần Minh, Điều phối viên | M2 → M3: danh mục **Sạc**, mức ưu tiên **Cao**, Lưu phân loại; chọn kỹ thuật viên **Võ Lan**, Phân công |
| 3 | `kt2` – Võ Lan, Kỹ thuật viên | M2 (chỉ thấy phiếu của mình) → M3: Xác nhận nhận phiếu |

## Đầu ra quan sát được

- Phiếu `BH-2026-000001` được sinh mã, trạng thái **Mới**, có nhãn **Hết hạn bảo hành** (BR3, luồng 5c).
- Sau phân loại: trạng thái **Đã phân loại**, hạn xử lý = thời điểm phân loại + 24 giờ (BR4, mức Cao).
- Sau phân công: trạng thái **Đã phân công**, kỹ thuật viên Võ Lan.
- Sau khi kỹ thuật viên nhận: trạng thái **Đang xử lý**; lịch sử có đủ 4 dòng `— → Mới → Đã phân loại → Đã phân công → Đang xử lý`, mỗi dòng ghi đúng người thao tác (NFR5).
- Tạo phiếu lần hai cho cùng IMEI bị chặn ở giao diện với thông báo (5b) và nút Lưu phiếu bị khoá (BR2).
- Không có lỗi JavaScript nào trong suốt luồng (Playwright ghi nhận `pageerror` = 0).

## Ảnh chụp

| File | Nội dung |
|---|---|
| `01-dang-nhap.png` | Trang đăng nhập |
| `02-m1-loi-dinh-dang-2a-4a.png` | M1 – thông báo (2a) SĐT sai, (4a) IMEI sai |
| `03-m1-truoc-khi-luu-5c.png` | M1 – đủ dữ liệu, nhãn Hết hạn bảo hành (5c) |
| `04-m3-da-tao-phieu.png` | M3 – vừa tạo phiếu (UC01 bước 8) |
| `05-m1-chan-br2-5b.png` | M1 – thiết bị đang có phiếu chưa đóng (5b), nút Lưu bị khoá |
| `06-m2-danh-sach-dieu-phoi.png` | M2 – Điều phối viên |
| `07-m3-da-phan-loai.png` | M3 – đã phân loại, hạn xử lý theo BR4 |
| `08-m3-da-phan-cong.png` | M3 – đã phân công (UC03 bước 6) |
| `09-m2-ky-thuat-vien-chi-thay-phieu-cua-minh.png` | M2 – Kỹ thuật viên chỉ thấy phiếu được giao |
| `10-m3-dang-xu-ly-lich-su.png` | M3 – Đang xử lý + lịch sử trạng thái đầy đủ (UC06) |
| `11-m2-trang-thai-rong.png` | Trạng thái **rỗng**: lọc Từ chối không có phiếu nào → câu giải thích |
| `12-m2-trang-thai-loi-tat-backend.png` | Trạng thái **lỗi**: tắt backend → thông báo + nút Thử lại |

Kết quả gọi API trực tiếp (T1–T8, các mã lỗi 400 / 401 / 403 / 409): `docs/ket-qua/buoi10-api.txt` (`bash scripts/demo-api.sh`).
