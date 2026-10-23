// M2 – Danh sách phiếu bảo hành (UC04, FR4). Bấm một dòng → M3.
// Kỹ thuật viên chỉ nhận về phiếu được phân công cho mình (máy chủ lọc, giao diện không tự lọc).
import { listTickets } from '../api/ticket.api.js';
import { session } from '../api/client.js';
import { DataState } from '../components/DataState.js';
import {
  h, STATUS_LABEL, PRIORITY_LABEL, formatDateTime, badge, takeFlash, successText,
} from '../components/dom.js';

const PAGE_SIZE = 20;

function select(id, label, options) {
  return h('select', { id, 'aria-label': label },
    h('option', { value: '' }, 'Tất cả'),
    ...Object.entries(options).map(([value, text]) => h('option', { value }, text)));
}

export function TicketListPage(root, { query }) {
  const staff = session.staff;
  const filters = {
    status: query.get('status') || '',
    priority: query.get('priority') || '',
    q: query.get('q') || '',
    dueFromDay: query.get('dueFrom') || '',
    dueToDay: query.get('dueTo') || '',
    page: Number(query.get('page')) || 1,
  };

  const status = select('f-status', 'Trạng thái', STATUS_LABEL);
  const priority = select('f-priority', 'Mức ưu tiên', PRIORITY_LABEL);
  const q = h('input', { id: 'f-q', type: 'search', placeholder: 'Tìm theo mã phiếu hoặc số điện thoại…' });
  const dueFrom = h('input', { id: 'f-due-from', type: 'date', 'aria-label': 'Hạn xử lý từ ngày' });
  const dueTo = h('input', { id: 'f-due-to', type: 'date', 'aria-label': 'Hạn xử lý đến ngày' });
  dueFrom.value = filters.dueFromDay;
  dueTo.value = filters.dueToDay;
  status.value = filters.status;
  priority.value = filters.priority;
  q.value = filters.q;

  const go = (page) => {
    const p = new URLSearchParams();
    if (status.value) p.set('status', status.value);
    if (priority.value) p.set('priority', priority.value);
    if (dueFrom.value) p.set('dueFrom', dueFrom.value);
    if (dueTo.value) p.set('dueTo', dueTo.value);
    if (q.value.trim()) p.set('q', q.value.trim());
    if (page > 1) p.set('page', page);
    const next = `#/tickets${p.toString() ? `?${p}` : ''}`;
    if (window.location.hash === next) state.reload();
    else window.location.hash = next;
  };

  const filterForm = h('form', { class: 'card filters', onsubmit: (e) => { e.preventDefault(); go(1); } },
    h('h2', {}, 'Bộ lọc'),
    h('div', { class: 'row' },
      h('label', {}, 'Trạng thái', status),
      h('label', {}, 'Mức ưu tiên', priority),
      h('label', {}, 'Hạn xử lý từ', dueFrom),
      h('label', {}, 'đến', dueTo)),
    h('div', { class: 'row' },
      h('label', { class: 'grow' }, 'Tìm kiếm', q),
      h('button', { class: 'btn', type: 'submit' }, 'Lọc')));

  const flash = takeFlash();
  const area = h('div', { class: 'card table-wrap' });

  root.replaceChildren(...[
    h('div', { class: 'page-head' },
      h('h1', {}, 'Danh sách phiếu bảo hành'),
      staff?.role === 'RECEPTIONIST'
        ? h('a', { class: 'btn primary', href: '#/tickets/new' }, '+ Tạo phiếu bảo hành') : null),
    flash ? successText(flash) : null,
    filterForm,
    area,
  ].filter(Boolean));

  const hasFilter = Boolean(filters.status || filters.priority || filters.q || filters.dueFromDay || filters.dueToDay);
  // Ngày chọn trên giao diện là ngày giờ Việt Nam: từ 00:00 tới hết 23:59:59 của ngày đó.
  const apiFilters = {
    status: filters.status,
    priority: filters.priority,
    q: filters.q,
    page: filters.page,
    size: PAGE_SIZE,
    dueFrom: filters.dueFromDay ? `${filters.dueFromDay}T00:00:00+07:00` : undefined,
    dueTo: filters.dueToDay ? `${filters.dueToDay}T23:59:59+07:00` : undefined,
  };
  const state = DataState(area, {
    load: () => listTickets(apiFilters),
    isEmpty: (data) => data.items.length === 0,
    emptyText: hasFilter
      ? 'Không có phiếu bảo hành nào khớp bộ lọc. Thử bỏ bớt điều kiện lọc.'
      : (staff?.role === 'TECHNICIAN'
        ? 'Chưa có phiếu bảo hành nào được phân công cho bạn.'
        : 'Chưa có phiếu bảo hành nào. Nhân viên tiếp nhận bấm "+ Tạo phiếu bảo hành" để bắt đầu.'),
    render: (data) => {
      const rows = data.items.map((t) => h('tr', {
        class: 'clickable',
        tabindex: 0,
        onclick: () => { window.location.hash = `#/tickets/${t.ticketCode}`; },
        onkeydown: (e) => { if (e.key === 'Enter') window.location.hash = `#/tickets/${t.ticketCode}`; },
      },
      h('td', { class: 'mono' }, t.ticketCode),
      h('td', {}, t.customerName, h('br'), h('span', { class: 'muted' }, t.customerPhone)),
      h('td', {}, t.model),
      h('td', {}, badge(STATUS_LABEL[t.status], `st-${t.status}`)),
      h('td', {}, t.priority ? PRIORITY_LABEL[t.priority] : '—'),
      h('td', { class: t.overdue ? 'overdue' : '' },
        formatDateTime(t.dueDate), t.overdue ? h('div', { class: 'overdue-flag' }, '⚠ Quá hạn') : null),
      h('td', {}, t.technicianName || '—')));

      const pages = Math.max(1, Math.ceil(data.total / data.size));
      const from = (data.page - 1) * data.size + 1;
      const to = from + data.items.length - 1;
      return h('div', {},
        h('table', {},
          h('thead', {}, h('tr', {}, ...['Mã phiếu', 'Khách hàng', 'Model', 'Trạng thái', 'Mức ưu tiên', 'Hạn xử lý', 'Kỹ thuật viên']
            .map((c) => h('th', {}, c)))),
          h('tbody', {}, rows)),
        h('div', { class: 'pager' },
          h('span', { class: 'muted' }, `Hiển thị ${from}–${to} / ${data.total} phiếu bảo hành · ${data.size} phiếu/trang`),
          h('span', {},
            h('button', { class: 'btn', type: 'button', disabled: data.page <= 1, onclick: () => go(data.page - 1) }, '‹'),
            h('span', { class: 'page-no' }, `${data.page} / ${pages}`),
            h('button', { class: 'btn', type: 'button', disabled: data.page >= pages, onclick: () => go(data.page + 1) }, '›'))));
    },
  });
}
