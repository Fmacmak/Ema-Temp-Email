const API = "https://api.mail.tm";

// ── DOM refs ──────────────────────────────
const emailDisplay = document.getElementById("email-display");
const copyBtn      = document.getElementById("copy-btn");
const newAddrBtn   = document.getElementById("new-addr-btn");
const deleteBtn    = document.getElementById("delete-btn");
const refreshBtn   = document.getElementById("refresh-btn");
const inbox        = document.getElementById("inbox");
const msgCount     = document.getElementById("msg-count");
const mainView     = document.getElementById("main-view");
const detailPanel  = document.getElementById("detail-panel");
const backBtn      = document.getElementById("back-btn");
const detailSubj   = document.getElementById("detail-subject");
const detailMeta   = document.getElementById("detail-meta");
const detailBody   = document.getElementById("detail-body");
const toast        = document.getElementById("toast");

let account = null;  // { address, password, token }
let messages = [];

// ── Helpers ───────────────────────────────
const rand = (n=10) => Math.random().toString(36).slice(2, 2+n);
const api  = async (path, opts={}) => {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    ...opts
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

function showToast(msg="Copied!", color="#4ade80") {
  toast.textContent = msg;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function timeSince(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)  return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── Account management ────────────────────
async function createAccount() {
  emailDisplay.textContent = "Generating…";
  emailDisplay.classList.add("loading");

  // 1. Fetch available domain
  const { "hydra:member": domains } = await api("/domains");
  const domain = domains[0].domain;

  // 2. Create account
  const address  = `${rand(8)}@${domain}`;
  const password = rand(12);
  await api("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });

  // 3. Get token
  const { token } = await api("/token", { method: "POST", body: JSON.stringify({ address, password }) });

  account = { address, password, token };
  await chrome.storage.local.set({ account });

  emailDisplay.textContent = address;
  emailDisplay.classList.remove("loading");

  messages = [];
  renderInbox();
  chrome.runtime.sendMessage({ type: "START_POLLING", token, address });
}

async function loadAccount() {
  const { account: saved } = await chrome.storage.local.get("account");
  if (!saved) return createAccount();

  account = saved;
  emailDisplay.textContent = account.address;
  emailDisplay.classList.remove("loading");
  await fetchMessages();
  chrome.runtime.sendMessage({ type: "START_POLLING", token: account.token, address: account.address });
}

async function deleteAccount() {
  if (!account) return;
  deleteBtn.disabled = true;
  try {
    // Delete via API (best-effort)
    const { "hydra:member": accs } = await api("/accounts");
    if (accs.length) await api(`/accounts/${accs[0].id}`, { method: "DELETE" });
  } catch (_) {}
  await chrome.storage.local.remove("account");
  account = null;
  messages = [];
  renderInbox();
  chrome.runtime.sendMessage({ type: "STOP_POLLING" });
  deleteBtn.disabled = false;
  createAccount();
}

// ── Messages ──────────────────────────────
async function fetchMessages() {
  if (!account) return;
  refreshBtn.classList.add("spinning");
  try {
    const { "hydra:member": msgs } = await api("/messages");
    messages = msgs;
    renderInbox();
  } catch(e) {
    showToast("Fetch failed", "#f87171");
  }
  refreshBtn.classList.remove("spinning");
}

function renderInbox() {
  msgCount.textContent = messages.length;
  if (!messages.length) {
    inbox.innerHTML = `
      <div class="empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M4 4h16v16H4z" rx="2"/><path d="M4 8l8 5 8-5"/>
        </svg>
        <p>No messages yet</p>
        <small>Waiting for incoming mail…</small>
      </div>`;
    return;
  }
  inbox.innerHTML = messages.map(m => `
    <div class="msg-card ${m.seen ? "" : "unread"}" data-id="${m.id}">
      <div class="msg-from">${escHtml(m.from?.address || "Unknown")}</div>
      <div class="msg-subject">${escHtml(m.subject || "(no subject)")}</div>
      <div class="msg-meta">
        <div class="msg-preview">${escHtml(m.intro || "")}</div>
        <div class="msg-time">${timeSince(m.createdAt)}</div>
      </div>
    </div>`).join("");

  inbox.querySelectorAll(".msg-card").forEach(card => {
    card.addEventListener("click", () => openMessage(card.dataset.id));
  });
}

async function openMessage(id) {
  try {
    const msg = await api(`/messages/${id}`);
    detailSubj.textContent = msg.subject || "(no subject)";
    detailMeta.innerHTML = `
      <span>From:</span> ${escHtml(msg.from?.address || "?")} &nbsp;·&nbsp;
      <span>To:</span> ${escHtml(msg.to?.[0]?.address || "?")} &nbsp;·&nbsp;
      ${new Date(msg.createdAt).toLocaleString()}`;
    // Prefer plain text; fall back to stripping HTML tags
    const body = msg.text || stripHtml(msg.html?.[0] || "");
    detailBody.textContent = body || "(empty)";
    mainView.style.display = "none";
    detailPanel.style.display = "block";
    // Mark as seen locally
    const m = messages.find(x => x.id === id);
    if (m) m.seen = true;
  } catch(e) {
    showToast("Could not load message", "#f87171");
  }
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function stripHtml(s) {
  return s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}

// ── Event listeners ───────────────────────
copyBtn.addEventListener("click", async () => {
  if (!account) return;
  await navigator.clipboard.writeText(account.address);
  copyBtn.classList.add("copied");
  showToast("Copied!");
  setTimeout(() => copyBtn.classList.remove("copied"), 1500);
});

newAddrBtn.addEventListener("click", async () => {
  if (!confirm("Generate a new address? The current one will be lost.")) return;
  await chrome.storage.local.remove("account");
  account = null;
  createAccount();
});

deleteBtn.addEventListener("click", () => {
  if (confirm("Delete this inbox and start fresh?")) deleteAccount();
});

refreshBtn.addEventListener("click", fetchMessages);

backBtn.addEventListener("click", () => {
  detailPanel.style.display = "none";
  mainView.style.display = "block";
  renderInbox();
});

// Listen for new-message notification from background
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "NEW_MESSAGE") {
    messages = msg.messages;
    renderInbox();
  }
});

// ── Init ──────────────────────────────────
loadAccount();

