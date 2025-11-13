import { formatBadge } from "../common/format.js";
import {
  fetchCashBalance,
  fetchPositions,
  fetchPositionsValue,
} from "./polymarket-api.js";

const POLL_MINUTES = 5;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PORTFOLIO_PATH = "portfolio.html";
const BADGE_COLOR = "#4873ffff";

chrome.runtime.onInstalled.addListener(() => {
  // Side panel for development, popup for production
  if (IS_DEVELOPMENT) {
    chrome.sidePanel.setOptions({ path: PORTFOLIO_PATH });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    chrome.action.setPopup({ popup: PORTFOLIO_PATH });
  }

  // Set badge background color
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });

  // Schedule polling alarm
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  });

  // Initial data refresh
  refreshNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === "poll") refreshNow();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") {
    refreshNow().then(sendResponse);
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (!Object.prototype.hasOwnProperty.call(changes, "address")) return;
  refreshNow();
});

async function refreshNow() {
  const { address } = await chrome.storage.sync.get(["address"]);
  if (!address || !ADDRESS_REGEX.test(address)) {
    const errorMessage = "No valid 0x address set.";
    await Promise.all([
      chrome.storage.sync.set({
        totalValue: null,
        positionsValue: null,
        cashBalance: null,
        lastUpdated: Date.now(),
        lastError: errorMessage,
      }),
      chrome.storage.session.set({
        positions: [],
        positionsUpdatedAt: null,
        positionsError: message,
      }),
    ]);
    updateBadge("—", message);
    return { ok: false, error: errorMessage };
  }

  try {
    const results = await Promise.allSettled([
      fetchPositionsValue(address),
      fetchCashBalance(address),
      fetchPositions(address),
    ]);

    const [positionsValue, cashBalance, positions] = results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            error: result.reason?.message || String(result.reason) || null,
          },
    );

    if (positionsValue.error && cashBalance.error) {
      throw new Error([positionsValue.error, cashBalance.error].join(" & "));
    }

    await Promise.all([
      chrome.storage.sync.set({
        positionsValue,
        cashBalance,
        lastUpdated: Date.now(),
        lastError: positionsValue.error || cashBalance.error || null,
      }),
      chrome.storage.session.set({
        positions,
        positionsUpdatedAt: Date.now(),
        positionsError: positions.error || null,
      }),
    ]);

    const totalValue = Number(positionsValue) + Number(cashBalance);
    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${Number(totalValue).toLocaleString()}`,
    );

    return { ok: true, totalValue, positionsValue, cashBalance };
  } catch (error) {
    const errorMessage = String(error);
    await Promise.all([
      chrome.storage.sync.set({
        lastError: errorMessage,
        lastUpdated: Date.now(),
      }),
      chrome.storage.session.set({ positionsError: errorMessage }),
    ]);
    updateBadge("!", `Error fetching value: ${e}`);
    return { ok: false, error: errorMessage };
  }
}

// 배지 업데이트 함수 (분리)
function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}
