import { formatBadge, parseNumber } from "../common/format.js";
import { fetchCashValue, fetchPositions } from "./polymarket-api.js";
import cfg from "../common/config.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ openInPopup: cfg.DEFAULT_OPEN_IN_POPUP });
  applyOpenMode(cfg.DEFAULT_OPEN_IN_POPUP);

  chrome.action.setBadgeBackgroundColor({ color: cfg.BADGE_COLOR });
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: cfg.POLL_MINUTES });
  });
  refreshNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === "poll") refreshNow();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") refreshNow().then(sendResponse);
  if (msg?.type === "setOpenMode") {
    applyOpenMode(msg.openInPopup)
      .then(() => sendResponse({ success: true }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error?.message || String(error),
        }),
      );
  }
  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if ("address" in changes) refreshNow();
  if ("openInPopup" in changes) applyOpenMode(changes.openInPopup.newValue);
});

async function applyOpenMode(openInPopup) {
  const isOpenInPopup = Boolean(openInPopup);
  try {
    if (isOpenInPopup) {
      await chrome.action.setPopup({ popup: cfg.PORTFOLIO_PATH });
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
    } else {
      await chrome.action.setPopup({ popup: "" });
      await chrome.sidePanel.setOptions({ path: cfg.PORTFOLIO_PATH });
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    console.error("Failed to apply open mode", error);
  }
}

async function updatePortfolioState({
  positionsValue = null,
  cashValue = null,
  positions = null,
  error = null,
} = {}) {
  const timestamp = Date.now();
  const isError = Boolean(error);

  const syncData = {
    valuesUpdatedAt: timestamp,
    valuesError: error,
  };

  const sessionData = {
    positionsUpdatedAt: timestamp,
    positionsError: error,
  };

  if (!isError) {
    syncData.positionsValue = positionsValue;
    syncData.cashValue = cashValue;
    sessionData.positions = positions;
  }

  await Promise.all([
    chrome.storage.sync.set(syncData),
    chrome.storage.session.set(sessionData),
  ]);

  if (isError) {
    updateBadge("-", `Error: ${error}`);
  } else {
    const safePosValue = Number(positionsValue) || 0;
    const safeCashValue = Number(cashValue) || 0;
    const totalValue = safePosValue + safeCashValue;

    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${totalValue.toLocaleString()}`,
    );
  }
}

async function refreshNow() {
  const { address: rawAddress } = await chrome.storage.sync.get(["address"]);
  const address = normalizeAddress(rawAddress);

  if (!cfg.ADDRESS_REGEX.test(address)) {
    const error = "No valid 0x address set. Please provide one in settings.";
    await updatePortfolioState({ error });
    return { success: false, error };
  }

  try {
    const results = await Promise.allSettled([
      fetchCashValue(address),
      fetchPositions(address),
    ]);

    const unwrap = (result, name) => {
      if (result.status === "rejected") {
        throw new Error(result.reason?.message || String(result.reason));
      }
      if (result.value && result.value.error) {
        throw new Error(`${name}: ${result.value.error}`);
      }
      return result.value;
    };

    const cashValue = unwrap(results[0], "Cash Value");
    const positions = unwrap(results[1], "Positions");

    const positionsValue = positions.reduce((sum, pos) => {
      const val = parseNumber(pos?.currentValue);
      return val != null ? sum + val : sum;
    }, 0);

    await updatePortfolioState({
      positionsValue,
      cashValue,
      positions,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    console.error("Refresh failed:", error);

    await updatePortfolioState({ error: errorMessage });

    return { success: false, error: errorMessage };
  }
}

function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}

function normalizeAddress(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}
