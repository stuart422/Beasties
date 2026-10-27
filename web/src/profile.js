import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, notify } from './chrome.js';
import { api, roleLabel } from './api.js';

const me = await initChrome('profile');
document.getElementById('intro').textContent = `Signed in as ${me.email}. Role: ${roleLabel(me.role)}.`;

const content = document.getElementById('content');
content.innerHTML = `
  <form class="panel-form" id="nameForm">
    <h2 class="form-title">Your name</h2>
    <label class="field"><span class="field__label">Name shown with your photos and comments</span>
      <input class="field__input" name="name" maxlength="60" required></label>
    <button class="btn btn--forest" type="submit">Save name</button>
  </form>
  <form class="panel-form" id="passForm">
    <h2 class="form-title">Change password</h2>
    <label class="field"><span class="field__label">Current password</span>
      <input class="field__input" type="password" name="current" autocomplete="current-password" required></label>
    <label class="field"><span class="field__label">New password (at least 10 characters)</span>
      <input class="field__input" type="password" name="next" autocomplete="new-password" minlength="10" required></label>
    <p class="form-error" id="passError" role="alert" hidden></p>
    <button class="btn btn--forest" type="submit">Change password</button>
  </form>`;

const nameForm = document.getElementById('nameForm');
nameForm.name.value = me.name;
nameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const { user } = await api('/me', { method: 'PATCH', body: { name: nameForm.name.value } });
    document.querySelector('.menu__who').firstChild.textContent = `${user.name} `;
    notify('Name saved', `You will show as ${user.name}.`);
  } catch (err) { notify('Name not saved', err.message); }
});

const passForm = document.getElementById('passForm');
const passError = document.getElementById('passError');
passForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passError.hidden = true;
  try {
    await api('/me/password', { method: 'POST', body: { current: passForm.current.value, next: passForm.next.value } });
    passForm.reset();
    notify('Password changed', 'Use the new password next time you sign in.');
  } catch (err) {
    passError.textContent = err.message;
    passError.hidden = false;
  }
});
