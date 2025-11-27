import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { formatCurrency, formatRefreshAgeLabel } from "../common/format.js";
import { POSITION_SCHEMA } from "../common/schema.js";
import cfg from "../common/config.js";
import PositionsList from "./components/PositionsList.jsx";
import SettingButtons from "./components/SettingButtons.jsx";

function generatePositionId(raw) {
  const fallbackId = "pos-" + Math.random().toString(36).slice(2);
  if (!raw) return fallbackId;
  if (raw.asset) return raw.asset;
  if (raw.conditionId) return raw.conditionId;
  if (raw.slug) return raw.outcome ? `${raw.slug}-${raw.outcome}` : raw.slug;
  return fallbackId;
}

function normalizePosition(raw) {
  const base = { id: generatePositionId(raw) };

  for (const [key, type] of Object.entries(POSITION_SCHEMA)) {
    if (type === "number") base[key] = null;
    else if (type === "boolean") base[key] = false;
    else base[key] = "";
  }

  if (!raw) {
    return {
      ...base,
      title: "Unnamed market",
    };
  }

  return {
    ...base,
    ...raw,
    title: raw.title || "Unnamed market",
  };
}

function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function TidviewPortfolio() {
  const [wallet, setWallet] = useState("");
  const [hasWallet, setHasWallet] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lastError, setLastError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsValue, setPositionsValue] = useState(null);
  const [cashValue, setCashValue] = useState(null);
  const [openInPopup, setOpenInPopup] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  const walletRef = useLatest(wallet);
  const lastErrorRef = useLatest(lastError);
  const updatedAtRef = useLatest(updatedAt);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const refreshAgeLabel = useMemo(
    () => formatRefreshAgeLabel(updatedAt, nowTimestamp),
    [updatedAt, nowTimestamp],
  );

  const updateStatusFromState = useCallback((nextLastError, nextUpdatedAt) => {
    if (nextLastError) {
      setStatusMessage("");
      return;
    }
    if (typeof nextUpdatedAt === "number" && !Number.isNaN(nextUpdatedAt)) {
      setStatusMessage(
        `Last updated: ${new Date(nextUpdatedAt).toLocaleString()}`,
      );
    } else {
      setStatusMessage("");
    }
  }, []);

  const applyPositionsState = useCallback((state) => {
    let touched = false;
    if (Object.prototype.hasOwnProperty.call(state, "positions")) {
      const rawPositions = state.positions;
      if (Array.isArray(rawPositions)) {
        const normalized = rawPositions.map((entry) =>
          normalizePosition(entry),
        );
        normalized.sort(
          (a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0),
        );
        setPositions(normalized);
        const computedValue = normalized.reduce((sum, pos) => {
          const value = pos?.currentValue;
          return value != null ? sum + value : sum;
        }, 0);
        setPositionsValue(
          Number.isFinite(computedValue) ? computedValue : null,
        );
        touched = true;
      } else if (typeof rawPositions !== "undefined") {
        setPositions([]);
        setPositionsValue(null);
        touched = true;
      }
    }

    if (touched) {
      setPositionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (!chrome?.storage?.sync || !chrome?.storage?.session) {
          return;
        }

        const [syncData, sessionData] = await Promise.all([
          chrome.storage.sync.get(),
          chrome.storage.session.get(),
        ]);
        if (cancelled) return;

        const {
          wallet: storedWallet,
          updatedAt: storedUpdatedAt,
          valuesUpdatedAt: legacyValuesUpdatedAt,
          lastError: storedLastError,
          positionsValue: storedPositionsValue,
          cashValue: storedCashValue,
          openInPopup: storedOpenInPopup,
        } = syncData || {};

        const nextWallet =
          typeof storedWallet === "string" ? storedWallet.trim() : "";
        const valid = cfg.WALLET_REGEX.test(nextWallet);
        setWallet(nextWallet);
        setHasWallet(valid);
        const parsedUpdatedAt =
          typeof storedUpdatedAt === "number"
            ? storedUpdatedAt
            : typeof legacyValuesUpdatedAt === "number"
              ? legacyValuesUpdatedAt
              : null;
        setUpdatedAt(parsedUpdatedAt ?? null);
        setLastError(storedLastError ?? "");
        setPositionsValue(
          typeof storedPositionsValue === "number"
            ? storedPositionsValue
            : null,
        );
        setCashValue(
          typeof storedCashValue === "number" ? storedCashValue : null,
        );
        setOpenInPopup(Boolean(storedOpenInPopup));

        const hasPositionsData = Array.isArray(sessionData?.positions);
        setPositionsLoading(valid && !hasPositionsData);

        applyPositionsState({
          positions: sessionData?.positions,
        });

        updateStatusFromState(storedLastError ?? "", parsedUpdatedAt);
      } catch (error) {
        console.error("Failed to initialize from storage", error);
        if (!cancelled) {
          setLastError("Unable to load current status.");
          setStatusMessage("");
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [applyPositionsState, updateStatusFromState]);

  useEffect(() => {
    if (!chrome?.storage?.onChanged) {
      return undefined;
    }

    const handleStorageChange = (changes, areaName) => {
      if (areaName === "sync") {
        let nextLastError = lastErrorRef.current;
        let nextUpdatedAt = updatedAtRef.current;

        if (Object.prototype.hasOwnProperty.call(changes, "wallet")) {
          const newWalletRaw = changes.wallet.newValue;
          const newWallet =
            typeof newWalletRaw === "string" ? newWalletRaw.trim() : "";
          const previousWallet = walletRef.current;
          const valid = cfg.WALLET_REGEX.test(newWallet);
          setWallet(newWallet);
          setHasWallet(valid);

          if (valid && newWallet !== previousWallet) {
            setPositions([]);
            setPositionsValue(null);
            setUpdatedAt(null);
            setPositionsLoading(true);
          }

          if (!valid) {
            setPositions([]);
            setPositionsValue(null);
            setUpdatedAt(null);
            setPositionsLoading(false);
          }
        }

        if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
          setPositionsValue(changes.positionsValue.newValue);
        }

        if (Object.prototype.hasOwnProperty.call(changes, "cashValue")) {
          setCashValue(changes.cashValue.newValue);
        }

        if (Object.prototype.hasOwnProperty.call(changes, "updatedAt")) {
          const raw = changes.updatedAt.newValue;
          const parsed = typeof raw === "number" ? raw : null;
          setUpdatedAt(parsed ?? null);
          nextUpdatedAt = parsed ?? null;
          setPositionsLoading(false);
        } else if (
          Object.prototype.hasOwnProperty.call(changes, "valuesUpdatedAt")
        ) {
          const raw = changes.valuesUpdatedAt.newValue;
          const parsed = typeof raw === "number" ? raw : null;
          setUpdatedAt(parsed ?? null);
          nextUpdatedAt = parsed ?? null;
          setPositionsLoading(false);
        }

        if (Object.prototype.hasOwnProperty.call(changes, "lastError")) {
          const nextError = changes.lastError.newValue
            ? String(changes.lastError.newValue)
            : "";
          setLastError(nextError);
          nextLastError = nextError;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
          setOpenInPopup(Boolean(changes.openInPopup.newValue));
        }

        updateStatusFromState(nextLastError, nextUpdatedAt);
        return;
      }

      if (areaName === "session") {
        const sessionUpdate = {};
        if (Object.prototype.hasOwnProperty.call(changes, "positions")) {
          sessionUpdate.positions = changes.positions.newValue;
        }
        if (Object.keys(sessionUpdate).length) {
          applyPositionsState(sessionUpdate);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [
    walletRef,
    applyPositionsState,
    updateStatusFromState,
    lastErrorRef,
    updatedAtRef,
  ]);

  const requestRefresh = useCallback(
    async ({ recordTimestamp = false } = {}) => {
      if (!chrome?.runtime?.sendMessage) {
        setLastError("Chrome runtime unavailable.");
        return false;
      }
      try {
        const res = await chrome.runtime.sendMessage({ type: "refresh" });
        if (!res?.success) {
          throw new Error(res?.error || "Unknown error during refresh");
        }
        return true;
      } catch (error) {
        const errorMessage = error?.message || "Failed to refresh balance.";
        console.error("Failed to refresh", errorMessage);
        setLastError(errorMessage);
        if (!recordTimestamp && updatedAtRef.current) {
          setStatusMessage(
            `Last updated: ${new Date(updatedAtRef.current).toLocaleString()}`,
          );
        } else {
          setStatusMessage("");
        }
        return false;
      } finally {
        setPositionsLoading(false);
      }
    },
    [updatedAtRef],
  );

  const handleInput = useCallback((event) => {
    setWallet(event.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = wallet.trim();
    if (!cfg.WALLET_REGEX.test(trimmed)) {
      setLastError("Please enter a valid 0x wallet.");
      setStatusMessage("");
      return;
    }

    setIsBusy(true);
    setLastError("");
    setStatusMessage("Saved. Refreshing...");
    setPositionsLoading(true);
    try {
      await chrome.storage.sync.set({ wallet: trimmed });
      setWallet(trimmed);
      setHasWallet(true);
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
      }
    } catch (error) {
      console.error("Failed to save wallet", error);
      setLastError(error?.message || "Failed to save wallet.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }, [wallet, requestRefresh]);

  const handleRefresh = useCallback(async () => {
    const trimmed = wallet.trim();
    if (!cfg.WALLET_REGEX.test(trimmed)) {
      setLastError("Please enter a valid 0x wallet.");
      setStatusMessage("");
      return;
    }

    setIsBusy(true);
    setLastError("");
    setStatusMessage("Refreshing...");
    setPositionsLoading(true);
    try {
      setWallet(trimmed);
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      setLastError(error?.message || "Failed to refresh balance.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }, [wallet, requestRefresh]);

  const openMarket = useCallback((slug, fallbackSlug) => {
    const finalSlug = slug || fallbackSlug;
    if (!finalSlug) return;
    const url = `https://polymarket.com/market/${finalSlug}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleOpenModeChange = useCallback((nextValue) => {
    setOpenInPopup(nextValue);
  }, []);

  const positionsValueSafe = positionsValue;
  const cashValueSafe = cashValue;
  const totalValue =
    positionsValueSafe == null && cashValueSafe == null
      ? null
      : (positionsValueSafe ?? 0) + (cashValueSafe ?? 0);

  const displayValues = useMemo(
    () => ({
      total: formatCurrency(totalValue),
      positions: formatCurrency(positionsValueSafe),
      cash: formatCurrency(cashValueSafe),
    }),
    [cashValueSafe, positionsValueSafe, totalValue],
  );

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111]">
      <header className="w-full box-border min-w-[320px] overflow-x-hidden overflow-y-auto leading-[1.4] p-3">
        <nav className="flex items-center justify-between gap-3">
          <figure>
            <img src="icons/icon16.png" alt="Tidview Logo" />
          </figure>
          <h3 className="text-lg font-semibold">Tidview</h3>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
            onClick={() => location.reload()}
            aria-label="Reload extension"
          >
            <span className="material-symbols-outlined text-base">
              restore_page
            </span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-slate-900 disabled:bg-slate-400"
            onClick={handleRefresh}
            disabled={isBusy || !hasWallet}
            aria-label="Refresh portfolio"
          >
            <span className="material-symbols-outlined text-base">sync</span>
          </button>
          <span className="w-12 text-right text-xs text-gray-500">
            {refreshAgeLabel}
          </span>
          <SettingButtons
            wallet={wallet}
            openInPopup={openInPopup}
            onModeChange={handleOpenModeChange}
          />
        </nav>

        {!hasWallet ? (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <label className="text-sm text-tid-muted" htmlFor="wallet">
              Your wallet
            </label>
            <input
              className="border border-gray-200 rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
              id="wallet"
              type="text"
              placeholder="0x...40 hex chars"
              autoComplete="off"
              value={wallet}
              onChange={handleInput}
            />
            <button
              type="button"
              className="px-2 py-1 rounded bg-slate-200 text-sm"
              onClick={handleSave}
              disabled={isBusy}
            >
              Save
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded bg-slate-200 text-sm"
              onClick={handleRefresh}
              disabled={isBusy}
            >
              Refresh
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
          {lastError ? (
            <div className="p-3 rounded-md bg-tid-bg-danger text-tid-negative text-xs flex-1">
              {lastError}
            </div>
          ) : null}

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

      <main className="flex-1 px-3">
        <PositionsList
          positions={positions}
          loading={positionsLoading}
          openMarket={openMarket}
        />
      </main>

      <footer className="p-3 flex flex-col gap-1">
        {statusMessage ? (
          <div className="text-xs text-tid-muted">{statusMessage}</div>
        ) : null}
        {updatedAt ? (
          <div className="text-xs text-tid-muted">
            Positions refreshed: {new Date(updatedAt).toLocaleString()}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<TidviewPortfolio />);
}
