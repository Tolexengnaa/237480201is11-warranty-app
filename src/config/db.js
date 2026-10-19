// Connection pool dùng chung cho lớp Repository (sơ đồ kiến trúc: "SQL tham số hoá qua connection pool").
const { Pool, types } = require('pg');
const env = require('./env');

// BIGINT (OID 20) mặc định trả về chuỗi; id của hệ thống nhỏ hơn 2^53 nên đổi sang number
// để so sánh id (BR1, phiếu của kỹ thuật viên) và JSON trả về đúng kiểu số như API contract.
types.setTypeParser(20, (value) => Number.parseInt(value, 10));

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
