// ClassifyService – FR2 · BR4: phân loại / từ chối phiếu. Hiện thực ở Sprint 2 (buổi 10).
// L1 – danh mục lỗi đang dùng (phục vụ màn hình phân loại).
const issueCategoryRepository = require('../repositories/issueCategoryRepository');
const { requireRole } = require('./ticketService');

async function listIssueCategories(caller) {
  requireRole(caller, ['COORDINATOR']);
  return issueCategoryRepository.listActive();
}

module.exports = { listIssueCategories };
