import { formatBadge, parseNumber } from "../common/format.js";
import { POSITION } from "../common/schema.js";
import { fetchCashValue, fetchPositions } from "../api/portfolio-data.js";
import cfg from "../common/config.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ openInPopup: cfg.DEFAULT_OPEN_IN_POPUP });
  applyOpenMode(cfg.DEFAULT_OPEN_IN_POPUP);

  chrome.action.setBadgeBackgroundColor({ color: cfg.BADGE_COLOR });
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: cfg.POLL_MINUTES });
  });
  fetchAndUpdateData();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === "poll") fetchAndUpdateData();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") fetchAndUpdateData().then(sendResponse);
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
  if ("wallet" in changes) fetchAndUpdateData();
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

async function updateStorageAndBadge({
  cashValue = null,
  positions = null,
  error = null,
} = {}) {
  const timestamp = Date.now();
  const syncData = {
    updatedAt: timestamp,
    lastError: error,
  };
  const sessionData = {};

  const sanitizePosition = (raw) => {
    if (!raw) return null;
    const position = {};

    for (const [key, fieldDef] of Object.entries(POSITION)) {
      const value = raw[key];
      const type = fieldDef.type;

      if (type === "number") {
        position[key] = parseNumber(value);
      } else if (type === "boolean") {
        position[key] = Boolean(value);
      } else {
        // string or default
        position[key] = value != null ? String(value) : "";
      }
    }
    return position;
  };

  if (positions !== null) {
    const sanitizedPositions = Array.isArray(positions)
      ? positions.map(sanitizePosition).filter(Boolean)
      : [];
    const positionsValue = sanitizedPositions.reduce(
      (sum, pos) => sum + (pos?.currentValue ?? 0),
      0,
    );

    syncData.positionsValue = positionsValue;
    sessionData.positions = sanitizedPositions;
  }

  if (cashValue !== null) {
    syncData.cashValue = parseNumber(cashValue);
  }

  await Promise.all([
    chrome.storage.sync.set(syncData),
    chrome.storage.session.set(sessionData),
  ]);

  const totalValue = (syncData.positionsValue ?? 0) + (syncData.cashValue ?? 0);

  if (error) {
    const isTotalFailure = positions === null && cashValue === null;
    updateBadge(
      isTotalFailure ? "-" : formatBadge(totalValue),
      `Error: ${error}`,
    );
  } else {
    updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${totalValue.toLocaleString()}`,
    );
  }
}

async function fetchAndUpdateData() {
  const { wallet } = await chrome.storage.sync.get(["wallet"]);

  if (!cfg.WALLET_REGEX.test(wallet)) {
    const error = "No valid 0x wallet set. Please provide one in settings.";
    await updateStorageAndBadge({ error });
    return { success: false, error };
  }

  try {
    const [cashResult, positionsResult] = await Promise.allSettled([
      fetchCashValue(wallet),
      fetchPositions(wallet),
    ]);

    const getResult = (result, label) => {
      if (result.status === "rejected") {
        return {
          error: `${label}: ${result.reason?.message || result.reason}`,
        };
      }
      if (result.value?.error) {
        return { error: `${label}: ${result.value.error}` };
      }
      return { value: result.value };
    };

    const cash = getResult(cashResult, "Cash Value");
    const pos = getResult(positionsResult, "Positions");

    const errors = [cash.error, pos.error].filter(Boolean);
    const error = errors.length > 0 ? errors.join("; ") : null;

    await updateStorageAndBadge({
      cashValue: cash.value,
      positions: pos.value,
      error,
    });

    return { success: !error, error };
  } catch (error) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    console.error("Refresh failed:", error);

    await updateStorageAndBadge({ error: errorMessage });

    return { success: false, error: errorMessage };
  }
}

function updateBadge(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });
}
