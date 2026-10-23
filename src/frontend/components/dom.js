// Tiện ích dựng DOM và hiển thị theo bảng thuật ngữ SRS. Không chứa quy tắc nghiệp vụ.

/** h('div', { class: 'x', onclick }, child1, 'text', …) – luôn dùng textContent nên an toàn với dữ liệu người dùng. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const STATUS_LABEL = {
  NEW: 'Mới',
  CLASSIFIED: 'Đã phân loại',
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang xử lý',
  REJECTED: 'Từ chối',
};

export const PRIORITY_LABEL = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };

export const ROLE_LABEL = {
  RECEPTIONIST: 'Nhân viên tiếp nhận',
  COORDINATOR: 'Điều phối viên',
  TECHNICIAN: 'Kỹ thuật viên',
};

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-12T14:30:00+07:00" → "12/10/2026 14:30" (giờ Việt Nam). */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} `
    + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "2026-01-01" → "01/01/2026". */
export function formatDate(ymd) {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export const badge = (text, kind = '') => h('span', { class: `badge ${kind}` }, text);

/** Thông báo lỗi theo mã bước của đặc tả use case, ví dụ "(2a) Số điện thoại không hợp lệ". */
export const errorText = (message) => h('p', { class: 'msg error', role: 'alert' }, '⚠ ', message);
export const infoText = (message) => h('p', { class: 'msg info' }, message);
export const successText = (message) => h('p', { class: 'msg success', role: 'status' }, '✔ ', message);

/** Thông báo thành công giữ qua một lần chuyển màn hình (UC01 bước 8, UC03 bước 6). */
let flash = null;
export function setFlash(message) { flash = message; }
export function takeFlash() { const m = flash; flash = null; return m; }
