// Kiểm tra dữ liệu dùng chung cho các service – một nơi duy nhất để T1 (tạo phiếu) và S2 (CRUD thiết bị)
// không kiểm cùng một trường theo hai cách khác nhau (BUG-04).

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Độ dài tối đa khớp với cột VARCHAR trong db/migrations/001_init_schema.sql.
const MAX_LEN = { fullName: 100, model: 100 };

/**
 * Ngày dạng YYYY-MM-DD và CÓ THẬT trên lịch.
 * Không dùng Date.parse một mình: V8 chấp nhận '2026-02-30' và tự đổi thành 02/03.
 */
function isCalendarDate(value) {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const ISO_RE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const VN_OFFSET = '+07:00'; // Việt Nam không dùng giờ mùa hè

/**
 * Mốc lọc hạn xử lý (T2) → Date chính xác, hoặc null nếu không hợp lệ (BUG-05).
 * - 'YYYY-MM-DD' (ô ngày của màn hình M2) hiểu theo giờ Việt Nam: mốc "từ" = 00:00:00,
 *   mốc "đến" = 23:59:59.999 của ngày đó, để lọc một ngày gồm cả phiếu hạn trong ngày.
 * - Thời gian ISO 8601 phải có múi giờ (Z hoặc ±hh:mm) để không phụ thuộc múi giờ của CSDL.
 */
function parseDueBound(value, { endOfDay = false } = {}) {
  if (typeof value !== 'string') return null;
  if (DAY_RE.test(value)) {
    if (!isCalendarDate(value)) return null;
    return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}${VN_OFFSET}`);
  }
  const m = ISO_RE.exec(value);
  if (!m || !isCalendarDate(m[1])) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { isCalendarDate, parseDueBound, MAX_LEN, DAY_RE };
