// Nơi DUY NHẤT trong giao diện được gọi fetch(). Các màn hình (pages/) chỉ gọi qua *.api.js.
// - Gắn token đăng nhập vào header Authorization.
// - Nhận 401 → xoá phiên và chuyển về trang đăng nhập.
// - Lỗi trả về theo "Định dạng lỗi chung" của docs/api-contract.md: { code, message, details }.

const TOKEN_KEY = 'smartcrm.token';
const STAFF_KEY = 'smartcrm.staff';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// localStorage có thể bị chặn (cửa sổ ẩn danh…) nên luôn bọc try/catch.
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* bỏ qua: phiên chỉ sống trong tab hiện tại */ }
}

export const session = {
  get token() { return read(TOKEN_KEY); },
  get staff() {
    try { return JSON.parse(read(STAFF_KEY)); } catch { return null; }
  },
  save({ token, staff }) {
    write(TOKEN_KEY, token);
    write(STAFF_KEY, JSON.stringify(staff));
  },
  clear() {
    write(TOKEN_KEY, null);
    write(STAFF_KEY, null);
  },
};

export async function request(method, path, { body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.');
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  if (res.status === 401 && path !== '/auth/login') {
    session.clear();
    window.location.hash = '#/login?expired=1';
  }
  throw new ApiError(
    res.status,
    data?.code || 'HTTP_' + res.status,
    data?.message || `Lỗi máy chủ (HTTP ${res.status})`,
    data?.details,
  );
}
