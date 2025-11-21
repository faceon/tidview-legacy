"use client";

import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatTimestamp,
} from "@/lib/format";
import type { Position } from "@/types/portfolio";
import { Badge } from "@/components/ui/badge";

interface PositionsTableProps {
  positions: Position[];
  isLoading: boolean;
  error?: string;
  updatedAt?: number | null;
}

export default function PositionsTable({
  positions,
  isLoading,
  error,
  updatedAt,
}: PositionsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
        Loading positions from Polymarket...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!positions.length) {
    return (
      <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
        No open positions for this wallet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span>Active positions</span>
        {updatedAt ? (
          <Badge variant="outline">Updated {formatTimestamp(updatedAt)}</Badge>
        ) : null}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="min-w-full divide-y divide-border/70 text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Market</th>
              <th className="px-4 py-2 text-left">Outcome</th>
              <th className="px-4 py-2 text-right">Value</th>
              <th className="px-4 py-2 text-right">Cash PnL</th>
              <th className="px-4 py-2 text-right">% PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {positions.map((position) => (
              <tr key={position.id} className="bg-background/40">
                <td className="px-4 py-2 text-left font-medium text-foreground">
                  {position.title}
                  {position.endDate ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Ends {position.endDate}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-left text-muted-foreground">
                  {position.outcome || "—"}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatCurrency(position.currentValue)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={
                      position.cashPnl && position.cashPnl !== 0
                        ? position.cashPnl > 0
                          ? "text-success"
                          : "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatSignedCurrency(position.cashPnl)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={
                      position.percentPnl && position.percentPnl !== 0
                        ? position.percentPnl > 0
                          ? "text-success"
                          : "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatPercent(position.percentPnl)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
