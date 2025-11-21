/// <reference types="chrome" />

import { formatBadge } from "../../../src/lib/format";
import {
  fetchCashValue,
  fetchPositions,
  fetchPositionsValue,
} from "../../../src/lib/polymarket";
import {
  ADDRESS_REGEX,
  BADGE_COLOR,
  DEFAULT_OPEN_IN_POPUP,
  POLL_MINUTES,
  PORTFOLIO_PATH,
} from "../../../src/lib/config";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ openInPopup: DEFAULT_OPEN_IN_POPUP });
  void applyOpenMode(DEFAULT_OPEN_IN_POPUP);

  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  });
  void refreshNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === "poll") void refreshNow();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "refresh") {
    refreshNow()
      .then((result) => sendResponse(result))
      .catch((error: unknown) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
  }

  if (msg?.type === "setOpenMode") {
    applyOpenMode(Boolean(msg.openInPopup))
      .then(() => sendResponse({ success: true }))
      .catch((error: unknown) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
  }

  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (Object.prototype.hasOwnProperty.call(changes, "address")) {
    void refreshNow();
  }
  if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
    void applyOpenMode(Boolean(changes.openInPopup.newValue));
  }
});

async function applyOpenMode(openInPopup: boolean) {
  const isPopup = Boolean(openInPopup);
  try {
    if (isPopup) {
      await chrome.action.setPopup({ popup: PORTFOLIO_PATH });
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
    } else {
      await chrome.action.setPopup({ popup: "" });
      await chrome.sidePanel.setOptions({ path: PORTFOLIO_PATH });
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    console.error("Failed to apply open mode", error);
  }
}

async function refreshNow() {
  const { address } = await chrome.storage.sync.get(["address"]);
  if (!address || !ADDRESS_REGEX.test(address)) {
    return { success: false, error: "No valid 0x address set." } as const;
  }

  try {
    const [positionsValue, cashValue, positions] = await Promise.all([
      fetchPositionsValue(address),
      fetchCashValue(address),
      fetchPositions(address),
    ]);

    await Promise.all([
      chrome.storage.sync.set({
        positionsValue,
        cashValue,
        valuesUpdatedAt: Date.now(),
        valuesError: null,
      }),
      chrome.storage.session.set({
        positions,
        positionsUpdatedAt: Date.now(),
        positionsError: null,
      }),
    ]);

    const totalValue = Number(positionsValue) + Number(cashValue);
    await updateBadge(
      formatBadge(totalValue),
      `Portfolio Total: $${Number(totalValue).toLocaleString()}`,
    );

    return { success: true } as const;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
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
    await updateBadge("-", `Error fetching data: ${errorMessage}`);
    return { success: false, error: errorMessage } as const;
  }
}

async function updateBadge(text: string, title: string) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title });
}
