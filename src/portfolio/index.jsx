import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
// tailwind.css is produced by build:css and reused by the shared helper
import { adoptTailwind } from "./tailwind-shared.js";
import { parseNumber, formatCurrency } from "../common/format.js";
import cfg from "../common/config.js";
import PositionsList from "./components/PositionsList.jsx";
import SettingsButton from "./components/SettingsButton.jsx";

// Import Material Web elements used by the UI (they register custom elements)
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/iconButton/icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/menu/menu.js";
import "@material/web/menu/menu-item.js";

function useRefreshTicker(valuesUpdatedAt) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (valuesUpdatedAt == null) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [valuesUpdatedAt]);
}

function normalizePosition(raw) {
  const id =
    raw?.asset ||
    (raw?.slug && raw?.outcome
      ? `${raw.slug}-${raw.outcome}`
      : raw?.conditionId ||
        raw?.title ||
        `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return {
    id,
    title: raw?.title || raw?.slug || "Unnamed market",
    outcome: raw?.outcome || "",
    currentValue: parseNumber(raw?.currentValue),
    cashPnl: parseNumber(raw?.cashPnl),
    percentPnl: parseNumber(raw?.percentPnl),
    size: parseNumber(raw?.size),
    avgPrice: parseNumber(raw?.avgPrice),
    curPrice: parseNumber(raw?.curPrice),
    endDate: raw?.endDate || "",
    icon: raw?.icon || "",
    initialValue: parseNumber(raw?.initialValue),
    realizedPnl: parseNumber(raw?.realizedPnl),
    slug: raw?.slug || "",
    eventSlug: raw?.eventSlug || "",
  };
}

function App() {
  // main state copied from original Lit component
  const [address, setAddress] = useState("");
  const hasAddress = useMemo(
    () => cfg.ADDRESS_REGEX.test(String(address || "")),
    [address],
  );

  const [valuesUpdatedAt, setValuesUpdatedAt] = useState(null);
  const [valuesError, setValuesError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsUpdatedAt, setPositionsUpdatedAt] = useState(null);
  const [positionsValue, setPositionsValue] = useState(null);
  const [positionsError, setPositionsError] = useState("");

  const [cashValue, setCashValue] = useState(null);
  const [openInPopup, setOpenInPopup] = useState(false);

  // tick while valuesUpdatedAt exists so computed labels update
  useRefreshTicker(valuesUpdatedAt);

  // adopt global tailwind styles (re-uses the existing helper)
  useEffect(() => {
    adoptTailwind(document);
  }, []);

  // storage listener
  useEffect(() => {
    function handleStorageChange(changes, areaName) {
      if (areaName === "sync") {
        let shouldUpdateStatus = false;

        if (Object.prototype.hasOwnProperty.call(changes, "address")) {
          const raw = changes.address.newValue;
          setAddress(typeof raw === "string" ? raw.trim() : "");
          // positions handling for stored address is done in init
        }

        if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
          setPositionsValue(parseNumber(changes.positionsValue.newValue));
        }

        if (Object.prototype.hasOwnProperty.call(changes, "cashValue")) {
          setCashValue(parseNumber(changes.cashValue.newValue));
        }

        if (Object.prototype.hasOwnProperty.call(changes, "valuesUpdatedAt")) {
          const raw = changes.valuesUpdatedAt.newValue;
          setValuesUpdatedAt(typeof raw === "number" ? raw : parseNumber(raw));
          shouldUpdateStatus = true;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "valuesError")) {
          const v = changes.valuesError.newValue;
          setValuesError(v ? String(v) : "");
          shouldUpdateStatus = true;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
          setOpenInPopup(Boolean(changes.openInPopup.newValue));
        }

        if (shouldUpdateStatus) {
          updateStatusFromState(valuesUpdatedAt, valuesError, setStatusMessage);
        }
        return;
      }

      if (areaName === "session") {
        const sessionUpdate = {};
        if (Object.prototype.hasOwnProperty.call(changes, "positions")) {
          sessionUpdate.positions = changes.positions.newValue;
        }
        if (
          Object.prototype.hasOwnProperty.call(changes, "positionsUpdatedAt")
        ) {
          sessionUpdate.positionsUpdatedAt =
            changes.positionsUpdatedAt.newValue;
        }
        if (Object.prototype.hasOwnProperty.call(changes, "positionsError")) {
          sessionUpdate.positionsError = changes.positionsError.newValue;
        }

        if (Object.keys(sessionUpdate).length) {
          applyPositionsState(sessionUpdate, { silent: false });
        }
      }
    }

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesUpdatedAt, valuesError]);

  async function initFromStorage() {
    try {
      if (!chrome?.storage?.sync || !chrome?.storage?.session) return;

      const [syncData, sessionData] = await Promise.all([
        chrome.storage.sync.get(),
        chrome.storage.session.get(),
      ]);

      const {
        address: storedAddress,
        valuesUpdatedAt: _valuesUpdatedAt,
        valuesError: _valuesError,
        positionsValue: _positionsValue,
        cashValue: _cashValue,
        openInPopup: _openInPopup,
      } = syncData;

      setAddress(typeof storedAddress === "string" ? storedAddress.trim() : "");
      setValuesUpdatedAt(
        typeof _valuesUpdatedAt === "number"
          ? _valuesUpdatedAt
          : parseNumber(_valuesUpdatedAt),
      );
      setValuesError(_valuesError ?? "");
      setPositionsValue(
        typeof _positionsValue === "number"
          ? _positionsValue
          : parseNumber(_positionsValue),
      );
      setCashValue(
        typeof _cashValue === "number" ? _cashValue : parseNumber(_cashValue),
      );
      setOpenInPopup(Boolean(_openInPopup));

      const hasPositionsData = Array.isArray(sessionData?.positions);
      setPositionsLoading(
        cfg.ADDRESS_REGEX.test(String(storedAddress || "")) &&
          !hasPositionsData,
      );

      applyPositionsState(
        {
          positions: sessionData?.positions,
          positionsUpdatedAt: sessionData?.positionsUpdatedAt,
          positionsError: sessionData?.positionsError,
        },
        { silent: true },
      );

      updateStatusFromState(_valuesUpdatedAt, _valuesError, setStatusMessage);
    } catch (err) {
      // console errors retained
      console.error("Failed to initialize from storage", err);
      setValuesError("Unable to load current status.");
      setStatusMessage("");
    }
  }

  useEffect(() => {
    initFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPositionsState(state, { silent = false } = {}) {
    let touched = false;

    if (Object.prototype.hasOwnProperty.call(state, "positions")) {
      const rawPositions = state.positions;
      if (typeof rawPositions === "undefined") {
        // still loading
      } else if (Array.isArray(rawPositions)) {
        const normalized = rawPositions.map((entry) =>
          normalizePosition(entry),
        );
        normalized.sort(
          (a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0),
        );
        setPositions(normalized);
        const computedValue = normalized.reduce((sum, pos) => {
          const v = parseNumber(pos?.currentValue);
          return v != null ? sum + v : sum;
        }, 0);
        setPositionsValue(computedValue);
        touched = true;
      } else {
        setPositions([]);
        setPositionsValue(null);
        touched = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(state, "positionsUpdatedAt")) {
      const rawUpdatedAt = state.positionsUpdatedAt;
      if (typeof rawUpdatedAt !== "undefined") {
        setPositionsUpdatedAt(
          typeof rawUpdatedAt === "number" && !Number.isNaN(rawUpdatedAt)
            ? rawUpdatedAt
            : null,
        );
        touched = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(state, "positionsError")) {
      const errorValue = state.positionsError;
      if (typeof errorValue !== "undefined") {
        setPositionsError(errorValue ? String(errorValue) : "");
        if (!silent && errorValue) setStatusMessage("");
        touched = true;
      }
    }

    if (touched) setPositionsLoading(false);
  }

  function updateStatusFromState(_valuesUpdatedAt, _valuesError, setStatus) {
    if (_valuesError) {
      setStatus("");
      return;
    }

    if (
      typeof _valuesUpdatedAt === "number" &&
      !Number.isNaN(_valuesUpdatedAt)
    ) {
      setStatus(`Last updated: ${new Date(_valuesUpdatedAt).toLocaleString()}`);
    } else {
      setStatus("");
    }
  }

  function getRefreshAgeLabel() {
    if (typeof valuesUpdatedAt !== "number") return "";
    const age = Math.max(Date.now() - valuesUpdatedAt, 0);
    if (age < 60 * 1000) {
      const seconds = Math.max(Math.floor(age / 1000), 0);
      return `${seconds}s`;
    }
    if (age < 60 * 60 * 1000) {
      const minutes = Math.floor(age / (60 * 1000));
      return `${minutes}m`;
    }
    const hours = Math.floor(age / (60 * 60 * 1000));
    return `${hours}h`;
  }

  async function handleSave() {
    const trimmed = String(address || "").trim();
    if (!cfg.ADDRESS_REGEX.test(trimmed)) {
      // keep the same behavior as before
      // (the UI shows an error via valuesError)
      // The previous Lit version set lastError and returned; we'll set valuesError
      setValuesError("Please enter a valid 0x address.");
      setStatusMessage("");
      return;
    }

    setIsBusy(true);
    setValuesError("");
    setStatusMessage("Saved. Refreshing...");
    setPositionsLoading(true);
    setPositionsError("");

    try {
      await chrome.storage.sync.set({ address: trimmed });
      setAddress(trimmed);
      const ok = await requestRefresh({ recordTimestamp: true });
      if (ok) setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
    } catch (err) {
      console.error("Failed to save address", err);
      setValuesError(err?.message || "Failed to save address.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRefresh() {
    const trimmed = String(address || "").trim();
    if (!cfg.ADDRESS_REGEX.test(trimmed)) {
      setValuesError("Please enter a valid 0x address.");
      setStatusMessage("");
      return;
    }

    setIsBusy(true);
    setValuesError("");
    setStatusMessage("Refreshing...");
    setPositionsLoading(true);
    setPositionsError("");

    try {
      setAddress(trimmed);
      const ok = await requestRefresh({ recordTimestamp: true });
      if (ok) setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
    } catch (err) {
      console.error("Failed to refresh balance", err);
      setValuesError(err?.message || "Failed to refresh balance.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }

  async function requestRefresh({ recordTimestamp = false } = {}) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "refresh" });
      if (!res?.success)
        throw new Error(res?.error || "Unknown error during refresh");
      return true;
    } catch (err) {
      const message = err?.message || "Failed to refresh balance.";
      console.error("Failed to refresh", message);
      setValuesError(message);
      if (!recordTimestamp && valuesUpdatedAt) {
        setStatusMessage(
          `Last updated: ${new Date(valuesUpdatedAt).toLocaleString()}`,
        );
      } else {
        setStatusMessage("");
      }
      return false;
    } finally {
      setPositionsLoading(false);
    }
  }

  function openMarket(slug, fallbackSlug) {
    const finalSlug = slug || fallbackSlug;
    if (!finalSlug) return;
    const url = `https://polymarket.com/market/${finalSlug}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  // small computed values for rendering
  const positionsValueNum = parseNumber(positionsValue);
  const cashValueNum = parseNumber(cashValue);
  const totalValue =
    positionsValueNum == null && cashValueNum == null
      ? null
      : (positionsValueNum ?? 0) + (cashValueNum ?? 0);

  const displayValues = {
    total: formatCurrency(totalValue),
    positions: formatCurrency(positionsValueNum),
    cash: formatCurrency(cashValueNum),
  };

  return (
    <div>
      <header className="w-full box-border min-w-[320px] overflow-x-hidden overflow-y-auto bg-white text-[#111] leading-[1.4] p-3">
        <nav className="flex items-center justify-between gap-3">
          <figure>
            <img src="icons/icon16.png" alt="Tidview Logo" />
          </figure>

          <h3>Tidview</h3>

          <md-icon-button onClick={() => location.reload()}>
            <md-icon>restore_page</md-icon>
          </md-icon-button>

          <md-filled-icon-button
            onClick={handleRefresh}
            disabled={isBusy || !hasAddress}
          >
            <md-icon>sync</md-icon>
          </md-filled-icon-button>

          <span className="w-12 text-right text-xs text-gray-500">
            {typeof valuesUpdatedAt === "number" ? getRefreshAgeLabel() : ""}
          </span>

          <SettingsButton
            address={address}
            openInPopup={openInPopup}
            setOpenInPopup={setOpenInPopup}
          />
        </nav>

        <div className={`${hasAddress ? "hidden" : "flex items-center gap-2"}`}>
          <label htmlFor="address">Your 0x address</label>
          <input
            className="border border-gray-200 rounded px-2 py-1 text-sm"
            id="address"
            type="text"
            placeholder="0x...40 hex chars"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
          />

          <button
            className="px-2 py-1 rounded bg-slate-200 text-sm"
            onClick={handleSave}
            disabled={isBusy}
          >
            Save
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-200 text-sm"
            onClick={handleRefresh}
            disabled={isBusy}
          >
            Refresh
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            className={`${!valuesError ? "hidden" : "p-3 rounded-md bg-tid-bg-danger text-tid-negative text-xs"}`}
          >
            {valuesError}
          </div>

          <div className="flex gap-3 border border-gray-200 rounded-md p-3 bg-[#fafafa]">
            <div className="flex flex-col">
              <span className="text-xs text-tid-muted">Total</span>
              <span className="text-base font-semibold text-tid-text">
                {displayValues.total}
              </span>
            </div>
          </div>

          <div className="flex gap-3 border border-gray-200 rounded-md p-3 bg-[#fafafa]">
            <div className="flex flex-col">
              <span className="text-xs text-tid-muted">Positions</span>
              <span className="text-sm font-semibold text-tid-text">
                {displayValues.positions}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-tid-muted">Cash</span>
              <span className="text-sm font-semibold text-tid-text">
                {displayValues.cash}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <PositionsList
          positions={positions}
          loading={positionsLoading}
          openMarket={openMarket}
        />
      </main>

      <footer className="p-3 flex flex-col gap-1">
        {positionsError ? (
          <div className="p-3 rounded-md bg-tid-bg-danger text-tid-negative text-xs">
            {positionsError}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="text-xs text-tid-muted">{statusMessage}</div>
        ) : null}
        {positionsUpdatedAt ? (
          <div className="text-xs text-tid-muted">
            Positions refreshed: {new Date(positionsUpdatedAt).toLocaleString()}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}

export default App;
