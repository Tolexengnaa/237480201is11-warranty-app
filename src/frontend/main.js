// Điểm vào của LỚP GIAO DIỆN: thanh tiêu đề + định tuyến theo hash (#/tickets, #/tickets/new, #/tickets/:code).
import { session } from './api/client.js';
import { h, ROLE_LABEL } from './components/dom.js';
import { LoginPage } from './pages/login.js';
import { TicketListPage } from './pages/ticketList.js';
import { TicketCreatePage } from './pages/ticketCreate.js';
import { TicketDetailPage } from './pages/ticketDetail.js';

const routes = [
  { pattern: /^\/login$/, page: LoginPage, public: true },
  { pattern: /^\/tickets$/, page: TicketListPage },
  { pattern: /^\/tickets\/new$/, page: TicketCreatePage, roles: ['RECEPTIONIST'] },
  { pattern: /^\/tickets\/(?<code>[^/]+)$/, page: TicketDetailPage },
];

const topbar = document.getElementById('topbar');
const main = document.getElementById('main');

function renderTopbar() {
  const staff = session.staff;
  topbar.replaceChildren(
    h('a', { class: 'brand', href: '#/tickets' }, h('strong', {}, 'Smart CRM'), ' · Bảo hành'),
    staff
      ? h('span', { class: 'who' }, `${staff.fullName} (${ROLE_LABEL[staff.role] || staff.role})`, ' | ',
        h('a', {
          href: '#/login',
          onclick: () => session.clear(),
        }, 'Đăng xuất'))
      : null,
  );
}

function router() {
  const [path, qs = ''] = (window.location.hash.slice(1) || '/tickets').split('?');
  const query = new URLSearchParams(qs);
  const route = routes.find((r) => r.pattern.test(path));

  if (!route) { window.location.hash = '#/tickets'; return; }
  if (!route.public && !session.token) { window.location.hash = '#/login'; return; }
  if (route.public && session.token) { window.location.hash = '#/tickets'; return; }
  if (route.roles && !route.roles.includes(session.staff?.role)) { window.location.hash = '#/tickets'; return; }

  renderTopbar();
  const params = path.match(route.pattern).groups || {};
  route.page(main, { params, query });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
router();
