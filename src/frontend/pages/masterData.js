// M4 – Khách hàng & thiết bị (S1: CRUD ≥ 2 thực thể). Nhân viên tiếp nhận sửa/xoá; Điều phối viên chỉ xem.
// Quyền thật được kiểm tra ở máy chủ (NFR4); giao diện chỉ ẩn nút để gọn.
import {
  listCustomers, updateCustomer, deleteCustomer, listDevices, createDevice, updateDevice, deleteDevice,
} from '../api/ticket.api.js';
import { session } from '../api/client.js';
import { DataState } from '../components/DataState.js';
import { h, formatDate, errorText, successText } from '../components/dom.js';

export function MasterDataPage(root) {
  const canWrite = session.staff?.role === 'RECEPTIONIST';
  const flash = h('div', { class: 'messages', role: 'status' });
  const area = h('div', {});
  let tab = 'customers';

  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const drawTabs = () => tabs.replaceChildren(
    ...[['customers', 'Khách hàng'], ['devices', 'Thiết bị']].map(([id, label]) =>
      h('button', {
        class: `tab ${tab === id ? 'active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(tab === id),
        onclick: () => { tab = id; drawTabs(); draw(); },
      }, label)));

  const say = (node) => flash.replaceChildren(node);
  const run = async (action, okText, reload) => {
    try { await action(); say(successText(okText)); reload(); } catch (err) { say(errorText(err.message)); }
  };

  function draw() {
    flash.replaceChildren();
    if (tab === 'customers') drawCustomers(); else drawDevices();
  }

  function drawCustomers() {
    const q = h('input', { id: 'm-q', type: 'search', placeholder: 'Tìm theo tên hoặc số điện thoại…' });
    const box = h('div', {});
    area.replaceChildren(
      h('form', { class: 'card filters', onsubmit: (e) => { e.preventDefault(); state.reload(); } },
        h('div', { class: 'row' }, h('div', { class: 'grow' }, q), h('button', { class: 'btn', type: 'submit' }, 'Tìm'))),
      h('div', { class: 'card table-wrap' }, box));
    const state = DataState(box, {
      load: () => listCustomers(q.value.trim()),
      isEmpty: (rows) => rows.length === 0,
      emptyText: 'Chưa có khách hàng nào khớp. Khách hàng mới được tạo khi tiếp nhận phiếu bảo hành.',
      render: (rows, reload) => h('table', {},
        h('thead', {}, h('tr', {}, ...['Họ tên', 'Số điện thoại', 'Thiết bị', ''].map((c) => h('th', {}, c)))),
        h('tbody', {}, rows.map((c) => h('tr', {},
          h('td', {}, c.fullName), h('td', { class: 'mono' }, c.phone), h('td', {}, c.deviceCount),
          h('td', { class: 'cell-actions' }, canWrite ? [
            h('button', { class: 'btn small-btn', type: 'button', onclick: () => editCustomer(c, reload) }, 'Sửa'),
            h('button', {
              class: 'btn small-btn danger', type: 'button',
              onclick: () => { if (window.confirm(`Xoá khách hàng ${c.fullName}?`)) run(() => deleteCustomer(c.id), 'Đã xoá khách hàng', reload); },
            }, 'Xoá')] : null))))),
    });
  }

  function editCustomer(c, reload) {
    const name = window.prompt('Họ tên khách hàng', c.fullName);
    if (name === null) return;
    const phone = window.prompt('Số điện thoại (10 chữ số)', c.phone);
    if (phone === null) return;
    run(() => updateCustomer(c.id, name, phone), 'Đã lưu khách hàng', reload);
  }

  function drawDevices() {
    const box = h('div', {});
    const form = canWrite ? newDeviceForm(() => state.reload()) : null;
    area.replaceChildren(form, h('div', { class: 'card table-wrap' }, box));
    const state = DataState(box, {
      load: listDevices,
      isEmpty: (rows) => rows.length === 0,
      emptyText: 'Chưa có thiết bị nào. Thêm thiết bị bằng biểu mẫu phía trên.',
      render: (rows, reload) => h('table', {},
        h('thead', {}, h('tr', {}, ...['IMEI', 'Mẫu', 'Mã khách', 'Hết hạn bảo hành', ''].map((c) => h('th', {}, c)))),
        h('tbody', {}, rows.map((d) => h('tr', {},
          h('td', { class: 'mono' }, d.imei), h('td', {}, d.model), h('td', {}, d.customerId), h('td', {}, formatDate(d.warrantyEndDate)),
          h('td', { class: 'cell-actions' }, canWrite ? [
            h('button', { class: 'btn small-btn', type: 'button', onclick: () => editDevice(d, reload) }, 'Sửa'),
            h('button', {
              class: 'btn small-btn danger', type: 'button',
              onclick: () => { if (window.confirm(`Xoá thiết bị ${d.imei}?`)) run(() => deleteDevice(d.id), 'Đã xoá thiết bị', reload); },
            }, 'Xoá')] : null))))),
    });
  }

  function editDevice(d, reload) {
    const model = window.prompt('Mẫu thiết bị', d.model);
    if (model === null) return;
    const date = window.prompt('Ngày hết hạn bảo hành (YYYY-MM-DD)', d.warrantyEndDate);
    if (date === null) return;
    run(() => updateDevice(d.id, model, date), 'Đã lưu thiết bị', reload);
  }

  function newDeviceForm(reload) {
    const f = {
      customerId: h('input', { type: 'number', min: '1', required: true, 'aria-label': 'Mã khách hàng' }),
      imei: h('input', { inputmode: 'numeric', maxlength: '15', required: true, 'aria-label': 'IMEI' }),
      model: h('input', { required: true, 'aria-label': 'Mẫu thiết bị' }),
      warrantyEndDate: h('input', { type: 'date', required: true, 'aria-label': 'Ngày hết hạn bảo hành' }),
    };
    return h('form', {
      class: 'card',
      onsubmit: (e) => {
        e.preventDefault();
        run(async () => {
          await createDevice({
            customerId: Number(f.customerId.value), imei: f.imei.value.trim(),
            model: f.model.value, warrantyEndDate: f.warrantyEndDate.value,
          });
          e.target.reset();
        }, 'Đã thêm thiết bị', reload);
      },
    },
    h('h2', {}, 'Thêm thiết bị'),
    h('div', { class: 'row' },
      h('label', {}, 'Mã khách hàng', f.customerId), h('label', {}, 'IMEI (15 chữ số)', f.imei),
      h('label', {}, 'Mẫu thiết bị', f.model), h('label', {}, 'Hết hạn bảo hành', f.warrantyEndDate),
      h('button', { class: 'btn primary', type: 'submit' }, 'Thêm thiết bị')));
  }

  root.replaceChildren(
    h('div', { class: 'page-head' }, h('h1', {}, 'Khách hàng & thiết bị'),
      canWrite ? null : h('span', { class: 'muted small' }, 'Chỉ xem – Điều phối viên không sửa dữ liệu này')),
    tabs, flash, area);
  drawTabs();
  draw();
}
