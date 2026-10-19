// TicketRepository – đọc / ghi bảng ticket. Lọc và phân trang ngay trong CSDL (NFR1).
const { pool } = require('../config/db');

const OPEN_STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS'];

/**
 * Sinh mã phiếu BH-YYYY-NNNNNN (TD-05). Phải gọi bên trong giao dịch:
 * khoá tư vấn giữ tới khi giao dịch kết thúc nên hai phiếu tạo cùng lúc không trùng mã.
 */
async function nextTicketCode(year, client) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`ticket_code_${year}`]);
  const { rows } = await client.query(
    `SELECT coalesce(max(substring(ticket_code FROM 9)::int), 0) + 1 AS next
       FROM ticket WHERE ticket_code LIKE $1`,
    [`BH-${year}-%`],
  );
  return `BH-${year}-${String(rows[0].next).padStart(6, '0')}`;
}

async function findOpenByDeviceId(deviceId, db = pool) {
  const { rows } = await db.query(
    'SELECT ticket_code AS "ticketCode" FROM ticket WHERE device_id = $1 AND status = ANY($2)',
    [deviceId, OPEN_STATUSES],
  );
  return rows[0] || null;
}

async function insert({ ticketCode, deviceId, issueDescription, createdBy }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO ticket (ticket_code, device_id, issue_description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, ticket_code AS "ticketCode", status, created_at AS "createdAt"`,
    [ticketCode, deviceId, issueDescription, createdBy],
  );
  return rows[0];
}

/** T3 – chi tiết phiếu, đủ trường cho màn hình M3. */
async function findDetailByCode(ticketCode, db = pool) {
  const { rows } = await db.query(
    `SELECT t.id, t.ticket_code AS "ticketCode", t.status, t.priority, t.due_date AS "dueDate",
            t.issue_description AS "issueDescription", t.created_at AS "createdAt",
            t.assigned_to AS "assignedTo",
            ic.id AS "categoryId", ic.name AS "categoryName",
            c.full_name AS "customerName", c.phone AS "customerPhone",
            d.imei, d.model, to_char(d.warranty_end_date, 'YYYY-MM-DD') AS "warrantyEndDate",
            tech.id AS "technicianId", tech.full_name AS "technicianName",
            cb.full_name AS "createdByName"
       FROM ticket t
       JOIN device d   ON d.id = t.device_id
       JOIN customer c ON c.id = d.customer_id
       JOIN staff cb   ON cb.id = t.created_by
       LEFT JOIN issue_category ic ON ic.id = t.issue_category_id
       LEFT JOIN staff tech        ON tech.id = t.assigned_to
      WHERE t.ticket_code = $1`,
    [ticketCode],
  );
  return rows[0] || null;
}

/**
 * T2 – danh sách phiếu: lọc, tìm, phân trang trong CSDL.
 * filters: { status, priority, dueFrom, dueTo, q, assignedTo, page, size }
 */
async function search(filters, db = pool) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.status) add('t.status = ?', filters.status);
  if (filters.priority) add('t.priority = ?', filters.priority);
  if (filters.dueFrom) add('t.due_date >= ?', filters.dueFrom);
  if (filters.dueTo) add('t.due_date <= ?', filters.dueTo);
  if (filters.assignedTo) add('t.assigned_to = ?', filters.assignedTo);
  if (filters.q) {
    params.push(filters.q);
    const p = `$${params.length}`;
    where.push(`(t.ticket_code = ${p} OR c.phone = ${p})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM ticket t
       JOIN device d   ON d.id = t.device_id
       JOIN customer c ON c.id = d.customer_id
       LEFT JOIN staff tech ON tech.id = t.assigned_to`;

  const total = await db.query(`SELECT count(*)::int AS total ${from} ${whereSql}`, params);

  const limitIdx = params.length + 1;
  const { rows } = await db.query(
    `SELECT t.ticket_code AS "ticketCode", c.full_name AS "customerName", c.phone AS "customerPhone",
            d.model, t.status, t.priority, t.due_date AS "dueDate",
            (t.due_date IS NOT NULL AND t.due_date < now()
               AND t.status IN ('CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS')) AS overdue,
            tech.full_name AS "technicianName"
       ${from} ${whereSql}
      ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC
      LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
    [...params, filters.size, (filters.page - 1) * filters.size],
  );
  return { total: total.rows[0].total, items: rows };
}

module.exports = { OPEN_STATUSES, nextTicketCode, findOpenByDeviceId, insert, findDetailByCode, search };

/**
 * Đổi trạng thái có điều kiện: chỉ cập nhật khi phiếu vẫn ở `fromStatus`.
 * Trả về false nếu người khác đã đổi trước (→ 409 DATA_CHANGED). Chỉ StatusService được gọi hàm này.
 */
async function updateStatus({ ticketId, fromStatus, toStatus }, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE ticket SET status = $3, updated_at = now() WHERE id = $1 AND status = $2',
    [ticketId, fromStatus, toStatus],
  );
  return rowCount === 1;
}

module.exports.updateStatus = updateStatus;
