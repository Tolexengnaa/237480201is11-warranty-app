// TODO buổi 8 – AuthMiddleware: /api/auth/login, xác thực token, lấy người gọi.
const router = require('express').Router();
function authenticate(req, res, next) { next(); }
module.exports = { authenticate, loginRouter: router };
