// Beasties Assistant: the round "Ask" button and chat panel. Loaded only when the owner has
// switched the assistant on (ASSISTANT_ENABLED) and a member is signed in.
// Voice uses the browser's own speech features (no extra services); each part is hidden where
// the browser does not support it. Audio is never recorded or sent to the server: speech is
// turned into text by the browser, and only that text is sent, like a typed question.
import './styles/assistant.css';
import { isReduced } from './chrome.js';

const MAX = 500;
const HISTORY = 6; // turns sent with each question (the server keeps only the last 6 too)
const STORE = 'beasties-assistant-chat'; // this tab only, cleared by "Clear chat"
const SPEAK_PREF = 'beasties-assistant-speak';
const NOTICE = 'Assistant, can make mistakes. For anything else, ask Stuart.';
const GEMINI_NOTICE = 'Do not type personal details.';
// Kept the same as CHIPS in server/assistant-faq.js (scripts/assistant-faq-check.mjs checks this).
const CHIPS = ['When is the next gathering?', 'How do I add a photo?', 'How do I write a caption?', 'How do I see just the photos?'];
const MORE_CHIPS = ['What can I ask?', 'How do I sign in?', 'How do I change my password?', 'How do I browse the albums?',
  'How do I see big photos?', 'How do I show photos from one day?', 'How do I comment on a photo?', 'How do I download a photo?',
  'What are Random Beastie Sightings?', 'Where are my photos?', 'How do I sign out?', 'What albums are there?',
  'How do I turn off moving effects?'];
const HELLO = 'Hello! I can help with the Beasties website and the next gathering. Tap a question below, or type your own.';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const load = (k, fallback) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
const pref = (k) => { try { return localStorage.getItem(k) === 'on'; } catch { return false; } };
const setPref = (k, on) => { try { localStorage.setItem(k, on ? 'on' : 'off'); } catch {} };

let turns = load(STORE, []); // [{ role: 'user' | 'assistant', text }]
let busy = false;

export function initAssistant(provider = 'faq') {
  if (document.getElementById('askBtn')) return;

  /* ---------- Button and panel ---------- */
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'askBtn';
  btn.className = 'ask-btn';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-controls', 'askPanel');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Ask the Beasties Assistant');
  btn.innerHTML = '<span class="ask-btn__icon" aria-hidden="true"></span><span class="ask-btn__text">Ask</span>';

  const panel = document.createElement('section');
  panel.id = 'askPanel';
  panel.className = 'ask';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'askTitle');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="ask__head">
      <h2 class="ask__title" id="askTitle">Beasties Assistant</h2>
      <div class="ask__tools">
        <button class="ask__tool" type="button" id="askSpeak" aria-pressed="false" hidden><span class="ask__ico ask__ico--speaker" aria-hidden="true"></span><span>Read aloud</span></button>
        <button class="ask__tool" type="button" id="askClear"><span>Clear chat</span></button>
        <button class="ask__tool ask__tool--close" type="button" id="askClose" aria-label="Close the assistant"><span>Close</span><span class="ask__x" aria-hidden="true"></span></button>
      </div>
    </header>
    <div class="ask__log" id="askLog" role="log" aria-live="polite" aria-relevant="additions text"></div>
    <div class="ask__chips" id="askChips" role="group" aria-label="Suggested questions"></div>
    <p class="ask__notice">${NOTICE}${provider === 'gemini' ? `<br>${GEMINI_NOTICE}` : ''}</p>
    <div class="ask__speaking" id="askSpeaking" hidden>
      <span class="ask__dot" aria-hidden="true"></span><span>Reading the answer aloud</span>
      <button class="ask__stop" type="button" id="askStop">Stop</button>
    </div>
    <div class="ask__listening" id="askListening" role="status" hidden>
      <span class="ask__mic-dot" aria-hidden="true"></span><span>Listening… speak now. Tap the microphone again to stop.</span>
    </div>
    <form class="ask__form" id="askForm" novalidate>
      <label class="sr" for="askInput">Your question</label>
      <textarea class="ask__input" id="askInput" rows="2" maxlength="${MAX}" placeholder="Type your question" aria-describedby="askCount"></textarea>
      <div class="ask__row">
        <p class="ask__count" id="askCount">0 / ${MAX}</p>
        <button class="ask__mic" type="button" id="askMic" aria-pressed="false" aria-label="Speak your question" hidden><span class="ask__ico ask__ico--mic" aria-hidden="true"></span></button>
        <button class="ask__send" type="submit" id="askSend">Send</button>
      </div>
    </form>`;
  document.body.append(btn, panel);

  const $ = (id) => document.getElementById(id);
  const log = $('askLog');
  const input = $('askInput');
  const send = $('askSend');
  const count = $('askCount');

  /* ---------- Messages ---------- */
  function bubble(role, text) {
    const div = document.createElement('div');
    div.className = `ask__msg ask__msg--${role}`;
    const who = document.createElement('p');
    who.className = 'sr';
    who.textContent = role === 'user' ? 'You asked:' : 'Assistant:';
    const body = document.createElement('p');
    body.className = 'ask__text';
    body.textContent = text;
    div.append(who, body);
    log.append(div);
    return body;
  }
  function render() {
    log.innerHTML = '';
    bubble('assistant', HELLO);
    turns.forEach((t) => bubble(t.role, t.text));
    $('askChips').hidden = turns.length > 0;
    scrollDown();
  }
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  const chips = $('askChips');
  const chip = (q) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'ask__chip';
    c.textContent = q;
    c.addEventListener('click', () => { unlockSpeech(); ask(q); });
    return c;
  };
  for (const q of CHIPS) chips.append(chip(q));
  // "More questions" opens the rest of the list in place.
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'ask__chip ask__chip--more';
  more.textContent = 'More questions';
  more.setAttribute('aria-expanded', 'false');
  more.addEventListener('click', () => {
    more.replaceWith(...MORE_CHIPS.map(chip));
    chips.classList.add('is-open');
    chips.querySelectorAll('.ask__chip')[CHIPS.length]?.focus();
  });
  chips.append(more);

  /* ---------- Asking ---------- */
  async function ask(asked) {
    const question = String(asked || '').trim().slice(0, MAX);
    if (!question || busy) return;
    busy = true;
    stopSpeaking();
    const history = turns.slice(-HISTORY);
    turns.push({ role: 'user', text: question });
    save(STORE, turns);
    chips.hidden = true;
    bubble('user', question);
    input.value = '';
    updateCount();
    send.disabled = true;
    send.textContent = 'Sending…';
    const answer = bubble('assistant', '');
    answer.parentElement.classList.add('is-loading');
    answer.innerHTML = '<span class="ask__typing" aria-label="The assistant is writing"><span></span><span></span><span></span></span>';
    log.setAttribute('aria-busy', 'true');
    scrollDown();

    let text = '';
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Beasties': '1' },
        body: JSON.stringify({ message: question, history }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 401 ? 'Please sign in again, then ask your question.'
          : res.status >= 500 && !data.error ? 'The assistant could not answer just now. Please try again in a minute.'
            : data.error || 'Something went wrong. Please try again.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      answer.textContent = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        answer.textContent = text;
        scrollDown();
      }
      text += decoder.decode();
      answer.textContent = text.trim() || 'Sorry, I have no answer for that. Please ask Stuart.';
      turns.push({ role: 'assistant', text: answer.textContent });
      save(STORE, turns);
      if (speakOn) speak(answer.textContent);
    } catch (err) {
      const offline = err instanceof TypeError;
      answer.textContent = offline ? 'The website could not be reached. Please check your internet connection and try again.' : err.message;
      answer.parentElement.classList.add('ask__msg--error');
      turns.pop(); // a failed question is not kept, so it can simply be asked again
      save(STORE, turns);
    } finally {
      answer.parentElement.classList.remove('is-loading');
      log.removeAttribute('aria-busy');
      busy = false;
      send.disabled = false;
      send.textContent = 'Send';
      scrollDown();
    }
  }

  const updateCount = () => { count.textContent = `${input.value.length} / ${MAX}`; };
  input.addEventListener('input', updateCount);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); unlockSpeech(); ask(input.value); }
  });
  $('askForm').addEventListener('submit', (e) => { e.preventDefault(); unlockSpeech(); ask(input.value); });

  $('askClear').addEventListener('click', () => {
    turns = [];
    save(STORE, turns);
    stopSpeaking();
    render();
    input.focus();
  });

  /* ---------- Open and close ---------- */
  function open() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('ask-open');
    render();
    input.focus();
  }
  function close() {
    stopListening();
    stopSpeaking();
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('ask-open');
    btn.focus();
  }
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  $('askClose').addEventListener('click', close);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  // The photo viewer always wins: opening it closes the assistant (see also the CSS).
  new MutationObserver(() => {
    if (document.documentElement.classList.contains('is-locked') && !panel.hidden) close();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---------- Voice in: the browser turns speech into text ---------- */
  const mic = $('askMic');
  let rec = null;
  let heard = '';
  if (SR) {
    mic.hidden = false;
    mic.addEventListener('click', () => (rec ? stopListening() : startListening()));
  }
  function startListening() {
    if (busy) return;
    stopSpeaking();
    try {
      rec = new SR();
    } catch { mic.hidden = true; return; }
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    heard = '';
    rec.onresult = (e) => {
      heard = [...e.results].map((r) => r[0].transcript).join(' ').trim();
      input.value = heard.slice(0, MAX);
      updateCount();
    };
    rec.onerror = (e) => {
      const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'The microphone is not allowed. You can allow it in your browser settings, or type your question.'
        : e.error === 'no-speech' ? 'I did not hear anything. Please try again, or type your question.' : null;
      if (msg) bubble('assistant', msg).parentElement.classList.add('ask__msg--error');
      heard = '';
    };
    rec.onend = () => {
      const text = heard;
      stopListening(true);
      if (text) ask(text); // fill the box and send, as if typed
    };
    mic.setAttribute('aria-pressed', 'true');
    mic.setAttribute('aria-label', 'Stop listening');
    mic.classList.add('is-on');
    $('askListening').hidden = false;
    try { rec.start(); } catch { stopListening(true); }
  }
  function stopListening(ended = false) {
    if (rec && !ended) { try { rec.stop(); } catch {} return; }
    rec = null;
    mic.setAttribute('aria-pressed', 'false');
    mic.setAttribute('aria-label', 'Speak your question');
    mic.classList.remove('is-on');
    $('askListening').hidden = true;
  }

  /* ---------- Voice out: the browser reads answers aloud ---------- */
  const speakBtn = $('askSpeak');
  let speakOn = canSpeak && pref(SPEAK_PREF);
  if (canSpeak) {
    speakBtn.hidden = false;
    const show = () => {
      speakBtn.setAttribute('aria-pressed', String(speakOn));
      speakBtn.querySelector('span:last-child').textContent = speakOn ? 'Reading aloud' : 'Read aloud';
    };
    show();
    speakBtn.addEventListener('click', () => {
      speakOn = !speakOn;
      setPref(SPEAK_PREF, speakOn);
      if (!speakOn) stopSpeaking();
      else unlockSpeech();
      show();
    });
    $('askStop').addEventListener('click', stopSpeaking);
    window.speechSynthesis.getVoices(); // some browsers load voices on first ask
  }
  function pickVoice() {
    const voices = window.speechSynthesis.getVoices().filter((v) => /^en(-|_)?/i.test(v.lang));
    const liked = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Daniel'];
    return liked.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean)
      || voices.find((v) => /en-US/i.test(v.lang)) || voices[0] || null;
  }
  function speak(text) {
    if (!canSpeak || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-US';
    u.rate = 0.9; // a little slower than normal, easier to follow
    u.pitch = 1;
    u.onstart = () => { $('askSpeaking').hidden = false; };
    u.onend = u.onerror = () => { $('askSpeaking').hidden = true; };
    window.speechSynthesis.speak(u);
  }
  // iPhone and iPad Safari only let a page speak if speaking starts inside a tap. Answers arrive
  // a moment after the tap, so speak a silent sound during the tap to unlock it for this page.
  let unlocked = false;
  function unlockSpeech() {
    if (!canSpeak || !speakOn || unlocked) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      unlocked = true;
    } catch {}
  }
  function stopSpeaking() {
    if (canSpeak) window.speechSynthesis.cancel();
    $('askSpeaking').hidden = true;
  }

  panel.classList.toggle('is-still', isReduced());
}
