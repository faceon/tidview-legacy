const cfg = {
  POLL_MINUTES: 5,
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  PORTFOLIO_PATH: "portfolio.html",
  BADGE_COLOR: "#4873ffff",
};
export default cfg;
