import React from "react";
import PositionsList from "./PositionsList.jsx";
import SettingButtons from "./SettingButtons.jsx";

export default function PortfolioView({
  displayValues,
  positions,
  isBusy,
  wallet,
  openInPopup,
  onRefresh,
  onModeChange,
  openMarket,
  lastError,
  statusMessage,
  refreshAgeLabel,
  updatedAt,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111] min-w-[350px]">
      <header className="w-full box-border min-w-[320px] overflow-x-hidden overflow-y-auto leading-[1.4] p-3 border-b border-gray-100">
        <nav className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <figure>
              <img
                src="icons/icon16.png"
                alt="Tidview Logo"
                className="w-5 h-5"
              />
            </figure>
            <h3 className="text-base font-semibold text-slate-900">Tidview</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => location.reload()}
              aria-label="Reload extension"
              title="Reload"
            >
              <span className="material-symbols-outlined text-[18px]">
                restore_page
              </span>
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={onRefresh}
              disabled={isBusy}
              aria-label="Refresh portfolio"
              title="Refresh"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isBusy ? "animate-spin" : ""}`}
              >
                sync
              </span>
            </button>
            <SettingButtons
              wallet={wallet}
              openInPopup={openInPopup}
              onModeChange={onModeChange}
            />
          </div>
        </nav>

        <div className="flex items-center justify-between gap-3 mt-4">
          {lastError ? (
            <div className="p-3 rounded-md bg-red-50 border border-red-100 text-red-600 text-xs flex-1">
              {lastError}
            </div>
          ) : null}

          <div className="flex-1 flex gap-3 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Total Value
              </span>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                {displayValues.total}
              </span>
            </div>
          </div>

          <div className="flex gap-4 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Positions
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {displayValues.positions}
              </span>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Cash
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {displayValues.cash}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-2">
        <PositionsList
          positions={positions}
          loading={isBusy}
          openMarket={openMarket}
        />
      </main>

      <footer className="p-3 border-t border-gray-100 bg-gray-50/30 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{statusMessage}</span>
          <span>{refreshAgeLabel}</span>
        </div>
        {updatedAt ? (
          <div className="text-[10px] text-gray-300 text-right">
            {new Date(updatedAt).toLocaleString()}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
