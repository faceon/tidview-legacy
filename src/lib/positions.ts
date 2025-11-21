import { parseNumber } from "./format";
import type { Position, RawPosition } from "@/types/portfolio";

export function normalizePosition(raw: RawPosition): Position {
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

export function sortPositions(positions: Position[]): Position[] {
  return [...positions].sort(
    (a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0),
  );
}
