// Members page (owner and admins). Add a member, see everyone, reset a password,
// change a role (owner only) and remove someone. The site never sends email: a new
// login is shown once, for the owner to pass on himself.
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, notify } from './chrome.js';
import { api, roleLabel } from './api.js';

const me = await initChrome('admin');
const intro = document.getElementById('intro');
const people = document.getElementById('people');

if (me.role !== 'owner' && me.role !== 'admin') {
  intro.textContent = 'Only the owner and admins can manage members.';
  document.querySelector('.admin').hidden = true;
  await new Promise(() => {});
}

intro.textContent = me.role === 'owner'
  ? 'Add people, reset a forgotten password, choose who is an admin, or remove someone.'
  : 'Add people, reset a forgotten password or remove a member. Only the owner can add or change admins.';

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ---------- The one-time login card ---------- */

const card = document.getElementById('loginCard');
let copyText = '';
function showLogin(member, password, isReset) {
  document.getElementById('loginH').textContent = isReset ? `New temporary password for ${member.name}` : `${member.name} is added`;
  document.getElementById('lcSite').textContent = location.origin.replace(/^https?:\/\//, '');
  document.getElementById('lcEmail').textContent = member.email;
  document.getElementById('lcPw').textContent = password;
  card.querySelectorAll('.js-who').forEach((el) => { el.textContent = member.name; });
  copyText = `Beasties website: ${location.origin}\nEmail: ${member.email}\nTemporary password: ${password}\nAfter you sign in, the site will ask you to choose your own password.`;
  card.hidden = false;
  card.scrollIntoView({ block: 'start', behavior: 'smooth' });
  card.focus({ preventScroll: true });
}
document.getElementById('lcCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copyText);
    notify('Copied', 'Paste it into a text or message to send it yourself.');
  } catch {
    // older browsers: select the password so it can be copied by hand
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('lcPw'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    notify('Select and copy', 'The password is selected. Copy it with your device.');
  }
});
document.getElementById('lcDone').addEventListener('click', () => {
  card.hidden = true;
  copyText = '';
  document.getElementById('lcPw').textContent = '';
});

/* ---------- Add a member ---------- */

const form = document.getElementById('addForm');
const addError = document.getElementById('addError');
const addBtn = document.getElementById('addBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.hidden = true;
  const nameIn = form.elements.namedItem('name');
  const name = nameIn.value.trim();
  const email = form.email.value.trim();
  const role = form.role?.value || 'member';
  if (!name) { addError.textContent = 'Please enter their full name.'; addError.hidden = false; nameIn.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { addError.textContent = 'Please enter a valid email address, like name@example.com.'; addError.hidden = false; form.email.focus(); return; }
  addBtn.disabled = true;
  try {
    const { member, tempPassword } = await api('/admin/members', { method: 'POST', body: { name, email, role } });
    form.reset();
    await load();
    showLogin(member, tempPassword, false);
  } catch (err) {
    addError.textContent = err.message;
    addError.hidden = false;
  } finally {
    addBtn.disabled = false;
  }
});

/* ---------- Everyone ---------- */

function button(cls, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function render({ members, canChangeRoles }) {
  people.innerHTML = '';
  for (const m of members) {
    const li = document.createElement('li');
    li.className = 'person';
    li.innerHTML = `
      <div class="person__who">
        <p class="person__name"></p>
        <p class="person__email"></p>
        <p class="person__meta"><span class="pill"></span><span class="person__added"></span></p>
      </div>
      <div class="person__actions"></div>
      <div class="person__confirm" hidden></div>`;
    li.querySelector('.person__name').textContent = m.isMe ? `${m.name} (you)` : m.name;
    li.querySelector('.person__email').textContent = m.email;
    const pill = li.querySelector('.pill');
    pill.textContent = roleLabel(m.role);
    pill.classList.add(`pill--${m.role}`);
    li.querySelector('.person__added').textContent = m.waitingForFirstSignIn
      ? `Added ${dateFmt.format(new Date(m.addedAt))} · Has not chosen a password yet`
      : `Added ${dateFmt.format(new Date(m.addedAt))}`;

    const actions = li.querySelector('.person__actions');
    if (m.canManage) {
      actions.append(button('btn btn--quiet btn--small', 'Edit name', () => {
        const box = li.querySelector('.person__confirm, .person__edit');
        box.className = 'person__edit';
        box.innerHTML = `<label class="field"><span class="field__label">Full name</span>
          <input class="field__input" maxlength="60"></label><div class="person__confirm-actions"></div>`;
        const input = box.querySelector('input');
        input.value = m.name;
        box.lastElementChild.append(
          button('btn btn--forest btn--small', 'Save name', async () => {
            try {
              await api(`/admin/members/${m.id}/name`, { method: 'PATCH', body: { name: input.value } });
              notify('Name saved', `Now shown as ${input.value.trim()}.`);
              await load();
            } catch (err) { notify('Name not saved', err.message); }
          }),
          button('btn btn--quiet btn--small', 'Cancel', () => { box.hidden = true; actions.hidden = false; }),
        );
        actions.hidden = true;
        box.hidden = false;
        input.focus();
        input.select();
      }));
      actions.append(button('btn btn--quiet btn--small', 'Reset password', async () => {
        if (!confirm(`Give ${m.name} a new temporary password? Their old password will stop working.`)) return;
        try {
          const { member, tempPassword } = await api(`/admin/members/${m.id}/reset-password`, { method: 'POST' });
          await load();
          showLogin(member, tempPassword, true);
        } catch (err) { notify('Password not reset', err.message); }
      }));
      if (canChangeRoles) {
        const toRole = m.role === 'admin' ? 'member' : 'admin';
        actions.append(button('btn btn--quiet btn--small', m.role === 'admin' ? 'Make member' : 'Make admin', async () => {
          try {
            await api(`/admin/members/${m.id}/role`, { method: 'PATCH', body: { role: toRole } });
            notify('Role changed', `${m.name} is now ${toRole === 'admin' ? 'an admin' : 'a member'}.`);
            await load();
          } catch (err) { notify('Role not changed', err.message); }
        }));
      }
      actions.append(button('btn btn--danger btn--small', 'Remove', () => {
        // a second, clear step before anything is removed
        const box = li.querySelector('.person__confirm, .person__edit');
        box.className = 'person__confirm';
        box.innerHTML = '<p class="person__confirm-text"></p><div class="person__confirm-actions"></div>';
        box.firstElementChild.textContent = `Remove ${m.name}? They will not be able to sign in. Their photos and comments stay on the site.`;
        const row = box.lastElementChild;
        row.append(
          button('btn btn--danger btn--small', `Yes, remove ${m.name}`, async () => {
            try {
              await api(`/admin/members/${m.id}`, { method: 'DELETE' });
              notify('Member removed', `${m.name} can no longer sign in.`);
              await load();
            } catch (err) { notify('Not removed', err.message); }
          }),
          button('btn btn--quiet btn--small', 'Cancel', () => { box.hidden = true; actions.hidden = false; }),
        );
        actions.hidden = true;
        box.hidden = false;
        row.lastElementChild.focus();
      }));
    }
    people.append(li);
  }
}

async function load() {
  const data = await api('/admin/members');
  document.getElementById('rolePick').hidden = !data.canCreateAdmins;
  document.getElementById('roleNote').hidden = data.canCreateAdmins;
  render(data);
}
await load();
