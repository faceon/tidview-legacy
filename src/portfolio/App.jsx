import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cfg from "../common/config.js";
import { formatCurrency, parseNumber } from "../common/format.js";
import PositionsList from "./components/PositionsList.jsx";
import SettingsMenu from "./components/SettingsMenu.jsx";

const initialState = {
  address: "",
  hasAddress: false,
  valuesUpdatedAt: null,
  valuesError: "",
  statusMessage: "",
  isBusy: false,
  positions: [],
  positionsLoading: false,
  positionsUpdatedAt: null,
  positionsValue: null,
  positionsError: "",
  cashValue: null,
  openInPopup: false,
};

const isValidAddress = (value) => cfg.ADDRESS_REGEX.test(value?.trim?.() ?? "");

const deriveStatusMessage = (timestamp) => {
  if (typeof timestamp === "number" && !Number.isNaN(timestamp)) {
    return `Last updated: ${new Date(timestamp).toLocaleString()}`;
  }
  return "";
};

const computeRefreshAgeLabel = (timestamp) => {
  if (typeof timestamp !== "number") return "";
  const age = Math.max(Date.now() - timestamp, 0);
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
};

const normalizePosition = (raw) => {
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
};

function App() {
  const [state, setState] = useState(initialState);
  const [, setRefreshTick] = useState(0);
  const lastActiveTabIdRef = useRef(null);

  const setPartialState = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyPositionsState = useCallback(
    (incoming, { silent = false } = {}) => {
      setState((prev) => {
        let touched = false;
        const next = { ...prev };

        if (Object.prototype.hasOwnProperty.call(incoming, "positions")) {
          const rawPositions = incoming.positions;
          if (typeof rawPositions === "undefined") {
            // waiting for data, no-op
          } else if (Array.isArray(rawPositions)) {
            const normalized = rawPositions.map((entry) =>
              normalizePosition(entry),
            );
            normalized.sort(
              (a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0),
            );
            next.positions = normalized;
            const computedValue = normalized.reduce((sum, position) => {
              const value = parseNumber(position.currentValue);
              return value != null ? sum + value : sum;
            }, 0);
            next.positionsValue = computedValue;
            touched = true;
          } else {
            next.positions = [];
            next.positionsValue = null;
            touched = true;
          }
        }

        if (
          Object.prototype.hasOwnProperty.call(incoming, "positionsUpdatedAt")
        ) {
          const rawUpdatedAt = incoming.positionsUpdatedAt;
          if (typeof rawUpdatedAt !== "undefined") {
            next.positionsUpdatedAt =
              typeof rawUpdatedAt === "number" && !Number.isNaN(rawUpdatedAt)
                ? rawUpdatedAt
                : null;
            touched = true;
          }
        }

        if (Object.prototype.hasOwnProperty.call(incoming, "positionsError")) {
          const errorValue = incoming.positionsError;
          if (typeof errorValue !== "undefined") {
            next.positionsError = errorValue ? String(errorValue) : "";
            if (!silent && next.positionsError) {
              next.statusMessage = "";
            }
            touched = true;
          }
        }

        if (!touched) {
          return prev;
        }

        next.positionsLoading = false;
        return next;
      });
    },
    [],
  );

  const initFromStorage = useCallback(async () => {
    if (!chrome?.storage?.sync || !chrome?.storage?.session) {
      return;
    }

    try {
      const [syncData, sessionData] = await Promise.all([
        chrome.storage.sync.get(),
        chrome.storage.session.get(),
      ]);

      const address =
        typeof syncData.address === "string" ? syncData.address.trim() : "";
      const hasAddress = isValidAddress(address);
      const valuesUpdatedRaw = syncData.valuesUpdatedAt;
      const valuesUpdatedAt =
        typeof valuesUpdatedRaw === "number"
          ? valuesUpdatedRaw
          : parseNumber(valuesUpdatedRaw);
      const positionsValueRaw = syncData.positionsValue;
      const cashValueRaw = syncData.cashValue;

      const baseState = {
        address,
        hasAddress,
        valuesUpdatedAt,
        valuesError: syncData.valuesError ?? "",
        positionsValue:
          typeof positionsValueRaw === "number"
            ? positionsValueRaw
            : parseNumber(positionsValueRaw),
        cashValue:
          typeof cashValueRaw === "number"
            ? cashValueRaw
            : parseNumber(cashValueRaw),
        openInPopup: Boolean(syncData.openInPopup),
        positionsLoading: hasAddress && !Array.isArray(sessionData?.positions),
        statusMessage: "",
      };

      if (!baseState.valuesError && valuesUpdatedAt) {
        baseState.statusMessage = deriveStatusMessage(valuesUpdatedAt);
      }

      setState((prev) => ({ ...prev, ...baseState }));

      applyPositionsState(
        {
          positions: sessionData?.positions,
          positionsUpdatedAt: sessionData?.positionsUpdatedAt,
          positionsError: sessionData?.positionsError,
        },
        { silent: true },
      );
    } catch (error) {
      console.error("Failed to initialize from storage", error);
      setPartialState({
        valuesError: "Unable to load current status.",
        statusMessage: "",
      });
    }
  }, [applyPositionsState, setPartialState]);

  const handleStorageChange = useCallback(
    (changes, areaName) => {
      if (areaName === "sync") {
        setState((prev) => {
          const next = { ...prev };
          let shouldUpdateStatus = false;

          if (Object.prototype.hasOwnProperty.call(changes, "address")) {
            const newAddressRaw = changes.address.newValue;
            const newAddress =
              typeof newAddressRaw === "string" ? newAddressRaw.trim() : "";
            const previousAddress = prev.address;
            next.address = newAddress;
            next.hasAddress = isValidAddress(newAddress);

            if (next.hasAddress && newAddress !== previousAddress) {
              next.positions = [];
              next.positionsValue = null;
              next.positionsUpdatedAt = null;
              next.positionsError = "";
              next.positionsLoading = true;
            }

            if (!next.hasAddress) {
              next.positions = [];
              next.positionsValue = null;
              next.positionsUpdatedAt = null;
              next.positionsError = "";
              next.positionsLoading = false;
            }
          }

          if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
            next.positionsValue = parseNumber(changes.positionsValue.newValue);
          }

          if (Object.prototype.hasOwnProperty.call(changes, "cashValue")) {
            next.cashValue = parseNumber(changes.cashValue.newValue);
          }

          if (
            Object.prototype.hasOwnProperty.call(changes, "valuesUpdatedAt")
          ) {
            const rawValue = changes.valuesUpdatedAt.newValue;
            next.valuesUpdatedAt =
              typeof rawValue === "number" ? rawValue : parseNumber(rawValue);
            shouldUpdateStatus = true;
          }

          if (Object.prototype.hasOwnProperty.call(changes, "valuesError")) {
            const errorValue = changes.valuesError.newValue;
            next.valuesError = errorValue ? String(errorValue) : "";
            shouldUpdateStatus = true;
          }

          if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
            next.openInPopup = Boolean(changes.openInPopup.newValue);
          }

          if (shouldUpdateStatus) {
            next.statusMessage = next.valuesError
              ? ""
              : deriveStatusMessage(next.valuesUpdatedAt);
          }

          return next;
        });
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
    },
    [applyPositionsState],
  );

  const requestRefresh = useCallback(
    async ({ recordTimestamp = false } = {}) => {
      if (!chrome?.runtime?.sendMessage) {
        setPartialState({
          valuesError: "Chrome runtime messaging is unavailable.",
          statusMessage: "",
        });
        return false;
      }

      try {
        const response = await chrome.runtime.sendMessage({ type: "refresh" });
        if (!response?.success) {
          throw new Error(response?.error || "Unknown error during refresh");
        }
        return true;
      } catch (error) {
        const errorMessage = error?.message || "Failed to refresh balance.";
        setState((prev) => ({
          ...prev,
          valuesError: errorMessage,
          statusMessage:
            !recordTimestamp && prev.valuesUpdatedAt
              ? deriveStatusMessage(prev.valuesUpdatedAt)
              : "",
        }));
        return false;
      } finally {
        setPartialState({ positionsLoading: false });
      }
    },
    [setPartialState],
  );

  const handleSave = useCallback(async () => {
    const trimmed = state.address.trim();
    if (!isValidAddress(trimmed)) {
      setPartialState({
        valuesError: "Please enter a valid 0x address.",
        statusMessage: "",
      });
      return;
    }

    setPartialState({
      isBusy: true,
      valuesError: "",
      statusMessage: "Saved. Refreshing...",
      positionsLoading: true,
      positionsError: "",
    });

    try {
      if (!chrome?.storage?.sync) {
        throw new Error("Chrome storage is unavailable.");
      }
      await chrome.storage.sync.set({ address: trimmed });
      setPartialState({ address: trimmed, hasAddress: true });
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setPartialState({
          statusMessage: `Refreshed at ${new Date().toLocaleString()}`,
        });
      }
    } catch (error) {
      console.error("Failed to save address", error);
      setPartialState({
        valuesError: error?.message || "Failed to save address.",
        statusMessage: "",
        positionsLoading: false,
      });
    } finally {
      setPartialState({ isBusy: false });
    }
  }, [requestRefresh, setPartialState, state.address]);

  const handleRefresh = useCallback(async () => {
    const trimmed = state.address.trim();
    if (!isValidAddress(trimmed)) {
      setPartialState({
        valuesError: "Please enter a valid 0x address.",
        statusMessage: "",
      });
      return;
    }

    setPartialState({
      isBusy: true,
      valuesError: "",
      statusMessage: "Refreshing...",
      positionsLoading: true,
      positionsError: "",
    });

    try {
      setPartialState({ address: trimmed });
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setPartialState({
          statusMessage: `Refreshed at ${new Date().toLocaleString()}`,
        });
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      setPartialState({
        valuesError: error?.message || "Failed to refresh balance.",
        statusMessage: "",
        positionsLoading: false,
      });
    } finally {
      setPartialState({ isBusy: false });
    }
  }, [requestRefresh, setPartialState, state.address]);

  const closeSidePanelIfNeeded = useCallback(async () => {
    if (!chrome?.sidePanel?.close) {
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

    if (typeof window !== "undefined" && window.close) {
      window.close();
    }
  }, []);

  const handleToggleOpenMode = useCallback(async () => {
    const nextValue = !state.openInPopup;
    setPartialState({ openInPopup: nextValue });

    try {
      if (!chrome?.storage?.sync) {
        throw new Error("Chrome storage is unavailable.");
      }

      await chrome.storage.sync.set({ openInPopup: nextValue });

      if (chrome?.runtime?.sendMessage) {
        await chrome.runtime.sendMessage({
          type: "setOpenMode",
          openInPopup: nextValue,
        });
      }

      if (nextValue) {
        await openPopupView();
      } else {
        await openSidePanelView();
      }
    } catch (error) {
      console.error("Failed to toggle open mode", error);
      setPartialState({ openInPopup: !nextValue });
    }
  }, [openPopupView, openSidePanelView, setPartialState, state.openInPopup]);

  const handleOpenMarket = useCallback((slug, fallbackSlug) => {
    const finalSlug = slug || fallbackSlug;
    if (!finalSlug) return;
    const url = `https://polymarket.com/market/${finalSlug}`;
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (!chrome?.storage?.onChanged?.addListener) {
      return () => {};
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [handleStorageChange]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshTick((tick) => tick + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshAgeLabel = computeRefreshAgeLabel(state.valuesUpdatedAt);

  const positionsValueNumber = parseNumber(state.positionsValue);
  const cashValueNumber = parseNumber(state.cashValue);
  const totalValue =
    positionsValueNumber == null && cashValueNumber == null
      ? null
      : (positionsValueNumber ?? 0) + (cashValueNumber ?? 0);

  const displayValues = useMemo(
    () => ({
      total: formatCurrency(totalValue),
      positions: formatCurrency(positionsValueNumber),
      cash: formatCurrency(cashValueNumber),
    }),
    [cashValueNumber, positionsValueNumber, totalValue],
  );

  return (
    <div className="flex min-h-screen w-full justify-center bg-slate-50 p-4 text-slate-900">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-2xl">
        <header className="space-y-4">
          <nav className="flex flex-wrap items-center gap-3">
            <img
              src="icons/icon16.png"
              alt="Tidview"
              className="h-10 w-10 rounded-2xl border border-slate-200 p-1"
            />
            <h1 className="text-xl font-semibold tracking-tight">Tidview</h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                onClick={() => window.location.reload()}
                title="Reload UI"
              >
                ↻
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-semibold text-white transition hover:bg-slate-800"
                onClick={handleRefresh}
                disabled={state.isBusy || !state.hasAddress}
                title="Refresh portfolio"
              >
                ⟳
              </button>
              <span className="w-10 text-right text-xs text-slate-500">
                {typeof state.valuesUpdatedAt === "number"
                  ? refreshAgeLabel
                  : ""}
              </span>
              <SettingsMenu
                address={state.address}
                openInPopup={state.openInPopup}
                onToggleOpenMode={handleToggleOpenMode}
              />
            </div>
          </nav>

          {!state.hasAddress && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100/60 p-4">
              <label
                htmlFor="address"
                className="text-sm font-medium text-slate-600"
              >
                Your 0x address
              </label>
              <input
                id="address"
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
                placeholder="0x...40 hex chars"
                value={state.address}
                onChange={(event) =>
                  setPartialState({ address: event.target.value })
                }
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={handleSave}
                  disabled={state.isBusy}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={handleRefresh}
                  disabled={state.isBusy}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {state.valuesError && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.valuesError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total
                </p>
                <p className="text-2xl font-semibold">{displayValues.total}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Positions
                  </p>
                  <p className="text-xl font-semibold">
                    {displayValues.positions}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Cash
                  </p>
                  <p className="text-xl font-semibold">{displayValues.cash}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          <PositionsList
            positions={state.positions}
            loading={state.positionsLoading}
            onOpenMarket={handleOpenMarket}
          />
        </main>

        <footer className="space-y-2 text-sm text-slate-500">
          {state.positionsError && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-rose-600">
              {state.positionsError}
            </div>
          )}
          {state.statusMessage && (
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 px-4 py-2 text-slate-600">
              {state.statusMessage}
            </div>
          )}
          {state.positionsUpdatedAt && (
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 px-4 py-2 text-slate-600">
              Positions refreshed:{" "}
              {new Date(state.positionsUpdatedAt).toLocaleString()}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;
