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

function buildSummary(positions) {
  const totalCurrentValue = positions.reduce(
    (sum, pos) => sum + (parseNumber(pos.currentValue) ?? 0),
    0,
  );
  const totalCashPnl = positions.reduce(
    (sum, pos) => sum + (parseNumber(pos.cashPnl) ?? 0),
    0,
  );
  const totalInitialValue = positions.reduce(
    (sum, pos) => sum + (parseNumber(pos.initialValue) ?? 0),
    0,
  );
  const totalPercent =
    totalInitialValue > 0 ? (totalCashPnl / totalInitialValue) * 100 : null;

  return {
    totalCurrentValue,
    totalCashPnl,
    totalPercent,
  };
}

function subtitleParts(position) {
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

  return [position.outcome, sizeText, avgPriceText, curPriceText].filter(
    Boolean,
  );
}

export default function PositionsList({ positions, loading, openMarket }) {
  const safePositions = useMemo(
    () => (Array.isArray(positions) ? positions : []),
    [positions],
  );
  const summary = useMemo(() => buildSummary(safePositions), [safePositions]);

  const handleOpenMarket = (slug, eventSlug) => {
    if (openMarket) {
      openMarket(slug, eventSlug);
    }
  };

  const renderPosition = (position) => {
    const parts = subtitleParts(position);

    return (
      <li
        key={position.id}
        className="flex gap-3 p-3 border-t border-gray-200 first:border-t-0 cursor-pointer transition-colors duration-200 hover:bg-tid-bg-subtle"
        role="button"
        tabIndex={0}
        onClick={() => handleOpenMarket(position.slug, position.eventSlug)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenMarket(position.slug, position.eventSlug);
          }
        }}
      >
        {position.icon ? (
          <img
            className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500"
            src={position.icon}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-md flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
            {position.outcome?.[0] || "?"}
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[13px] font-semibold text-tid-text">
            {position.title}
          </div>
          {parts.length ? (
            <div className="text-xs text-tid-muted flex gap-2 flex-wrap">
              {parts.map((part, index) => (
                <span key={`${position.id}-${index}`}>{part}</span>
              ))}
            </div>
          ) : null}
          <div className="text-xs text-tid-muted">
            {formatDate(position.endDate)}
          </div>
        </div>

        <div className="text-right flex flex-col gap-1 text-xs">
          <div className="text-sm font-semibold text-tid-text">
            {formatCurrency(position.currentValue)}
          </div>
          <div
            className={`position-stat-pnl ${trendClass(
              position.cashPnl,
            )} text-[13px] font-semibold`}
          >
            {formatSignedCurrency(position.cashPnl)}
            {position.percentPnl != null ? (
              <span className="text-xs">
                ({formatPercent(position.percentPnl)})
              </span>
            ) : null}
          </div>
        </div>
      </li>
    );
  };

  const renderList = () => {
    if (loading) {
      return <div className="text-xs text-tid-muted">Loading positions...</div>;
    }

    if (!safePositions.length) {
      return (
        <div className="text-xs text-tid-muted">
          No positions found for this wallet.
        </div>
      );
    }

    return (
      <ul className="m-0 p-0 list-none flex flex-col">
        {safePositions.map(renderPosition)}
      </ul>
    );
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Portfolio</span>
        <span className="text-sm text-tid-muted">
          {safePositions.length} positions
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex flex-col">
          <span className="text-xs text-tid-muted">Current Value</span>
          <span className="text-base font-semibold text-tid-text">
            {formatCurrency(summary.totalCurrentValue)}
          </span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-xs text-tid-muted">Total PnL</span>
          <span
            className={`text-[13px] font-semibold ${trendClass(
              summary.totalCashPnl,
            )}`}
          >
            {formatSignedCurrency(summary.totalCashPnl)}
            {summary.totalPercent != null ? (
              <span className="text-xs">
                ({formatPercent(summary.totalPercent)})
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {renderList()}
    </section>
  );
}
