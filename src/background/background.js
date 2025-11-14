import { formatBadge } from "../common/format.js";
import {
  fetchCashValue,
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
    throw new Error("No valid 0x address set.");
  }

  try {
    const results = await Promise.allSettled([
      fetchPositionsValue(address),
      fetchCashValue(address),
      fetchPositions(address),
    ]);

    const [positionsValue, cashValue, positions] = results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            error: result.reason?.message || String(result.reason) || null,
          },
    );

    if (positionsValue.error && cashValue.error) {
      throw new Error([positionsValue.error, cashValue.error].join(" & "));
    }

    await Promise.all([
      chrome.storage.sync.set({
        positionsValue,
        cashValue,
        valuesUpdatedAt: Date.now(),
        valuesError: positionsValue.error || cashValue.error || null,
      }),
      chrome.storage.session.set({
        positions,
        positionsUpdatedAt: Date.now(),
        positionsError: positions.error || null,
      }),
    ]);

    const totalValue = Number(positionsValue) + Number(cashValue);

    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${Number(totalValue).toLocaleString()}`,
    );

    return { ok: true, totalValue, positionsValue, cashValue };
  } catch (error) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    await Promise.all([
      chrome.storage.sync.set({
        valuesError: errorMessage,
        valuesUpdatedAt: Date.now(),
      }),
      chrome.storage.session.set({
        positionsError: errorMessage,
        positionsUpdatedAt: Date.now(),
      }),
    ]);
    updateBadge("-", `Error fetching total value: ${errorMessage}`);

    return { ok: false, error: errorMessage };
  }
}

function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}
