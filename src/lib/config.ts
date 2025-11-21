export const POLL_MINUTES = 1 / 6;
export const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const PORTFOLIO_PATH = "portfolio.html";
export const BADGE_COLOR = "#4873ffff";
export const DEFAULT_OPEN_IN_POPUP = false;

export const API_BASE = "https://data-api.polymarket.com";
export const POLYGON_RPC_URL = "https://polygon-rpc.com/";
export const USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
export const USDC_DECIMALS = 6;

export const isExtensionBuild = () =>
  typeof window !== "undefined" &&
  !!window.location.href?.startsWith?.("chrome-extension://");

export const isDevelopment = process.env.NODE_ENV !== "production";

export type Nullable<T> = T | null | undefined;
