// AuthService – đăng nhập và đọc token (hỗ trợ AuthMiddleware; không chứa quy tắc BR1–BR6).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const staffRepository = require('../repositories/staffRepository');
const { invalidInput, notAuthenticated, notAllowed } = require('../errors/AppError');

async function login({ username, password } = {}) {
  if (!username || !password) {
    throw invalidInput('CREDENTIALS_REQUIRED', 'Vui lòng nhập tên đăng nhập và mật khẩu');
  }
  const staff = await staffRepository.findByUsername(username);
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
    throw notAuthenticated('INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu');
  }
  if (!staff.isActive) throw notAllowed('STAFF_INACTIVE', 'Tài khoản đã bị khoá');

  const token = jwt.sign({ sub: String(staff.id), role: staff.role }, env.secretKey, {
    expiresIn: env.tokenExpiresIn,
  });
  return { token, staff: { id: staff.id, fullName: staff.fullName, role: staff.role } };
}

/** Trả về người gọi { id, role, fullName } từ token; đọc lại CSDL để chặn tài khoản vừa bị khoá. */
async function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.secretKey);
  } catch {
    throw notAuthenticated('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }
  const staff = await staffRepository.findById(Number(payload.sub));
  if (!staff || !staff.isActive) throw notAuthenticated('INVALID_TOKEN', 'Phiên đăng nhập không còn hiệu lực');
  return { id: staff.id, role: staff.role, fullName: staff.fullName };
}

module.exports = { login, verifyToken };
