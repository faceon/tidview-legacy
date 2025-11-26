import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { parseNumber, formatCurrency } from "../common/format.js";
import cfg from "../common/config.js";
import PositionsList from "./components/positions-list.js";
import SettingsButton from "./components/settings-button.js";
import "./tailwind.css";

function formatRefreshAgeLabel(valuesUpdatedAt, now = Date.now()) {
  if (typeof valuesUpdatedAt !== "number") {
    return "";
  }
  const age = Math.max(now - valuesUpdatedAt, 0);
  if (age < 60 * 1000) {
    return `${Math.max(Math.floor(age / 1000), 0)}s`;
  }
  if (age < 60 * 60 * 1000) {
    return `${Math.floor(age / (60 * 1000))}m`;
  }
  return `${Math.floor(age / (60 * 60 * 1000))}h`;
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

function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function TidviewPortfolio() {
  const [address, setAddress] = useState("");
  const [hasAddress, setHasAddress] = useState(false);
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
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  const addressRef = useLatest(address);
  const valuesErrorRef = useLatest(valuesError);
  const valuesUpdatedAtRef = useLatest(valuesUpdatedAt);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const refreshAgeLabel = useMemo(
    () => formatRefreshAgeLabel(valuesUpdatedAt, nowTimestamp),
    [valuesUpdatedAt, nowTimestamp],
  );

  const updateStatusFromState = useCallback(
    (nextValuesError, nextValuesUpdatedAt) => {
      if (nextValuesError) {
        setStatusMessage("");
        return;
      }
      if (
        typeof nextValuesUpdatedAt === "number" &&
        !Number.isNaN(nextValuesUpdatedAt)
      ) {
        setStatusMessage(
          `Last updated: ${new Date(nextValuesUpdatedAt).toLocaleString()}`,
        );
      } else {
        setStatusMessage("");
      }
    },
    [],
  );

  const applyPositionsState = useCallback((state, { silent = false } = {}) => {
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
          const value = parseNumber(pos?.currentValue);
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

    if (Object.prototype.hasOwnProperty.call(state, "positionsUpdatedAt")) {
      const rawUpdatedAt = state.positionsUpdatedAt;
      setPositionsUpdatedAt(
        typeof rawUpdatedAt === "number" && !Number.isNaN(rawUpdatedAt)
          ? rawUpdatedAt
          : null,
      );
      touched = true;
    }

    if (Object.prototype.hasOwnProperty.call(state, "positionsError")) {
      const errorValue = state.positionsError;
      setPositionsError(errorValue ? String(errorValue) : "");
      if (!silent && errorValue) {
        setStatusMessage("");
      }
      touched = true;
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
          address: storedAddress,
          valuesUpdatedAt: storedValuesUpdatedAt,
          valuesError: storedValuesError,
          positionsValue: storedPositionsValue,
          cashValue: storedCashValue,
          openInPopup: storedOpenInPopup,
        } = syncData || {};

        const nextAddress =
          typeof storedAddress === "string" ? storedAddress.trim() : "";
        const valid = cfg.ADDRESS_REGEX.test(nextAddress);
        setAddress(nextAddress);
        setHasAddress(valid);
        const parsedValuesUpdatedAt =
          typeof storedValuesUpdatedAt === "number"
            ? storedValuesUpdatedAt
            : parseNumber(storedValuesUpdatedAt);
        setValuesUpdatedAt(parsedValuesUpdatedAt ?? null);
        setValuesError(storedValuesError ?? "");
        setPositionsValue(
          typeof storedPositionsValue === "number"
            ? storedPositionsValue
            : parseNumber(storedPositionsValue),
        );
        setCashValue(
          typeof storedCashValue === "number"
            ? storedCashValue
            : parseNumber(storedCashValue),
        );
        setOpenInPopup(Boolean(storedOpenInPopup));

        const hasPositionsData = Array.isArray(sessionData?.positions);
        setPositionsLoading(valid && !hasPositionsData);

        applyPositionsState(
          {
            positions: sessionData?.positions,
            positionsUpdatedAt: sessionData?.positionsUpdatedAt,
            positionsError: sessionData?.positionsError,
          },
          { silent: true },
        );

        updateStatusFromState(storedValuesError ?? "", parsedValuesUpdatedAt);
      } catch (error) {
        console.error("Failed to initialize from storage", error);
        if (!cancelled) {
          setValuesError("Unable to load current status.");
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
        let nextValuesError = valuesErrorRef.current;
        let nextValuesUpdatedAt = valuesUpdatedAtRef.current;

        if (Object.prototype.hasOwnProperty.call(changes, "address")) {
          const newAddressRaw = changes.address.newValue;
          const newAddress =
            typeof newAddressRaw === "string" ? newAddressRaw.trim() : "";
          const previousAddress = addressRef.current;
          const valid = cfg.ADDRESS_REGEX.test(newAddress);
          setAddress(newAddress);
          setHasAddress(valid);

          if (valid && newAddress !== previousAddress) {
            setPositions([]);
            setPositionsValue(null);
            setPositionsUpdatedAt(null);
            setPositionsError("");
            setPositionsLoading(true);
          }

          if (!valid) {
            setPositions([]);
            setPositionsValue(null);
            setPositionsUpdatedAt(null);
            setPositionsError("");
            setPositionsLoading(false);
          }
        }

        if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
          setPositionsValue(parseNumber(changes.positionsValue.newValue));
        }

        if (Object.prototype.hasOwnProperty.call(changes, "cashValue")) {
          setCashValue(parseNumber(changes.cashValue.newValue));
        }

        if (Object.prototype.hasOwnProperty.call(changes, "valuesUpdatedAt")) {
          const raw = changes.valuesUpdatedAt.newValue;
          const parsed = typeof raw === "number" ? raw : parseNumber(raw);
          setValuesUpdatedAt(parsed ?? null);
          nextValuesUpdatedAt = parsed ?? null;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "valuesError")) {
          const nextError = changes.valuesError.newValue
            ? String(changes.valuesError.newValue)
            : "";
          setValuesError(nextError);
          nextValuesError = nextError;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
          setOpenInPopup(Boolean(changes.openInPopup.newValue));
        }

        updateStatusFromState(nextValuesError, nextValuesUpdatedAt);
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
          applyPositionsState(sessionUpdate);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [
    addressRef,
    applyPositionsState,
    updateStatusFromState,
    valuesErrorRef,
    valuesUpdatedAtRef,
  ]);

  const requestRefresh = useCallback(
    async ({ recordTimestamp = false } = {}) => {
      if (!chrome?.runtime?.sendMessage) {
        setValuesError("Chrome runtime unavailable.");
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
        setValuesError(errorMessage);
        if (!recordTimestamp && valuesUpdatedAtRef.current) {
          setStatusMessage(
            `Last updated: ${new Date(
              valuesUpdatedAtRef.current,
            ).toLocaleString()}`,
          );
        } else {
          setStatusMessage("");
        }
        return false;
      } finally {
        setPositionsLoading(false);
      }
    },
    [valuesUpdatedAtRef],
  );

  const handleInput = useCallback((event) => {
    setAddress(event.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = address.trim();
    if (!cfg.ADDRESS_REGEX.test(trimmed)) {
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
      setHasAddress(true);
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
      }
    } catch (error) {
      console.error("Failed to save address", error);
      setValuesError(error?.message || "Failed to save address.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }, [address, requestRefresh]);

  const handleRefresh = useCallback(async () => {
    const trimmed = address.trim();
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
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      setValuesError(error?.message || "Failed to refresh balance.");
      setStatusMessage("");
      setPositionsLoading(false);
    } finally {
      setIsBusy(false);
    }
  }, [address, requestRefresh]);

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

  const positionsValueSafe = parseNumber(positionsValue);
  const cashValueSafe = parseNumber(cashValue);
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
            disabled={isBusy || !hasAddress}
            aria-label="Refresh portfolio"
          >
            <span className="material-symbols-outlined text-base">sync</span>
          </button>
          <span className="w-12 text-right text-xs text-gray-500">
            {refreshAgeLabel}
          </span>
          <SettingsButton
            address={address}
            openInPopup={openInPopup}
            onModeChange={handleOpenModeChange}
          />
        </nav>

        {!hasAddress ? (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <label className="text-sm text-tid-muted" htmlFor="address">
              Your 0x address
            </label>
            <input
              className="border border-gray-200 rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
              id="address"
              type="text"
              placeholder="0x...40 hex chars"
              autoComplete="off"
              value={address}
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
          {valuesError ? (
            <div className="p-3 rounded-md bg-tid-bg-danger text-tid-negative text-xs flex-1">
              {valuesError}
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

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<TidviewPortfolio />);
}
