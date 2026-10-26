import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome } from './chrome.js';
import { api } from './api.js';

await initChrome('signin');

const form = document.getElementById('form');
const error = document.getElementById('error');
const submit = document.getElementById('submit');

// Only go back to a page on this site after signing in.
function nextPage() {
  const next = new URLSearchParams(location.search).get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) {
    error.textContent = 'Please enter your email and password.';
    error.hidden = false;
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Signing in…';
  try {
    await api('/login', { method: 'POST', body: { email, password } });
    location.href = nextPage();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Sign in';
    form.password.select();
  }
});
