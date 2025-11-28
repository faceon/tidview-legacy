import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { formatCurrency, formatRefreshAgeLabel } from "../common/format.js";
import { POSITION } from "../common/schema.js";
import cfg from "../common/config.js";
import WalletInputView from "./components/WalletInputView.jsx";
import PortfolioView from "./components/PortfolioView.jsx";

function normalizePosition(raw) {
  const generatePositionId = (raw) => {
    const fallbackId = "pos-" + Math.random().toString(36).slice(2);
    if (!raw) return fallbackId;
    if (raw.asset) return raw.asset;
    if (raw.conditionId) return raw.conditionId;
    if (raw.slug) return raw.outcome ? `${raw.slug}-${raw.outcome}` : raw.slug;
    return fallbackId;
  };

  const base = { id: generatePositionId(raw) };

  for (const [key, fieldDef] of Object.entries(POSITION)) {
    base[key] = fieldDef.default;
  }

  if (!raw) return base;

  return { ...base, ...raw };
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
  const [cashValue, setCashValue] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lastError, setLastError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionsValue, setPositionsValue] = useState(null);
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
    if ("positions" in state) {
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
      setIsBusy(false);
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
        if (valid && !hasPositionsData) {
          setIsBusy(true);
        }

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
    const handleStorageChange = (changes, areaName) => {
      if (areaName === "sync") {
        let nextLastError = lastErrorRef.current;
        let nextUpdatedAt = updatedAtRef.current;

        if ("wallet" in changes) {
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
            setIsBusy(true);
          }

          if (!valid) {
            setPositions([]);
            setPositionsValue(null);
            setUpdatedAt(null);
            setIsBusy(false);
          }
        }

        if ("positionsValue" in changes) {
          setPositionsValue(changes.positionsValue.newValue);
        }

        if ("cashValue" in changes) {
          setCashValue(changes.cashValue.newValue);
        }

        if ("updatedAt" in changes) {
          const raw = changes.updatedAt.newValue;
          const parsed = typeof raw === "number" ? raw : null;
          setUpdatedAt(parsed ?? null);
          nextUpdatedAt = parsed ?? null;
          setIsBusy(false);
        }

        if ("lastError" in changes) {
          const nextError = changes.lastError.newValue
            ? String(changes.lastError.newValue)
            : "";
          setLastError(nextError);
          nextLastError = nextError;
        }

        if ("openInPopup" in changes) {
          setOpenInPopup(Boolean(changes.openInPopup.newValue));
        }

        updateStatusFromState(nextLastError, nextUpdatedAt);
        return;
      }

      if (areaName === "session") {
        const sessionUpdate = {};
        if ("positions" in changes) {
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
        setIsBusy(false);
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

    try {
      await chrome.storage.sync.set({ wallet: trimmed });
      setWallet(trimmed);
      setHasWallet(true);

      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
        // Explicitly fetch the latest positions to ensure UI update
        // in case the storage listener didn't fire or was missed.
        const sessionData = await chrome.storage.session.get("positions");
        if (sessionData?.positions) {
          applyPositionsState({ positions: sessionData.positions });
        }
      }
    } catch (error) {
      console.error("Failed to save wallet", error);
      setLastError(error?.message || "Failed to save wallet.");
      setStatusMessage("");
      setIsBusy(false);
    } finally {
      setIsBusy(false);
    }
  }, [wallet, requestRefresh, applyPositionsState]);

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

    try {
      setWallet(trimmed);
      const refreshOk = await requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        setStatusMessage(`Refreshed at ${new Date().toLocaleString()}`);
        // Explicitly fetch the latest positions to ensure UI update
        const sessionData = await chrome.storage.session.get("positions");
        if (sessionData?.positions) {
          applyPositionsState({ positions: sessionData.positions });
        }
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      setLastError(error?.message || "Failed to refresh balance.");
      setStatusMessage("");
      setIsBusy(false);
    } finally {
      setIsBusy(false);
    }
  }, [wallet, requestRefresh, applyPositionsState]);

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

  if (!hasWallet) {
    return (
      <WalletInputView
        wallet={wallet}
        onInput={handleInput}
        onSave={handleSave}
        isBusy={isBusy}
        lastError={lastError}
      />
    );
  }

  return (
    <PortfolioView
      displayValues={displayValues}
      positions={positions}
      isBusy={isBusy}
      wallet={wallet}
      openInPopup={openInPopup}
      onRefresh={handleRefresh}
      onModeChange={handleOpenModeChange}
      openMarket={openMarket}
      lastError={lastError}
      statusMessage={statusMessage}
      refreshAgeLabel={refreshAgeLabel}
      updatedAt={updatedAt}
    />
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<TidviewPortfolio />);
}
