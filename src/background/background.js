import { formatBadge } from "../common/format.js";
import {
  fetchCashBalance,
  fetchPositions,
  fetchPositionsValue,
} from "./polymarket-api.js";

const POLL_MINUTES = 5;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SESSION_KEYS = ["positions", "positionsUpdatedAt", "positionsError"];

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
    Promise.all([
      chrome.storage.sync.get([
        "address",
        "totalValue",
        "lastUpdated",
        "lastError",
        "positionsValue",
        "cashBalance",
      ]),
      chrome.storage.session.get(SESSION_KEYS),
    ])
      .then(([syncData, sessionData]) => ({ ...syncData, ...sessionData }))
      .then(sendResponse);
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (!Object.prototype.hasOwnProperty.call(changes, "address")) return;
  refreshNow();
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
  if (!address || !ADDRESS_REGEX.test(address)) {
    const message = "No valid 0x address set.";
    await Promise.all([
      chrome.storage.sync.set({
        totalValue: null,
        positionsValue: null,
        cashBalance: null,
        lastUpdated: Date.now(),
        lastError: message,
      }),
      chrome.storage.session.set({
        positions: [],
        positionsUpdatedAt: null,
        positionsError: message,
      }),
    ]);
    updateBadge("—", message);
    return { ok: false, error: message };
  }

  try {
    const results = await Promise.allSettled([
      fetchPositionsValue(address),
      fetchCashBalance(address),
      fetchPositions(address),
    ]);

    const [positionsValueResult, cashBalanceResult, positionsResult] = results;

    const positionsValue =
      positionsValueResult.status === "fulfilled"
        ? positionsValueResult.value
        : null;
    const cashBalance =
      cashBalanceResult.status === "fulfilled" ? cashBalanceResult.value : null;
    const positionsData =
      positionsResult.status === "fulfilled" ? positionsResult.value : null;

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

    const sessionUpdate = {};
    if (Array.isArray(positionsData)) {
      sessionUpdate.positions = positionsData;
      sessionUpdate.positionsUpdatedAt = Date.now();
      sessionUpdate.positionsError = null;
    } else if (positionsResult.status === "rejected") {
      sessionUpdate.positionsError =
        positionsResult.reason?.message || String(positionsResult.reason);
    }

    await Promise.all([
      chrome.storage.sync.set({
        totalValue,
        positionsValue,
        cashBalance,
        lastUpdated: Date.now(),
        lastError: errorMessage,
      }),
      Object.keys(sessionUpdate).length
        ? chrome.storage.session.set(sessionUpdate)
        : Promise.resolve(),
    ]);

    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${Number(totalValue).toLocaleString()}`,
    );

    return {
      ok: true,
      totalValue,
      positionsValue,
      cashBalance,
      error: errorMessage,
    };
  } catch (e) {
    const message = String(e);
    await Promise.all([
      chrome.storage.sync.set({
        lastError: message,
        lastUpdated: Date.now(),
      }),
      chrome.storage.session.set({ positionsError: message }),
    ]);
    updateBadge("!", `Error fetching value: ${e}`);
    return { ok: false, error: message };
  }
}

// 배지 업데이트 함수 (분리)
function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}
