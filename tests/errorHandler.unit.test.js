// Unit test errorHandler – chuyển lỗi thành JSON theo "Định dạng lỗi chung" của API contract.
// Chạy: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/backend/middlewares/errorHandler');

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('Lỗi UNIQUE của PostgreSQL (23505) chưa được lớp nghiệp vụ xử lý → 409 DATA_CHANGED, không phải 500', () => {
  const res = fakeRes();
  const err = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'device_imei_key' });
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'DATA_CHANGED');
});
