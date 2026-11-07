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

module.exports = { isCalendarDate, MAX_LEN, DAY_RE };
