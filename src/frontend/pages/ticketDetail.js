// M3 – Chi tiết phiếu bảo hành (UC02 phân loại / từ chối, UC03 phân công, UC05 nhận phiếu, UC06 lịch sử).
// Nút chỉ hiện theo vai trò để tiện dùng; quyền thật được kiểm tra ở máy chủ (NFR4).
import {
  getTicket, getTicketHistory, listIssueCategories, listTechnicians,
  classifyTicket, rejectTicket, assignTicket, startTicket,
} from '../api/ticket.api.js';
import { session } from '../api/client.js';
import { DataState } from '../components/DataState.js';
import {
  h, STATUS_LABEL, PRIORITY_LABEL, formatDateTime, formatDate, badge,
  errorText, infoText, successText, setFlash, takeFlash,
} from '../components/dom.js';

export function TicketDetailPage(root, { params }) {
  const code = params.code;
  const staff = session.staff;
  const flash = takeFlash();
  const area = h('div', {});

  root.replaceChildren(...[
    h('p', {}, h('a', { href: '#/tickets' }, '← Danh sách phiếu bảo hành')),
    flash ? successText(flash) : null,
    area,
  ].filter(Boolean));

  // Sau mỗi thao tác thành công: giữ thông báo và vẽ lại toàn bộ M3 từ dữ liệu mới.
  const done = (message) => { setFlash(message); TicketDetailPage(root, { params }); };

  DataState(area, {
    load: () => getTicket(code),
    loadingText: `Đang tải phiếu ${code}…`,
    render: (t) => h('div', { class: 'stack' },
      header(t),
      staff?.role === 'COORDINATOR' && t.status === 'NEW' ? classifySection(t, done) : null,
      staff?.role === 'COORDINATOR' && ['NEW', 'CLASSIFIED'].includes(t.status) ? assignSection(t, done) : null,
      staff?.role === 'TECHNICIAN' && t.status === 'ASSIGNED' && t.technician?.id === staff.id ? startSection(t, done) : null,
      historySection(t)),
  });
}

function header(t) {
  return h('section', { class: 'card' },
    h('div', { class: 'page-head' },
      h('h1', {}, `Phiếu bảo hành ${t.ticketCode}`),
      h('span', {},
        badge(STATUS_LABEL[t.status], `st-${t.status}`),
        t.outOfWarranty ? badge('Hết hạn bảo hành', 'warn') : null)),
    h('dl', { class: 'facts' },
      h('dt', {}, 'Khách hàng'), h('dd', {}, `${t.customer.fullName} · ${t.customer.phone}`),
      h('dt', {}, 'Thiết bị'), h('dd', {}, `${t.device.model} · IMEI ${t.device.imei} · Ngày hết hạn bảo hành ${formatDate(t.device.warrantyEndDate)}`),
      h('dt', {}, 'Mô tả lỗi'), h('dd', {}, t.issueDescription),
      h('dt', {}, 'Danh mục lỗi'), h('dd', {}, t.issueCategory?.name || '—'),
      h('dt', {}, 'Mức ưu tiên'), h('dd', {}, t.priority ? PRIORITY_LABEL[t.priority] : '—'),
      h('dt', {}, 'Hạn xử lý'), h('dd', {}, formatDateTime(t.dueDate)),
      h('dt', {}, 'Kỹ thuật viên'), h('dd', {}, t.technician?.fullName || '—'),
      h('dt', {}, 'Nhân viên tiếp nhận'), h('dd', {}, `${t.createdBy.fullName} · Ngày tạo: ${formatDateTime(t.createdAt)}`)));
}

// ---------- UC02: phân loại / từ chối ----------
function classifySection(t, done) {
  const box = h('div', {});
  const section = h('section', { class: 'card' }, h('h2', {}, 'Phân loại phiếu bảo hành (Điều phối viên) – UC02'), box);

  DataState(box, {
    load: listIssueCategories,
    isEmpty: (cats) => cats.length === 0,
    emptyText: 'Chưa có danh mục lỗi nào đang dùng – liên hệ quản trị để bổ sung.',
    render: (cats) => {
      const category = h('select', { id: 'category' },
        h('option', { value: '' }, '— Chọn danh mục lỗi —'),
        ...cats.map((c) => h('option', { value: c.id }, c.name)));
      const radios = Object.entries(PRIORITY_LABEL).map(([value, text]) =>
        h('label', { class: 'inline' }, h('input', { type: 'radio', name: 'priority', value }), ` ${text}`));
      const classifyMsg = h('div', { class: 'messages' });
      const reason = h('input', { id: 'reason', placeholder: 'Nhập lý do khi chọn Từ chối…' });
      const rejectMsg = h('div', { class: 'messages' });

      const onClassify = async (e) => {
        e.preventDefault();
        classifyMsg.replaceChildren();
        const priority = new FormData(e.target).get('priority');
        if (!category.value || !priority) {
          classifyMsg.append(errorText('Vui lòng chọn danh mục lỗi và mức ưu tiên'));
          return;
        }
        try {
          const r = await classifyTicket(t.ticketCode, Number(category.value), priority);
          done(`Đã phân loại phiếu ${r.ticketCode} – hạn xử lý ${formatDateTime(r.dueDate)} (BR4)`);
        } catch (err) { classifyMsg.append(errorText(err.message)); }
      };

      const onReject = async () => {
        rejectMsg.replaceChildren();
        if (!reason.value.trim()) {
          rejectMsg.append(errorText('Vui lòng nhập lý do từ chối'));
          reason.focus();
          return;
        }
        try {
          const r = await rejectTicket(t.ticketCode, reason.value.trim());
          done(`Đã từ chối phiếu ${r.ticketCode}`);
        } catch (err) { rejectMsg.append(errorText(err.message)); }
      };

      return h('div', {},
        h('form', { onsubmit: onClassify },
          h('div', { class: 'row' },
            h('label', { class: 'grow' }, 'Danh mục lỗi *', category),
            h('fieldset', { class: 'plain' }, h('legend', {}, 'Mức ưu tiên *'), ...radios),
            h('button', { class: 'btn primary', type: 'submit' }, 'Lưu phân loại')),
          h('p', { class: 'muted small' }, 'Hạn xử lý do hệ thống tính theo BR4: Cao +24 giờ · Trung bình +72 giờ · Thấp +120 giờ.'),
          classifyMsg),
        h('hr'),
        h('label', { for: 'reason' }, 'Lý do từ chối'),
        h('div', { class: 'row' }, reason, h('button', { class: 'btn', type: 'button', onclick: onReject }, 'Từ chối')),
        rejectMsg);
    },
  });
  return section;
}

// ---------- UC03: phân công kỹ thuật viên ----------
function assignSection(t, done) {
  const section = h('section', { class: 'card' }, h('h2', {}, 'Phân công kỹ thuật viên – UC03'));
  if (t.status === 'NEW') {
    section.append(
      h('div', { class: 'row' },
        h('select', { disabled: true }, h('option', {}, '— Kỹ thuật viên —')),
        h('button', { class: 'btn', type: 'button', disabled: true }, 'Phân công')),
      errorText('(1a) Cần phân loại phiếu trước khi phân công'));
    return section;
  }

  const box = h('div', {});
  section.append(box);
  DataState(box, {
    load: listTechnicians,
    isEmpty: (list) => list.length === 0,
    emptyText: '⚠ (2a) Chưa có kỹ thuật viên khả dụng',
    render: (techs, reload) => {
      const tech = h('select', { id: 'technician' },
        h('option', { value: '' }, '— Chọn kỹ thuật viên —'),
        ...techs.map((x) => h('option', { value: x.id }, `${x.fullName} – đang giữ ${x.openTicketCount} phiếu`)));
      const msg = h('div', { class: 'messages' });
      const onAssign = async () => {
        msg.replaceChildren();
        if (!tech.value) { msg.append(errorText('Vui lòng chọn kỹ thuật viên')); return; }
        try {
          const r = await assignTicket(t.ticketCode, Number(tech.value));
          done(`Đã phân công phiếu ${r.ticketCode} cho ${r.technician.fullName}`);
        } catch (err) {
          const step = { FORBIDDEN_ROLE: '(4a) ', DATA_CHANGED: '(4b) ', TICKET_NOT_CLASSIFIED: '(1a) ' }[err.code] || '';
          msg.append(errorText(step + err.message));
          if (err.code === 'DATA_CHANGED') {
            msg.append(h('button', { class: 'btn', type: 'button', onclick: reload }, 'Tải lại danh sách kỹ thuật viên'));
          }
        }
      };
      return h('div', {},
        h('div', { class: 'row' }, tech, h('button', { class: 'btn primary', type: 'button', onclick: onAssign }, 'Phân công')),
        msg);
    },
  });
  return section;
}

// ---------- UC05: kỹ thuật viên xác nhận nhận phiếu ----------
function startSection(t, done) {
  const msg = h('div', { class: 'messages' });
  return h('section', { class: 'card' },
    h('h2', {}, 'Xác nhận nhận phiếu – UC05'),
    h('div', { class: 'row' },
      h('button', {
        class: 'btn primary',
        type: 'button',
        onclick: async () => {
          msg.replaceChildren();
          try {
            const r = await startTicket(t.ticketCode);
            done(`Đã nhận phiếu ${r.ticketCode} – trạng thái Đang xử lý`);
          } catch (err) { msg.append(errorText(err.message)); }
        },
      }, 'Xác nhận nhận phiếu'),
      infoText('Chỉ kỹ thuật viên được phân công thấy nút này.')),
    msg);
}

// ---------- UC06: lịch sử trạng thái (chỉ đọc) ----------
function historySection(t) {
  const box = h('div', {});
  DataState(box, {
    load: () => getTicketHistory(t.ticketCode),
    isEmpty: (rows) => rows.length === 0,
    emptyText: 'Phiếu chưa có lịch sử trạng thái.',
    render: (rows) => h('table', {},
      h('thead', {}, h('tr', {}, ...['Thời điểm', 'Từ', 'Sang', 'Nhân viên', 'Ghi chú'].map((c) => h('th', {}, c)))),
      h('tbody', {}, rows.map((r) => h('tr', {},
        h('td', {}, formatDateTime(r.changedAt)),
        h('td', {}, r.fromStatus ? STATUS_LABEL[r.fromStatus] : '—'),
        h('td', {}, STATUS_LABEL[r.toStatus]),
        h('td', {}, r.changedBy),
        h('td', {}, r.note || '—'))))),
  });
  return h('section', { class: 'card' },
    h('h2', {}, 'Lịch sử trạng thái – UC06'),
    box,
    h('p', { class: 'muted small' }, 'Chỉ đọc – không ai được sửa lịch sử trạng thái.'));
}
