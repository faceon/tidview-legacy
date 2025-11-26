const POLYMARKET_API = "https://data-api.polymarket.com";
const POLYGON_API = "https://polygon-rpc.com/";
const USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const USDC_DECIMALS = 6;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Fetch error " + res.status);
  }
  return res.json();
}

export async function fetchPositions(proxyWallet) {
  const url = `${POLYMARKET_API}/positions?user=${encodeURIComponent(proxyWallet)}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data)) {
    throw new Error("Unexpected positions response format");
  }
  return data;
}

export async function fetchCashValue(proxyWallet) {
  const addressNoPrefix = proxyWallet.trim().toLowerCase().replace(/^0x/, "");
  const data = ERC20_BALANCE_OF_SELECTOR + addressNoPrefix.padStart(64, "0");

  const res = await fetch(POLYGON_API, {
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
    throw new Error("Polygon RPC request", res.status);
  }

  const json = await res.json();
  if (json?.error) {
    throw new Error(json.error?.message || "Polygon RPC error");
  }

  const hexValue = json?.result;
  if (typeof hexValue !== "string") {
    throw new Error("Invalid Polygon RPC response");
  }

  let cashValue;
  try {
    const raw = BigInt(hexValue);
    cashValue = Number(raw) / 10 ** USDC_DECIMALS;
  } catch (error) {
    throw new Error("Failed to parse USDC value");
  }

  if (!Number.isFinite(cashValue)) {
    throw new Error("USDC value is not a finite number");
  }

  return cashValue;
}
