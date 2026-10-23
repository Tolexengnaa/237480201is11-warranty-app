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

module.exports = { findByImei, insert };
