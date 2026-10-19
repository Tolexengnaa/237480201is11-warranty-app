// Chuyển Date → chuỗi ISO 8601 có múi giờ +07:00 (API contract mục 1: "Thời gian").
function toVnIso(value) {
  if (!value) return value ?? null;
  const d = value instanceof Date ? value : new Date(value);
  const shifted = new Date(d.getTime() + 7 * 3600 * 1000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, '+07:00');
}

/** Bọc handler async để lỗi đi tới errorHandler. */
const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

module.exports = { toVnIso, handle };
