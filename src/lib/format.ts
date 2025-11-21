const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const parseNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatCurrency = (value: unknown): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  return currencyFormatter.format(num);
};

export const formatSignedCurrency = (value: unknown): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatted = currencyFormatter.format(Math.abs(num));
  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

export const formatPercent = (value: unknown, digits = 1): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatted = num.toFixed(digits);
  return num >= 0 ? `+${formatted}%` : `${formatted}%`;
};

export const formatBadge = (value: unknown): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const rounded = Math.round(num);
  if (rounded < 1000) return String(rounded);
  if (rounded < 10000) {
    return `${(rounded / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (rounded < 1_000_000) {
    return `${Math.round(rounded / 1000)}k`;
  }
  return `${Math.round(rounded / 1_000_000)}M`;
};

export const formatTimestamp = (value?: number | null): string => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

export const trendClass = (
  value: unknown,
): "positive" | "negative" | "neutral" => {
  const num = parseNumber(value);
  if (num == null || num === 0) return "neutral";
  return num > 0 ? "positive" : "negative";
};

export const formatAddress = (address?: string | null): string => {
  if (!address) return "";
  const trimmed = address.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};
