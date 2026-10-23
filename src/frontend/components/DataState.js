// DataState – bọc một vùng dữ liệu với ba trạng thái: đang tải · rỗng · lỗi (slide buổi 10).
// Mỗi màn hình M1/M2/M3 dùng thành phần này thay vì tự xử lý từng trạng thái.
import { h } from './dom.js';

/**
 * @param {HTMLElement} container  vùng sẽ được vẽ lại
 * @param {object} opts
 * @param {() => Promise<any>} opts.load      hàm gọi API
 * @param {(data:any) => Node} opts.render    vẽ khi có dữ liệu
 * @param {(data:any) => boolean} [opts.isEmpty]
 * @param {string} [opts.emptyText]           câu giải thích khi rỗng
 * @param {string} [opts.loadingText]
 * @returns {{ reload: () => Promise<void> }}
 */
export function DataState(container, { load, render, isEmpty = () => false, emptyText = 'Không có dữ liệu.', loadingText = 'Đang tải…' }) {
  async function reload() {
    container.replaceChildren(
      h('div', { class: 'state state-loading', 'data-state': 'loading', 'aria-busy': 'true' },
        h('span', { class: 'spinner', 'aria-hidden': 'true' }), loadingText),
    );
    let data;
    try {
      data = await load();
    } catch (err) {
      // 401 đã được client.js chuyển về trang đăng nhập; các lỗi khác hiện ở đây kèm nút thử lại.
      container.replaceChildren(
        h('div', { class: 'state state-error', 'data-state': 'error', role: 'alert' },
          h('p', {}, h('strong', {}, 'Không tải được dữ liệu. '), err.message || 'Lỗi không xác định'),
          err.code ? h('p', { class: 'muted' }, `Mã lỗi: ${err.code}`) : null,
          h('button', { class: 'btn', type: 'button', onclick: reload }, 'Thử lại')),
      );
      return;
    }
    if (isEmpty(data)) {
      container.replaceChildren(h('div', { class: 'state state-empty', 'data-state': 'empty' }, emptyText));
      return;
    }
    container.replaceChildren(render(data, reload));
  }

  reload();
  return { reload };
}
