-- =====================================================================
-- Smart CRM – Mekong Mobile · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành
-- SQL DDL skeleton (SQL Server / T-SQL) · Bài tập 1 · Track SE
-- Nguồn sơ đồ: docs/erd.drawio
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customer – Khách hàng
-- ---------------------------------------------------------------------
CREATE TABLE customer (
    id          BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
    full_name   NVARCHAR(100) NOT NULL,
    phone       VARCHAR(10)   NOT NULL
                CONSTRAINT uq_customer_phone UNIQUE
                CONSTRAINT chk_customer_phone CHECK (phone LIKE REPLICATE('[0-9]', 10)),
    created_at  DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- ---------------------------------------------------------------------
-- 2. device – Thiết bị
-- ---------------------------------------------------------------------
CREATE TABLE device (
    id                 BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
    customer_id        BIGINT        NOT NULL REFERENCES customer (id),
    imei               CHAR(15)      NOT NULL CONSTRAINT uq_device_imei UNIQUE
                       CONSTRAINT chk_device_imei CHECK (imei NOT LIKE '%[^0-9]%' AND LEN(imei) = 15),
    model              NVARCHAR(100) NOT NULL,
    warranty_end_date  DATE          NOT NULL,
    created_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
CREATE INDEX idx_device_customer ON device (customer_id);

-- ---------------------------------------------------------------------
-- 3. issue_category – Danh mục lỗi
-- ---------------------------------------------------------------------
CREATE TABLE issue_category (
    id        BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
    code      VARCHAR(20)   NOT NULL CONSTRAINT uq_issue_category_code UNIQUE,  -- SCREEN, BATTERY, POWER, SOFTWARE…
    name      NVARCHAR(100) NOT NULL CONSTRAINT uq_issue_category_name UNIQUE,  -- Màn hình, Pin, Nguồn, Phần mềm…
    is_active BIT           NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
-- 4. staff – Nhân viên (Nhân viên tiếp nhận / Điều phối viên / Kỹ thuật viên)
-- ---------------------------------------------------------------------
CREATE TABLE staff (
    id             BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
    username       VARCHAR(50)   NOT NULL CONSTRAINT uq_staff_username UNIQUE,
    password_hash  VARCHAR(255)  NOT NULL,
    full_name      NVARCHAR(100) NOT NULL,
    role           VARCHAR(20)   NOT NULL
                   CONSTRAINT chk_staff_role CHECK (role IN ('RECEPTIONIST', 'COORDINATOR', 'TECHNICIAN')),
    is_active      BIT           NOT NULL DEFAULT 1,
    created_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- ---------------------------------------------------------------------
-- 5. ticket – Phiếu bảo hành
-- ---------------------------------------------------------------------
CREATE TABLE ticket (
    id                 BIGINT         NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ticket_code        VARCHAR(14)    NOT NULL CONSTRAINT uq_ticket_code UNIQUE
                       CONSTRAINT chk_ticket_code CHECK (ticket_code LIKE 'BH-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]'),
    device_id          BIGINT         NOT NULL REFERENCES device (id),
    issue_description  NVARCHAR(MAX)  NOT NULL CONSTRAINT chk_ticket_desc CHECK (LEN(LTRIM(RTRIM(issue_description))) > 0),
    issue_category_id  BIGINT         REFERENCES issue_category (id),      -- NULL khi trạng thái NEW
    priority           VARCHAR(10)
                       CONSTRAINT chk_ticket_priority CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    due_date           DATETIMEOFFSET,                                      -- Hạn xử lý (BR4)
    status             VARCHAR(20)    NOT NULL DEFAULT 'NEW'
                       CONSTRAINT chk_ticket_status CHECK (status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    assigned_to        BIGINT         REFERENCES staff (id),               -- Kỹ thuật viên được phân công
    created_by         BIGINT         NOT NULL REFERENCES staff (id),      -- Nhân viên tiếp nhận
    created_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    -- Đã phân loại trở đi thì bắt buộc có danh mục lỗi, mức ưu tiên, hạn xử lý (FR2)
    CONSTRAINT chk_ticket_classified CHECK (
        status IN ('NEW', 'REJECTED')
        OR (issue_category_id IS NOT NULL AND priority IS NOT NULL AND due_date IS NOT NULL)
    ),
    -- Đã phân công trở đi thì bắt buộc có kỹ thuật viên (FR3)
    CONSTRAINT chk_ticket_assigned CHECK (
        status NOT IN ('ASSIGNED', 'IN_PROGRESS') OR assigned_to IS NOT NULL
    )
);

-- NFR1: lọc theo trạng thái + sắp xếp theo hạn xử lý trên màn hình M2
CREATE INDEX idx_ticket_status_due ON ticket (status, due_date);
-- Kỹ thuật viên xem phiếu của mình; đếm số phiếu đang giữ (UC03)
CREATE INDEX idx_ticket_assigned   ON ticket (assigned_to, status);
CREATE INDEX idx_ticket_device     ON ticket (device_id);

-- BR2: một thiết bị có tối đa một phiếu chưa đóng
-- SQL Server không hỗ trợ partial unique index → dùng filtered unique index
CREATE UNIQUE INDEX ux_ticket_open_device ON ticket (device_id)
    WHERE status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS');

-- ---------------------------------------------------------------------
-- 6. ticket_status_log – Lịch sử trạng thái
-- ---------------------------------------------------------------------
CREATE TABLE ticket_status_log (
    id           BIGINT         NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ticket_id    BIGINT         NOT NULL REFERENCES ticket (id),
    from_status  VARCHAR(20)
                 CONSTRAINT chk_log_from CHECK (from_status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    to_status    VARCHAR(20)    NOT NULL
                 CONSTRAINT chk_log_to   CHECK (to_status   IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    note         NVARCHAR(MAX),                                    -- Lý do khi Từ chối (bắt buộc)
    changed_by   BIGINT         NOT NULL REFERENCES staff (id),
    changed_at   DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT chk_log_reject_reason CHECK (
        to_status <> 'REJECTED' OR LEN(LTRIM(RTRIM(ISNULL(note, '')))) > 0
    )
);
-- UC06: xem lịch sử của một phiếu theo thời gian
CREATE INDEX idx_log_ticket_time ON ticket_status_log (ticket_id, changed_at);
