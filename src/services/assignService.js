// AssignService – FR3 · BR5: phân công kỹ thuật viên. Hiện thực ở Sprint 2 (buổi 10).
// L2 – danh sách kỹ thuật viên đang hoạt động kèm số phiếu đang giữ.
const staffRepository = require('../repositories/staffRepository');
const { requireRole } = require('./ticketService');

async function listActiveTechnicians(caller) {
  requireRole(caller, ['COORDINATOR']);
  return staffRepository.listActiveTechnicians();
}

module.exports = { listActiveTechnicians };
