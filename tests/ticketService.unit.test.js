// Unit test lớp nghiệp vụ – không cần CSDL: repository được thay bằng bản giả (fake) trong bộ nhớ.
// Chạy: npm test
process.env.DB_NAME ||= 'test';
process.env.DB_USER ||= 'test';
process.env.SECRET_KEY ||= 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTicketService, isOutOfWarranty } = require('../src/backend/services/ticketService');
const { canTransition } = require('../src/backend/services/statusService');

const RECEPTIONIST = { id: 1, role: 'RECEPTIONIST' };
const COORDINATOR = { id: 2, role: 'COORDINATOR' };

function makeService({ openTicket = null, device = { id: 7, customerId: 1, warrantyEndDate: '2027-01-01' } } = {}) {
  const calls = { inserted: [], logs: [] };
  const service = createTicketService({
    customers: { findById: async (id) => (id === 1 ? { id: 1 } : null) },
    devices: {
      findByImei: async () => device,
      insert: async (d) => ({ id: 99, ...d }),
    },
    tickets: {
      findOpenByDeviceId: async () => openTicket,
      nextTicketCode: async (year) => `BH-${year}-000123`,
      insert: async (t) => {
        calls.inserted.push(t);
        return { id: 50, ticketCode: t.ticketCode, status: 'NEW', createdAt: new Date('2026-10-19T07:00:00Z') };
      },
    },
    statusService: { recordCreation: async (client, entry) => calls.logs.push(entry) },
    withTransaction: (work) => work({}),
    now: () => new Date('2026-10-19T07:00:00Z'),
  });
  return { service, calls };
}

const validInput = { customerId: 1, imei: '356789012345678', issueDescription: 'Màn hình bị sọc' };

test('FR1: tạo phiếu hợp lệ → mã BH-YYYY-NNNNNN, trạng thái NEW, ghi 1 bản ghi lịch sử (NFR5)', async () => {
  const { service, calls } = makeService();
  const result = await service.createTicket(RECEPTIONIST, validInput);
  assert.equal(result.ticketCode, 'BH-2026-000123');
  assert.equal(result.status, 'NEW');
  assert.equal(calls.inserted.length, 1);
  assert.deepEqual(calls.logs, [{ ticketId: 50, changedBy: 1 }]);
});

test('NFR4: Điều phối viên tạo phiếu → 403 FORBIDDEN_ROLE, không ghi gì', async () => {
  const { service, calls } = makeService();
  await assert.rejects(service.createTicket(COORDINATOR, validInput), { status: 403, code: 'FORBIDDEN_ROLE' });
  assert.equal(calls.inserted.length, 0);
});

test('BR2: thiết bị đang có phiếu chưa đóng → 409 TICKET_OPEN_EXISTS kèm mã phiếu cũ', async () => {
  const { service, calls } = makeService({ openTicket: { ticketCode: 'BH-2026-000098' } });
  await assert.rejects(service.createTicket(RECEPTIONIST, validInput), (err) => {
    assert.equal(err.status, 409);
    assert.equal(err.code, 'TICKET_OPEN_EXISTS');
    assert.deepEqual(err.details, { openTicketCode: 'BH-2026-000098' });
    return true;
  });
  assert.equal(calls.inserted.length, 0);
});

test('BR1: IMEI đã thuộc khách hàng khác → 409 DEVICE_OWNER_MISMATCH', async () => {
  const { service } = makeService({ device: { id: 7, customerId: 5, warrantyEndDate: '2027-01-01' } });
  await assert.rejects(service.createTicket(RECEPTIONIST, validInput), { status: 409, code: 'DEVICE_OWNER_MISMATCH' });
});

test('UC01-4a / 7a: IMEI sai định dạng hoặc mô tả lỗi rỗng → 400', async () => {
  const { service } = makeService();
  await assert.rejects(service.createTicket(RECEPTIONIST, { ...validInput, imei: '12345' }), { code: 'INVALID_IMEI' });
  await assert.rejects(service.createTicket(RECEPTIONIST, { ...validInput, issueDescription: '   ' }),
    { code: 'ISSUE_DESCRIPTION_REQUIRED' });
});

test('UC01-5a: thiết bị mới mà thiếu model → 400 MODEL_REQUIRED', async () => {
  const { service } = makeService({ device: null });
  await assert.rejects(service.createTicket(RECEPTIONIST, validInput), { code: 'MODEL_REQUIRED' });
});

test('BR3: hết hạn bảo hành khi ngày tiếp nhận SAU ngày hết hạn (theo giờ Việt Nam)', () => {
  assert.equal(isOutOfWarranty('2026-10-19', new Date('2026-10-19T16:00:00Z')), false); // 23:00 ngày 19 giờ VN
  assert.equal(isOutOfWarranty('2026-10-19', new Date('2026-10-19T17:00:00Z')), true); // 00:00 ngày 20 giờ VN
});

test('BR6: trạng thái chỉ đi tới, Từ chối chỉ từ NEW', () => {
  assert.equal(canTransition('NEW', 'CLASSIFIED'), true);
  assert.equal(canTransition('NEW', 'REJECTED'), true);
  assert.equal(canTransition('CLASSIFIED', 'REJECTED'), false);
  assert.equal(canTransition('ASSIGNED', 'CLASSIFIED'), false);
  assert.equal(canTransition('REJECTED', 'NEW'), false);
});

test('BR2 (đồng thời): CSDL chặn phiếu thứ hai bằng ux_ticket_open_device → 409 TICKET_OPEN_EXISTS, không phải 500', async () => {
  let openAfterRollback = null;
  const service = createTicketService({
    customers: { findById: async () => ({ id: 1 }) },
    devices: { findByImei: async () => ({ id: 7, customerId: 1, warrantyEndDate: '2027-01-01' }) },
    tickets: {
      // Trong giao dịch chưa thấy phiếu kia; sau rollback mới đọc được phiếu đã commit.
      findOpenByDeviceId: async (deviceId, client) => (client ? null : openAfterRollback),
      nextTicketCode: async (year) => `BH-${year}-000124`,
      insert: async () => {
        openAfterRollback = { ticketCode: 'BH-2026-000123' };
        throw Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'ux_ticket_open_device' });
      },
    },
    statusService: { recordCreation: async () => {} },
    withTransaction: (work) => work({}),
    now: () => new Date('2026-10-19T07:00:00Z'),
  });
  await assert.rejects(service.createTicket(RECEPTIONIST, validInput), {
    status: 409, code: 'TICKET_OPEN_EXISTS', details: { openTicketCode: 'BH-2026-000123' },
  });
});

test('UC07 (đồng thời): số điện thoại vừa được người khác tạo → 409 PHONE_EXISTS, không phải 500', async () => {
  const service = createTicketService({
    customers: {
      findByPhone: async () => null,
      insert: async () => {
        throw Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'customer_phone_key' });
      },
    },
  });
  await assert.rejects(service.createCustomer(RECEPTIONIST, { fullName: 'Khách', phone: '0901234567' }),
    { status: 409, code: 'PHONE_EXISTS' });
});

test('UC01-5a: ngày hết hạn bảo hành không có thật (30/02) → 400, không để CSDL báo lỗi 500', async () => {
  const { service, calls } = makeService({ device: null });
  for (const warrantyEndDate of ['2026-02-30', '2026-13-01', '2026-1-1', 20270101]) {
    await assert.rejects(
      service.createTicket(RECEPTIONIST, { ...validInput, model: 'Galaxy A55', warrantyEndDate }),
      { status: 400, code: 'WARRANTY_END_DATE_REQUIRED' },
    );
  }
  await service.createTicket(RECEPTIONIST, { ...validInput, model: 'Galaxy A55', warrantyEndDate: '2028-02-29' });
  assert.equal(calls.inserted.length, 1);
});

test('FR4: dueFrom / dueTo không phải ISO 8601 → 400 INVALID_FILTER; định dạng giao diện gửi được chấp nhận', async () => {
  let searched = null;
  const service = createTicketService({
    tickets: { search: async (f) => { searched = f; return { total: 0, items: [] }; } },
  });
  for (const dueFrom of ['1', 'hello 2026', '2026-02-30', '2026-10-23T25:00:00+07:00']) {
    await assert.rejects(service.listTickets(RECEPTIONIST, { dueFrom }), { status: 400, code: 'INVALID_FILTER' });
  }
  await service.listTickets(RECEPTIONIST, {
    dueFrom: '2026-10-23T00:00:00+07:00', dueTo: '2026-10-24T23:59:59+07:00',
  });
  assert.equal(searched.dueFrom, '2026-10-23T00:00:00+07:00');
  await service.listTickets(RECEPTIONIST, { dueFrom: '2026-10-23', dueTo: '2026-10-24T00:00:00Z' });
});
