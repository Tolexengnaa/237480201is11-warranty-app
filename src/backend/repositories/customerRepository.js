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

async function list({ q, limit = 50, offset = 0 } = {}, db = pool) {
  const like = q ? `%${q}%` : null;
  const { rows } = await db.query(
    `SELECT ${COLUMNS}, (SELECT count(*)::int FROM device d WHERE d.customer_id = customer.id) AS "deviceCount"
       FROM customer
      WHERE $1::text IS NULL OR full_name ILIKE $1 OR phone LIKE $1
      ORDER BY id LIMIT $2 OFFSET $3`,
    [like, limit, offset],
  );
  return rows;
}

async function update(id, { fullName, phone }, db = pool) {
  const { rows } = await db.query(
    `UPDATE customer SET full_name = $2, phone = $3 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, fullName, phone],
  );
  return rows[0] || null;
}

async function remove(id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM customer WHERE id = $1', [id]);
  return rowCount > 0;
}

async function countDevices(id, db = pool) {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM device WHERE customer_id = $1', [id]);
  return rows[0].n;
}

module.exports = { findByPhone, findById, insert, list, update, remove, countDevices };
