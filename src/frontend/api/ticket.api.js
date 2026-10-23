// Hợp đồng gọi API nghiệp vụ phiếu bảo hành – ánh xạ một–một với docs/api-contract.md.
import { request, session } from './client.js';

const enc = encodeURIComponent;

// A1
export async function login(username, password) {
  const result = await request('POST', '/auth/login', { body: { username, password } });
  session.save(result);
  return result.staff;
}

// C1, C2 – khách hàng (UC07)
export const findCustomerByPhone = (phone) => request('GET', '/customers', { query: { phone } });
export const createCustomer = (fullName, phone) => request('POST', '/customers', { body: { fullName, phone } });

// D1 – thiết bị
export const findDeviceByImei = (imei) => request('GET', '/devices', { query: { imei } });

// T1–T8 – phiếu bảo hành
export const createTicket = (input) => request('POST', '/tickets', { body: input });
export const listTickets = (filters) => request('GET', '/tickets', { query: filters });
export const getTicket = (code) => request('GET', `/tickets/${enc(code)}`);
export const classifyTicket = (code, issueCategoryId, priority) =>
  request('POST', `/tickets/${enc(code)}/classify`, { body: { issueCategoryId, priority } });
export const rejectTicket = (code, reason) =>
  request('POST', `/tickets/${enc(code)}/reject`, { body: { reason } });
export const assignTicket = (code, technicianId) =>
  request('POST', `/tickets/${enc(code)}/assign`, { body: { technicianId } });
export const startTicket = (code) => request('POST', `/tickets/${enc(code)}/start`);
export const getTicketHistory = (code) => request('GET', `/tickets/${enc(code)}/history`);

// L1, L2 – danh mục
export const listIssueCategories = () => request('GET', '/issue-categories');
export const listTechnicians = () => request('GET', '/technicians', { query: { active: true } });
