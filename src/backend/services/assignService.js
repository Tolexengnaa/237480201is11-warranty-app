// AssignService – FR3 · BR5: phân công kỹ thuật viên (UC03). Chỉ Điều phối viên (NFR4).
const db = require('../config/db');
const staffRepository = require('../repositories/staffRepository');
const ticketRepository = require('../repositories/ticketRepository');
const defaultStatusService = require('./statusService');
const { requireRole } = require('./ticketService');
const { badRequest, notFound, conflict } = require('../errors/AppError');

function createAssignService({
  staff = staffRepository,
  tickets = ticketRepository,
  statusService = defaultStatusService,
  withTransaction = db.withTransaction,
} = {}) {
  // L2 – kỹ thuật viên đang hoạt động kèm số phiếu đang giữ.
  async function listActiveTechnicians(caller) {
    requireRole(caller, ['COORDINATOR']);
    return staff.listActiveTechnicians();
  }

  // T6 – POST /api/tickets/:ticketCode/assign
  async function assign(caller, ticketCode, input) {
    requireRole(caller, ['COORDINATOR'], 'Bạn không có quyền phân công phiếu'); // UC03-4a
    const technicianId = input && input.technicianId;
    if (!Number.isInteger(technicianId) || technicianId <= 0) {
      throw badRequest('TECHNICIAN_REQUIRED', 'Vui lòng chọn kỹ thuật viên');
    }

    return withTransaction(async (client) => {
      const ticket = await tickets.findByCode(ticketCode, client);
      if (!ticket) throw notFound('TICKET_NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
      if (ticket.status === 'NEW') {
        throw conflict('TICKET_NOT_CLASSIFIED', 'Cần phân loại phiếu trước khi phân công'); // UC03-1a
      }
      if (ticket.status !== 'CLASSIFIED') {
        throw conflict('DATA_CHANGED', 'Dữ liệu đã thay đổi, vui lòng tải lại'); // UC03-4b
      }
      // BR5: chỉ phân công cho kỹ thuật viên đang hoạt động.
      const tech = await staff.findById(technicianId, client);
      if (!tech || tech.role !== 'TECHNICIAN' || !tech.isActive) {
        throw conflict('DATA_CHANGED', 'Kỹ thuật viên không còn khả dụng, vui lòng tải lại'); // UC03-4b
      }
      await statusService.changeStatus(client, {
        ticketId: ticket.id,
        fromStatus: 'CLASSIFIED',
        toStatus: 'ASSIGNED',
        changedBy: caller.id,
        fields: { assignedTo: tech.id },
      });
      return {
        ticketCode: ticket.ticketCode,
        status: 'ASSIGNED',
        technician: { id: tech.id, fullName: tech.fullName },
      };
    });
  }

  return { listActiveTechnicians, assign };
}

module.exports = { ...createAssignService(), createAssignService };
