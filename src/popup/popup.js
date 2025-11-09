import { LitElement, html, css } from "lit";
import "./components/positions-panel.js";
import "./components/history-panel.js";
import { parseNumber } from "./components/format.js";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HISTORY_PAGE_SIZE = 5;

class TidviewPopup extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 360px;
      max-height: 600px;
      box-sizing: border-box;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        "Apple Color Emoji", "Segoe UI Emoji";
      color: #111;
      background: #fff;
    }

    .scroll-area {
      max-height: 600px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .top-controls {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #fff;
      padding: 14px;
      border-bottom: 1px solid #ececec;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    h1 {
      font-size: 16px;
      margin: 0;
    }

    .address-chip {
      font-size: 12px;
      color: #333;
      background: #f3f3f3;
      border-radius: 999px;
      padding: 4px 10px;
      width: max-content;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .address-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-size: 12px;
      color: #444;
    }

    input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 13px;
    }

    .row {
      display: flex;
      gap: 8px;
    }

    button {
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition:
        background 0.2s ease,
        opacity 0.2s ease;
    }

    .primary-button {
      flex: 1;
      padding: 9px 12px;
      background: #111;
      color: #fff;
    }

    .secondary-button {
      flex: 1;
      padding: 9px 12px;
      background: #e9e9e9;
      color: #111;
    }

    .top-refresh {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: #111;
      color: #fff;
      font-size: 12px;
      line-height: 1;
      min-width: 0;
    }

    button[disabled] {
      opacity: 0.5;
      cursor: default;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #e4e4e4;
      padding-bottom: 2px;
    }

    .tab-button {
      flex: 1;
      padding: 10px 0;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
    }

    .tab-button.active {
      border-bottom-color: #111;
      color: #111;
    }

    .content {
      padding: 16px 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .value-card {
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #f1f1f1;
      background: #fafafa;
      font-size: 14px;
    }

    .tab-panel {
      display: block;
    }

    .meta {
      font-size: 12px;
      color: #666;
    }

    .error {
      padding: 12px;
      border-radius: 10px;
      background: #ffe6e6;
      color: #b00020;
      font-size: 12px;
    }
  `;

  static properties = {
    address: { type: String },
    addressPersisted: { type: Boolean },
    lastValue: { type: Number },
    lastUpdated: { type: Number },
    lastError: { type: String },
    statusMessage: { type: String },
    isBusy: { type: Boolean },
    positions: { type: Array },
    positionsLoading: { type: Boolean },
    positionsUpdatedAt: { type: Number },
    positionsError: { type: String },
    trades: { type: Array },
    tradesLoading: { type: Boolean },
    tradesUpdatedAt: { type: Number },
    tradesError: { type: String },
    activeTab: { type: String },
    historyPage: { type: Number },
  };

  constructor() {
    super();
    this.address = "";
    this.addressPersisted = false;
    this.lastValue = null;
    this.lastUpdated = null;
    this.lastError = "";
    this.statusMessage = "";
    this.isBusy = false;
    this.positions = [];
    this.positionsLoading = false;
    this.positionsUpdatedAt = null;
    this.positionsError = "";
    this.trades = [];
    this.tradesLoading = false;
    this.tradesUpdatedAt = null;
    this.tradesError = "";
    this.activeTab = "positions";
    this.historyPage = 1;
    this.boundOpenMarket = this.openMarket.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadStatus();
  }

  async loadStatus() {
    try {
      const { address, lastValue, lastUpdated, lastError } =
        (await chrome.runtime.sendMessage({ type: "getStatus" })) || {};

      const storedAddress = typeof address === "string" ? address.trim() : "";
      this.address = storedAddress;
      this.addressPersisted = ADDRESS_REGEX.test(storedAddress);
      this.lastValue =
        typeof lastValue === "number" ? lastValue : parseNumber(lastValue);
      this.lastUpdated = typeof lastUpdated === "number" ? lastUpdated : null;
      this.lastError = lastError ?? "";

      if (this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      }

      if (this.addressPersisted) {
        await this.loadPositions({ address: this.address, silent: true });
      }
    } catch (error) {
      console.error("Failed to load popup status", error);
      this.lastError = "Unable to load current status.";
    }
  }

  handleInput(event) {
    this.address = event.target.value;
  }

  async setActiveTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    if (tab === "positions") {
      if (
        this.address &&
        ADDRESS_REGEX.test(this.address) &&
        !this.positionsLoading &&
        this.positions.length === 0
      ) {
        await this.loadPositions({ address: this.address, silent: true });
      }
      return;
    }

    if (
      tab === "history" &&
      this.address &&
      ADDRESS_REGEX.test(this.address) &&
      !this.tradesLoading &&
      this.trades.length === 0
    ) {
      try {
        await this.loadTrades({ address: this.address });
      } catch (error) {
        console.error("Failed to load trades on tab switch", error);
      }
    }
  }

  async handleSave() {
    const trimmed = this.address.trim();
    if (!ADDRESS_REGEX.test(trimmed)) {
      this.lastError = "Please enter a valid 0x address.";
      this.positionsError = "";
      this.tradesError = "";
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.lastError = "";
    this.positionsError = "";
    this.statusMessage = "Saved. Refreshing...";
    try {
      await chrome.storage.sync.set({ address: trimmed });
      this.address = trimmed;
      this.addressPersisted = true;
      const fetches = [
        this.refreshBalance({ recordTimestamp: true }),
        this.loadPositions({ address: trimmed }),
      ];
      if (this.activeTab === "history" || this.trades.length > 0) {
        fetches.push(
          this.loadTrades({
            address: trimmed,
            silent: this.activeTab !== "history",
          }),
        );
      }
      const [badgeOk] = await Promise.all(fetches);
      if (badgeOk) {
        this.statusMessage = `Refreshed at ${new Date().toLocaleString()}`;
      }
    } catch (error) {
      console.error("Failed to save address", error);
      this.lastError = error?.message || "Failed to save address.";
      this.statusMessage = "";
    } finally {
      this.isBusy = false;
    }
  }

  async handleRefresh() {
    const trimmed = this.address.trim();
    if (!ADDRESS_REGEX.test(trimmed)) {
      this.lastError = "Please enter a valid 0x address.";
      this.positionsError = "";
      this.tradesError = "";
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.lastError = "";
    this.positionsError = "";
    this.statusMessage = "Refreshing...";
    try {
      this.address = trimmed;
      const fetches = [
        this.refreshBalance({ recordTimestamp: true }),
        this.loadPositions({ address: trimmed }),
      ];
      fetches.push(
        this.loadTrades({
          address: trimmed,
          silent: this.activeTab !== "history",
        }),
      );
      const [badgeOk] = await Promise.all(fetches);
      if (badgeOk) {
        this.statusMessage = `Refreshed at ${new Date().toLocaleString()}`;
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      this.lastError = error?.message || "Failed to refresh balance.";
      this.statusMessage = "";
    } finally {
      this.isBusy = false;
    }
  }

  async refreshBalance({ recordTimestamp = false } = {}) {
    const res = await chrome.runtime.sendMessage({ type: "refresh" });
    if (res?.ok) {
      this.lastValue = parseNumber(res.value);
      if (recordTimestamp) {
        this.lastUpdated = Date.now();
        this.statusMessage = `Updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      }
      this.lastError = "";
      return true;
    } else {
      this.lastError = res?.error || "Unknown error";
      if (!recordTimestamp && this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      } else {
        this.statusMessage = "";
      }
      return false;
    }
  }

  async loadPositions({ address = this.address, silent = false } = {}) {
    const trimmed = address?.trim();

    if (!trimmed) {
      if (!silent) {
        this.positions = [];
        this.positionsUpdatedAt = null;
        this.positionsError = "Please enter a valid 0x address.";
        this.statusMessage = "";
      }
      return 0;
    }

    if (!ADDRESS_REGEX.test(trimmed)) {
      if (!silent) {
        this.positions = [];
        this.positionsUpdatedAt = null;
        this.positionsError = "Please enter a valid 0x address.";
        this.statusMessage = "";
      }
      return 0;
    }

    this.positionsLoading = true;

    try {
      const url = `https://data-api.polymarket.com/positions?user=${encodeURIComponent(
        trimmed,
      )}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Positions request failed with HTTP ${response.status}`,
        );
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected positions response format");
      }

      const normalized = data.map((entry) => this.normalizePosition(entry));
      normalized.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));

      this.positions = normalized;
      this.positionsUpdatedAt = Date.now();
      this.positionsError = "";
      return normalized.length;
    } catch (error) {
      console.error("Failed to load positions", error);
      this.positions = [];
      this.positionsUpdatedAt = null;
      if (!silent) {
        this.positionsError = error?.message || "Failed to load positions.";
        this.statusMessage = "";
      }
      if (!silent) {
        throw error;
      }
      return 0;
    } finally {
      this.positionsLoading = false;
    }
  }

  async loadTrades({ address = this.address, silent = false } = {}) {
    const trimmed = address?.trim();

    if (!trimmed) {
      if (!silent) {
        this.trades = [];
        this.tradesUpdatedAt = null;
        this.tradesError = "Please enter a valid 0x address.";
        this.statusMessage = "";
      }
      return 0;
    }

    if (!ADDRESS_REGEX.test(trimmed)) {
      if (!silent) {
        this.trades = [];
        this.tradesUpdatedAt = null;
        this.tradesError = "Please enter a valid 0x address.";
        this.statusMessage = "";
      }
      return 0;
    }

    this.tradesLoading = true;

    try {
      const url = `https://data-api.polymarket.com/trades?user=${encodeURIComponent(
        trimmed,
      )}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Trades request failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected trades response format");
      }

      const normalized = data.map((entry) => this.normalizeTrade(entry));
      normalized.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

      this.trades = normalized;
      this.tradesUpdatedAt = Date.now();
      this.tradesError = "";
      this.historyPage = 1;
      return normalized.length;
    } catch (error) {
      console.error("Failed to load trades", error);
      this.trades = [];
      this.tradesUpdatedAt = null;
      if (!silent) {
        this.tradesError = error?.message || "Failed to load trade history.";
        this.statusMessage = "";
      }
      if (!silent) {
        throw error;
      }
      return 0;
    } finally {
      this.tradesLoading = false;
    }
  }

  normalizePosition(raw) {
    const id =
      raw?.asset ||
      (raw?.slug && raw?.outcome
        ? `${raw.slug}-${raw.outcome}`
        : raw?.conditionId ||
          raw?.title ||
          `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    return {
      id,
      title: raw?.title || raw?.slug || "Unnamed market",
      outcome: raw?.outcome || "",
      currentValue: parseNumber(raw?.currentValue),
      cashPnl: parseNumber(raw?.cashPnl),
      percentPnl: parseNumber(raw?.percentPnl),
      size: parseNumber(raw?.size),
      avgPrice: parseNumber(raw?.avgPrice),
      curPrice: parseNumber(raw?.curPrice),
      endDate: raw?.endDate || "",
      icon: raw?.icon || "",
      initialValue: parseNumber(raw?.initialValue),
      realizedPnl: parseNumber(raw?.realizedPnl),
      slug: raw?.slug || "",
      eventSlug: raw?.eventSlug || "",
    };
  }

  normalizeTrade(raw) {
    const toNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const timestamp = toNumber(raw?.timestamp);
    const normalizeStatus = (value) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";
    const statusText = normalizeStatus(
      raw?.marketStatus ||
        raw?.market_status ||
        raw?.status ||
        raw?.eventStatus ||
        raw?.state ||
        raw?.resolution ||
        raw?.event_state,
    );
    const closedStatuses = [
      "closed",
      "settled",
      "resolved",
      "ended",
      "finished",
      "resolved_market",
      "graded",
    ];
    const isClosedFromStatus = statusText
      ? closedStatuses.some((keyword) => statusText.includes(keyword))
      : false;
    const closedFlags = [
      raw?.marketClosed,
      raw?.market_closed,
      raw?.closed,
      raw?.isClosed,
      raw?.resolved,
      raw?.isResolved,
      raw?.marketResolved,
    ];
    const isClosedFromFlags = closedFlags.some((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return (
          normalized === "true" ||
          normalized === "closed" ||
          normalized === "resolved" ||
          normalized === "settled" ||
          normalized === "1" ||
          normalized === "yes"
        );
      }
      return value === true || value === 1;
    });
    const isClosed = isClosedFromStatus || isClosedFromFlags;

    return {
      id:
        raw?.transactionHash ||
        raw?.asset ||
        `trade-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: raw?.title || raw?.slug || "Unnamed market",
      outcome: raw?.outcome || "",
      slug: raw?.slug || "",
      eventSlug: raw?.eventSlug || "",
      icon: raw?.icon || "",
      side: (raw?.side || "").toUpperCase(),
      size: toNumber(raw?.size),
      price: toNumber(raw?.price),
      timestamp: timestamp != null ? timestamp * 1000 : null,
      isClosed,
    };
  }
  openMarket(slug, fallbackSlug) {
    const finalSlug = slug || fallbackSlug;
    if (!finalSlug) return;
    const url = `https://polymarket.com/market/${finalSlug}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  onHistoryPageChange(event) {
    const nextPage = Number(event?.detail?.page);
    if (!Number.isFinite(nextPage)) {
      return;
    }
    const normalized = Math.max(1, Math.floor(nextPage));
    if (normalized !== this.historyPage) {
      this.historyPage = normalized;
    }
  }

  formatAddress(address) {
    if (typeof address !== "string") {
      return "";
    }
    const trimmed = address.trim();
    if (trimmed.length <= 12) {
      return trimmed;
    }
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  render() {
    const isPositionsActive = this.activeTab === "positions";
    const isHistoryActive = this.activeTab === "history";
    const tabError = isHistoryActive ? this.tradesError : this.positionsError;
    const errorMessage = this.lastError || tabError;

    const trimmedAddress =
      typeof this.address === "string" ? this.address.trim() : "";
    const hasSavedAddress =
      this.addressPersisted && ADDRESS_REGEX.test(trimmedAddress);
    const refreshDisabled = this.isBusy || !hasSavedAddress;

    return html`
      <div class="scroll-area">
        <div class="top-controls">
          <div class="top-row">
            <h1>Tidview</h1>
            <button
              type="button"
              class="top-refresh"
              @click=${this.handleRefresh}
              ?disabled=${refreshDisabled}
              aria-label="Refresh data"
            >
              ${this.isBusy ? "..." : "Refresh"}
            </button>
          </div>
          ${hasSavedAddress
            ? html`
                <div class="address-chip" title=${trimmedAddress}>
                  ${this.formatAddress(trimmedAddress)}
                </div>
              `
            : html`
                <div class="address-form">
                  <label for="address">Your 0x address</label>
                  <input
                    id="address"
                    type="text"
                    placeholder="0x...40 hex chars"
                    .value=${this.address}
                    @input=${this.handleInput}
                    autocomplete="off"
                  />
                  <div class="row">
                    <button
                      type="button"
                      class="primary-button"
                      @click=${this.handleSave}
                      ?disabled=${this.isBusy}
                    >
                      ${this.isBusy ? "Working..." : "Save"}
                    </button>
                    <button
                      type="button"
                      class="secondary-button"
                      @click=${this.handleRefresh}
                      ?disabled=${this.isBusy}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              `}
          <div class="tabs">
            <button
              type="button"
              class="tab-button ${isPositionsActive ? "active" : ""}"
              @click=${() => this.setActiveTab("positions")}
            >
              Positions
            </button>
            <button
              type="button"
              class="tab-button ${isHistoryActive ? "active" : ""}"
              @click=${() => this.setActiveTab("history")}
            >
              History
            </button>
          </div>
        </div>
        <div class="content">
          ${errorMessage ? html`<div class="error">${errorMessage}</div>` : ""}
          ${this.lastValue != null
            ? html`<div class="value-card">
                Latest value: $${Number(this.lastValue).toLocaleString()}
              </div>`
            : ""}
          ${isPositionsActive
            ? html`
                <section class="tab-panel">
                  <tidview-positions-panel
                    .positions=${this.positions}
                    .loading=${this.positionsLoading}
                    .openMarket=${this.boundOpenMarket}
                  ></tidview-positions-panel>
                </section>
              `
            : ""}
          ${isHistoryActive
            ? html`
                <section class="tab-panel">
                  <tidview-history-panel
                    .trades=${this.trades}
                    .loading=${this.tradesLoading}
                    .openMarket=${this.boundOpenMarket}
                    .page=${this.historyPage}
                    .pageSize=${HISTORY_PAGE_SIZE}
                    @page-change=${this.onHistoryPageChange}
                  ></tidview-history-panel>
                </section>
              `
            : ""}
          ${this.statusMessage
            ? html`<div class="meta">${this.statusMessage}</div>`
            : ""}
          ${isPositionsActive && this.positionsUpdatedAt
            ? html`<div class="meta">
                Positions refreshed:
                ${new Date(this.positionsUpdatedAt).toLocaleString()}
              </div>`
            : ""}
          ${isHistoryActive && this.tradesUpdatedAt
            ? html`<div class="meta">
                History refreshed:
                ${new Date(this.tradesUpdatedAt).toLocaleString()}
              </div>`
            : ""}
        </div>
      </div>
    `;
  }
}

customElements.define("tidview-popup", TidviewPopup);
