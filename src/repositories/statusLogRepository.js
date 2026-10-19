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
