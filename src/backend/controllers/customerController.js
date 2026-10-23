// CustomerController – /api/customers, /api/devices (UC07, UC01 bước 5).
// Chỉ nhận HTTP, lấy người gọi, chuyển JSON ↔ đối tượng; quy tắc nằm ở TicketService.
const router = require('express').Router();
const ticketService = require('../services/ticketService');
const { handle } = require('./format');

// C1 – GET /api/customers?phone=
router.get('/customers', handle(async (req, res) => {
  res.json(await ticketService.findCustomerByPhone(req.caller, req.query.phone));
}));

// C2 – POST /api/customers
router.post('/customers', handle(async (req, res) => {
  res.status(201).json(await ticketService.createCustomer(req.caller, req.body || {}));
}));

// D1 – GET /api/devices?imei=
router.get('/devices', handle(async (req, res) => {
  res.json(await ticketService.findDeviceByImei(req.caller, req.query.imei));
}));

module.exports = router;
