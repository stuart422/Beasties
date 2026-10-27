import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, notify } from './chrome.js';
import { api, roleLabel } from './api.js';

const me = await initChrome('profile');
document.getElementById('intro').textContent = `Signed in as ${me.email}. Role: ${roleLabel(me.role)}.`;

const MIN = 12;
const content = document.getElementById('content');
content.innerHTML = `
  <form class="panel-form" id="nameForm" novalidate>
    <h2 class="form-title">Your name</h2>
    <label class="field"><span class="field__label">Name shown with your photos and comments</span>
      <input class="field__input" name="name" maxlength="60" required></label>
    <button class="btn btn--forest" type="submit">Save name</button>
  </form>
  <form class="panel-form" id="passForm" novalidate>
    <h2 class="form-title">Change password</h2>
    <p class="body-muted">Use at least ${MIN} characters. A short phrase you will remember works well. After the change, you are signed out on every other device.</p>
    <input type="email" name="username" autocomplete="username" hidden>
    <label class="field"><span class="field__label">Current password</span>
      <input class="field__input" type="password" name="current" autocomplete="current-password" required></label>
    <label class="field"><span class="field__label">New password</span>
      <input class="field__input" type="password" name="next" autocomplete="new-password" minlength="${MIN}" required aria-describedby="nextCount">
      <span class="field__hint" id="nextCount" aria-live="polite"></span></label>
    <label class="field"><span class="field__label">Type the new password again</span>
      <input class="field__input" type="password" name="confirm" autocomplete="new-password" required></label>
    <label class="show-pw"><input type="checkbox" id="showPw"> Show passwords</label>
    <p class="form-error" id="passError" role="alert" hidden></p>
    <button class="btn btn--forest" type="submit" id="passBtn">Change password</button>
  </form>`;

const field = (form, name) => form.elements.namedItem(name); // form.name is the form's own name, not the field

const nameForm = document.getElementById('nameForm');
field(nameForm, 'name').value = me.name;
nameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const { user } = await api('/me', { method: 'PATCH', body: { name: field(nameForm, 'name').value } });
    const who = document.querySelector('.menu__who');
    if (who) who.firstChild.textContent = `${user.name} `;
    notify('Name saved', `You will show as ${user.name}.`);
  } catch (err) { notify('Name not saved', err.message); }
});

const passForm = document.getElementById('passForm');
const passError = document.getElementById('passError');
const passBtn = document.getElementById('passBtn');
const [cur, next, again] = ['current', 'next', 'confirm'].map((n) => field(passForm, n));
field(passForm, 'username').value = me.email; // helps password managers save the new one
const count = document.getElementById('nextCount');
const updateCount = () => {
  const n = next.value.length;
  count.textContent = n >= MIN ? `${n} characters. Long enough.` : `${n} of ${MIN} characters`;
  count.classList.toggle('is-ok', n >= MIN);
};
next.addEventListener('input', updateCount);
updateCount();
document.getElementById('showPw').addEventListener('change', (e) => {
  for (const el of [cur, next, again]) el.type = e.target.checked ? 'text' : 'password';
});
for (const el of [cur, next, again]) el.addEventListener('input', () => el.removeAttribute('aria-invalid'));

function showError(message, el) {
  passError.textContent = message;
  passError.hidden = false;
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
}

passForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passError.hidden = true;
  if (!cur.value) return showError('Please type your current password.', cur);
  if (next.value.length < MIN) return showError(`The new password is too short. Please use at least ${MIN} characters.`, next);
  if (next.value !== again.value) return showError('The two new passwords are not the same. Please type it again.', again);
  passBtn.disabled = true;
  try {
    await api('/me/password', { method: 'POST', body: { current: cur.value, next: next.value } });
    passForm.reset();
    field(passForm, 'username').value = me.email;
    updateCount();
    notify('Password changed', 'Use the new password next time you sign in. Other devices have been signed out.');
  } catch (err) {
    showError(err.message, err.message.includes('current') ? cur : next);
  } finally {
    passBtn.disabled = false;
  }
});
