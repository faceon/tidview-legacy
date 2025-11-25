import { useCallback, useEffect, useRef, useState } from "react";
import { formatAddress } from "../../common/format.js";
import cfg from "../../common/config.js";

const menuBaseClasses =
  "absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg z-10";

export default function SettingsButton({ address, openInPopup, onModeChange }) {
  const hasAddress = cfg.ADDRESS_REGEX.test(address);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const copyTimeoutRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const lastActiveTabIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClick = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  const closeSidePanelIfNeeded = useCallback(async () => {
    if (!chrome?.sidePanel) {
      return;
    }

    let tabIdCandidate = lastActiveTabIdRef.current;
    if (typeof tabIdCandidate !== "number" && chrome?.tabs?.query) {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabIdCandidate = tabs?.[0]?.id;
      } catch (error) {
        console.error("Failed to query tabs for side panel close", error);
      }
    }

    if (typeof tabIdCandidate !== "number") {
      return;
    }

    try {
      await chrome.sidePanel.close({ tabId: tabIdCandidate });
    } catch (error) {
      console.error("Failed to close side panel", error);
    }
  }, []);

  const openPopupView = useCallback(async () => {
    await closeSidePanelIfNeeded();
    if (chrome?.action?.openPopup) {
      try {
        await chrome.action.openPopup();
      } catch (error) {
        console.error("Failed to open popup", error);
      }
    }
  }, [closeSidePanelIfNeeded]);

  const openSidePanelView = useCallback(async () => {
    if (!chrome?.sidePanel || !chrome?.tabs?.query) {
      return;
    }

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tabs?.[0]?.id;
      if (typeof tabId === "number") {
        lastActiveTabIdRef.current = tabId;
        await chrome.sidePanel.open({ tabId });
      } else {
        await chrome.sidePanel.open({});
      }
    } catch (error) {
      console.error("Failed to open side panel", error);
    }

    if (typeof window !== "undefined" && typeof window.close === "function") {
      window.close();
    }
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (!hasAddress || !navigator?.clipboard) return;
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true);
        if (copyTimeoutRef.current) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((error) => {
        console.error("Failed to copy address", error);
      });
  }, [address, hasAddress]);

  const handleToggleOpenMode = useCallback(async () => {
    if (!chrome?.storage?.sync) {
      return;
    }

    const nextValue = !openInPopup;
    onModeChange?.(nextValue);

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
    } catch (error) {
      console.error("Failed to toggle open mode", error);
      onModeChange?.(!nextValue);
    } finally {
      setMenuOpen(false);
    }
  }, [openInPopup, onModeChange, openPopupView, openSidePanelView]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
        ref={buttonRef}
      >
        <span className="material-symbols-outlined text-base">settings</span>
      </button>

      {menuOpen ? (
        <div className={menuBaseClasses} ref={menuRef} role="menu">
          <button
            type="button"
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${hasAddress ? "" : "hidden"}`}
            onClick={handleCopyAddress}
            title={address}
            role="menuitem"
          >
            {copied ? "copied" : formatAddress(address)}
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100"
            onClick={handleToggleOpenMode}
            role="menuitem"
          >
            {openInPopup ? "open in sidepanel" : "open in popup"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
