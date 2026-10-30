// Unit test lớp nghiệp vụ Sprint 2 – phân loại (BR4), từ chối (BR6), phân công (BR5), nhận phiếu (UC05).
// Không cần CSDL: repository được thay bằng bản giả trong bộ nhớ. Chạy: npm test
process.env.DB_NAME ||= 'test';
process.env.DB_USER ||= 'test';
process.env.SECRET_KEY ||= 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createClassifyService, computeDueDate } = require('../src/backend/services/classifyService');
const { createAssignService } = require('../src/backend/services/assignService');
const { createTicketService } = require('../src/backend/services/ticketService');

const COORDINATOR = { id: 2, role: 'COORDINATOR' };
const RECEPTIONIST = { id: 1, role: 'RECEPTIONIST' };
const TECH = { id: 3, role: 'TECHNICIAN' };
const NOW = new Date('2026-10-23T07:00:00Z');

/** Bản giả: một phiếu trong bộ nhớ + ghi lại mọi lần đổi trạng thái. */
function fakes(ticket) {
  const changes = [];
  return {
    changes,
    tickets: { findByCode: async (code) => (ticket && code === ticket.ticketCode ? ticket : null) },
    statusService: { changeStatus: async (client, c) => changes.push(c) },
    withTransaction: (work) => work({}),
  };
}

const ticket = (status, extra = {}) => ({ id: 10, ticketCode: 'BH-2026-000010', status, assignedTo: null, ...extra });

// ---------- BR4: hạn xử lý ----------
test('BR4: hạn xử lý = thời điểm phân loại + 24 / 72 / 120 giờ theo mức ưu tiên', () => {
  assert.equal(computeDueDate(NOW, 'HIGH').toISOString(), '2026-10-24T07:00:00.000Z');
  assert.equal(computeDueDate(NOW, 'MEDIUM').toISOString(), '2026-10-26T07:00:00.000Z');
  assert.equal(computeDueDate(NOW, 'LOW').toISOString(), '2026-10-28T07:00:00.000Z');
});

test('BR4 (dữ liệu sai): mức ưu tiên ngoài HIGH/MEDIUM/LOW → 400 INVALID_PRIORITY', () => {
  assert.throws(() => computeDueDate(NOW, 'URGENT'), { kind: 'INVALID_INPUT', code: 'INVALID_PRIORITY' });
});

test('FR2: phân loại phiếu Mới → CLASSIFIED, ghi danh mục, mức ưu tiên và hạn xử lý trong cùng lần đổi trạng thái', async () => {
  const f = fakes(ticket('NEW'));
  const svc = createClassifyService({
    ...f, categories: { findActiveById: async (id) => (id === 1 ? { id: 1 } : null) }, now: () => NOW,
  });
  const r = await svc.classify(COORDINATOR, 'BH-2026-000010', { issueCategoryId: 1, priority: 'HIGH' });
  assert.equal(r.status, 'CLASSIFIED');
  assert.equal(f.changes.length, 1);
  assert.deepEqual(f.changes[0].fields, {
    issueCategoryId: 1, priority: 'HIGH', dueDate: new Date('2026-10-24T07:00:00Z'),
  });
});

test('BR6 (biên): phân loại phiếu không còn ở trạng thái Mới → 409 INVALID_STATUS, không đổi gì', async () => {
  const f = fakes(ticket('CLASSIFIED'));
  const svc = createClassifyService({ ...f, categories: { findActiveById: async () => ({ id: 1 }) }, now: () => NOW });
  await assert.rejects(
    svc.classify(COORDINATOR, 'BH-2026-000010', { issueCategoryId: 1, priority: 'LOW' }),
    { kind: 'CONFLICT', code: 'INVALID_STATUS' },
  );
  assert.equal(f.changes.length, 0);
});

test('BR6: từ chối mà lý do chỉ có khoảng trắng → 400 REJECT_REASON_REQUIRED', async () => {
  const f = fakes(ticket('NEW'));
  const svc = createClassifyService({ ...f, categories: {}, now: () => NOW });
  await assert.rejects(svc.reject(COORDINATOR, 'BH-2026-000010', { reason: '   ' }),
    { kind: 'INVALID_INPUT', code: 'REJECT_REASON_REQUIRED' });
  assert.equal(f.changes.length, 0);
});

// ---------- BR5 / UC03: phân công ----------
function assignService(t, techById) {
  const f = fakes(t);
  const svc = createAssignService({ ...f, staff: { findById: async (id) => techById[id] || null } });
  return { f, svc };
}

test('UC03-1a: phân công phiếu còn ở trạng thái Mới → 409 TICKET_NOT_CLASSIFIED', async () => {
  const { svc } = assignService(ticket('NEW'), { 3: { id: 3, role: 'TECHNICIAN', isActive: true } });
  await assert.rejects(svc.assign(COORDINATOR, 'BH-2026-000010', { technicianId: 3 }),
    { kind: 'CONFLICT', code: 'TICKET_NOT_CLASSIFIED' });
});

test('UC03-4a / NFR4: Nhân viên tiếp nhận gọi phân công → 403 FORBIDDEN_ROLE', async () => {
  const { svc, f } = assignService(ticket('CLASSIFIED'), {});
  await assert.rejects(svc.assign(RECEPTIONIST, 'BH-2026-000010', { technicianId: 3 }),
    { kind: 'NOT_ALLOWED', code: 'FORBIDDEN_ROLE' });
  assert.equal(f.changes.length, 0);
});

test('BR5 / UC03-4b: kỹ thuật viên đã bị khoá → 409 DATA_CHANGED, phiếu giữ nguyên', async () => {
  const { svc, f } = assignService(ticket('CLASSIFIED'), { 5: { id: 5, role: 'TECHNICIAN', isActive: false } });
  await assert.rejects(svc.assign(COORDINATOR, 'BH-2026-000010', { technicianId: 5 }),
    { kind: 'CONFLICT', code: 'DATA_CHANGED' });
  assert.equal(f.changes.length, 0);
});

test('FR3: phân công phiếu Đã phân loại cho kỹ thuật viên đang hoạt động → ASSIGNED', async () => {
  const { svc, f } = assignService(ticket('CLASSIFIED'),
    { 3: { id: 3, role: 'TECHNICIAN', isActive: true, fullName: 'Phạm Huy' } });
  const r = await svc.assign(COORDINATOR, 'BH-2026-000010', { technicianId: 3 });
  assert.equal(r.status, 'ASSIGNED');
  assert.deepEqual(f.changes[0].fields, { assignedTo: 3 });
});

// ---------- UC05: kỹ thuật viên nhận phiếu ----------
test('UC05: kỹ thuật viên khác nhận phiếu không phải của mình → 403', async () => {
  const f = fakes(ticket('ASSIGNED', { assignedTo: 4 }));
  const svc = createTicketService({ ...f, logs: {} });
  await assert.rejects(svc.startTicket(TECH, 'BH-2026-000010'), { kind: 'NOT_ALLOWED', code: 'FORBIDDEN_ROLE' });
  assert.equal(f.changes.length, 0);
});
