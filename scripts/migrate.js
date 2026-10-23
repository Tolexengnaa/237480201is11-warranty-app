// Chạy lần lượt các file db/migrations/*.sql chưa chạy; ghi lại vào bảng schema_migrations.
// Dùng: npm run migrate
const fs = require('fs');
const path = require('path');
const { pool, withTransaction } = require('../src/backend/config/db');

const DIR = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(200) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`bỏ qua   ${file} (đã chạy)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    console.log(`đã chạy  ${file}`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Migration lỗi:', err.message);
    await pool.end();
    process.exit(1);
  });
