// Đọc biến môi trường từ .env (xem .env.example). Không ghi mật khẩu vào mã nguồn.
require('dotenv').config({ quiet: true });

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
  secretKey: required('SECRET_KEY'),
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '8h',
};
