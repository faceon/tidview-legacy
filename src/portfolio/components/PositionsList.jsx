import { useMemo } from "react";
import {
  formatCurrency,
  formatSignedCurrency,
  formatPercent,
  formatNumber,
  formatDate,
  trendClass,
  parseNumber,
} from "../../common/format.js";

const trendTextClass = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-600 dark:text-slate-400",
};

const getTrendClassName = (value) =>
  trendTextClass[trendClass(value)] ?? trendTextClass.neutral;

function PositionsList({ positions, loading, onOpenMarket }) {
  const safePositions = useMemo(
    () => (Array.isArray(positions) ? positions : []),
    [positions],
  );

  const summary = useMemo(() => {
    const totalCurrentValue = safePositions.reduce(
      (sum, pos) => sum + (parseNumber(pos.currentValue) ?? 0),
      0,
    );
    const totalCashPnl = safePositions.reduce(
      (sum, pos) => sum + (parseNumber(pos.cashPnl) ?? 0),
      0,
    );
    const totalInitialValue = safePositions.reduce(
      (sum, pos) => sum + (parseNumber(pos.initialValue) ?? 0),
      0,
    );
    const totalPercent =
      totalInitialValue > 0 ? (totalCashPnl / totalInitialValue) * 100 : null;

    return { totalCurrentValue, totalCashPnl, totalPercent };
  }, [safePositions]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading positions...</div>;
  }

  if (!safePositions.length) {
    return (
      <div className="text-sm text-slate-500">
        No positions found for this address.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Portfolio</span>
        <span>{safePositions.length} positions</span>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Current Value
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(summary.totalCurrentValue)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total PnL
            </p>
            <p
              className={`text-lg font-semibold ${getTrendClassName(summary.totalCashPnl)}`}
            >
              {formatSignedCurrency(summary.totalCashPnl)}
              {summary.totalPercent != null && (
                <span className="ml-1 text-sm font-medium text-slate-500">
                  ({formatPercent(summary.totalPercent)})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm">
        {safePositions.map((position) => {
          const avgPriceText =
            position.avgPrice != null
              ? `@ ${formatNumber(position.avgPrice, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}`
              : "";
          const curPriceText =
            position.curPrice != null
              ? `→ ${formatNumber(position.curPrice, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}`
              : "";
          const sizeText =
            position.size != null ? `Size ${formatNumber(position.size)}` : "";

          const subtitleParts = [
            position.outcome,
            sizeText,
            avgPriceText,
            curPriceText,
          ].filter(Boolean);

          return (
            <button
              key={position.id}
              type="button"
              className="flex w-full gap-4 px-4 py-3 text-left transition hover:bg-slate-50"
              onClick={() => onOpenMarket?.(position.slug, position.eventSlug)}
            >
              {position.icon ? (
                <img
                  className="h-12 w-12 rounded-lg object-cover"
                  src={position.icon}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
                  {position.outcome?.[0] || "?"}
                </div>
              )}

              <div className="flex flex-1 flex-col gap-1">
                <div className="text-sm font-semibold text-slate-900">
                  {position.title}
                </div>
                {subtitleParts.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {subtitleParts.map((part, index) => (
                      <span key={`${position.id}-${index}`}>{part}</span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  {formatDate(position.endDate)}
                </div>
              </div>

              <div className="flex flex-col items-end justify-center gap-1 text-sm">
                <div className="font-semibold text-slate-900">
                  {formatCurrency(position.currentValue)}
                </div>
                <div
                  className={`text-xs font-semibold ${getTrendClassName(position.cashPnl)}`}
                >
                  {formatSignedCurrency(position.cashPnl)}
                  {position.percentPnl != null && (
                    <span className="ml-1 text-slate-500">
                      ({formatPercent(position.percentPnl)})
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PositionsList;
