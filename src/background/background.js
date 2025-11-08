const API_BASE = "https://data-api.polymarket.com";
const POLL_MINUTES = 5;

// Extension 설치 시 초기 설정: 배지 색, 알람 스케줄, 첫 리프레시
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#2d2d2d" });
  scheduleAlarm();
  refreshNow();
});

// 알람 이벤트: 폴링 시 리프레시
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === "poll") refreshNow();
});

// 메시지 리스너: 팝업에서 리프레시 요청 처리
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") {
    refreshNow().then(sendResponse);
    return true; // 비동기 응답
  }
  if (msg?.type === "getStatus") {
    chrome.storage.sync.get(
      ["address", "lastValue", "lastUpdated", "lastError"],
      sendResponse,
    );
    return true;
  }
});

// 알람 스케줄링 함수
function scheduleAlarm() {
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  });
}

// 데이터 리프레시 함수 (메인 로직)
async function refreshNow() {
  const { address } = await chrome.storage.sync.get(["address"]);
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    updateBadge("—", "No valid 0x address set.");
    return { ok: false, error: "No valid 0x address set." };
  }

  try {
    const value = await fetchValue(address);
    await chrome.storage.sync.set({
      lastValue: value,
      lastUpdated: Date.now(),
      lastError: null,
    });
    updateBadge(
      formatBadge(value),
      `Polymarket Value: $${Number(value).toLocaleString()}`,
    );
    return { ok: true, value };
  } catch (e) {
    await chrome.storage.sync.set({
      lastError: String(e),
      lastUpdated: Date.now(),
    });
    updateBadge("!", `Error fetching value: ${e}`);
    return { ok: false, error: String(e) };
  }
}

// API 호출 함수 (분리)
async function fetchValue(address) {
  const url = `${API_BASE}/value?user=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const value =
    Array.isArray(json) && json[0]?.value
      ? Number(json[0].value)
      : Number(json?.value);
  if (isNaN(value)) throw new Error("Unexpected response format");
  return value;
}

// 배지 업데이트 함수 (분리)
function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}

// 배지 텍스트 포맷팅 함수
function formatBadge(v) {
  if (v == null || isNaN(v)) return "—";
  const rounded = Math.round(v);
  if (rounded < 1000) return String(rounded);
  if (rounded < 10000)
    return (rounded / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (rounded < 1000000) return Math.round(rounded / 1000) + "k";
  return Math.round(rounded / 1000000) + "M";
}
