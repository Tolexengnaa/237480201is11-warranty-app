// Lắp ráp ứng dụng Express: LỚP API (Controller) gọi xuống LỚP NGHIỆP VỤ (Service).
const express = require('express');
const { authenticate, loginRouter } = require('./middlewares/authMiddleware');
const customerController = require('./controllers/customerController');
const ticketController = require('./controllers/ticketController');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// A1 – đăng nhập không cần token; mọi API còn lại phải có Bearer token.
app.use('/api/auth', loginRouter);
app.use('/api', authenticate);
app.use('/api', customerController);
app.use('/api', ticketController);

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' }));
app.use(errorHandler);

module.exports = app;
