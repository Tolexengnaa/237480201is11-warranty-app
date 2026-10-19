// TicketService – FR1 (tạo phiếu), FR4 (tra cứu) · quy tắc BR1, BR2, BR3.
// Kiểm tra vai trò người gọi ngay tại đây (NFR4), không dựa vào việc ẩn nút trên giao diện.
const db = require('../config/db');
const customerRepository = require('../repositories/customerRepository');
const deviceRepository = require('../repositories/deviceRepository');
const ticketRepository = require('../repositories/ticketRepository');
const defaultStatusService = require('./statusService');
const { badRequest, forbidden, notFound, conflict } = require('../errors/AppError');

const PHONE_RE = /^[0-9]{10}$/;
const IMEI_RE = /^[0-9]{15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam – mốc so sánh ngày hết hạn bảo hành. */
function vnDate(at) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(at);
}

/** BR3: thiết bị tiếp nhận SAU ngày hết hạn bảo hành → Hết hạn bảo hành (tính, không lưu). */
function isOutOfWarranty(warrantyEndDate, at = new Date()) {
  return vnDate(at) > warrantyEndDate;
}

function requireRole(caller, roles, message) {
  if (!caller || !roles.includes(caller.role)) {
    throw forbidden('FORBIDDEN_ROLE', message || 'Bạn không có quyền thực hiện chức năng này');
  }
}

function validatePhone(phone) {
  if (!PHONE_RE.test(phone || '')) throw badRequest('INVALID_PHONE', 'Số điện thoại không hợp lệ');
}

function validateImei(imei) {
  if (!IMEI_RE.test(imei || '')) throw badRequest('INVALID_IMEI', 'IMEI phải gồm 15 chữ số');
}

function createTicketService({
  customers = customerRepository,
  devices = deviceRepository,
  tickets = ticketRepository,
  statusService = defaultStatusService,
  withTransaction = db.withTransaction,
  now = () => new Date(),
} = {}) {
  // ---- C1 / C2: khách hàng (UC07) ----
  async function findCustomerByPhone(caller, phone) {
    requireRole(caller, ['RECEPTIONIST']);
    validatePhone(phone);
    const customer = await customers.findByPhone(phone);
    if (!customer) throw notFound('CUSTOMER_NOT_FOUND', 'Chưa có khách hàng với số điện thoại này');
    return customer;
  }

  async function createCustomer(caller, { fullName, phone }) {
    requireRole(caller, ['RECEPTIONIST']);
    if (!fullName || !String(fullName).trim()) {
      throw badRequest('FULL_NAME_REQUIRED', 'Vui lòng nhập họ tên khách hàng');
    }
    validatePhone(phone);
    if (await customers.findByPhone(phone)) {
      throw conflict('PHONE_EXISTS', 'Số điện thoại đã thuộc về một khách hàng khác');
    }
    return customers.insert({ fullName: String(fullName).trim(), phone });
  }

  // ---- D1: tra cứu thiết bị (UC01 bước 5) ----
  async function findDeviceByImei(caller, imei) {
    requireRole(caller, ['RECEPTIONIST']);
    validateImei(imei);
    const device = await devices.findByImei(imei);
    if (!device) throw notFound('DEVICE_NOT_FOUND', 'Chưa có thiết bị với IMEI này');
    const open = await tickets.findOpenByDeviceId(device.id);
    return {
      ...device,
      outOfWarranty: isOutOfWarranty(device.warrantyEndDate, now()),
      openTicketCode: open ? open.ticketCode : null,
    };
  }

  // ---- T1: tạo phiếu bảo hành (UC01, FR1) ----
  async function createTicket(caller, input) {
    requireRole(caller, ['RECEPTIONIST'], 'Chỉ Nhân viên tiếp nhận được tạo phiếu bảo hành');
    const { customerId, imei, model, warrantyEndDate } = input || {};
    const issueDescription = input && typeof input.issueDescription === 'string'
      ? input.issueDescription.trim() : '';

    if (!Number.isInteger(customerId) || customerId <= 0) {
      throw badRequest('CUSTOMER_ID_REQUIRED', 'Vui lòng chọn khách hàng');
    }
    validateImei(imei);
    if (!issueDescription) throw badRequest('ISSUE_DESCRIPTION_REQUIRED', 'Vui lòng nhập mô tả lỗi');

    const createdAt = now();
    return withTransaction(async (client) => {
      const customer = await customers.findById(customerId, client);
      if (!customer) throw notFound('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');

      let device = await devices.findByImei(imei, client);
      if (!device) {
        // UC01-5a: thiết bị mới → bắt buộc Model và Ngày hết hạn bảo hành.
        if (!model || !String(model).trim()) throw badRequest('MODEL_REQUIRED', 'Vui lòng nhập model thiết bị');
        if (!DATE_RE.test(warrantyEndDate || '') || Number.isNaN(Date.parse(warrantyEndDate))) {
          throw badRequest('WARRANTY_END_DATE_REQUIRED', 'Vui lòng nhập ngày hết hạn bảo hành (YYYY-MM-DD)');
        }
        device = await devices.insert(
          { customerId, imei, model: String(model).trim(), warrantyEndDate }, client,
        );
      } else if (device.customerId !== customerId) {
        // BR1: phiếu gắn với đúng một khách hàng và một thiết bị của chính khách đó.
        throw conflict('DEVICE_OWNER_MISMATCH', 'Thiết bị này đã đăng ký cho khách hàng khác');
      }

      // BR2: một IMEI tối đa một phiếu chưa đóng (CSDL còn chặn thêm bằng UNIQUE một phần).
      const open = await tickets.findOpenByDeviceId(device.id, client);
      if (open) {
        throw conflict('TICKET_OPEN_EXISTS', `Thiết bị đang có phiếu ${open.ticketCode} chưa đóng`,
          { openTicketCode: open.ticketCode });
      }

      const year = Number(vnDate(createdAt).slice(0, 4));
      const ticketCode = await tickets.nextTicketCode(year, client);
      const ticket = await tickets.insert(
        { ticketCode, deviceId: device.id, issueDescription, createdBy: caller.id }, client,
      );
      await statusService.recordCreation(client, { ticketId: ticket.id, changedBy: caller.id });

      return {
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        outOfWarranty: isOutOfWarranty(device.warrantyEndDate, ticket.createdAt),
        createdAt: ticket.createdAt,
      };
    });
  }

  // ---- T2: danh sách phiếu (UC04, FR4) ----
  async function listTickets(caller, query = {}) {
    requireRole(caller, ['RECEPTIONIST', 'COORDINATOR', 'TECHNICIAN']);
    const page = query.page === undefined ? 1 : Number(query.page);
    const size = query.size === undefined ? 20 : Number(query.size);
    if (!Number.isInteger(page) || page < 1) throw badRequest('INVALID_PAGE', 'page phải là số nguyên ≥ 1');
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      throw badRequest('INVALID_PAGE', 'size phải là số nguyên từ 1 đến 100');
    }
    if (query.status && !STATUSES.includes(query.status)) {
      throw badRequest('INVALID_FILTER', `status phải là một trong ${STATUSES.join(', ')}`);
    }
    if (query.priority && !PRIORITIES.includes(query.priority)) {
      throw badRequest('INVALID_FILTER', `priority phải là một trong ${PRIORITIES.join(', ')}`);
    }
    for (const key of ['dueFrom', 'dueTo']) {
      if (query[key] && Number.isNaN(Date.parse(query[key]))) {
        throw badRequest('INVALID_FILTER', `${key} phải là thời gian ISO 8601`);
      }
    }

    const filters = {
      status: query.status, priority: query.priority, dueFrom: query.dueFrom, dueTo: query.dueTo,
      q: query.q ? String(query.q).trim() : undefined, page, size,
      // Kỹ thuật viên chỉ thấy phiếu được phân công cho chính mình.
      assignedTo: caller.role === 'TECHNICIAN' ? caller.id : undefined,
    };
    const { total, items } = await tickets.search(filters);
    return { page, size, total, items };
  }

  // ---- T3: chi tiết phiếu (màn hình M3) ----
  async function getTicket(caller, ticketCode) {
    requireRole(caller, ['RECEPTIONIST', 'COORDINATOR', 'TECHNICIAN']);
    const t = await tickets.findDetailByCode(ticketCode);
    if (!t) throw notFound('TICKET_NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
    if (caller.role === 'TECHNICIAN' && t.assignedTo !== caller.id) {
      throw forbidden('FORBIDDEN_ROLE', 'Phiếu này không được phân công cho bạn');
    }
    return {
      ticketCode: t.ticketCode,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      issueCategory: t.categoryId ? { id: t.categoryId, name: t.categoryName } : null,
      issueDescription: t.issueDescription,
      outOfWarranty: isOutOfWarranty(t.warrantyEndDate, t.createdAt),
      customer: { fullName: t.customerName, phone: t.customerPhone },
      device: { imei: t.imei, model: t.model, warrantyEndDate: t.warrantyEndDate },
      technician: t.technicianId ? { id: t.technicianId, fullName: t.technicianName } : null,
      createdBy: { fullName: t.createdByName },
      createdAt: t.createdAt,
    };
  }

  return { findCustomerByPhone, createCustomer, findDeviceByImei, createTicket, listTickets, getTicket };
}

module.exports = { ...createTicketService(), createTicketService, isOutOfWarranty, requireRole };
