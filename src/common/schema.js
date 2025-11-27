export const POSITION_SCHEMA = {
  // Numbers
  size: "number",
  avgPrice: "number",
  initialValue: "number",
  currentValue: "number",
  cashPnl: "number",
  percentPnl: "number",
  totalBought: "number",
  realizedPnl: "number",
  percentRealizedPnl: "number",
  curPrice: "number",
  outcomeIndex: "number",

  // Strings
  proxyWallet: "string",
  asset: "string",
  conditionId: "string",
  title: "string",
  slug: "string",
  icon: "string",
  eventId: "string",
  eventSlug: "string",
  outcome: "string",
  oppositeOutcome: "string",
  oppositeAsset: "string",
  endDate: "string",

  // Booleans
  redeemable: "boolean",
  mergeable: "boolean",
  negativeRisk: "boolean",
};
