// StaffRepository – đọc bảng staff (dữ liệu nạp sẵn, không có API quản lý tài khoản).
const { pool } = require('../config/db');

async function findByUsername(username, db = pool) {
  const { rows } = await db.query(
    `SELECT id, username, password_hash AS "passwordHash", full_name AS "fullName",
            role, is_active AS "isActive"
       FROM staff WHERE username = $1`,
    [username],
  );
  return rows[0] || null;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(
    `SELECT id, username, full_name AS "fullName", role, is_active AS "isActive"
       FROM staff WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

/** L2 – kỹ thuật viên đang hoạt động + số phiếu đang giữ (tính khi truy vấn, không lưu). */
async function listActiveTechnicians(db = pool) {
  const { rows } = await db.query(
    `SELECT s.id, s.full_name AS "fullName",
            count(t.id)::int AS "openTicketCount"
       FROM staff s
       LEFT JOIN ticket t ON t.assigned_to = s.id AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
      WHERE s.role = 'TECHNICIAN' AND s.is_active
      GROUP BY s.id, s.full_name
      ORDER BY "openTicketCount", s.full_name`,
  );
  return rows;
}

module.exports = { findByUsername, findById, listActiveTechnicians };
