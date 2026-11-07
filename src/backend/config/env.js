// Đọc biến môi trường từ .env (xem .env.example). Không ghi mật khẩu vào mã nguồn.
require('dotenv').config({ quiet: true });
const crypto = require('crypto');

// Các giá trị SECRET_KEY từng nằm công khai trong repo (BUG-06) – ai cũng ký được token với chúng.
const PUBLIC_KEYS = new Set(['your_secret_key', 'doi-khoa-bi-mat-nay-khi-trien-khai', 'secret', 'changeme']);
const MIN_SECRET_LENGTH = 32;

/**
 * Khoá ký token (BUG-06).
 * - Không cấu hình → sinh khoá ngẫu nhiên cho lần chạy này (token cũ hết hiệu lực khi khởi động lại).
 * - Khoá đã công khai hoặc ngắn hơn 32 ký tự → dừng ngay, không chạy với khoá đoán được.
 */
function secretKey() {
  const value = process.env.SECRET_KEY;
  if (value === undefined || value === '') {
    console.warn('SECRET_KEY chưa đặt – dùng khoá ngẫu nhiên cho lần chạy này; đăng nhập lại sau mỗi lần khởi động.');
    return crypto.randomBytes(32).toString('hex');
  }
  if (PUBLIC_KEYS.has(value) || value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SECRET_KEY không an toàn (đã công khai hoặc ngắn hơn ${MIN_SECRET_LENGTH} ký tự). `
      + 'Tạo khoá mới: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" '
      + 'hoặc để trống để hệ thống tự sinh.',
    );
  }
  return value;
}

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Thiếu biến môi trường ${name} – xem .env.example`);
  }
  return value;
}

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
  },
  appPort: Number(process.env.APP_PORT || 3000),
  secretKey: secretKey(),
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '8h',
};
