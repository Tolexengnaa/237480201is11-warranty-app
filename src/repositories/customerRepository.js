// CustomerRepository – đọc / ghi bảng customer. `db` là pool hoặc client của giao dịch.
const { pool } = require('../config/db');

const COLUMNS = 'id, full_name AS "fullName", phone';

async function findByPhone(phone, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM customer WHERE phone = $1`, [phone]);
  return rows[0] || null;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM customer WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function insert({ fullName, phone }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO customer (full_name, phone) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [fullName, phone],
  );
  return rows[0];
}

module.exports = { findByPhone, findById, insert };
