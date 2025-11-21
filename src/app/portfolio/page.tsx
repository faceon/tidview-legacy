import config from "@/lib/config";
import {
  formatAddress,
  formatCurrency,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";

const demoPositions = [
  {
    id: "0xabc",
    market: "Will BTC trade above $100k by 12/31?",
    currentValue: 15432.12,
    pnl: 432.12,
    lastUpdated: Date.now(),
  },
  {
    id: "0xdef",
    market: "Will ETH ETF be approved in 2025?",
    currentValue: 9120.57,
    pnl: -201.44,
    lastUpdated: Date.now() - 1000 * 60 * 52,
  },
];

const totals = demoPositions.reduce(
  (acc, position) => {
    acc.holdings += position.currentValue;
    acc.pnl += position.pnl;
    return acc;
  },
  { holdings: 0, pnl: 0 },
);

export default function PortfolioPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
          Polymarket Portfolio
        </p>
        <div className="flex flex-wrap items-center gap-2 text-3xl font-semibold sm:text-4xl">
          <span className="text-white">Wallet snapshot</span>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-base font-normal text-slate-300">
            {formatAddress("0xdeadbeefcafebabedeadbeefcafebabedeadbeef")}
          </span>
        </div>
        <p className="text-slate-400">
          Rendered via Next.js {config.isDevelopment ? "(dev)" : ""} build. Live
          data + Chrome storage wiring comes next.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Total holdings
          </p>
          <p className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            {formatCurrency(totals.holdings)}
          </p>
          <p className="mt-1 text-sm text-slate-400">Includes cash + positions</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Unrealized PnL
          </p>
          <p className={`mt-3 text-3xl font-semibold ${totals.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatSignedCurrency(totals.pnl)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Placeholder math until live positions sync
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Positions</h2>
          <span className="text-sm text-slate-400">
            Auto-refresh cadence: every {config.pollMinutes * 60} seconds
          </span>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 font-medium">Market</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">PnL</th>
                <th className="pb-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {demoPositions.map((position) => (
                <tr
                  key={position.id}
                  className="border-t border-slate-800 text-base text-slate-200"
                >
                  <td className="py-4 pr-6">{position.market}</td>
                  <td className="py-4 pr-6">{formatCurrency(position.currentValue)}</td>
                  <td
                    className={`py-4 pr-6 font-semibold ${
                      position.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatSignedCurrency(position.pnl)}
                  </td>
                  <td className="py-4 text-sm text-slate-400">
                    {formatTimestamp(position.lastUpdated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
