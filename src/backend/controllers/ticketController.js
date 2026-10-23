// TicketController – /api/tickets, /api/issue-categories, /api/technicians.
const router = require('express').Router();
const ticketService = require('../services/ticketService');
const classifyService = require('../services/classifyService');
const assignService = require('../services/assignService');
const { toVnIso, handle } = require('./format');

// T1 – POST /api/tickets
router.post('/tickets', handle(async (req, res) => {
  const result = await ticketService.createTicket(req.caller, req.body);
  res.status(201).json({ ...result, createdAt: toVnIso(result.createdAt) });
}));

// T2 – GET /api/tickets
router.get('/tickets', handle(async (req, res) => {
  const result = await ticketService.listTickets(req.caller, req.query);
  res.json({ ...result, items: result.items.map((i) => ({ ...i, dueDate: toVnIso(i.dueDate) })) });
}));

// T3 – GET /api/tickets/:ticketCode
router.get('/tickets/:ticketCode', handle(async (req, res) => {
  const t = await ticketService.getTicket(req.caller, req.params.ticketCode);
  res.json({ ...t, dueDate: toVnIso(t.dueDate), createdAt: toVnIso(t.createdAt) });
}));

// T4 – POST /api/tickets/:ticketCode/classify
router.post('/tickets/:ticketCode/classify', handle(async (req, res) => {
  const r = await classifyService.classify(req.caller, req.params.ticketCode, req.body);
  res.json({ ...r, dueDate: toVnIso(r.dueDate) });
}));

// T5 – POST /api/tickets/:ticketCode/reject
router.post('/tickets/:ticketCode/reject', handle(async (req, res) => {
  res.json(await classifyService.reject(req.caller, req.params.ticketCode, req.body));
}));

// T6 – POST /api/tickets/:ticketCode/assign
router.post('/tickets/:ticketCode/assign', handle(async (req, res) => {
  res.json(await assignService.assign(req.caller, req.params.ticketCode, req.body));
}));

// T7 – POST /api/tickets/:ticketCode/start
router.post('/tickets/:ticketCode/start', handle(async (req, res) => {
  res.json(await ticketService.startTicket(req.caller, req.params.ticketCode));
}));

// T8 – GET /api/tickets/:ticketCode/history
router.get('/tickets/:ticketCode/history', handle(async (req, res) => {
  const rows = await ticketService.getHistory(req.caller, req.params.ticketCode);
  res.json(rows.map((r) => ({ ...r, changedAt: toVnIso(r.changedAt) })));
}));

// L1 – GET /api/issue-categories
router.get('/issue-categories', handle(async (req, res) => {
  res.json(await classifyService.listIssueCategories(req.caller));
}));

// L2 – GET /api/technicians?active=true
router.get('/technicians', handle(async (req, res) => {
  res.json(await assignService.listActiveTechnicians(req.caller));
}));

module.exports = router;
