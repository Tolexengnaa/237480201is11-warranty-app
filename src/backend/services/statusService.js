// StatusService – FR5 · BR6 · nơi DUY NHẤT đổi trạng thái phiếu và ghi lịch sử (NFR5).
// Mọi hàm nhận `client` của giao dịch đang mở để trạng thái và lịch sử cùng commit hoặc cùng rollback.
const ticketRepository = require('../repositories/ticketRepository');
const statusLogRepository = require('../repositories/statusLogRepository');
const { conflict, invalidInput } = require('../errors/AppError');

// BR6: Mới → Đã phân loại → Đã phân công → Đang xử lý, không quay lui; Từ chối chỉ từ Mới.
const TRANSITIONS = {
  NEW: ['CLASSIFIED', 'REJECTED'],
  CLASSIFIED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: [],
  REJECTED: [],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function createStatusService({ tickets = ticketRepository, logs = statusLogRepository } = {}) {
  /** Bản ghi lịch sử đầu tiên khi tạo phiếu: null → NEW. */
  async function recordCreation(client, { ticketId, changedBy }) {
    await logs.insert({ ticketId, fromStatus: null, toStatus: 'NEW', changedBy }, client);
  }

  /** Đổi trạng thái + ghi đúng 1 bản ghi lịch sử. Dùng cho phân loại, từ chối, phân công, nhận phiếu. */
  async function changeStatus(client, { ticketId, fromStatus, toStatus, changedBy, note, fields }) {
    if (!canTransition(fromStatus, toStatus)) {
      throw conflict('INVALID_STATUS', `Không thể chuyển phiếu từ ${fromStatus} sang ${toStatus}`);
    }
    if (toStatus === 'REJECTED' && !(note && note.trim())) {
      throw invalidInput('REJECT_REASON_REQUIRED', 'Vui lòng nhập lý do từ chối');
    }
    const updated = await tickets.updateStatus({ ticketId, fromStatus, toStatus, fields }, client);
    if (!updated) {
      throw conflict('DATA_CHANGED', 'Dữ liệu đã thay đổi, vui lòng tải lại');
    }
    await logs.insert({ ticketId, fromStatus, toStatus, note, changedBy }, client);
  }

  return { recordCreation, changeStatus };
}

module.exports = { ...createStatusService(), createStatusService, canTransition, TRANSITIONS };
