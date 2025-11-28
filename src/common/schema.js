export const POSITION = {
  // Numbers
  size: { type: "number", default: null },
  avgPrice: { type: "number", default: null },
  initialValue: { type: "number", default: null },
  currentValue: { type: "number", default: null },
  cashPnl: { type: "number", default: null },
  percentPnl: { type: "number", default: null },
  totalBought: { type: "number", default: null },
  realizedPnl: { type: "number", default: null },
  percentRealizedPnl: { type: "number", default: null },
  curPrice: { type: "number", default: null },
  outcomeIndex: { type: "number", default: null },

  // Strings
  proxyWallet: { type: "string", default: "" },
  asset: { type: "string", default: "" },
  conditionId: { type: "string", default: "" },
  title: { type: "string", default: "Unnamed market" },
  slug: { type: "string", default: "" },
  icon: { type: "string", default: "" },
  eventId: { type: "string", default: "" },
  eventSlug: { type: "string", default: "" },
  outcome: { type: "string", default: "" },
  oppositeOutcome: { type: "string", default: "" },
  oppositeAsset: { type: "string", default: "" },
  endDate: { type: "string", default: "" },

  // Booleans
  redeemable: { type: "boolean", default: false },
  mergeable: { type: "boolean", default: false },
  negativeRisk: { type: "boolean", default: false },
};
