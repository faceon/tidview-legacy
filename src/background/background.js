const API_BASE = "https://data-api.polymarket.com";

// Poll every N minutes
const POLL_MINUTES = 5;

// Set a neutral badge style on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#2d2d2d" });
  scheduleAlarm();
  // Try first refresh
  refreshNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === "poll") {
    refreshNow();
  }
});

function scheduleAlarm() {
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  });
}

// Listen to refresh requests from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") {
    refreshNow().then(sendResponse);
    return true; // async response
  }
  if (msg?.type === "getStatus") {
    chrome.storage.sync.get(["address","lastValue","lastUpdated","lastError"], (data) => {
      sendResponse(data);
    });
    return true;
  }
});

async function refreshNow() {
  const { address } = await chrome.storage.sync.get(["address"]);
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    chrome.action.setBadgeText({ text: "—" });
    return { ok: false, error: "No valid 0x address set." };
  }
  try {
    const url = `${API_BASE}/value?user=${encodeURIComponent(address)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const value = parseValue(json);
    // Persist and badge
    await chrome.storage.sync.set({ lastValue: value, lastUpdated: Date.now(), lastError: null });
    chrome.action.setBadgeText({ text: formatBadge(value) });
    chrome.action.setTitle({ title: `Polymarket Value: $${Number(value).toLocaleString()}` });
    return { ok: true, value };
  } catch (e) {
    await chrome.storage.sync.set({ lastError: String(e), lastUpdated: Date.now() });
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setTitle({ title: `Error fetching value: ${e}` });
    return { ok: false, error: String(e) };
  }
}

function parseValue(json) {
  // Expected: [{ user: "0x...", value: 123.45 }]
  if (Array.isArray(json) && json.length && typeof json[0].value !== "undefined") {
    return Number(json[0].value);
  }
  // Some implementations may return an object
  if (json && typeof json.value !== "undefined") return Number(json.value);
  throw new Error("Unexpected response format");
}

function formatBadge(v) {
  if (v == null || isNaN(v)) return "—";
  const rounded = Math.round(v);
  if (rounded < 1000) return String(rounded);
  if (rounded < 10000) return (rounded/1000).toFixed(1).replace(/\.0$/,"") + "k";
  if (rounded < 1000000) return Math.round(rounded/1000) + "k";
  return Math.round(rounded/1000000) + "M";
}