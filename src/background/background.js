import { formatBadge } from "../common/format.js";

const API_BASE = "https://data-api.polymarket.com";
const POLYGON_RPC_URL = "https://polygon-rpc.com/";
const USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const USDC_DECIMALS = 6;
const POLL_MINUTES = 5;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// Extension 설치 시 초기 설정: 배지 색, 알람 스케줄, 첫 리프레시
chrome.runtime.onInstalled.addListener(() => {
  // 개발 모드에서는 사이드패널, 배포 모드에서는 팝업 사용
  if (IS_DEVELOPMENT) {
    chrome.sidePanel.setOptions({ path: "portfolio.html" });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    chrome.action.setPopup({ popup: "portfolio.html" });
  }
  chrome.action.setBadgeBackgroundColor({ color: "#4873ffff" });
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
      [
        "address",
        "lastValue",
        "lastUpdated",
        "lastError",
        "positionsValue",
        "cashBalance",
      ],
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
    const results = await Promise.allSettled([
      fetchPositionsValue(address),
      fetchCashBalance(address),
    ]);

    const [positionsValue, cashBalance] = results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );

    if (positionsValue == null && cashBalance == null) {
      const reasons =
        results
          .filter((result) => result.status === "rejected")
          .map((result) => String(result.reason?.message || result.reason))
          .join("; ") || "Unknown error";
      throw new Error(reasons);
    }

    const totalValue = (positionsValue || 0) + (cashBalance || 0);

    const partialErrors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message || String(result.reason));

    const errorMessage = partialErrors.length ? partialErrors.join("; ") : null;

    await chrome.storage.sync.set({
      lastValue: totalValue,
      positionsValue,
      cashBalance,
      lastUpdated: Date.now(),
      lastError: errorMessage,
    });

    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${Number(totalValue).toLocaleString()}`,
    );

    return {
      ok: true,
      value: totalValue,
      positionsValue,
      cashBalance,
      error: errorMessage,
    };
  } catch (e) {
    await chrome.storage.sync.set({
      lastError: String(e),
      lastUpdated: Date.now(),
    });
    updateBadge("!", `Error fetching value: ${e}`);
    return { ok: false, error: String(e) };
  }
}

// Positions API 호출 함수: 포지션 총합 계산
async function fetchPositionsValue(address) {
  const url = `${API_BASE}/positions?user=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Positions HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error("Unexpected positions response format");
  }

  return json.reduce((sum, entry) => {
    const parsed = toNumber(entry?.currentValue);
    return parsed != null ? sum + parsed : sum;
  }, 0);
}

// Polygon RPC 호출 함수: USDC 잔액 조회
async function fetchCashBalance(address) {
  const normalizedAddress = address.trim().toLowerCase().replace(/^0x/, "");
  const data = ERC20_BALANCE_OF_SELECTOR + normalizedAddress.padStart(64, "0");

  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: USDC_CONTRACT,
          data,
        },
        "latest",
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Polygon RPC HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json?.error) {
    throw new Error(json.error?.message || "Polygon RPC error");
  }

  const hexValue = json?.result;
  if (typeof hexValue !== "string") {
    throw new Error("Invalid Polygon RPC response");
  }

  let balance;
  try {
    const raw = BigInt(hexValue);
    balance = Number(raw) / 10 ** USDC_DECIMALS;
  } catch (error) {
    throw new Error("Failed to parse USDC balance");
  }

  if (!Number.isFinite(balance)) {
    throw new Error("USDC balance is not a finite number");
  }

  return balance;
}

// 배지 업데이트 함수 (분리)
function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}

// 숫자 파서 (안전한 변환)
function toNumber(value) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
