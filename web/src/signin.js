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
    // Wrong password (401) and too many tries (429) come with their own clear message.
    // Anything else is a problem on the site, not with the password.
    error.textContent = err.status === 401 || err.status === 429 ? err.message
      : err.status === 0 ? err.message
        : 'We could not check your password because of a problem on the site. Your password may be fine. Please try again in a few minutes.';
    error.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Sign in';
    form.password.select();
  }
});
