// First sign-in: replace the temporary password with one of the member's own.
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/signin.css';

import { api } from './api.js';

const MIN = 10;
const { user } = await api('/me');
if (!user) location.replace('/signin.html');
else if (!user.mustChangePassword) location.replace('/');
else {
  document.getElementById('hello').textContent = `Welcome, ${user.name}`;
  document.getElementById('username').value = user.email; // helps password managers save it
}

const form = document.getElementById('form');
const pw = document.getElementById('password');
const confirmIn = document.getElementById('confirm');
const error = document.getElementById('error');
const submit = document.getElementById('submit');
const label = submit.querySelector('.card__submit-text');
const count = document.getElementById('pwCount');

const updateCount = () => {
  const n = pw.value.length;
  count.textContent = n >= MIN ? `${n} characters. Long enough.` : `${n} of ${MIN} characters`;
  count.classList.toggle('is-ok', n >= MIN);
};
pw.addEventListener('input', updateCount);
updateCount();

const show = document.getElementById('showPw');
show.addEventListener('click', () => {
  const on = pw.type === 'password';
  pw.type = confirmIn.type = on ? 'text' : 'password';
  show.textContent = on ? 'Hide' : 'Show';
  show.setAttribute('aria-pressed', String(on));
  show.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
});

const showError = (msg) => { error.textContent = msg; error.hidden = false; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (pw.value.length < MIN) { showError(`Please use at least ${MIN} characters.`); pw.focus(); return; }
  if (pw.value !== confirmIn.value) { showError('The two passwords are not the same. Please type it again.'); confirmIn.focus(); return; }
  error.hidden = true;
  submit.disabled = true;
  submit.classList.add('is-busy');
  label.textContent = 'Saving…';
  try {
    await api('/me/first-password', { method: 'POST', body: { next: pw.value } });
    label.textContent = 'Saved. Welcome!';
    location.replace('/');
  } catch (err) {
    showError(err.message);
    submit.disabled = false;
    submit.classList.remove('is-busy');
    label.textContent = 'Save my password';
  }
});

document.getElementById('signOut').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  location.replace('/signin.html');
});
