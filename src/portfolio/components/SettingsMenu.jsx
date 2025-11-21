import { useCallback, useEffect, useRef, useState } from "react";
import cfg from "../../common/config.js";
import { formatAddress } from "../../common/format.js";

const isValidAddress = (value) => cfg.ADDRESS_REGEX.test(value?.trim?.() ?? "");

function SettingsMenu({ address, openInPopup, onToggleOpenMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const hasAddress = isValidAddress(address);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!hasAddress || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address.trim());
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address", error);
    }
  }, [address, hasAddress]);

  const handleToggle = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleSwitchMode = useCallback(() => {
    setMenuOpen(false);
    onToggleOpenMode?.();
  }, [onToggleOpenMode]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={handleToggle}
      >
        <span className="sr-only">Open settings</span>
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .68.39 1.3 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .68.39 1.3 1 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl">
          {hasAddress && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-600 transition hover:bg-slate-50"
              title={address}
              onClick={handleCopy}
            >
              <span className="truncate">{formatAddress(address)}</span>
              <span className="text-xs text-slate-400">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
          )}

          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-600 transition hover:bg-slate-50"
            onClick={handleSwitchMode}
          >
            <span>{openInPopup ? "Open in side panel" : "Open in popup"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
