// Lỗi nghiệp vụ (domain error). LỚP NGHIỆP VỤ chỉ biết "loại lỗi" (kind), KHÔNG biết mã HTTP.
// Việc đổi kind -> mã HTTP nằm ở lớp API: src/middlewares/errorHandler.js (tiêu chí C2).
const KINDS = ['INVALID_INPUT', 'NOT_AUTHENTICATED', 'NOT_ALLOWED', 'NOT_FOUND', 'CONFLICT'];

class AppError extends Error {
  constructor(kind, code, message, details) {
    super(message);
    this.kind = kind;
    this.code = code;
    this.details = details;
  }
}

const invalidInput = (c, m, d) => new AppError('INVALID_INPUT', c, m, d);
const notAuthenticated = (c, m) => new AppError('NOT_AUTHENTICATED', c, m);
const notAllowed = (c, m) => new AppError('NOT_ALLOWED', c, m);
const notFound = (c, m) => new AppError('NOT_FOUND', c, m);
const conflict = (c, m, d) => new AppError('CONFLICT', c, m, d);

module.exports = { AppError, KINDS, invalidInput, notAuthenticated, notAllowed, notFound, conflict };
