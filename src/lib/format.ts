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

export const formatPercent = (
  value: unknown,
  { digits = 1 }: { digits?: number } = {},
): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatted = num.toFixed(digits);
  return num >= 0 ? `+${formatted}%` : `${formatted}%`;
};

export const formatNumber = (
  value: unknown,
  options: Intl.NumberFormatOptions = {},
): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
  return formatter.format(num);
};

export const formatBadge = (value: unknown): string => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const rounded = Math.round(num);
  if (rounded < 1000) return String(rounded);
  if (rounded < 10000)
    return (rounded / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (rounded < 1000000) return Math.round(rounded / 1000) + "k";
  return Math.round(rounded / 1000000) + "M";
};

export const formatDate = (value: unknown): string => {
  if (!value) return "No end date";
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return "No end date";
  return date.toLocaleDateString();
};

export const formatTimestamp = (value: unknown): string => {
  if (!value) return "Unknown time";
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

export const formatSide = (value: unknown): string => {
  if (!value) return "";
  return String(value).toUpperCase();
};

export const trendClass = (value: unknown): "positive" | "negative" | "neutral" => {
  const num = parseNumber(value);
  if (num == null || num === 0) return "neutral";
  return num > 0 ? "positive" : "negative";
};

export const ensurePositiveInteger = (value: unknown, fallback = 1): number => {
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const formatAddress = (address: unknown): string => {
  if (typeof address !== "string") {
    return "";
  }
  const trimmed = address.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};
