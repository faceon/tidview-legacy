const API_BASE = "https://data-api.polymarket.com";
const POLYGON_RPC_URL = "https://polygon-rpc.com/";
const USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const USDC_DECIMALS = 6;

const HTTP_ERROR_MESSAGE = (context, status) =>
  `${context} failed with HTTP ${status}`;

/**
 * Execute a GET request and parse the JSON response.
 * @param {string} url
 * @param {string} context
 */
async function fetchJson(url, context) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(HTTP_ERROR_MESSAGE(context, res.status));
  }
  return res.json();
}

export async function fetchPositions(address) {
  const url = `${API_BASE}/positions?user=${encodeURIComponent(address)}`;
  const data = await fetchJson(url, "Positions request");
  if (!Array.isArray(data)) {
    throw new Error("Unexpected positions response format");
  }
  return data;
}

function normalizeAddress(address) {
  return address.trim().toLowerCase().replace(/^0x/, "");
}

export async function fetchCashValue(address) {
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

  const json = await res.json();
  if (json?.error) {
    throw new Error(json.error?.message || "Polygon RPC error");
  }

  const hexValue = json?.result;
  if (typeof hexValue !== "string") {
    throw new Error("Invalid Polygon RPC response");
  }

  let balance;
  try {
    const raw = BigInt(hexValue);
    balance = Number(raw) / 10 ** USDC_DECIMALS;
  } catch (error) {
    throw new Error("Failed to parse USDC balance");
  }

  if (!Number.isFinite(balance)) {
    throw new Error("USDC balance is not a finite number");
  }

  return balance;
}
