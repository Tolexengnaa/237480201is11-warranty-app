// API test – TC-01 → TC-12 của docs/test-report.md (Bài tập 3).
// Gọi HTTP thật: controller → service → repository → PostgreSQL. Cần CSDL đã migrate + seed.
// Mỗi test tự tạo dữ liệu riêng (điện thoại 09888xxxxx, IMEI 98880xxxxxxxxxx) và xoá sạch trước/sau.
// Chạy: npm test   (hoặc riêng tệp này: node --test tests/api.db.test.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const jwt = require('jsonwebtoken');
const app = require('../src/backend/app');
const { pool } = require('../src/backend/config/db');

const PHONE_PREFIX = '09888';
const IMEI_PREFIX = '98880';
const PASSWORD = 'Matkhau@123'; // mật khẩu tài khoản mẫu của scripts/seed.js (chỉ máy phát triển)

let server;
let base;
const token = {};
const staffId = {};
let seq = 0;

// ---------- tiện ích ----------
async function call(method, url, { as, body, bearer } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = bearer || (as && token[as]);
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(base + url, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

/** Ngày YYYY-MM-DD theo giờ Việt Nam, lệch `offsetDays` ngày so với hôm nay. */
function vnDay(offsetDays = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function count(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return Number(rows[0].n);
}

/** Tạo một khách hàng + một thiết bị riêng cho test (ghi thẳng CSDL để chủ động ngày hết hạn). */
async function fixture({ warrantyEndDate = vnDay(365) } = {}) {
  seq += 1;
  const phone = `${PHONE_PREFIX}${String(seq).padStart(5, '0')}`;
  const imei = `${IMEI_PREFIX}${String(seq).padStart(10, '0')}`;
  const c = await pool.query(
    "INSERT INTO customer (full_name, phone) VALUES ('Khách kiểm thử BT3', $1) RETURNING id", [phone]);
  const d = await pool.query(
    `INSERT INTO device (customer_id, imei, model, warranty_end_date)
     VALUES ($1, $2, 'Máy kiểm thử', $3) RETURNING id`, [c.rows[0].id, imei, warrantyEndDate]);
  return { customerId: c.rows[0].id, deviceId: d.rows[0].id, imei };
}

async function createTicket(f) {
  const r = await call('POST', '/api/tickets', {
    as: 'tn1', body: { customerId: f.customerId, imei: f.imei, issueDescription: 'Màn hình không lên' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.ticketCode;
}

async function cleanup() {
  const dev = `SELECT id FROM device WHERE imei LIKE '${IMEI_PREFIX}%'`;
  await pool.query(`DELETE FROM ticket_status_log WHERE ticket_id IN (SELECT id FROM ticket WHERE device_id IN (${dev}))`);
  await pool.query(`DELETE FROM ticket WHERE device_id IN (${dev})`);
  await pool.query(`DELETE FROM device WHERE imei LIKE '${IMEI_PREFIX}%'`);
  await pool.query(`DELETE FROM customer WHERE phone LIKE '${PHONE_PREFIX}%'`);
}

test.before(async () => {
  await cleanup();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (const u of ['tn1', 'dp1', 'kt1', 'kt2', 'kt3']) {
    const { rows } = await pool.query('SELECT id FROM staff WHERE username = $1', [u]);
    assert.ok(rows[0], `Chưa có tài khoản ${u} – hãy chạy npm run seed`);
    staffId[u] = rows[0].id;
  }
  for (const u of ['tn1', 'dp1', 'kt1', 'kt2']) {
    const r = await call('POST', '/api/auth/login', { body: { username: u, password: PASSWORD } });
    assert.equal(r.status, 200, `Đăng nhập ${u} thất bại`);
    token[u] = r.body.token;
  }
});

test.after(async () => {
  await cleanup();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ---------- 1. Luồng đúng – mỗi quy tắc ít nhất một test ----------

test('TC-01 [BR1] tạo phiếu cho thiết bị của chính khách hàng → 201, trạng thái NEW, thêm 1 phiếu và 1 dòng lịch sử', async (t) => {
  const f = await fixture();
  const before = await count('SELECT count(*) n FROM ticket WHERE device_id = $1', [f.deviceId]);
  const code = await createTicket(f);
  assert.match(code, /^BH-\d{4}-\d{6}$/);
  const after = await count('SELECT count(*) n FROM ticket WHERE device_id = $1', [f.deviceId]);
  assert.equal(after - before, 1);
  const h = await call('GET', `/api/tickets/${code}/history`, { as: 'tn1' });
  assert.equal(h.body.length, 1);
  assert.equal(h.body[0].fromStatus, null);
  assert.equal(h.body[0].toStatus, 'NEW');
  t.diagnostic(`thực tế: 201 ${code}, trạng thái NEW; phiếu của thiết bị ${before} → ${after}; lịch sử ${h.body.length} dòng (null → NEW)`);
});

test('TC-02 [BR2] thiết bị đang có phiếu chưa đóng, tạo phiếu thứ hai → 409 TICKET_OPEN_EXISTS, không thêm phiếu', async (t) => {
  const f = await fixture();
  const first = await createTicket(f);
  const before = await count('SELECT count(*) n FROM ticket WHERE device_id = $1', [f.deviceId]);
  const r = await call('POST', '/api/tickets', {
    as: 'tn1', body: { customerId: f.customerId, imei: f.imei, issueDescription: 'Lỗi lần hai' },
  });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'TICKET_OPEN_EXISTS');
  assert.equal(r.body.details.openTicketCode, first);
  const after = await count('SELECT count(*) n FROM ticket WHERE device_id = $1', [f.deviceId]);
  assert.equal(after, before);
  t.diagnostic(`thực tế: ${r.status} ${r.body.code}, openTicketCode=${r.body.details.openTicketCode}; phiếu của thiết bị ${before} → ${after}`);
});

// ---------- 2. Giá trị biên – BR3, hai phía của cùng ranh giới ----------

test('TC-03 [BR3 biên] ngày hết hạn bảo hành = hôm nay → còn bảo hành (outOfWarranty = false)', async (t) => {
  const f = await fixture({ warrantyEndDate: vnDay(0) });
  const r = await call('POST', '/api/tickets', {
    as: 'tn1', body: { customerId: f.customerId, imei: f.imei, issueDescription: 'Biên hôm nay' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.outOfWarranty, false);
  t.diagnostic(`thực tế: hết hạn ${vnDay(0)} (hôm nay) → ${r.status}, outOfWarranty=${r.body.outOfWarranty}`);
});

test('TC-04 [BR3 biên] ngày hết hạn bảo hành = hôm qua → hết bảo hành (outOfWarranty = true)', async (t) => {
  const f = await fixture({ warrantyEndDate: vnDay(-1) });
  const r = await call('POST', '/api/tickets', {
    as: 'tn1', body: { customerId: f.customerId, imei: f.imei, issueDescription: 'Biên hôm qua' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.outOfWarranty, true);
  t.diagnostic(`thực tế: hết hạn ${vnDay(-1)} (hôm qua) → ${r.status}, outOfWarranty=${r.body.outOfWarranty}`);
});

test('TC-05 [BR4] phân loại mức HIGH → hạn xử lý = thời điểm phân loại + 24 giờ', async (t) => {
  const f = await fixture();
  const code = await createTicket(f);
  const t0 = Date.now();
  const r = await call('POST', `/api/tickets/${code}/classify`, {
    as: 'dp1', body: { issueCategoryId: 1, priority: 'HIGH' },
  });
  const t1 = Date.now();
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.status, 'CLASSIFIED');
  const due = Date.parse(r.body.dueDate);
  const H24 = 24 * 3600 * 1000;
  assert.ok(due >= Math.floor((t0 + H24) / 1000) * 1000 && due <= t1 + H24,
    `dueDate ${r.body.dueDate} không nằm trong [phân loại + 24h]`);
  t.diagnostic(`thực tế: 200 CLASSIFIED; gọi lúc ${new Date(t0).toISOString()}, dueDate=${r.body.dueDate} (lệch ${((due - t0) / 3600000).toFixed(3)} giờ)`);
});

test('TC-06 [BR5] phân công cho kỹ thuật viên đã khoá (kt3) → 409 DATA_CHANGED, phiếu vẫn CLASSIFIED', async (t) => {
  const f = await fixture();
  const code = await createTicket(f);
  await call('POST', `/api/tickets/${code}/classify`, { as: 'dp1', body: { issueCategoryId: 1, priority: 'LOW' } });
  const r = await call('POST', `/api/tickets/${code}/assign`, { as: 'dp1', body: { technicianId: staffId.kt3 } });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'DATA_CHANGED');
  const tk = await call('GET', `/api/tickets/${code}`, { as: 'dp1' });
  assert.equal(tk.body.status, 'CLASSIFIED');
  assert.equal(tk.body.technician, null);
  t.diagnostic(`thực tế: ${r.status} ${r.body.code} "${r.body.message}"; phiếu vẫn ${tk.body.status}, technician=${tk.body.technician}`);
});

test('TC-07 [BR6] từ chối phiếu đã phân loại (không quay lui) → 409 INVALID_STATUS, lịch sử không thêm dòng', async (t) => {
  const f = await fixture();
  const code = await createTicket(f);
  await call('POST', `/api/tickets/${code}/classify`, { as: 'dp1', body: { issueCategoryId: 1, priority: 'MEDIUM' } });
  const before = (await call('GET', `/api/tickets/${code}/history`, { as: 'dp1' })).body.length;
  const r = await call('POST', `/api/tickets/${code}/reject`, { as: 'dp1', body: { reason: 'Không thuộc bảo hành' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'INVALID_STATUS');
  assert.match(r.body.message, /trạng thái Mới/);
  const after = (await call('GET', `/api/tickets/${code}/history`, { as: 'dp1' })).body.length;
  assert.equal(after, before);
  t.diagnostic(`thực tế: ${r.status} ${r.body.code} "${r.body.message}"; lịch sử ${before} → ${after} dòng`);
});

// ---------- 3. Dữ liệu sai – kiểm cả mã trạng thái và thông báo ----------

test('TC-08 [dữ liệu sai] T1 thiết bị mới với ngày không có thật 2026-02-30 hoặc model 101 ký tự → 400, không tạo thiết bị', async (t) => {
  const c = await pool.query(
    "INSERT INTO customer (full_name, phone) VALUES ('Khách kiểm thử BT3', $1) RETURNING id", [`${PHONE_PREFIX}99001`]);
  const customerId = c.rows[0].id;
  const devicesBefore = await count(`SELECT count(*) n FROM device WHERE imei LIKE '${IMEI_PREFIX}%'`);

  const badDate = await call('POST', '/api/tickets', {
    as: 'tn1',
    body: { customerId, imei: `${IMEI_PREFIX}9900000001`, model: 'Galaxy A55', warrantyEndDate: '2026-02-30', issueDescription: 'Lỗi nguồn' },
  });
  assert.equal(badDate.status, 400, JSON.stringify(badDate.body));
  assert.equal(badDate.body.code, 'WARRANTY_END_DATE_REQUIRED');
  assert.match(badDate.body.message, /YYYY-MM-DD/);

  const longModel = await call('POST', '/api/tickets', {
    as: 'tn1',
    body: { customerId, imei: `${IMEI_PREFIX}9900000002`, model: 'A'.repeat(101), warrantyEndDate: '2027-01-01', issueDescription: 'Lỗi nguồn' },
  });
  assert.equal(longModel.status, 400, JSON.stringify(longModel.body));
  assert.equal(longModel.body.code, 'MODEL_TOO_LONG');

  const devicesAfter = await count(`SELECT count(*) n FROM device WHERE imei LIKE '${IMEI_PREFIX}%'`);
  assert.equal(devicesAfter, devicesBefore);
  t.diagnostic(`thực tế: 2026-02-30 → ${badDate.status} ${badDate.body.code}; model 101 ký tự → ${longModel.status} ${longModel.body.code}; thiết bị ${devicesBefore} → ${devicesAfter}`);
});

test('TC-09 [dữ liệu sai] T2 lọc hạn xử lý: dueFrom=1 → 400 INVALID_FILTER; lọc đúng một ngày (dạng M2 gửi) phải gồm phiếu hạn trong ngày đó', async (t) => {
  const r = await call('GET', '/api/tickets?dueFrom=1', { as: 'dp1' });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.code, 'INVALID_FILTER');
  assert.match(r.body.message, /dueFrom/);

  // Phân vùng hợp lệ: màn hình M2 gửi ngày dạng YYYY-MM-DD (ô input type="date").
  const f = await fixture();
  const code = await createTicket(f);
  const c = await call('POST', `/api/tickets/${code}/classify`, { as: 'dp1', body: { issueCategoryId: 1, priority: 'HIGH' } });
  const dueDay = c.body.dueDate.slice(0, 10); // dueDate dạng ISO +07:00 → ngày theo giờ Việt Nam
  const ok = await call('GET', `/api/tickets?dueFrom=${dueDay}&dueTo=${dueDay}&q=${code}`, { as: 'dp1' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.items.some((i) => i.ticketCode === code),
    `Lọc hạn xử lý ${dueDay} → ${dueDay} không thấy phiếu ${code} có hạn ${c.body.dueDate}`);
  t.diagnostic(`thực tế: dueFrom=1 → ${r.status} ${r.body.code}; lọc ${dueDay} → ${dueDay} thấy ${ok.body.total} phiếu (${code}, hạn ${c.body.dueDate})`);
});

// ---------- 4. Bảo mật ----------

test('TC-10 [bảo mật A01] kỹ thuật viên kt1 xem phiếu đã phân công cho kt2 → 403, không lộ dữ liệu phiếu', async (t) => {
  const f = await fixture();
  const code = await createTicket(f);
  await call('POST', `/api/tickets/${code}/classify`, { as: 'dp1', body: { issueCategoryId: 1, priority: 'HIGH' } });
  const a = await call('POST', `/api/tickets/${code}/assign`, { as: 'dp1', body: { technicianId: staffId.kt2 } });
  assert.equal(a.status, 200);

  const detail = await call('GET', `/api/tickets/${code}`, { as: 'kt1' });
  assert.equal(detail.status, 403);
  assert.equal(detail.body.code, 'FORBIDDEN_ROLE');
  assert.equal(detail.body.customer, undefined);
  const history = await call('GET', `/api/tickets/${code}/history`, { as: 'kt1' });
  assert.equal(history.status, 403);
  const start = await call('POST', `/api/tickets/${code}/start`, { as: 'kt1' });
  assert.equal(start.status, 403);
  // Đúng chủ sở hữu thì được.
  const own = await call('GET', `/api/tickets/${code}`, { as: 'kt2' });
  assert.equal(own.status, 200);
  t.diagnostic(`thực tế: kt1 xem chi tiết → ${detail.status} ${detail.body.code}, lịch sử → ${history.status}, nhận phiếu → ${start.status}; kt2 (được phân công) → ${own.status}`);
});

test('TC-11 [bảo mật A07] token tự ký bằng khoá bí mật công khai trong repo → 401 INVALID_TOKEN', async (t) => {
  // Hai giá trị SECRET_KEY từng nằm công khai trong repo: .env.example và docker-compose.yml (v0.2).
  for (const publicKey of ['your_secret_key', 'doi-khoa-bi-mat-nay-khi-trien-khai']) {
    const forged = jwt.sign({ sub: String(staffId.dp1), role: 'COORDINATOR' }, publicKey);
    const r = await call('GET', '/api/technicians', { bearer: forged });
    assert.equal(r.status, 401, `Token ký bằng "${publicKey}" được chấp nhận: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.code, 'INVALID_TOKEN');
    t.diagnostic(`thực tế: token ký bằng "${publicKey}" → ${r.status} ${r.body.code}`);
  }
});

// ---------- 5. Tái lập ----------

test('TC-12 [tái lập] chạy lại migrate + seed lần hai → không lỗi, số bản ghi danh mục không đổi', async (t) => {
  const root = path.join(__dirname, '..');
  const snapshot = async () => ({
    migrations: await count('SELECT count(*) n FROM schema_migrations'),
    categories: await count('SELECT count(*) n FROM issue_category'),
    staff: await count('SELECT count(*) n FROM staff'),
    customers: await count(`SELECT count(*) n FROM customer WHERE phone NOT LIKE '${PHONE_PREFIX}%' AND phone NOT LIKE '0999%'`),
    devices: await count(`SELECT count(*) n FROM device WHERE imei NOT LIKE '${IMEI_PREFIX}%' AND imei NOT LIKE '999%'`),
  });
  const before = await snapshot();
  for (const script of ['migrate.js', 'seed.js']) {
    execFileSync(process.execPath, [path.join(root, 'scripts', script)], { cwd: root, stdio: 'pipe' });
  }
  const after = await snapshot();
  assert.deepEqual(after, before);
  t.diagnostic(`thực tế: trước ${JSON.stringify(before)} · sau lần chạy thứ hai ${JSON.stringify(after)}`);
});
