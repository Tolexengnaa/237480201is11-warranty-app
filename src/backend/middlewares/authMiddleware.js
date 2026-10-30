// AuthMiddleware – /api/auth/login · xác thực Bearer token, gắn người gọi vào req.caller.
const router = require('express').Router();
const authService = require('../services/authService');
const { notAuthenticated } = require('../errors/AppError');

// A1 – POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    res.json(await authService.login(req.body));
  } catch (err) {
    next(err);
  }
});

async function authenticate(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw notAuthenticated('UNAUTHENTICATED', 'Vui lòng đăng nhập');
    }
    req.caller = await authService.verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, loginRouter: router };
