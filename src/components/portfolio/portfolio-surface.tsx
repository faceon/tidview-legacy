"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PositionsTable from "@/components/portfolio/positions-table";
import { DEFAULT_OPEN_IN_POPUP, ADDRESS_REGEX } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addChromeStorageListener,
  chromeSessionGet,
  chromeSyncGet,
  chromeSyncSet,
  hasChromeStorage,
  sendChromeMessage,
} from "@/lib/chrome";
import { fetchPortfolioSnapshot } from "@/lib/polymarket";
import { normalizePosition, sortPositions } from "@/lib/positions";
import type { Position, RawPosition } from "@/types/portfolio";

const LOCAL_STORAGE_KEY = "tidview:address";

const initialState = {
  address: "",
  hasAddress: false,
  valuesUpdatedAt: null as number | null,
  valuesError: "",
  statusMessage: "",
  isBusy: false,
  positions: [] as Position[],
  positionsLoading: false,
  positionsUpdatedAt: null as number | null,
  positionsValue: null as number | null,
  positionsError: "",
  cashValue: null as number | null,
  openInPopup: DEFAULT_OPEN_IN_POPUP,
};

type PortfolioState = typeof initialState;
const isValidAddress = (value: string) => ADDRESS_REGEX.test(value.trim());

const deriveStatusMessage = (timestamp?: number | null) => {
  if (typeof timestamp === "number" && !Number.isNaN(timestamp)) {
    return `Last updated: ${new Date(timestamp).toLocaleString()}`;
  }
  return "";
};

const computeRefreshAgeLabel = (timestamp?: number | null) => {
  if (typeof timestamp !== "number") return "";
  const age = Math.max(Date.now() - timestamp, 0);
  if (age < 60 * 1000) {
    const seconds = Math.max(Math.floor(age / 1000), 0);
    return `${seconds}s ago`;
  }
  if (age < 60 * 60 * 1000) {
    const minutes = Math.floor(age / (60 * 1000));
    return `${minutes}m ago`;
  }
  const hours = Math.floor(age / (60 * 60 * 1000));
  return `${hours}h ago`;
};

function normalizePositions(rawPositions?: RawPosition[]): Position[] {
  if (!Array.isArray(rawPositions)) return [];
  return sortPositions(rawPositions.map((entry) => normalizePosition(entry)));
}

export default function PortfolioSurface() {
  const [state, setState] = useState<PortfolioState>(initialState);
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  const applyPositionsState = useCallback(
    (source: Record<string, unknown>, silent = false) => {
      setState((prev) => {
        const next = { ...prev };
        let touched = false;

        if (Object.prototype.hasOwnProperty.call(source, "positions")) {
          const normalized = normalizePositions(
            source.positions as RawPosition[],
          );
          next.positions = normalized;
          next.positionsValue = normalized.reduce(
            (sum, pos) => sum + (pos.currentValue ?? 0),
            0,
          );
          touched = true;
        }

        if (
          Object.prototype.hasOwnProperty.call(source, "positionsUpdatedAt")
        ) {
          const rawUpdatedAt = source.positionsUpdatedAt;
          next.positionsUpdatedAt =
            typeof rawUpdatedAt === "number" ? rawUpdatedAt : null;
          touched = true;
        }

        if (Object.prototype.hasOwnProperty.call(source, "positionsError")) {
          const positionsError = source.positionsError;
          next.positionsError = positionsError ? String(positionsError) : "";
          if (!silent && next.positionsError) {
            next.statusMessage = "";
          }
          touched = true;
        }

        if (!touched) return prev;
        next.positionsLoading = false;
        return next;
      });
    },
    [],
  );

  const requestNetworkSnapshot = useCallback(async (address: string) => {
    try {
      setState((prev) => ({
        ...prev,
        positionsLoading: true,
        valuesError: "",
        statusMessage: "",
      }));
      const snapshot = await fetchPortfolioSnapshot(address);
      const normalized = normalizePositions(snapshot.positions);
      const timestamp = Date.now();
      setState((prev) => ({
        ...prev,
        positions: normalized,
        positionsValue: normalized.reduce(
          (sum, pos) => sum + (pos.currentValue ?? 0),
          0,
        ),
        cashValue: snapshot.cashValue,
        valuesUpdatedAt: timestamp,
        positionsUpdatedAt: timestamp,
        statusMessage: deriveStatusMessage(timestamp),
        positionsLoading: false,
        positionsError: "",
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        valuesError:
          error instanceof Error
            ? error.message
            : "Failed to refresh portfolio.",
        statusMessage: "",
        positionsLoading: false,
      }));
      return false;
    }
  }, []);

  useEffect(() => {
    setExtensionAvailable(hasChromeStorage());
  }, []);

  const handleStorageChange = useCallback(
    (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: "local" | "sync" | "session" | "managed",
    ) => {
      if (areaName === "sync") {
        setState((prev) => {
          const next = { ...prev };
          let shouldUpdateStatus = false;

          if (changes.address) {
            const newAddress =
              typeof changes.address.newValue === "string"
                ? changes.address.newValue.trim()
                : "";
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
          }

          if (changes.positionsValue) {
            const value = changes.positionsValue.newValue;
            next.positionsValue = typeof value === "number" ? value : null;
          }

          if (changes.cashValue) {
            const cashValue = changes.cashValue.newValue;
            next.cashValue = typeof cashValue === "number" ? cashValue : null;
          }

          if (changes.valuesUpdatedAt) {
            const rawValue = changes.valuesUpdatedAt.newValue;
            next.valuesUpdatedAt =
              typeof rawValue === "number" ? rawValue : null;
            shouldUpdateStatus = true;
          }

          if (changes.valuesError) {
            const errorValue = changes.valuesError.newValue;
            next.valuesError = errorValue ? String(errorValue) : "";
            shouldUpdateStatus = true;
          }

          if (changes.openInPopup) {
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
        const sessionUpdate: Record<string, unknown> = {};
        if (changes.positions)
          sessionUpdate.positions = changes.positions.newValue;
        if (changes.positionsUpdatedAt)
          sessionUpdate.positionsUpdatedAt =
            changes.positionsUpdatedAt.newValue;
        if (changes.positionsError)
          sessionUpdate.positionsError = changes.positionsError.newValue;
        if (Object.keys(sessionUpdate).length) {
          applyPositionsState(sessionUpdate);
        }
      }
    },
    [applyPositionsState],
  );

  useEffect(() => {
    if (!extensionAvailable) {
      if (typeof window === "undefined") return;
      const stored = window.localStorage?.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const trimmed = stored.trim();
        const hasAddress = isValidAddress(trimmed);
        setState((prev) => ({
          ...prev,
          address: trimmed,
          hasAddress,
        }));
        if (hasAddress) {
          void requestNetworkSnapshot(trimmed);
        }
      }
      return;
    }

    const bootstrap = async () => {
      try {
        const [syncData, sessionData] = await Promise.all([
          chromeSyncGet<Record<string, unknown>>(),
          chromeSessionGet<Record<string, unknown>>(),
        ]);

        const address =
          typeof syncData.address === "string" ? syncData.address.trim() : "";
        const hasAddress = isValidAddress(address);
        const positionsValue =
          typeof syncData.positionsValue === "number"
            ? syncData.positionsValue
            : null;
        const cashValue =
          typeof syncData.cashValue === "number" ? syncData.cashValue : null;
        const valuesUpdatedAt =
          typeof syncData.valuesUpdatedAt === "number"
            ? syncData.valuesUpdatedAt
            : null;

        setState((prev) => ({
          ...prev,
          address,
          hasAddress,
          positionsValue,
          cashValue,
          valuesUpdatedAt,
          openInPopup: Boolean(syncData.openInPopup ?? DEFAULT_OPEN_IN_POPUP),
          valuesError: (syncData.valuesError as string) || "",
          statusMessage: syncData.valuesError
            ? ""
            : deriveStatusMessage(valuesUpdatedAt ?? null),
          positionsLoading:
            hasAddress && !Array.isArray(sessionData?.positions),
        }));

        applyPositionsState(sessionData);
      } catch (error) {
        console.error("Failed to bootstrap Chrome storage", error);
        setState((prev) => ({
          ...prev,
          valuesError: "Unable to load current Chrome data.",
          statusMessage: "",
        }));
      }
    };

    bootstrap();

    const cleanup = addChromeStorageListener(handleStorageChange);

    return () => {
      cleanup?.();
    };
  }, [
    applyPositionsState,
    extensionAvailable,
    handleStorageChange,
    requestNetworkSnapshot,
  ]);

  const requestRefresh = useCallback(
    async ({ recordTimestamp = false }: { recordTimestamp?: boolean } = {}) => {
      const trimmed = state.address.trim();
      if (!isValidAddress(trimmed)) {
        setState((prev) => ({
          ...prev,
          valuesError: "Please enter a valid 0x address.",
          statusMessage: "",
        }));
        return false;
      }

      if (extensionAvailable) {
        try {
          const response = await sendChromeMessage<
            { type: string; recordTimestamp?: boolean },
            { success: boolean; error?: string }
          >({
            type: "refresh",
            recordTimestamp,
          });
          if (!response?.success) {
            throw new Error(response?.error || "Refresh failed");
          }
          return true;
        } catch (error) {
          setState((prev) => ({
            ...prev,
            valuesError:
              error instanceof Error
                ? error.message
                : "Failed to refresh portfolio.",
            statusMessage: prev.valuesUpdatedAt
              ? deriveStatusMessage(prev.valuesUpdatedAt)
              : "",
          }));
          return false;
        }
      }

      return requestNetworkSnapshot(trimmed);
    },
    [extensionAvailable, requestNetworkSnapshot, state.address],
  );

  const handleSave = useCallback(async () => {
    const trimmed = state.address.trim();
    if (!isValidAddress(trimmed)) {
      setState((prev) => ({
        ...prev,
        valuesError: "Please enter a valid 0x address.",
        statusMessage: "",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isBusy: true,
      valuesError: "",
      statusMessage: extensionAvailable
        ? "Saved. Refreshing..."
        : "Refreshing...",
      positionsLoading: true,
      positionsError: "",
    }));

    try {
      if (extensionAvailable) {
        await chromeSyncSet({ address: trimmed });
        await requestRefresh({ recordTimestamp: true });
      } else {
        if (typeof window !== "undefined") {
          window.localStorage?.setItem(LOCAL_STORAGE_KEY, trimmed);
        }
        await requestNetworkSnapshot(trimmed);
      }
    } catch (error) {
      console.error("Failed to save address", error);
      setState((prev) => ({
        ...prev,
        valuesError:
          error instanceof Error ? error.message : "Failed to save address.",
        statusMessage: "",
        positionsLoading: false,
      }));
    } finally {
      setState((prev) => ({ ...prev, isBusy: false }));
    }
  }, [
    extensionAvailable,
    requestNetworkSnapshot,
    requestRefresh,
    state.address,
  ]);

  const handleRefresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isBusy: true,
      valuesError: "",
      positionsLoading: true,
    }));
    try {
      await requestRefresh({ recordTimestamp: true });
    } finally {
      setState((prev) => ({ ...prev, isBusy: false, positionsLoading: false }));
    }
  }, [requestRefresh]);

  const handleToggleOpenMode = useCallback(
    async (openInPopup: boolean) => {
      if (!extensionAvailable) {
        setState((prev) => ({ ...prev, openInPopup }));
        return;
      }

      try {
        await chromeSyncSet({ openInPopup });
        await sendChromeMessage({ type: "setOpenMode", openInPopup });
      } catch (error) {
        console.error("Failed to toggle open mode", error);
      }
    },
    [extensionAvailable],
  );

  const totalValue = useMemo(() => {
    const positionsValue = state.positionsValue ?? 0;
    const cashValue = state.cashValue ?? 0;
    return positionsValue + cashValue;
  }, [state.cashValue, state.positionsValue]);

  const refreshAge = computeRefreshAgeLabel(state.valuesUpdatedAt);

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Wallet overview
              </CardTitle>
              <CardDescription>
                Enter a Polymarket wallet to mirror inside the extension.
              </CardDescription>
            </div>
            {extensionAvailable ? (
              <Badge variant="secondary">Extension mode</Badge>
            ) : (
              <Badge variant="outline">Web preview</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet address</Label>
              <Input
                id="wallet"
                value={state.address}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    address: event.target.value,
                    valuesError: "",
                  }))
                }
                placeholder="0x..."
                autoComplete="off"
              />
            </div>
            <div className="flex items-end gap-3">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={state.isBusy}
              >
                <Save className="mr-2 h-4 w-4" /> Save & sync
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleRefresh}
                disabled={state.isBusy || !state.hasAddress}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {state.statusMessage && <span>{state.statusMessage}</span>}
            {refreshAge && (
              <span className="text-xs text-muted-foreground">
                ({refreshAge})
              </span>
            )}
            {state.valuesError && (
              <Badge variant="destructive" className="text-xs">
                {state.valuesError}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ValueCard
          label="Portfolio total"
          value={formatCurrency(totalValue)}
          accent="text-primary"
        />
        <ValueCard
          label="Positions"
          value={formatCurrency(state.positionsValue)}
        />
        <ValueCard label="Cash" value={formatCurrency(state.cashValue)} />
      </div>

      <PositionsTable
        positions={state.positions}
        isLoading={state.positionsLoading && state.hasAddress}
        error={state.positionsError}
        updatedAt={state.positionsUpdatedAt}
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" /> Chrome behavior
          </CardTitle>
          <CardDescription>
            Choose whether Tidview opens as a popup or in the side panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Open in popup</p>
            <p className="text-sm text-muted-foreground">
              {state.openInPopup
                ? "Action click opens the portfolio popup."
                : "Action click docks Tidview in the side panel."}
            </p>
          </div>
          <Switch
            checked={state.openInPopup}
            onCheckedChange={(checked) =>
              handleToggleOpenMode(Boolean(checked))
            }
            disabled={!extensionAvailable}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ValueCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold text-foreground", accent)}>
        {value}
      </p>
    </div>
  );
}
