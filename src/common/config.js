const cfg = {
  POLL_MINUTES: 1 / 6,
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  DEFAULT_OPEN_IN_POPUP: false,
  WALLET_REGEX: /^0x[a-fA-F0-9]{40}$/,
  PORTFOLIO_PATH: "index.html",
  BADGE_COLOR: "#4873ffff",
  NUMERIC_POSITION_FIELDS: [
    "currentValue",
    "cashPnl",
    "percentPnl",
    "size",
    "avgPrice",
    "curPrice",
    "initialValue",
    "realizedPnl",
  ],
  STRING_POSITION_FIELDS: ["outcome", "eventSlug", "slug"],
};
export default cfg;
