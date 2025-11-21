import type { Nullable } from "@/lib/config";

export type RawPosition = {
  asset?: string;
  slug?: string;
  outcome?: string;
  conditionId?: string;
  title?: string;
  currentValue?: number | string | null;
  cashPnl?: number | string | null;
  percentPnl?: number | string | null;
  size?: number | string | null;
  avgPrice?: number | string | null;
  curPrice?: number | string | null;
  endDate?: string | null;
  icon?: string | null;
  initialValue?: number | string | null;
  realizedPnl?: number | string | null;
  eventSlug?: string | null;
};

export type Position = {
  id: string;
  title: string;
  outcome: string;
  currentValue: Nullable<number>;
  cashPnl: Nullable<number>;
  percentPnl: Nullable<number>;
  size: Nullable<number>;
  avgPrice: Nullable<number>;
  curPrice: Nullable<number>;
  endDate: string;
  icon?: string | null;
  initialValue: Nullable<number>;
  realizedPnl: Nullable<number>;
  slug: string;
  eventSlug?: string | null;
};

export type PortfolioSnapshot = {
  positionsValue: number;
  cashValue: number;
  positions: RawPosition[];
};
