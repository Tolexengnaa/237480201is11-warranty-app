# 237480201is11-warranty-app – Smart CRM · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Đồ án học phần **Chuyên đề tốt nghiệp 1** – Trường Đại học Văn Lang, Khoa Công nghệ Thông tin – Học kỳ 1, năm học 2026 – 2027.

---

## 1. Giới thiệu đề tài

| Mục | Nội dung |
|---|---|
| Case study | Smart CRM – Mekong Mobile |
| Luồng nghiệp vụ | **L2 – Tiếp nhận và phân loại yêu cầu bảo hành** |
| Track | **SE** (Software Engineering) |
| Sinh viên | `MINGBOUPPHA XAYKHAM` – `237480201is11` – `261_71ITGR40203_03` |
| Giảng viên | `Nguyễn Minh Tân` |

Mekong Mobile tiếp nhận yêu cầu bảo hành thiết bị tại cửa hàng nhưng còn ghi chép thủ công, nên khó biết phiếu nào đang chờ, phiếu nào trễ hạn và ai đang xử lý. Dự án số hoá đoạn từ lúc khách mang thiết bị đến cửa hàng cho tới khi **phiếu bảo hành** được phân loại, đặt **mức ưu tiên** và giao cho **kỹ thuật viên**.

## 2. Phạm vi

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

## 3. Công nghệ

*Sẽ cập nhật ở Bài tập 2.* Đã chốt ở BT1: ứng dụng web nguyên khối 4 lớp, REST/JSON, CSDL **PostgreSQL 16**.

## 4. Cấu trúc thư mục

```
237480201is11-warranty-app/
├── README.md
├── .gitignore
├── .env.example            # mẫu biến môi trường, không chứa mật khẩu thật
├── docs/
│   ├── srs.md              # nguồn Markdown của file PDF nộp (Mục 1–5 + Phụ lục)
│   ├── usecase.drawio      # Use Case Diagram – file gốc
│   ├── architecture.drawio # sơ đồ kiến trúc – file gốc
│   ├── erd.drawio          # ERD – file gốc
│   ├── wireframe.drawio    # wireframe 3 màn hình – file gốc
│   ├── wireframe.png       # ảnh wireframe
│   ├── export/             # ảnh PNG xuất từ các file .drawio để chèn PDF
│   ├── api-contract.md     # hợp đồng REST API (track SE)
│   └── ai-disclosure.md    # bảng khai báo sử dụng công cụ AI
├── db/
│   └── schema.sql          # SQL DDL skeleton (PostgreSQL 16)
├── src/                    # mã nguồn – bắt đầu từ BT2
└── tests/                  # kiểm thử – bắt đầu từ BT2
```

## 5. Cài đặt và chạy

*Sẽ cập nhật ở Bài tập 2.* Hiện có thể kiểm tra lược đồ CSDL:

```bash
createdb warranty
psql -d warranty -f db/schema.sql
```

## 6. Tài liệu thiết kế

| Tài liệu | File | Cách mở |
|---|---|---|
| SRS rút gọn, Use Case, kiến trúc, mô hình dữ liệu, wireframe | `docs/srs.md` | Xem trực tiếp trên GitHub |
| Use Case Diagram | `docs/usecase.drawio` | Mở bằng [draw.io](https://app.diagrams.net) (File → Open) hoặc extension *Draw.io Integration* trong VS Code |
| Sơ đồ kiến trúc | `docs/architecture.drawio` | như trên |
| ERD | `docs/erd.drawio` | như trên |
| Wireframe | `docs/wireframe.drawio`, `docs/wireframe.png` | như trên |
| SQL DDL | `db/schema.sql` | Chạy bằng `psql` (mục 5) |
| API contract | `docs/api-contract.md` | Xem trực tiếp trên GitHub |
| Khai báo sử dụng AI | `docs/ai-disclosure.md` | Xem trực tiếp trên GitHub |

**Nhật ký phiên bản**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | `<09/10/2026>` | Nộp Bài tập 1 – Phân tích và Thiết kế |
