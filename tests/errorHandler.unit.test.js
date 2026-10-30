// C2 – chỉ lớp API (errorHandler) mới đổi loại lỗi nghiệp vụ sang mã HTTP.
const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/backend/middlewares/errorHandler');
const { AppError, invalidInput, notAuthenticated, notAllowed, notFound, conflict } = require('../src/backend/errors/AppError');

function run(err) {
  const out = {};
  const res = { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } };
  const orig = console.error; console.error = () => {};
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = orig; }
  return out;
}

test('C2: mỗi loại lỗi nghiệp vụ ↔ một mã HTTP', () => {
  assert.equal(run(invalidInput('X', 'm')).status, 400);
  assert.equal(run(notAuthenticated('X', 'm')).status, 401);
  assert.equal(run(notAllowed('X', 'm')).status, 403);
  assert.equal(run(notFound('X', 'm')).status, 404);
  assert.equal(run(conflict('X', 'm', { a: 1 })).body.details.a, 1);
  assert.equal(run(conflict('X', 'm')).status, 409);
});

test('C2: lỗi nghiệp vụ không mang mã HTTP', () => {
  const e = invalidInput('X', 'm');
  assert.ok(e instanceof AppError);
  assert.equal(e.status, undefined);
});

test('Suy giảm có kiểm soát: mất kết nối CSDL → 503 thông báo rõ, JSON sai → 400, lỗi lạ → 500 chung', () => {
  const down = run(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));
  assert.equal(down.status, 503);
  assert.equal(down.body.code, 'DB_UNAVAILABLE');
  assert.equal(run({ type: 'entity.parse.failed' }).status, 400);
  const other = run(new Error('boom'));
  assert.equal(other.status, 500);
  assert.ok(!JSON.stringify(other.body).includes('boom'));
});
