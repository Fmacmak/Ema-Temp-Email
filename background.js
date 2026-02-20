const API = "https://api.mail.tm";
let pollingToken   = null;
let pollingAddress = null;
let lastMsgIds     = new Set();

// ── Polling alarm (every 30s) ─────────────
chrome.alarms.create("poll", { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name === "poll") poll();
});

async function poll() {
  if (!pollingToken) {
    // Try to restore from storage
    const { account } = await chrome.storage.local.get("account");
    if (!account) return;
    pollingToken   = account.token;
    pollingAddress = account.address;
  }

  try {
    const res = await fetch(`${API}/messages`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pollingToken}`
      }
    });
    if (!res.ok) return;
    const { "hydra:member": msgs } = await res.json();

    // Detect genuinely new messages
    const newMsgs = msgs.filter(m => !lastMsgIds.has(m.id));
    newMsgs.forEach(m => lastMsgIds.add(m.id));

    if (newMsgs.length > 0) {
      // Desktop notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/48.png",
        title: `TempMail — ${newMsgs.length} new message${newMsgs.length > 1 ? "s" : ""}`,
        message: newMsgs.map(m => `From: ${m.from?.address}  •  ${m.subject || "(no subject)"}`).join("\n")
      });

      // Forward to popup if open
      chrome.runtime.sendMessage({ type: "NEW_MESSAGE", messages: msgs }).catch(() => {});
    }
  } catch (_) {}
}

// ── Message handler ───────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_POLLING") {
    pollingToken   = msg.token;
    pollingAddress = msg.address;
    lastMsgIds     = new Set();
    poll();
  }
  if (msg.type === "STOP_POLLING") {
    pollingToken   = null;
    pollingAddress = null;
    lastMsgIds     = new Set();
  }
});