// Nạp dữ liệu danh mục và dữ liệu mẫu. Chạy lại nhiều lần không bị trùng (ON CONFLICT DO NOTHING).
// Dùng: npm run seed
// Tài khoản mẫu (chỉ dùng ở máy phát triển): mật khẩu chung = Matkhau@123
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../src/config/db');

const DEV_PASSWORD = 'Matkhau@123';

const issueCategories = [
  ['SCREEN', 'Màn hình'],
  ['BATTERY', 'Pin'],
  ['POWER', 'Nguồn'],
  ['CHARGING', 'Sạc'],
  ['SOFTWARE', 'Phần mềm'],
  ['WATER', 'Vào nước'],
  ['OTHER', 'Khác'],
];

const staff = [
  ['tn1', 'Lê Thu', 'RECEPTIONIST', true],
  ['dp1', 'Trần Minh', 'COORDINATOR', true],
  ['kt1', 'Phạm Huy', 'TECHNICIAN', true],
  ['kt2', 'Võ Lan', 'TECHNICIAN', true],
  ['kt3', 'Đỗ Nam', 'TECHNICIAN', false],
];

const customers = [
  ['Nguyễn Văn A', '0901234567'],
  ['Trần Thị B', '0912345678'],
  ['Lê Văn C', '0987654321'],
];

// [phone, imei, model, warranty_end_date]
const devices = [
  ['0901234567', '356789012345678', 'Galaxy A55', '2027-03-15'],
  ['0912345678', '359876543210987', 'iPhone 13', '2026-01-01'],
  ['0987654321', '351234567890123', 'Redmi 12', '2027-06-30'],
];

async function main() {
  const hash = await bcrypt.hash(DEV_PASSWORD, 10);
  await withTransaction(async (c) => {
    for (const [code, name] of issueCategories) {
      await c.query(
        'INSERT INTO issue_category (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
        [code, name],
      );
    }
    for (const [username, fullName, role, active] of staff) {
      await c.query(
        `INSERT INTO staff (username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
        [username, hash, fullName, role, active],
      );
    }
    for (const [fullName, phone] of customers) {
      await c.query(
        'INSERT INTO customer (full_name, phone) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING',
        [fullName, phone],
      );
    }
    for (const [phone, imei, model, warrantyEnd] of devices) {
      await c.query(
        `INSERT INTO device (customer_id, imei, model, warranty_end_date)
         SELECT id, $2, $3, $4 FROM customer WHERE phone = $1
         ON CONFLICT (imei) DO NOTHING`,
        [phone, imei, model, warrantyEnd],
      );
    }
  });

  const counts = await pool.query(`SELECT
      (SELECT count(*) FROM issue_category) AS issue_category,
      (SELECT count(*) FROM staff)          AS staff,
      (SELECT count(*) FROM customer)       AS customer,
      (SELECT count(*) FROM device)         AS device`);
  console.log('seed xong:', counts.rows[0]);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Seed lỗi:', err.message);
    await pool.end();
    process.exit(1);
  });
