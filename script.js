const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const sourceLang = document.getElementById("sourceLang");
const targetLang = document.getElementById("targetLang");
const translateBtn = document.getElementById("translateBtn");
const loading = document.getElementById("loading");
const charCount = document.getElementById("charCount");
const darkModeToggle = document.getElementById("darkModeToggle");

charCount.textContent = `${inputText.value.length} / 500`;

let debounceTimer;

function debounceTranslate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    translateText();
  }, 600);
}

inputText.addEventListener("input", () => {
  charCount.textContent = `${inputText.value.length} / 500`;
  debounceTranslate();
});

translateBtn.addEventListener("click", translateText);

document.getElementById("swapBtn").addEventListener("click", () => {
  [sourceLang.value, targetLang.value] = [targetLang.value, sourceLang.value];
  [inputText.value, outputText.value] = [outputText.value, inputText.value];
});

function translateText() {
  const text = inputText.value.trim();
  if (!text) return;

  loading.style.display = "block";
  outputText.value = "";

  const from = sourceLang.value === "auto" ? "en" : sourceLang.value;
  const to = targetLang.value;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${from}|${to}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.responseStatus !== 200) {
        throw new Error("Translation failed");
      }
      outputText.value = data.responseData.translatedText;
    })
    .catch(() => {
      outputText.value = "Translation failed. Please try again.";
    })
    .finally(() => {
      loading.style.display = "none";
    });
}

function speakText(id) {
  const text = document.getElementById(id).value;
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

function copyText(id) {
  const text = document.getElementById(id).value;
  navigator.clipboard.writeText(text);
}

if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark");
  darkModeToggle.textContent = "☀️ Light Mode";
}

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("darkMode", "enabled");
    darkModeToggle.textContent = "☀️ Light Mode";
  } else {
    localStorage.setItem("darkMode", "disabled");
    darkModeToggle.textContent = "🌙 Dark Mode";
  }
});
