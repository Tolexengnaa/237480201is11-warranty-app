// M1 – Tạo phiếu bảo hành (UC01, UC07). Thông báo ghi mã bước của luồng ngoại lệ trong đặc tả UC01.
// Giao diện chỉ kiểm tra định dạng nhập; quy tắc BR1–BR3 do máy chủ quyết định.
import {
  findCustomerByPhone, createCustomer, findDeviceByImei, createTicket,
} from '../api/ticket.api.js';
import { h, errorText, infoText, badge, formatDate, setFlash } from '../components/dom.js';

const PHONE_RE = /^[0-9]{10}$/;
const IMEI_RE = /^[0-9]{15}$/;

export function TicketCreatePage(root) {
  const state = { customer: null, device: null, newDevice: false, blocked: false };

  // ---------- 1. Khách hàng ----------
  const phone = h('input', { id: 'phone', inputmode: 'numeric', maxlength: 10, placeholder: '0901234567' });
  const fullName = h('input', { id: 'fullName', disabled: true, placeholder: 'Họ tên khách hàng' });
  const customerMsg = h('div', { class: 'messages' });
  const createCustomerBtn = h('button', { class: 'btn', type: 'button', hidden: true }, 'Tạo khách hàng mới');

  // Đổi số điện thoại thì bỏ khách hàng đã tra cứu – tránh lưu phiếu cho khách cũ.
  function resetCustomer() {
    customerMsg.replaceChildren();
    state.customer = null;
    createCustomerBtn.hidden = true;
    fullName.disabled = true;
    fullName.value = '';
    refreshSave();
  }

  async function lookupCustomer() {
    resetCustomer();
    if (!PHONE_RE.test(phone.value)) {
      customerMsg.append(errorText('(2a) Số điện thoại không hợp lệ'));
      return;
    }
    try {
      state.customer = await findCustomerByPhone(phone.value);
      fullName.value = state.customer.fullName;
    } catch (err) {
      if (err.code === 'CUSTOMER_NOT_FOUND') {
        customerMsg.append(errorText('(3a) Chưa có khách hàng với số điện thoại này'),
          infoText('Nhập họ tên khách hàng rồi bấm "Tạo khách hàng mới".'));
        fullName.disabled = false;
        createCustomerBtn.hidden = false;
        fullName.focus();
      } else {
        customerMsg.append(errorText(err.message));
      }
    }
    refreshSave();
  }

  createCustomerBtn.addEventListener('click', async () => {
    customerMsg.replaceChildren();
    try {
      state.customer = await createCustomer(fullName.value.trim(), phone.value);
      fullName.disabled = true;
      createCustomerBtn.hidden = true;
      customerMsg.append(infoText(`Đã tạo khách hàng ${state.customer.fullName}.`));
      imei.focus();
    } catch (err) {
      customerMsg.append(errorText(err.message));
    }
    refreshSave();
  });

  // ---------- 2. Thiết bị ----------
  const imei = h('input', { id: 'imei', inputmode: 'numeric', maxlength: 15, placeholder: '15 chữ số' });
  const model = h('input', { id: 'model', disabled: true });
  const warrantyEnd = h('input', { id: 'warrantyEnd', type: 'date', disabled: true });
  const warrantyBadge = h('span', {});
  const deviceMsg = h('div', { class: 'messages' });

  // Đổi IMEI thì phải kiểm tra lại – kết quả cũ (thiết bị, phiếu đang mở) không còn đúng.
  function resetDevice() {
    deviceMsg.replaceChildren();
    warrantyBadge.replaceChildren();
    Object.assign(state, { device: null, newDevice: false, blocked: false });
    model.disabled = true;
    warrantyEnd.disabled = true;
    model.value = '';
    warrantyEnd.value = '';
    refreshSave();
  }

  async function lookupDevice() {
    resetDevice();
    if (!IMEI_RE.test(imei.value)) {
      deviceMsg.append(errorText('(4a) IMEI phải gồm 15 chữ số'));
      return;
    }
    try {
      const d = await findDeviceByImei(imei.value);
      state.device = d;
      model.value = d.model;
      warrantyEnd.value = d.warrantyEndDate;
      if (d.outOfWarranty) {
        warrantyBadge.append(badge('Hết hạn bảo hành', 'warn'));
        deviceMsg.append(infoText(`(5c) Thiết bị hết hạn bảo hành từ ${formatDate(d.warrantyEndDate)} – vẫn cho lưu phiếu.`));
      }
      if (d.openTicketCode) {
        state.blocked = true;
        deviceMsg.append(h('p', { class: 'msg error', role: 'alert' }, '⚠ (5b) Thiết bị đang có phiếu ',
          h('a', { href: `#/tickets/${d.openTicketCode}` }, d.openTicketCode), ' chưa đóng – không thể tạo phiếu mới.'));
      }
    } catch (err) {
      if (err.code === 'DEVICE_NOT_FOUND') {
        state.newDevice = true;
        model.disabled = false;
        warrantyEnd.disabled = false;
        deviceMsg.append(infoText('(5a) IMEI chưa có trong hệ thống: nhập Model và Ngày hết hạn bảo hành để tạo thiết bị mới.'));
        model.focus();
      } else {
        deviceMsg.append(errorText(err.message));
      }
    }
    refreshSave();
  }

  // ---------- 3. Yêu cầu bảo hành ----------
  const description = h('textarea', { id: 'description', rows: 4, placeholder: 'Mô tả lỗi khách hàng báo…' });
  const formMsg = h('div', { class: 'messages' });
  const save = h('button', { class: 'btn primary', type: 'submit' }, 'Lưu phiếu');

  function refreshSave() {
    save.disabled = !state.customer || state.blocked || (!state.device && !state.newDevice);
  }

  async function onSubmit(e) {
    e.preventDefault();
    formMsg.replaceChildren();
    if (!description.value.trim()) {
      formMsg.append(errorText('(7a) Vui lòng nhập mô tả lỗi'));
      description.focus();
      return;
    }
    const input = { customerId: state.customer.id, imei: imei.value, issueDescription: description.value.trim() };
    if (state.newDevice) Object.assign(input, { model: model.value.trim(), warrantyEndDate: warrantyEnd.value });
    save.disabled = true;
    try {
      const t = await createTicket(input);
      setFlash(`Đã tạo phiếu ${t.ticketCode}`);
      window.location.hash = `#/tickets/${t.ticketCode}`; // UC01 bước 8 → M3
    } catch (err) {
      if (err.code === 'TICKET_OPEN_EXISTS') {
        state.blocked = true;
        deviceMsg.append(errorText(`(5b) ${err.message}`));
      } else {
        formMsg.append(errorText(err.message));
      }
      refreshSave();
    }
  }

  description.addEventListener('input', () => formMsg.replaceChildren());
  phone.addEventListener('input', () => { if (state.customer || !fullName.disabled) resetCustomer(); });
  imei.addEventListener('input', () => { if (state.device || state.newDevice || state.blocked) resetDevice(); });
  phone.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(); } });
  imei.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lookupDevice(); } });
  refreshSave();

  root.replaceChildren(
    h('div', { class: 'page-head' }, h('h1', {}, 'Tạo phiếu bảo hành')),
    h('form', { class: 'stack', onsubmit: onSubmit, novalidate: true },
      h('fieldset', { class: 'card' },
        h('legend', {}, '1. Khách hàng'),
        h('label', { for: 'phone' }, 'Số điện thoại *'),
        h('div', { class: 'row' }, phone, h('button', { class: 'btn', type: 'button', onclick: lookupCustomer }, 'Tra cứu')),
        h('label', { for: 'fullName' }, 'Họ tên khách hàng'),
        h('div', { class: 'row' }, fullName, createCustomerBtn),
        customerMsg),
      h('fieldset', { class: 'card' },
        h('legend', {}, '2. Thiết bị'),
        h('label', { for: 'imei' }, 'IMEI *'),
        h('div', { class: 'row' }, imei, h('button', { class: 'btn', type: 'button', onclick: lookupDevice }, 'Kiểm tra IMEI')),
        h('div', { class: 'row' },
          h('label', { class: 'grow' }, 'Model', model),
          h('label', { class: 'grow' }, 'Ngày hết hạn bảo hành', warrantyEnd),
          warrantyBadge),
        deviceMsg),
      h('fieldset', { class: 'card' },
        h('legend', {}, '3. Yêu cầu bảo hành'),
        h('label', { for: 'description' }, 'Mô tả lỗi *'),
        description,
        h('p', { class: 'muted small' }, 'Trạng thái khi lưu: Mới · Mã phiếu do hệ thống sinh'),
        formMsg),
      h('div', { class: 'actions' },
        h('a', { class: 'btn', href: '#/tickets' }, 'Huỷ'),
        save)),
  );
  phone.focus();
}
