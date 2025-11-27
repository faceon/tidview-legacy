import { formatBadge, parseNumber } from "../common/format.js";
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

function sanitizePosition(rawPosition) {
  if (!rawPosition) return null;
  const position = { ...rawPosition };
  for (const key of cfg.NUMERIC_POSITION_FIELDS) {
    position[key] = parseNumber(position[key]);
  }
  return position;
}

async function updateStorageAndBadge({
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
  };

  const sanitizedPositions = Array.isArray(positions)
    ? positions.map(sanitizePosition).filter(Boolean)
    : [];

  const positionsValue = sanitizedPositions.reduce(
    (sum, pos) => sum + (pos?.currentValue ?? 0),
    0,
  );

  if (!isError) {
    syncData.cashValue = parseNumber(cashValue);
    syncData.positionsValue = positionsValue;
    sessionData.positions = sanitizedPositions;
  }

  await Promise.all([
    chrome.storage.sync.set(syncData),
    chrome.storage.session.set(sessionData),
  ]);

  if (isError) {
    updateBadge("-", `Error: ${error}`);
    return;
  }

  // Use the stored, sanitized scalars for badge computation (fallback 0)
  const safePosValue = syncData.positionsValue ?? 0;
  const safeCashValue = syncData.cashValue ?? 0;
  const totalValue = safePosValue + safeCashValue;

  updateBadge(
    formatBadge(totalValue),
    `Portfolio Total: $${totalValue.toLocaleString()}`,
  );
}

async function fetchAndUpdateData() {
  const { wallet } = await chrome.storage.sync.get(["wallet"]);

  if (!cfg.WALLET_REGEX.test(wallet)) {
    const error = "No valid 0x wallet set. Please provide one in settings.";
    await updateStorageAndBadge({ error });
    return { success: false, error };
  }

  try {
    const results = await Promise.allSettled([
      fetchCashValue(wallet),
      fetchPositions(wallet),
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

    await updateStorageAndBadge({
      cashValue,
      positions,
    });

    return { success: true };
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
