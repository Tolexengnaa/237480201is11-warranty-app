// Chuyển lỗi thành JSON theo "Định dạng lỗi chung" của API contract.
const { AppError } = require('../errors/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Dữ liệu gửi lên không phải JSON hợp lệ' });
  }
  // Vi phạm UNIQUE do hai yêu cầu chạy đồng thời mà lớp nghiệp vụ chưa chuyển thành mã lỗi riêng
  // (ví dụ hai phiếu cùng tạo một IMEI mới) – người dùng tải lại là thấy dữ liệu mới.
  if (err.code === '23505') {
    return res.status(409).json({ code: 'DATA_CHANGED', message: 'Dữ liệu đã thay đổi, vui lòng tải lại' });
  }
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại' });
}

module.exports = errorHandler;
