// ===== Localized strings =====
const STRINGS = {
  en: {
    welcome: "Hello! I'm your AI assistant 🤖\nAsk me anything and I'll help you instantly.",
    placeholder: "Send a message...",
    suggestions: ["Help me study", "Explain a lesson", "Plan my day"],
    networkError: "Network error. Please try again.",
    noResponse: "(No response)",
    thinking: "Thinking",
  },
  ar: {
    welcome: "مرحباً! أنا مساعدك الذكي 🤖\nاسألني أي شيء وسأساعدك فوراً.",
    placeholder: "اكتب رسالتك هنا...",
    suggestions: ["ساعدني في الدراسة", "اشرح لي درساً", "خطط ليومي"],
    networkError: "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    noResponse: "(لا يوجد رد)",
    thinking: "جارٍ التفكير",
  },
};

let currentLang = "en";
let currentGender = "neutral";
let history = [];
let isWaiting = false;

// ===== Start screen =====
const startScreen = document.getElementById("start-screen");
const stepLanguage = document.getElementById("step-language");
const stepGender = document.getElementById("step-gender");
const chatApp = document.getElementById("chat-app");
const backBtn = document.getElementById("back-to-lang");

function applyLanguage(lang) {
  currentLang = lang;
  document.body.classList.remove("lang-en", "lang-ar");
  document.body.classList.add(`lang-${lang}`);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-en]").forEach((el) => {
    const txt = el.dataset[lang];
    if (txt) el.textContent = txt;
    if (lang === "ar") el.classList.add("ar"); else el.classList.remove("ar");
  });
}

function applyTheme(gender) {
  currentGender = gender;
  document.body.classList.remove("theme-male", "theme-female", "theme-neutral");
  document.body.classList.add(`theme-${gender}`);
}

function showStep(step) {
  stepLanguage.classList.toggle("active", step === "language");
  stepGender.classList.toggle("active", step === "gender");
}

function startChat() {
  startScreen.classList.add("hidden");
  setTimeout(() => {
    startScreen.style.display = "none";
    chatApp.hidden = false;
    initChat();
  }, 300);
}

document.querySelectorAll(".start-option[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyLanguage(btn.dataset.lang);
    showStep("gender");
  });
});

document.querySelectorAll(".start-option[data-gender]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.gender);
    startChat();
  });
});

backBtn.addEventListener("click", () => showStep("language"));

// ===== Chat =====
let messagesEl, form, input, sendBtn, clearBtn;

function initChat() {
  messagesEl = document.getElementById("messages");
  form = document.getElementById("chat-form");
  input = document.getElementById("input");
  sendBtn = document.getElementById("send-btn");
  clearBtn = document.getElementById("clear-btn");

  input.placeholder = STRINGS[currentLang].placeholder;
  renderWelcome();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    sendMessage(text);
  });

  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  clearBtn.addEventListener("click", () => {
    history = [];
    renderWelcome();
    input.focus();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".suggestion");
    if (!btn) return;
    const prompt = btn.dataset.prompt;
    if (!prompt) return;
    input.value = prompt;
    autoResize();
    input.focus();
  });

  input.focus();
}

function renderWelcome() {
  const s = STRINGS[currentLang];
  const isAr = currentLang === "ar";
  const chips = s.suggestions
    .map((t) => `<button type="button" class="suggestion${isAr ? " ar" : ""}" data-prompt="${t}">${t}</button>`)
    .join("");
  messagesEl.innerHTML = `
    <div class="message assistant welcome-msg">
      <div class="bubble${isAr ? " ar" : ""}">${s.welcome}</div>
    </div>
    <div class="suggestions welcome-msg">${chips}</div>
  `;
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 200) + "px";
}

function clearEmptyState() {
  messagesEl.querySelectorAll(".welcome-msg").forEach((el) => el.remove());
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, content, opts = {}) {
  clearEmptyState();
  const wrap = document.createElement("div");
  wrap.className = `message ${role}` + (opts.error ? " error" : "");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return bubble;
}

function addTypingIndicator() {
  clearEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "message assistant thinking-msg";
  wrap.id = "typing-msg";

  const isAr = currentLang === "ar";
  const label = STRINGS[currentLang].thinking;

  const bubble = document.createElement("div");
  bubble.className = "bubble thinking-bubble" + (isAr ? " ar" : "");
  bubble.innerHTML = `
    <span class="thinking-label">${label}</span><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
  `;

  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

function removeTypingIndicator() {
  const t = document.getElementById("typing-msg");
  if (!t) return;
  t.classList.add("fading");
  setTimeout(() => t.remove(), 180);
}

async function sendMessage(text) {
  if (!text || isWaiting) return;
  isWaiting = true;
  sendBtn.disabled = true;
  sendBtn.classList.add("loading");

  addMessage("user", text);
  history.push({ role: "user", content: text });

  input.value = "";
  autoResize();
  addTypingIndicator();

  let bubble = null;
  let fullText = "";
  let firstChunk = true;
  let errored = false;

  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, lang: currentLang }),
    });

    if (!res.ok || !res.body) {
      removeTypingIndicator();
      const err = await res.json().catch(() => ({}));
      addMessage("assistant", err.error || `Request failed (${res.status}).`, { error: true });
      errored = true;
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          let data;
          try { data = JSON.parse(payload); } catch { continue; }

          if (data.error) {
            removeTypingIndicator();
            addMessage("assistant", data.error, { error: true });
            errored = true;
            continue;
          }
          if (data.done) continue;
          if (typeof data.content === "string") {
            if (firstChunk) {
              removeTypingIndicator();
              bubble = addMessage("assistant", "");
              firstChunk = false;
            }
            fullText += data.content;
            bubble.textContent = fullText;
            scrollToBottom();
          }
        }
      }

      if (!errored) {
        const finalText = fullText.trim() || STRINGS[currentLang].noResponse;
        if (!bubble) {
          removeTypingIndicator();
          addMessage("assistant", finalText);
        } else {
          bubble.textContent = finalText;
        }
        history.push({ role: "assistant", content: finalText });
      }
    }
  } catch (e) {
    removeTypingIndicator();
    addMessage("assistant", STRINGS[currentLang].networkError, { error: true });
  } finally {
    isWaiting = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove("loading");
    input.focus();
  }
}
