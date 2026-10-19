// Connection pool dùng chung cho lớp Repository (sơ đồ kiến trúc: "SQL tham số hoá qua connection pool").
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(env.db);

/**
 * Chạy `work(client)` trong MỘT giao dịch CSDL.
 * Lớp Service dùng hàm này để mở / đóng giao dịch (NFR5).
 */
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
