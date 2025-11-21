import {
  API_BASE,
  ERC20_BALANCE_OF_SELECTOR,
  POLYGON_RPC_URL,
  USDC_CONTRACT,
  USDC_DECIMALS,
} from "./config";
import type { RawPosition } from "@/types/portfolio";

const HTTP_ERROR_MESSAGE = (context: string, status: number) =>
  `${context} failed with HTTP ${status}`;

async function fetchJson<T>(url: string, context: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(HTTP_ERROR_MESSAGE(context, res.status));
  }
  return (await res.json()) as T;
}

const toNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function fetchPositionsValue(address: string): Promise<number> {
  const url = `${API_BASE}/value?user=${encodeURIComponent(address)}`;
  const data = await fetchJson<{ value?: number } | Array<{ value: number }>>(
    url,
    "Portfolio value request",
  );
  const value = Array.isArray(data) ? data[0]?.value : data?.value;
  const numeric = toNumber(value);
  if (numeric == null) {
    throw new Error("Unexpected value response format");
  }
  return numeric;
}

export async function fetchPositions(address: string): Promise<RawPosition[]> {
  const url = `${API_BASE}/positions?user=${encodeURIComponent(address)}`;
  const data = await fetchJson<unknown[]>(url, "Positions request");
  if (!Array.isArray(data)) {
    throw new Error("Unexpected positions response format");
  }
  return data as RawPosition[];
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/^0x/, "");
}

export async function fetchCashValue(address: string): Promise<number> {
  const normalizedAddress = normalizeAddress(address);
  const data = ERC20_BALANCE_OF_SELECTOR + normalizedAddress.padStart(64, "0");

  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: USDC_CONTRACT,
          data,
        },
        "latest",
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(HTTP_ERROR_MESSAGE("Polygon RPC request", res.status));
  }

  const json = (await res.json()) as {
    result?: string;
    error?: { message?: string };
  };
  if (json?.error) {
    throw new Error(json.error?.message || "Polygon RPC error");
  }

  const hexValue = json?.result;
  if (typeof hexValue !== "string") {
    throw new Error("Invalid Polygon RPC response");
  }

  let balance: number;
  try {
    const raw = BigInt(hexValue);
    balance = Number(raw) / 10 ** USDC_DECIMALS;
  } catch {
    throw new Error("Failed to parse USDC balance");
  }

  if (!Number.isFinite(balance)) {
    throw new Error("USDC balance is not a finite number");
  }

  return balance;
}

export async function fetchPortfolioSnapshot(address: string) {
  const [positionsValue, cashValue, positions] = await Promise.all([
    fetchPositionsValue(address),
    fetchCashValue(address),
    fetchPositions(address),
  ]);

  return { positionsValue, cashValue, positions };
}
