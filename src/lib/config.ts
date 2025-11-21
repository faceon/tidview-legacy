export const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const config = {
  pollMinutes: 1 / 6,
  badgeColor: "#4873ffff",
  portfolioPath: "/portfolio",
  defaultOpenInPopup: false,
  isDevelopment: process.env.NODE_ENV !== "production",
  storageKeys: {
    address: "address",
    positionsValue: "positionsValue",
    cashValue: "cashValue",
    valuesUpdatedAt: "valuesUpdatedAt",
    valuesError: "valuesError",
    positions: "positions",
    positionsUpdatedAt: "positionsUpdatedAt",
    positionsError: "positionsError",
  },
} as const;

export type TidviewConfig = typeof config;

export default config;
