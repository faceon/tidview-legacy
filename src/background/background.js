import { formatBadge } from "../common/format.js";
import {
  fetchCashValue,
  fetchPositions,
  fetchPositionsValue,
} from "./polymarket-api.js";
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

async function refreshNow() {
  const { address: rawAddress } = await chrome.storage.sync.get(["address"]);
  const address = normalizeAddress(rawAddress);
  if (!cfg.ADDRESS_REGEX.test(address)) {
    const errorMessage =
      "No valid 0x address set. Please provide one in settings.";
    await surfaceAddressError(errorMessage);
    return { success: false, error: errorMessage };
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
      throw new Error([positionsValue.error, cashValue.error].join(" ; "));
    }

    // TODO: validate values and positions format
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

    return { success: true };
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
    updateBadge("-", `Error fetching data: ${errorMessage}`);

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

async function surfaceAddressError(errorMessage) {
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
  updateBadge("-", `Error: ${errorMessage}`);
}
