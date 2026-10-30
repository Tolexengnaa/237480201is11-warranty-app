// S1 – CRUD khách hàng / thiết bị ở lớp nghiệp vụ, dùng repository giả (không cần CSDL).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMasterDataService } = require('../src/backend/services/masterDataService');

const RECEPTIONIST = { id: 1, role: 'RECEPTIONIST' };
const COORDINATOR = { id: 2, role: 'COORDINATOR' };
const TECHNICIAN = { id: 3, role: 'TECHNICIAN' };

function build({ deviceCount = 0, ticketCount = 0 } = {}) {
  const calls = [];
  const store = { 1: { id: 1, fullName: 'Khách A', phone: '0901234567' }, 2: { id: 2, fullName: 'Khách B', phone: '0912345678' } };
  const customers = {
    findById: async (id) => store[id] || null,
    findByPhone: async (phone) => Object.values(store).find((c) => c.phone === phone) || null,
    list: async (o) => { calls.push(['list', o]); return Object.values(store); },
    update: async (id, v) => { calls.push(['update', id, v]); return { id, ...v }; },
    remove: async (id) => { calls.push(['remove', id]); return true; },
    countDevices: async () => deviceCount,
  };
  const devices = {
    findById: async (id) => (id === 7 ? { id: 7, customerId: 1, imei: '356789012345678', model: 'X1', warrantyEndDate: '2027-01-01' } : null),
    findByImei: async (imei) => (imei === '111111111111111' ? { id: 9 } : null),
    insert: async (v) => { calls.push(['insertDevice', v]); return { id: 8, ...v }; },
    update: async (id, v) => ({ id, ...v }),
    remove: async (id) => { calls.push(['removeDevice', id]); return true; },
    countTickets: async () => ticketCount,
    list: async (o) => { calls.push(['listDevices', o]); return []; },
  };
  return { svc: createMasterDataService({ customers, devices }), calls };
}

// ---- Hợp lệ ----
test('S1 (hợp lệ): Nhân viên tiếp nhận sửa khách hàng, tên được cắt khoảng trắng', async () => {
  const { svc } = build();
  const r = await svc.updateCustomer(RECEPTIONIST, 1, { fullName: '  Nguyễn Văn A  ', phone: '0901234567' });
  assert.equal(r.fullName, 'Nguyễn Văn A');
});

test('S1 (hợp lệ): tạo thiết bị mới cho khách đang có', async () => {
  const { svc, calls } = build();
  const r = await svc.createDevice(RECEPTIONIST, { customerId: 1, imei: '222222222222222', model: 'Y2', warrantyEndDate: '2028-02-29' });
  assert.equal(r.id, 8);
  assert.deepEqual(calls[0][1].warrantyEndDate, '2028-02-29');
});

test('S1 (hợp lệ): Điều phối viên được xem danh sách khách hàng', async () => {
  const { svc } = build();
  assert.equal((await svc.listCustomers(COORDINATOR, { q: 'A' })).length, 2);
});

// ---- Biên ----
test('S1 (biên): số điện thoại 9 và 11 chữ số bị từ chối, 10 chữ số được nhận', async () => {
  const { svc } = build();
  for (const phone of ['090123456', '09012345678']) {
    await assert.rejects(svc.updateCustomer(RECEPTIONIST, 1, { fullName: 'A', phone }), { kind: 'INVALID_INPUT', code: 'INVALID_PHONE' });
  }
  await svc.updateCustomer(RECEPTIONIST, 1, { fullName: 'A', phone: '0900000000' });
});

test('S1 (biên): họ tên đúng 100 ký tự được nhận, 101 ký tự bị từ chối', async () => {
  const { svc } = build();
  await svc.updateCustomer(RECEPTIONIST, 1, { fullName: 'a'.repeat(100), phone: '0901234567' });
  await assert.rejects(svc.updateCustomer(RECEPTIONIST, 1, { fullName: 'a'.repeat(101), phone: '0901234567' }), { code: 'FULL_NAME_TOO_LONG' });
});

test('S1 (biên): limit = 200 hợp lệ, limit = 201 và offset âm bị từ chối', async () => {
  const { svc } = build();
  await svc.listCustomers(RECEPTIONIST, { limit: '200' });
  await assert.rejects(svc.listCustomers(RECEPTIONIST, { limit: '201' }), { code: 'INVALID_PAGING' });
  await assert.rejects(svc.listCustomers(RECEPTIONIST, { offset: '-1' }), { code: 'INVALID_PAGING' });
});

// ---- Dữ liệu sai ----
test('S1 (sai): ngày 2027-02-30 không tồn tại → INVALID_WARRANTY_DATE', async () => {
  const { svc } = build();
  await assert.rejects(
    svc.createDevice(RECEPTIONIST, { customerId: 1, imei: '222222222222222', model: 'Y', warrantyEndDate: '2027-02-30' }),
    { kind: 'INVALID_INPUT', code: 'INVALID_WARRANTY_DATE' });
});

test('S1 (sai): IMEI trùng → CONFLICT IMEI_EXISTS; khách không có → NOT_FOUND', async () => {
  const { svc } = build();
  await assert.rejects(
    svc.createDevice(RECEPTIONIST, { customerId: 1, imei: '111111111111111', model: 'Y', warrantyEndDate: '2027-01-01' }),
    { kind: 'CONFLICT', code: 'IMEI_EXISTS' });
  await assert.rejects(
    svc.createDevice(RECEPTIONIST, { customerId: 99, imei: '222222222222222', model: 'Y', warrantyEndDate: '2027-01-01' }),
    { kind: 'NOT_FOUND', code: 'CUSTOMER_NOT_FOUND' });
});

test('S1 (sai): đổi sang số điện thoại của khách khác → CONFLICT PHONE_EXISTS', async () => {
  const { svc } = build();
  await assert.rejects(svc.updateCustomer(RECEPTIONIST, 1, { fullName: 'A', phone: '0912345678' }), { kind: 'CONFLICT', code: 'PHONE_EXISTS' });
});

test('S1 (sai): không xoá khách còn thiết bị, không xoá thiết bị đã có phiếu (BR6)', async () => {
  await assert.rejects(build({ deviceCount: 1 }).svc.deleteCustomer(RECEPTIONIST, 1), { code: 'CUSTOMER_HAS_DEVICES' });
  await assert.rejects(build({ ticketCount: 2 }).svc.deleteDevice(RECEPTIONIST, 7), { code: 'DEVICE_HAS_TICKETS' });
});

test('S1 (sai): xoá được khi không còn ràng buộc', async () => {
  const { svc, calls } = build();
  await svc.deleteCustomer(RECEPTIONIST, 2);
  await svc.deleteDevice(RECEPTIONIST, 7);
  assert.deepEqual(calls.map((c) => c[0]), ['remove', 'removeDevice']);
});

test('NFR4: Điều phối viên không được ghi, Kỹ thuật viên không được đọc', async () => {
  const { svc } = build();
  await assert.rejects(svc.deleteCustomer(COORDINATOR, 1), { kind: 'NOT_ALLOWED', code: 'FORBIDDEN_ROLE' });
  await assert.rejects(svc.listDevices(TECHNICIAN), { kind: 'NOT_ALLOWED' });
  await assert.rejects(svc.getCustomer(RECEPTIONIST, 'abc'), { code: 'INVALID_CUSTOMER_ID' });
});
