const addressEl = document.getElementById("address");
const valueEl = document.getElementById("value");
const metaEl = document.getElementById("meta");
const errorEl = document.getElementById("error");

init();

async function init() {
  const { address, lastValue, lastUpdated, lastError } = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (address) addressEl.value = address;
  if (typeof lastValue !== "undefined") valueEl.textContent = `Latest value: $${Number(lastValue).toLocaleString()}`;
  if (lastUpdated) metaEl.textContent = `Last updated: ${new Date(lastUpdated).toLocaleString()}`;
  if (lastError) errorEl.textContent = lastError;
}

document.getElementById("save").addEventListener("click", async () => {
  const addr = addressEl.value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    errorEl.textContent = "Please enter a valid 0x address.";
    return;
  }
  await chrome.storage.sync.set({ address: addr });
  errorEl.textContent = "";
  metaEl.textContent = "Saved. Refreshing...";
  const res = await chrome.runtime.sendMessage({ type: "refresh" });
  if (res?.ok) {
    valueEl.textContent = `Latest value: $${Number(res.value).toLocaleString()}`;
    metaEl.textContent = `Updated: ${new Date().toLocaleString()}`;
    errorEl.textContent = "";
  } else {
    errorEl.textContent = res?.error || "Unknown error";
  }
});

document.getElementById("refresh").addEventListener("click", async () => {
  metaEl.textContent = "Refreshing...";
  const res = await chrome.runtime.sendMessage({ type: "refresh" });
  if (res?.ok) {
    valueEl.textContent = `Latest value: $${Number(res.value).toLocaleString()}`;
    metaEl.textContent = `Updated: ${new Date().toLocaleString()}`;
    errorEl.textContent = "";
  } else {
    errorEl.textContent = res?.error || "Unknown error";
  }
});