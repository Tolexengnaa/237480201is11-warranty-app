// Chuyển lỗi thành JSON theo "Định dạng lỗi chung" của API contract.
// Đây là NƠI DUY NHẤT đổi loại lỗi nghiệp vụ sang mã HTTP (tiêu chí C2).
const { AppError } = require('../errors/AppError');

const HTTP_STATUS = {
  INVALID_INPUT: 400,
  NOT_AUTHENTICATED: 401,
  NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

// Mã lỗi kết nối của Node/pg khi PostgreSQL không chạy hoặc không với tới được.
const DB_DOWN = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03', '08006', '08001']);

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(HTTP_STATUS[err.kind] || 500).json(body);
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Dữ liệu gửi lên không phải JSON hợp lệ' });
  }
  const dbDown = DB_DOWN.has(err.code) || (err.errors || []).some((e) => DB_DOWN.has(e.code));
  if (dbDown) {
    console.error('Mất kết nối CSDL:', err.code || err.message);
    return res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau' });
  }
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại' });
}

module.exports = errorHandler;
module.exports.HTTP_STATUS = HTTP_STATUS;
