-- =====================================================================
-- Smart CRM – Mekong Mobile · Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành
-- SQL DDL skeleton (PostgreSQL 16) · Bài tập 1 · Track SE
-- Nguồn sơ đồ: docs/erd.drawio
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customer – Khách hàng
-- ---------------------------------------------------------------------
CREATE TABLE customer (
    id          BIGSERIAL     PRIMARY KEY,
    full_name   VARCHAR(100)  NOT NULL,
    phone       VARCHAR(10)   NOT NULL UNIQUE
                CHECK (phone ~ '^[0-9]{10}$'),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. device – Thiết bị
-- ---------------------------------------------------------------------
CREATE TABLE device (
    id                 BIGSERIAL     PRIMARY KEY,
    customer_id        BIGINT        NOT NULL REFERENCES customer (id),
    imei               CHAR(15)      NOT NULL UNIQUE
                       CHECK (imei ~ '^[0-9]{15}$'),
    model              VARCHAR(100)  NOT NULL,
    warranty_end_date  DATE          NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_customer ON device (customer_id);

-- ---------------------------------------------------------------------
-- 3. issue_category – Danh mục lỗi
-- ---------------------------------------------------------------------
CREATE TABLE issue_category (
    id         BIGSERIAL     PRIMARY KEY,
    code       VARCHAR(20)   NOT NULL UNIQUE,          -- SCREEN, BATTERY, POWER, SOFTWARE…
    name       VARCHAR(100)  NOT NULL UNIQUE,          -- Màn hình, Pin, Nguồn, Phần mềm…
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- 4. staff – Nhân viên (Nhân viên tiếp nhận / Điều phối viên / Kỹ thuật viên)
-- ---------------------------------------------------------------------
CREATE TABLE staff (
    id             BIGSERIAL     PRIMARY KEY,
    username       VARCHAR(50)   NOT NULL UNIQUE,
    password_hash  VARCHAR(255)  NOT NULL,
    full_name      VARCHAR(100)  NOT NULL,
    role           VARCHAR(20)   NOT NULL
                   CHECK (role IN ('RECEPTIONIST', 'COORDINATOR', 'TECHNICIAN')),
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. ticket – Phiếu bảo hành
-- ---------------------------------------------------------------------
CREATE TABLE ticket (
    id                 BIGSERIAL     PRIMARY KEY,
    ticket_code        VARCHAR(14)   NOT NULL UNIQUE
                       CHECK (ticket_code ~ '^BH-[0-9]{4}-[0-9]{6}$'),   -- BH-2026-000123
    device_id          BIGINT        NOT NULL REFERENCES device (id),
    issue_description  TEXT          NOT NULL CHECK (length(trim(issue_description)) > 0),
    issue_category_id  BIGINT        REFERENCES issue_category (id),     -- NULL khi trạng thái NEW
    priority           VARCHAR(10)
                       CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),    -- Cao / Trung bình / Thấp
    due_date           TIMESTAMPTZ,                                      -- Hạn xử lý (BR4)
    status             VARCHAR(20)   NOT NULL DEFAULT 'NEW'
                       CHECK (status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    assigned_to        BIGINT        REFERENCES staff (id),              -- Kỹ thuật viên được phân công
    created_by         BIGINT        NOT NULL REFERENCES staff (id),     -- Nhân viên tiếp nhận
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

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
CREATE INDEX idx_ticket_status_due   ON ticket (status, due_date);
-- Kỹ thuật viên xem phiếu của mình; đếm số phiếu đang giữ (UC03)
CREATE INDEX idx_ticket_assigned     ON ticket (assigned_to, status);
CREATE INDEX idx_ticket_device       ON ticket (device_id);
-- BR2: một thiết bị có tối đa một phiếu chưa đóng
CREATE UNIQUE INDEX ux_ticket_open_device ON ticket (device_id)
    WHERE status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS');

-- ---------------------------------------------------------------------
-- 6. ticket_status_log – Lịch sử trạng thái
-- ---------------------------------------------------------------------
CREATE TABLE ticket_status_log (
    id           BIGSERIAL    PRIMARY KEY,
    ticket_id    BIGINT       NOT NULL REFERENCES ticket (id),
    from_status  VARCHAR(20)                                   -- NULL ở bản ghi tạo phiếu
                 CHECK (from_status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    to_status    VARCHAR(20)  NOT NULL
                 CHECK (to_status IN ('NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED')),
    note         TEXT,                                         -- Lý do khi Từ chối (bắt buộc)
    changed_by   BIGINT       NOT NULL REFERENCES staff (id),
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_log_reject_reason CHECK (
        to_status <> 'REJECTED' OR length(trim(coalesce(note, ''))) > 0
    )
);
-- UC06: xem lịch sử của một phiếu theo thời gian
CREATE INDEX idx_log_ticket_time ON ticket_status_log (ticket_id, changed_at);
