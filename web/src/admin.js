import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, notify } from './chrome.js';
import { api, roleLabel } from './api.js';

const me = await initChrome('admin');
const intro = document.getElementById('intro');
const content = document.getElementById('content');

if (me.role !== 'owner') {
  intro.textContent = 'Only the owner can manage admins.';
} else {
  intro.textContent = 'Admins can edit any caption, set photo days and manage comments. Only the owner can change who is an admin.';
  const list = document.createElement('ul');
  list.className = 'members';
  content.append(list);

  const render = (members) => {
    list.innerHTML = '';
    for (const m of members) {
      const li = document.createElement('li');
      li.className = 'member';
      li.innerHTML = '<span class="member__name"></span><span class="member__role"></span>';
      li.querySelector('.member__name').textContent = m.name;
      li.querySelector('.member__role').textContent = roleLabel(m.role);
      if (m.role !== 'owner') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = m.role === 'admin' ? 'btn btn--quiet btn--small' : 'btn btn--plum btn--small';
        b.textContent = m.role === 'admin' ? 'Remove admin' : 'Make admin';
        b.addEventListener('click', async () => {
          const role = m.role === 'admin' ? 'member' : 'admin';
          try {
            await api(`/admin/members/${m.id}/role`, { method: 'PATCH', body: { role } });
            notify('Role changed', `${m.name} is now ${role === 'admin' ? 'an admin' : 'a member'}.`);
            render((await api('/admin/members')).members);
          } catch (err) { notify('Role not changed', err.message); }
        });
        li.append(b);
      }
      list.append(li);
    }
  };
  render((await api('/admin/members')).members);
}
