// Đăng nhập (A1). Thành công → M2 Danh sách phiếu bảo hành.
import { login } from '../api/ticket.api.js';
import { h, errorText, infoText } from '../components/dom.js';

export function LoginPage(root, { query }) {
  const username = h('input', { id: 'username', name: 'username', autocomplete: 'username', required: true });
  const password = h('input', { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const message = h('div', { class: 'messages' });
  const submit = h('button', { class: 'btn primary', type: 'submit' }, 'Đăng nhập');

  if (query.get('expired')) message.append(infoText('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'));

  const form = h('form', {
    class: 'card login',
    onsubmit: async (e) => {
      e.preventDefault();
      message.replaceChildren();
      submit.disabled = true;
      try {
        await login(username.value.trim(), password.value);
        window.location.hash = '#/tickets';
      } catch (err) {
        message.append(errorText(err.message));
      } finally {
        submit.disabled = false;
      }
    },
  },
  h('h1', {}, 'Smart CRM · Bảo hành'),
  h('label', { for: 'username' }, 'Tên đăng nhập'), username,
  h('label', { for: 'password' }, 'Mật khẩu'), password,
  message,
  submit,
  h('p', { class: 'muted small' }, 'Tài khoản mẫu: tn1 · dp1 · kt1 — mật khẩu Matkhau@123 (chỉ ở máy phát triển)'));

  root.replaceChildren(form);
  username.focus();
}
