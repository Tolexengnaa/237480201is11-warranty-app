// Lắp ráp ứng dụng Express: LỚP API (Controller) gọi xuống LỚP NGHIỆP VỤ (Service).
const path = require('path');
const express = require('express');
const { pool } = require('./config/db');
const { authenticate, loginRouter } = require('./middlewares/authMiddleware');
const customerController = require('./controllers/customerController');
const ticketController = require('./controllers/ticketController');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by'); // không quảng cáo framework đang dùng (checklist bảo mật mục 5)
app.use(express.json());

// Kiểm tra sức khoẻ cho Docker healthcheck: chỉ "ok" khi ứng dụng VÀ CSDL cùng trả lời được.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

// LỚP GIAO DIỆN: M1, M2, M3 (src/frontend) – cùng cổng với API nên không cần cấu hình CORS.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// A1 – đăng nhập không cần token; mọi API còn lại phải có Bearer token.
app.use('/api/auth', loginRouter);
app.use('/api', authenticate);
app.use('/api', customerController);
app.use('/api', ticketController);

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' }));
app.use(errorHandler);

module.exports = app;
