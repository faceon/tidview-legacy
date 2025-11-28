import React from "react";

export default function WalletInputView({
  wallet,
  onInput,
  onSave,
  isBusy,
  lastError,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111] min-w-[350px] items-center justify-center p-6">
      <figure className="mb-6">
        <img src="icons/icon48.png" alt="Tidview Logo" className="w-16 h-16" />
      </figure>
      <h1 className="text-2xl font-bold mb-2 text-slate-900">
        Welcome to Tidview
      </h1>
      <p className="text-gray-500 mb-8 text-center max-w-[280px] leading-relaxed">
        Enter your Polymarket wallet address to start tracking your positions.
      </p>

      <div className="w-full max-w-xs">
        <label
          className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
          htmlFor="wallet-input"
        >
          Wallet Address
        </label>
        <input
          id="wallet-input"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
          type="text"
          placeholder="0x..."
          autoComplete="off"
          value={wallet}
          onChange={onInput}
        />
        <button
          type="button"
          className="w-full py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 active:bg-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          onClick={onSave}
          disabled={isBusy || !wallet.trim()}
        >
          {isBusy ? "Connecting..." : "Get Started"}
        </button>
        {lastError && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-100 text-red-600 text-xs text-center">
            {lastError}
          </div>
        )}
      </div>
    </div>
  );
}
