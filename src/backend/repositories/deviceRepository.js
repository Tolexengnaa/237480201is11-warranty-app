// DeviceRepository – đọc / ghi bảng device.
const { pool } = require('../config/db');

const COLUMNS = `id, customer_id AS "customerId", imei, model,
  to_char(warranty_end_date, 'YYYY-MM-DD') AS "warrantyEndDate"`;

async function findByImei(imei, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM device WHERE imei = $1`, [imei]);
  return rows[0] || null;
}

async function insert({ customerId, imei, model, warrantyEndDate }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO device (customer_id, imei, model, warranty_end_date)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [customerId, imei, model, warrantyEndDate],
  );
  return rows[0];
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM device WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function list({ customerId = null, limit = 50, offset = 0 } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM device WHERE $1::bigint IS NULL OR customer_id = $1
      ORDER BY id LIMIT $2 OFFSET $3`,
    [customerId, limit, offset],
  );
  return rows;
}

async function update(id, { model, warrantyEndDate }, db = pool) {
  const { rows } = await db.query(
    `UPDATE device SET model = $2, warranty_end_date = $3 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, model, warrantyEndDate],
  );
  return rows[0] || null;
}

async function remove(id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM device WHERE id = $1', [id]);
  return rowCount > 0;
}

async function countTickets(id, db = pool) {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM ticket WHERE device_id = $1', [id]);
  return rows[0].n;
}

module.exports = { findByImei, findById, insert, list, update, remove, countTickets };
