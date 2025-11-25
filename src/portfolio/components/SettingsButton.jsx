import React, { useRef, useState } from "react";
import { formatAddress } from "../../common/format.js";
import cfg from "../../common/config.js";

import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/iconButton/icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/filled-tonal-button.js"; // imported for parity with previous code (not directly used here)
import "@material/web/menu/menu.js";
import "@material/web/menu/menu-item.js";

export default function SettingsButton({
  address = "",
  openInPopup = true,
  setOpenInPopup = () => {},
}) {
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const hasAddress = cfg.ADDRESS_REGEX.test(String(address || ""));

  async function handleCopyAddress() {
    if (!hasAddress) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  }

  function toggleMenu() {
    const menuEl = menuRef.current;
    if (!menuEl) return;
    menuEl.open = !menuEl.open;
  }

  async function handleToggleOpenMode(e) {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    if (!chrome?.storage?.sync) return;

    const nextValue = !openInPopup;
    setOpenInPopup(nextValue);

    try {
      await chrome.storage.sync.set({ openInPopup: nextValue });
      await chrome.runtime.sendMessage({
        type: "setOpenMode",
        openInPopup: nextValue,
      });
      if (nextValue) {
        await openPopupView();
      } else {
        await openSidePanelView();
      }
    } catch (err) {
      console.error("Failed to toggle open mode", err);
    }
  }

  async function openPopupView() {
    if (chrome?.action?.openPopup) {
      try {
        await chrome.action.openPopup();
      } catch (err) {
        console.error("Failed to open popup", err);
      }
    }
  }

  async function openSidePanelView() {
    if (!chrome?.sidePanel || !chrome?.tabs?.query) return;
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tabs?.[0]?.id;
      if (typeof tabId === "number") {
        await chrome.sidePanel.open({ tabId });
      } else {
        await chrome.sidePanel.open({});
      }
    } catch (err) {
      console.error("Failed to open side panel", err);
    }
  }

  return (
    <div>
      <md-icon-button
        className="relative"
        id="settings-anchor"
        onClick={toggleMenu}
      >
        <md-icon>settings</md-icon>
      </md-icon-button>

      <md-menu id="settings-menu" anchor="settings-anchor" ref={menuRef}>
        <md-menu-item>
          <md-text-button
            className={`${hasAddress ? "" : "hidden"} text-sm`}
            title={address}
            onClick={handleCopyAddress}
          >
            {copied ? "copied" : formatAddress(address)}
          </md-text-button>
        </md-menu-item>

        <md-menu-item>
          <md-text-button className="text-sm" onClick={handleToggleOpenMode}>
            {openInPopup ? "open in sidepanel" : "open in popup"}
          </md-text-button>
        </md-menu-item>
      </md-menu>
    </div>
  );
}
