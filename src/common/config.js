const cfg = {
  POLL_MINUTES: 0.175,
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  DEFAULT_OPEN_IN_POPUP: false,
  ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  PORTFOLIO_PATH: "portfolio.html",
  BADGE_COLOR: "#4873ffff",
};
export default cfg;
