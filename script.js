/* ════════════════════════════════════════════════════════════════
   script.js — LinguaFlow Multilingual Translator
   ════════════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────────── */
const MAX_CHARS     = 500;
const DEBOUNCE_WAIT = 800; // milliseconds

/* ── State ─────────────────────────────────────────────────────── */
let debounceTimer = null;
let currentOutput = 'Bonjour, comment allez-vous';
let isSpeaking    = false;

/* ── DOM References ────────────────────────────────────────────── */
const inputText     = document.getElementById('inputText');
const outputText    = document.getElementById('outputText');
const sourceLang    = document.getElementById('sourceLang');
const targetLang    = document.getElementById('targetLang');
const switchBtn     = document.getElementById('switchBtn');
const translateBtn  = document.getElementById('translateBtn');
const charCount     = document.getElementById('charCount');
const listenInput   = document.getElementById('listenInput');
const listenOutput  = document.getElementById('listenOutput');
const copyInput     = document.getElementById('copyInput');
const copyOutput    = document.getElementById('copyOutput');
const errorBanner   = document.getElementById('errorBanner');
const errorMsg      = document.getElementById('errorMsg');
const detectedBadge = document.getElementById('detectedBadge');
const themeToggle   = document.getElementById('themeToggle');
const inputPanel    = document.getElementById('inputPanel');

/* ══════════════════════════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════════════════════════ */

/**
 * Load the saved theme from localStorage on page load.
 * Falls back to 'light' if nothing has been saved yet.
 */
const savedTheme = localStorage.getItem('linguaflow-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

/** Toggle between light and dark mode and persist the choice. */
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('linguaflow-theme', next);
});

/* ══════════════════════════════════════════════════════════════════
   CHARACTER COUNTER & BUTTON STATE
   ══════════════════════════════════════════════════════════════════ */

/**
 * Refresh the character counter display and apply
 * warning / over-limit colour classes.
 */
function updateCharCount() {
  const len = inputText.value.length;
  charCount.textContent = `${len}/${MAX_CHARS}`;
  charCount.classList.toggle('warn', len >= 400 && len < MAX_CHARS);
  charCount.classList.toggle('over', len >= MAX_CHARS);
  updateButtons();
}

/**
 * Enable or disable Listen / Copy buttons based on
 * whether there is content to act on.
 */
function updateButtons() {
  const hasInput  = inputText.value.trim().length > 0;
  const hasOutput = currentOutput && !currentOutput.startsWith('—');

  listenInput.disabled  = !hasInput;
  copyInput.disabled    = !hasInput;
  listenOutput.disabled = !hasOutput;
  copyOutput.disabled   = !hasOutput;
}

/* ══════════════════════════════════════════════════════════════════
   TRANSLATION API
   ══════════════════════════════════════════════════════════════════ */

/**
 * Call the MyMemory translation API and update the output panel.
 * Uses GET with query parameters as required by the assignment spec.
 */
async function translate() {
  const text = inputText.value.trim();
  if (!text) return;

  const src = sourceLang.value;
  const tgt = targetLang.value;

  // Skip API call when source and target are the same language
  if (src !== 'auto' && src === tgt) {
    currentOutput          = text;
    outputText.textContent = text;
    updateButtons();
    return;
  }

  // MyMemory uses 'autodetect' for language detection
  const langpair = `${src === 'auto' ? 'autodetect' : src}|${tgt}`;

  setLoading(true);
  hideError();

  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', langpair);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.responseStatus === 200 || data.responseStatus === '200') {
      const translated       = data.responseData?.translatedText ?? '';
      currentOutput          = translated;
      outputText.textContent = translated;

      // Show which language was auto-detected (if applicable)
      if (src === 'auto' && data.detectedLanguage) {
        detectedBadge.textContent = data.detectedLanguage.toUpperCase();
        detectedBadge.classList.add('show');
      } else {
        detectedBadge.classList.remove('show');
      }

      updateButtons();
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }

  } catch (err) {
    const message = err.message.includes('Failed to fetch')
      ? 'Network error — check your connection and try again.'
      : `Translation failed: ${err.message}`;

    showError(message);
    currentOutput          = '';
    outputText.textContent = '— Translation unavailable —';
    updateButtons();

  } finally {
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════════════════════════
   LOADING STATE
   ══════════════════════════════════════════════════════════════════ */

/**
 * Toggle the loading/spinner state on the translate button
 * and apply a shimmer animation to the output panel.
 * @param {boolean} on - true to enable loading, false to disable
 */
function setLoading(on) {
  translateBtn.disabled = on;
  translateBtn.classList.toggle('loading', on);
  outputText.classList.toggle('loading-shimmer', on);
  if (on) outputText.textContent = '';
}

/* ══════════════════════════════════════════════════════════════════
   ERROR HANDLING
   ══════════════════════════════════════════════════════════════════ */

/**
 * Display the error banner with a given message.
 * @param {string} msg - Error message to display
 */
function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.add('show');
}

/** Hide the error banner. */
function hideError() {
  errorBanner.classList.remove('show');
}

/* ══════════════════════════════════════════════════════════════════
   DEBOUNCE UTILITY
   ══════════════════════════════════════════════════════════════════ */

/**
 * Returns a debounced version of the provided function.
 * The function will only execute after the specified wait period
 * has elapsed since it was last called.
 *
 * @param {Function} fn   - Function to debounce
 * @param {number}   wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, wait) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), wait);
  };
}

const debouncedTranslate = debounce(translate, DEBOUNCE_WAIT);

/* ══════════════════════════════════════════════════════════════════
   EVENT LISTENERS
   ══════════════════════════════════════════════════════════════════ */

/* ── Input textarea ────────────────────────────────────────────── */
inputText.addEventListener('input', () => {
  updateCharCount();
  hideError();

  if (inputText.value.trim()) {
    debouncedTranslate();
  } else {
    outputText.textContent = '';
    currentOutput          = '';
    updateButtons();
  }
});

// Highlight the input panel border when focused
inputText.addEventListener('focus', () => inputPanel.classList.add('active'));
inputText.addEventListener('blur',  () => inputPanel.classList.remove('active'));

/* ── Translate button ──────────────────────────────────────────── */
translateBtn.addEventListener('click', () => {
  clearTimeout(debounceTimer); // cancel any pending debounce
  translate();
});

/* ── Switch languages button ───────────────────────────────────── */
switchBtn.addEventListener('click', () => {
  const srcVal = sourceLang.value;
  const tgtVal = targetLang.value;

  // Cannot swap when source is auto-detect (no concrete language to swap with)
  if (srcVal === 'auto') {
    showToast('Set a specific source language before switching.', 'error');
    return;
  }

  // Swap the dropdown values
  sourceLang.value = tgtVal;
  targetLang.value = srcVal;

  // Swap the text content between panels
  const prevInput  = inputText.value;
  const prevOutput = currentOutput;

  inputText.value        = prevOutput;
  outputText.textContent = prevInput;
  currentOutput          = prevInput;

  detectedBadge.classList.remove('show');
  updateCharCount();
  updateButtons();
});

/* ── Language dropdowns ────────────────────────────────────────── */
sourceLang.addEventListener('change', () => {
  detectedBadge.classList.remove('show');
  if (inputText.value.trim()) debouncedTranslate();
});

targetLang.addEventListener('change', () => {
  if (inputText.value.trim()) debouncedTranslate();
});

/* ══════════════════════════════════════════════════════════════════
   TEXT-TO-SPEECH
   ══════════════════════════════════════════════════════════════════ */

/**
 * Use the Web Speech API to speak the given text aloud.
 * @param {string} text     - Text to speak
 * @param {string} langCode - BCP-47 language code (e.g. 'en', 'fr')
 */
function speak(text, langCode) {
  if (!window.speechSynthesis) {
    showToast('Text-to-Speech is not supported in this browser.', 'error');
    return;
  }

  // Cancel any in-progress speech before starting new
  if (isSpeaking) speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = langCode === 'auto' ? 'en' : langCode;
  utterance.rate  = 0.9;

  utterance.onstart = () => { isSpeaking = true; };
  utterance.onend   = () => { isSpeaking = false; };
  utterance.onerror = () => {
    isSpeaking = false;
    showToast('Speech playback failed.', 'error');
  };

  speechSynthesis.speak(utterance);
}

listenInput.addEventListener('click',  () => speak(inputText.value, sourceLang.value));
listenOutput.addEventListener('click', () => speak(currentOutput,   targetLang.value));

/* ══════════════════════════════════════════════════════════════════
   COPY TO CLIPBOARD
   ══════════════════════════════════════════════════════════════════ */

/**
 * Copy text to the user's clipboard.
 * Falls back to the legacy execCommand API for older browsers.
 *
 * @param {string} text  - Text to copy
 * @param {string} label - Human-readable label shown in the toast
 */
async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied!`, 'success');
  } catch {
    // Legacy fallback
    const ta        = document.createElement('textarea');
    ta.value        = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`${label} copied!`, 'success');
  }
}

copyInput.addEventListener('click',  () => copyToClipboard(inputText.value, 'Input'));
copyOutput.addEventListener('click', () => copyToClipboard(currentOutput,   'Translation'));

/* ══════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════════════════ */

/**
 * Show a temporary toast notification at the bottom of the screen.
 * @param {string} msg  - Message to display
 * @param {string} type - Optional CSS class: 'success' or 'error'
 */
function showToast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const el        = document.createElement('div');

  el.className   = `toast${type ? ' ' + type : ''}`;
  el.textContent = msg;
  container.appendChild(el);

  // Auto-dismiss after 2.5 seconds with fade-out animation
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

/* ══════════════════════════════════════════════════════════════════
   INITIALISATION
   ══════════════════════════════════════════════════════════════════ */

// Set up initial UI state to match the pre-filled default text
updateCharCount();
updateButtons();

// Enable all buttons immediately since the page loads with default content
listenInput.disabled  = false;
copyInput.disabled    = false;
listenOutput.disabled = false;
copyOutput.disabled   = false;
