// CustomerController – /api/customers, /api/devices (UC07, UC01 bước 5).
// Chỉ nhận HTTP, lấy người gọi, chuyển JSON ↔ đối tượng; quy tắc nằm ở TicketService.
const router = require('express').Router();
const ticketService = require('../services/ticketService');
const masterData = require('../services/masterDataService');
const { handle } = require('./format');

// C1 – GET /api/customers?phone=
// Không có ?phone → danh sách khách hàng (S1, hỗ trợ ?q=&limit=&offset=).
router.get('/customers', handle(async (req, res) => {
  if (req.query.phone === undefined) return res.json(await masterData.listCustomers(req.caller, req.query));
  return res.json(await ticketService.findCustomerByPhone(req.caller, req.query.phone));
}));

// C2 – POST /api/customers
router.post('/customers', handle(async (req, res) => {
  res.status(201).json(await ticketService.createCustomer(req.caller, req.body || {}));
}));

// D1 – GET /api/devices?imei=
// Không có ?imei → danh sách thiết bị (S1, hỗ trợ ?customerId=&limit=&offset=).
router.get('/devices', handle(async (req, res) => {
  if (req.query.imei === undefined) return res.json(await masterData.listDevices(req.caller, req.query));
  return res.json(await ticketService.findDeviceByImei(req.caller, req.query.imei));
}));

// ---- S1: CRUD khách hàng ----
router.get('/customers/:id', handle(async (req, res) => {
  res.json(await masterData.getCustomer(req.caller, req.params.id));
}));
router.put('/customers/:id', handle(async (req, res) => {
  res.json(await masterData.updateCustomer(req.caller, req.params.id, req.body || {}));
}));
router.delete('/customers/:id', handle(async (req, res) => {
  await masterData.deleteCustomer(req.caller, req.params.id);
  res.status(204).end();
}));

// ---- S1: CRUD thiết bị ----
router.post('/devices', handle(async (req, res) => {
  res.status(201).json(await masterData.createDevice(req.caller, req.body || {}));
}));
router.get('/devices/:id', handle(async (req, res) => {
  res.json(await masterData.getDevice(req.caller, req.params.id));
}));
router.put('/devices/:id', handle(async (req, res) => {
  res.json(await masterData.updateDevice(req.caller, req.params.id, req.body || {}));
}));
router.delete('/devices/:id', handle(async (req, res) => {
  await masterData.deleteDevice(req.caller, req.params.id);
  res.status(204).end();
}));

module.exports = router;
