// ClassifyService – FR2 · BR4 · BR6: phân loại hoặc từ chối phiếu (UC02). Chỉ Điều phối viên (BR5, NFR4).
const db = require('../config/db');
const issueCategoryRepository = require('../repositories/issueCategoryRepository');
const ticketRepository = require('../repositories/ticketRepository');
const defaultStatusService = require('./statusService');
const { requireRole } = require('./ticketService');
const { invalidInput, notFound, conflict } = require('../errors/AppError');

// BR4: hạn xử lý = thời điểm phân loại + số giờ theo mức ưu tiên.
const SLA_HOURS = { HIGH: 24, MEDIUM: 72, LOW: 120 };

/** BR4 – tính hạn xử lý; mức ưu tiên không hợp lệ → 400. */
function computeDueDate(classifiedAt, priority) {
  const hours = SLA_HOURS[priority];
  if (!hours) {
    throw invalidInput('INVALID_PRIORITY', 'Mức ưu tiên phải là HIGH, MEDIUM hoặc LOW');
  }
  return new Date(classifiedAt.getTime() + hours * 3600 * 1000);
}

function createClassifyService({
  categories = issueCategoryRepository,
  tickets = ticketRepository,
  statusService = defaultStatusService,
  withTransaction = db.withTransaction,
  now = () => new Date(),
} = {}) {
  const COORDINATOR_ONLY = 'Chỉ Điều phối viên được phân loại hoặc từ chối phiếu';

  // L1 – danh mục lỗi đang dùng (màn hình M3, khu vực phân loại).
  async function listIssueCategories(caller) {
    requireRole(caller, ['COORDINATOR']);
    return categories.listActive();
  }

  async function loadNewTicket(client, ticketCode) {
    const ticket = await tickets.findByCode(ticketCode, client);
    if (!ticket) throw notFound('TICKET_NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
    if (ticket.status !== 'NEW') {
      throw conflict('INVALID_STATUS', 'Chỉ phân loại hoặc từ chối phiếu đang ở trạng thái Mới');
    }
    return ticket;
  }

  // T4 – POST /api/tickets/:ticketCode/classify
  async function classify(caller, ticketCode, input) {
    requireRole(caller, ['COORDINATOR'], COORDINATOR_ONLY);
    const { issueCategoryId, priority } = input || {};
    if (!Number.isInteger(issueCategoryId) || issueCategoryId <= 0) {
      throw invalidInput('ISSUE_CATEGORY_REQUIRED', 'Vui lòng chọn danh mục lỗi');
    }
    const classifiedAt = now();
    const dueDate = computeDueDate(classifiedAt, priority);

    return withTransaction(async (client) => {
      const ticket = await loadNewTicket(client, ticketCode);
      if (!(await categories.findActiveById(issueCategoryId, client))) {
        throw invalidInput('ISSUE_CATEGORY_INVALID', 'Danh mục lỗi không tồn tại hoặc đã ngừng dùng');
      }
      await statusService.changeStatus(client, {
        ticketId: ticket.id,
        fromStatus: 'NEW',
        toStatus: 'CLASSIFIED',
        changedBy: caller.id,
        fields: { issueCategoryId, priority, dueDate },
      });
      return { ticketCode: ticket.ticketCode, status: 'CLASSIFIED', dueDate };
    });
  }

  // T5 – POST /api/tickets/:ticketCode/reject (BR6: chỉ từ Mới, bắt buộc lý do)
  async function reject(caller, ticketCode, input) {
    requireRole(caller, ['COORDINATOR'], COORDINATOR_ONLY);
    const reason = input && typeof input.reason === 'string' ? input.reason.trim() : '';
    if (!reason) throw invalidInput('REJECT_REASON_REQUIRED', 'Vui lòng nhập lý do từ chối');

    return withTransaction(async (client) => {
      const ticket = await loadNewTicket(client, ticketCode);
      await statusService.changeStatus(client, {
        ticketId: ticket.id,
        fromStatus: 'NEW',
        toStatus: 'REJECTED',
        changedBy: caller.id,
        note: reason,
      });
      return { ticketCode: ticket.ticketCode, status: 'REJECTED' };
    });
  }

  return { listIssueCategories, classify, reject };
}

module.exports = { ...createClassifyService(), createClassifyService, computeDueDate, SLA_HOURS };
