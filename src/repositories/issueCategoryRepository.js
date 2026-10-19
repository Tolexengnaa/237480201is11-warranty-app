// IssueCategoryRepository – danh mục lỗi.
const { pool } = require('../config/db');

async function listActive(db = pool) {
  const { rows } = await db.query(
    'SELECT id, code, name FROM issue_category WHERE is_active ORDER BY id',
  );
  return rows;
}

module.exports = { listActive };
