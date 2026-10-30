// MasterDataService – CRUD Khách hàng và Thiết bị (tiêu chí S1: CRUD cho ≥ 2 thực thể).
// Phiếu bảo hành KHÔNG sửa/xoá được (BR6) nên hai thực thể CRUD đầy đủ là customer và device.
// Quyền (NFR4): Nhân viên tiếp nhận được đọc + ghi; Điều phối viên chỉ đọc; Kỹ thuật viên không truy cập.
const customerRepository = require('../repositories/customerRepository');
const deviceRepository = require('../repositories/deviceRepository');
const { invalidInput, notAllowed, notFound, conflict } = require('../errors/AppError');

const PHONE_RE = /^[0-9]{10}$/;
const IMEI_RE = /^[0-9]{15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const READ_ROLES = ['RECEPTIONIST', 'COORDINATOR'];
const WRITE_ROLES = ['RECEPTIONIST'];

function requireRole(caller, roles) {
  if (!caller || !roles.includes(caller.role)) {
    throw notAllowed('FORBIDDEN_ROLE', 'Bạn không có quyền thực hiện chức năng này');
  }
}

function toId(value, code, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw invalidInput(code, `${label} không hợp lệ`);
  return id;
}

function cleanName(fullName) {
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  if (!name) throw invalidInput('FULL_NAME_REQUIRED', 'Vui lòng nhập họ tên khách hàng');
  if (name.length > 100) throw invalidInput('FULL_NAME_TOO_LONG', 'Họ tên tối đa 100 ký tự');
  return name;
}

function cleanPhone(phone) {
  if (!PHONE_RE.test(phone || '')) throw invalidInput('INVALID_PHONE', 'Số điện thoại không hợp lệ');
  return phone;
}

function cleanModel(model) {
  const m = typeof model === 'string' ? model.trim() : '';
  if (!m) throw invalidInput('MODEL_REQUIRED', 'Vui lòng nhập mẫu thiết bị');
  if (m.length > 100) throw invalidInput('MODEL_TOO_LONG', 'Mẫu thiết bị tối đa 100 ký tự');
  return m;
}

function cleanDate(value) {
  const ok = DATE_RE.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
  if (!ok) throw invalidInput('INVALID_WARRANTY_DATE', 'Ngày hết hạn bảo hành phải có dạng YYYY-MM-DD');
  return value;
}

function paging({ limit, offset } = {}) {
  const l = limit === undefined ? 50 : Number(limit);
  const o = offset === undefined ? 0 : Number(offset);
  if (!Number.isInteger(l) || l < 1 || l > 200 || !Number.isInteger(o) || o < 0) {
    throw invalidInput('INVALID_PAGING', 'limit phải từ 1 đến 200 và offset không âm');
  }
  return { limit: l, offset: o };
}

function createMasterDataService({ customers = customerRepository, devices = deviceRepository } = {}) {
  // ---------- Khách hàng ----------
  async function listCustomers(caller, query = {}) {
    requireRole(caller, READ_ROLES);
    const q = typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined;
    return customers.list({ q, ...paging(query) });
  }

  async function getCustomer(caller, id) {
    requireRole(caller, READ_ROLES);
    const customer = await customers.findById(toId(id, 'INVALID_CUSTOMER_ID', 'Mã khách hàng'));
    if (!customer) throw notFound('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    return customer;
  }

  async function updateCustomer(caller, id, body = {}) {
    requireRole(caller, WRITE_ROLES);
    const customerId = toId(id, 'INVALID_CUSTOMER_ID', 'Mã khách hàng');
    const fullName = cleanName(body.fullName);
    const phone = cleanPhone(body.phone);
    if (!(await customers.findById(customerId))) throw notFound('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    const other = await customers.findByPhone(phone);
    if (other && other.id !== customerId) {
      throw conflict('PHONE_EXISTS', 'Số điện thoại đã thuộc về một khách hàng khác');
    }
    return customers.update(customerId, { fullName, phone });
  }

  async function deleteCustomer(caller, id) {
    requireRole(caller, WRITE_ROLES);
    const customerId = toId(id, 'INVALID_CUSTOMER_ID', 'Mã khách hàng');
    if (!(await customers.findById(customerId))) throw notFound('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    if ((await customers.countDevices(customerId)) > 0) {
      throw conflict('CUSTOMER_HAS_DEVICES', 'Khách hàng còn thiết bị, hãy xoá hoặc chuyển thiết bị trước');
    }
    await customers.remove(customerId);
  }

  // ---------- Thiết bị ----------
  async function listDevices(caller, query = {}) {
    requireRole(caller, READ_ROLES);
    const customerId = query.customerId === undefined
      ? null : toId(query.customerId, 'INVALID_CUSTOMER_ID', 'Mã khách hàng');
    return devices.list({ customerId, ...paging(query) });
  }

  async function getDevice(caller, id) {
    requireRole(caller, READ_ROLES);
    const device = await devices.findById(toId(id, 'INVALID_DEVICE_ID', 'Mã thiết bị'));
    if (!device) throw notFound('DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
    return device;
  }

  async function createDevice(caller, body = {}) {
    requireRole(caller, WRITE_ROLES);
    const customerId = toId(body.customerId, 'INVALID_CUSTOMER_ID', 'Mã khách hàng');
    if (!IMEI_RE.test(body.imei || '')) throw invalidInput('INVALID_IMEI', 'IMEI phải gồm 15 chữ số');
    const model = cleanModel(body.model);
    const warrantyEndDate = cleanDate(body.warrantyEndDate);
    if (!(await customers.findById(customerId))) throw notFound('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    if (await devices.findByImei(body.imei)) throw conflict('IMEI_EXISTS', 'IMEI đã tồn tại trong hệ thống');
    return devices.insert({ customerId, imei: body.imei, model, warrantyEndDate });
  }

  async function updateDevice(caller, id, body = {}) {
    requireRole(caller, WRITE_ROLES);
    const deviceId = toId(id, 'INVALID_DEVICE_ID', 'Mã thiết bị');
    const model = cleanModel(body.model);
    const warrantyEndDate = cleanDate(body.warrantyEndDate);
    if (!(await devices.findById(deviceId))) throw notFound('DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
    return devices.update(deviceId, { model, warrantyEndDate });
  }

  async function deleteDevice(caller, id) {
    requireRole(caller, WRITE_ROLES);
    const deviceId = toId(id, 'INVALID_DEVICE_ID', 'Mã thiết bị');
    if (!(await devices.findById(deviceId))) throw notFound('DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
    if ((await devices.countTickets(deviceId)) > 0) {
      throw conflict('DEVICE_HAS_TICKETS', 'Thiết bị đã có phiếu bảo hành nên không xoá được (BR6: giữ lịch sử)');
    }
    await devices.remove(deviceId);
  }

  return {
    listCustomers, getCustomer, updateCustomer, deleteCustomer,
    listDevices, getDevice, createDevice, updateDevice, deleteDevice,
  };
}

module.exports = { ...createMasterDataService(), createMasterDataService };
