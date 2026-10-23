// Kiểm thử tích hợp BR2 với CSDL thật: một IMEI chỉ có tối đa một phiếu chưa đóng.
// Cần PostgreSQL đã chạy `npm run migrate` và `npm run seed` (đọc kết nối từ .env).
// Chạy: npm run test:db
const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/backend/config/db');
const ticketService = require('../src/backend/services/ticketService');

const PHONE = '0999000222';
const IMEI = '999000222333444';
let receptionist;
let customerId;

async function cleanup() {
  await pool.query(
    `DELETE FROM ticket_status_log WHERE ticket_id IN
       (SELECT t.id FROM ticket t JOIN device d ON d.id = t.device_id WHERE d.imei = $1)`, [IMEI]);
  await pool.query('DELETE FROM ticket WHERE device_id IN (SELECT id FROM device WHERE imei = $1)', [IMEI]);
  await pool.query('DELETE FROM device WHERE imei = $1', [IMEI]);
  await pool.query('DELETE FROM customer WHERE phone = $1', [PHONE]);
}

test.before(async () => {
  const { rows } = await pool.query(
    "SELECT id, role FROM staff WHERE role = 'RECEPTIONIST' AND is_active LIMIT 1");
  assert.ok(rows[0], 'Chưa có Nhân viên tiếp nhận – hãy chạy npm run seed');
  receptionist = rows[0];
  await cleanup();
  const c = await pool.query(
    "INSERT INTO customer (full_name, phone) VALUES ('Khách kiểm thử BR2', $1) RETURNING id", [PHONE]);
  customerId = c.rows[0].id;
});

test.after(async () => {
  await cleanup();
  await pool.end();
});

test('BR2 (lớp nghiệp vụ): tạo phiếu thứ hai cho cùng IMEI khi phiếu đầu chưa đóng → 409 TICKET_OPEN_EXISTS', async () => {
  const first = await ticketService.createTicket(receptionist, {
    customerId, imei: IMEI, model: 'Máy kiểm thử', warrantyEndDate: '2030-12-31',
    issueDescription: 'Phiếu thứ nhất',
  });
  assert.equal(first.status, 'NEW');

  await assert.rejects(
    ticketService.createTicket(receptionist, { customerId, imei: IMEI, issueDescription: 'Phiếu thứ hai' }),
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'TICKET_OPEN_EXISTS');
      assert.equal(err.details.openTicketCode, first.ticketCode);
      return true;
    },
  );

  const { rows } = await pool.query(
    'SELECT count(*)::int AS n FROM ticket t JOIN device d ON d.id = t.device_id WHERE d.imei = $1', [IMEI]);
  assert.equal(rows[0].n, 1, 'Chỉ được có đúng 1 phiếu trong CSDL');
});

test('BR2 (CSDL): ghi thẳng phiếu chưa đóng thứ hai, bỏ qua service → bị UNIQUE ux_ticket_open_device chặn', async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO ticket (ticket_code, device_id, issue_description, created_by)
       SELECT 'BH-2026-999999', id, 'Ghi thẳng vào CSDL', $2 FROM device WHERE imei = $1`,
      [IMEI, receptionist.id]),
    (err) => {
      assert.equal(err.code, '23505'); // unique_violation
      assert.equal(err.constraint, 'ux_ticket_open_device');
      return true;
    },
  );
});

test('BR2: phiếu cũ đã đóng (REJECTED) thì được tạo phiếu mới cho cùng IMEI', async () => {
  await pool.query(
    `UPDATE ticket SET status = 'REJECTED'
      WHERE device_id = (SELECT id FROM device WHERE imei = $1)`, [IMEI]);
  const again = await ticketService.createTicket(receptionist, {
    customerId, imei: IMEI, issueDescription: 'Mang máy đến lần hai',
  });
  assert.equal(again.status, 'NEW');
});