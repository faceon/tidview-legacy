const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const parseNumber = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatCurrency = (value) => {
  const num = parseNumber(value);
  if (num == null) return "—";
  return currencyFormatter.format(num);
};

export const formatSignedCurrency = (value) => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatted = currencyFormatter.format(Math.abs(num));
  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

export const formatPercent = (value, { digits = 1 } = {}) => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatted = num.toFixed(digits);
  return num >= 0 ? `+${formatted}%` : `${formatted}%`;
};

export const formatNumber = (value, options = {}) => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
  return formatter.format(num);
};

export const formatBadge = (value) => {
  const num = parseNumber(value);
  if (num == null) return "—";
  const rounded = Math.round(num);
  if (rounded < 1000) return String(rounded);
  if (rounded < 10000)
    return (rounded / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (rounded < 1000000) return Math.round(rounded / 1000) + "k";
  return Math.round(rounded / 1000000) + "M";
};

export const formatDate = (value) => {
  if (!value) return "No end date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No end date";
  return date.toLocaleDateString();
};

export const formatTimestamp = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

export const formatSide = (value) => {
  if (!value) return "";
  return String(value).toUpperCase();
};

export const trendClass = (value) => {
  // Return Tailwind class names instead of semantic class names so components
  // can rely on utility classes without needing shared semantic CSS.
  const num = parseNumber(value);
  if (num == null || num === 0) return "text-tid-neutral";
  return num > 0 ? "text-tid-positive" : "text-tid-negative";
};

export const ensurePositiveInteger = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const formatWallet = (wallet) => {
  if (typeof wallet !== "string") {
    return "";
  }
  const trimmed = wallet.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};
