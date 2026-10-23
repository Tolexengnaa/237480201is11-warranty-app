// StatusLogRepository – bảng ticket_status_log. Chỉ thêm và đọc, không sửa / xoá (BR6).
const { pool } = require('../config/db');

async function insert({ ticketId, fromStatus, toStatus, note, changedBy }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, note, changed_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [ticketId, fromStatus, toStatus, note || null, changedBy],
  );
  return rows[0];
}

module.exports = { insert };

/** T8 – lịch sử trạng thái của một phiếu, cũ trước mới sau (index idx_log_ticket_time). */
async function listByTicketId(ticketId, db = pool) {
  const { rows } = await db.query(
    `SELECT l.changed_at AS "changedAt", l.from_status AS "fromStatus", l.to_status AS "toStatus",
            s.full_name AS "changedBy", l.note
       FROM ticket_status_log l
       JOIN staff s ON s.id = l.changed_by
      WHERE l.ticket_id = $1
      ORDER BY l.changed_at, l.id`,
    [ticketId],
  );
  return rows;
}

module.exports.listByTicketId = listByTicketId;
