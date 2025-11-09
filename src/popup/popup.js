import { LitElement, html, css } from "lit";
import { repeat } from "lit/directives/repeat.js";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

class TidviewPopup extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 320px;
      padding: 14px;
      box-sizing: border-box;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        "Apple Color Emoji", "Segoe UI Emoji";
    }

    h1 {
      font-size: 16px;
      margin: 0 0 10px;
    }

    label {
      font-size: 12px;
      color: #444;
      display: block;
      margin-bottom: 4px;
    }

    input[type="text"] {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-sizing: border-box;
    }

    .row {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    button {
      flex: 1;
      padding: 8px 10px;
      border: 0;
      border-radius: 10px;
      background: #111;
      color: #fff;
      cursor: pointer;
    }

    button.secondary {
      background: #e9e9e9;
      color: #111;
    }

    button[disabled] {
      opacity: 0.7;
      cursor: default;
    }

    .value {
      margin-top: 8px;
      font-size: 14px;
    }

    .tabs {
      display: flex;
      margin-top: 16px;
      border-bottom: 1px solid #e4e4e4;
      gap: 8px;
    }

    .tab-button {
      flex: 1;
      padding: 10px 0;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      cursor: pointer;
    }

    .tab-button.active {
      border-bottom-color: #111;
      color: #111;
    }

    .tab-panel {
      padding-top: 12px;
    }

    .portfolio {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .portfolio-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 13px;
      font-weight: 600;
    }

    .portfolio-header span {
      font-size: 12px;
      font-weight: 400;
      color: #666;
    }

    .portfolio-summary {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid #f1f1f1;
      border-radius: 10px;
      padding: 10px 12px;
      background: #fafafa;
    }

    .summary-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #555;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 600;
      color: #111;
    }

    .summary-pnl {
      font-size: 13px;
      font-weight: 600;
    }

    .summary-pnl span {
      font-size: 12px;
      font-weight: 400;
      margin-left: 4px;
    }

    .positions-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 320px;
      overflow-y: auto;
    }

    .position-row {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid #f2f2f2;
      cursor: pointer;
    }

    .position-row:first-child {
      border-top: none;
      padding-top: 0;
    }

    .position-thumb {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: #f4f4f4;
    }

    .position-thumb.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #777;
    }

    .position-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .position-title {
      font-size: 13px;
      font-weight: 600;
      color: #111;
      margin: 0;
    }

    .position-subtitle {
      font-size: 11px;
      color: #666;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .position-stats {
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }

    .position-stat-value {
      font-size: 14px;
      font-weight: 600;
      color: #111;
    }

    .position-stat-pnl {
      font-size: 11px;
    }

    .history-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 320px;
      overflow-y: auto;
    }

    .history-row {
      display: flex;
      gap: 10px;
      padding: 12px 0;
      border-top: 1px solid #f2f2f2;
      cursor: pointer;
    }

    .history-row:first-child {
      border-top: none;
      padding-top: 0;
    }

    .history-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }

    .history-title {
      font-size: 13px;
      font-weight: 600;
      color: #111;
    }

    .history-meta {
      font-size: 11px;
      color: #666;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .history-side.buy {
      color: #107c41;
    }

    .history-side.sell {
      color: #b00020;
    }

    .positive {
      color: #107c41;
    }

    .negative {
      color: #b00020;
    }

    .neutral {
      color: #444;
    }

    .meta {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }

    .error {
      margin-top: 8px;
      font-size: 12px;
      color: #b00020;
    }
  `;

  static properties = {
    address: { type: String },
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
  };

  constructor() {
    super();
    this.address = "";
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
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadStatus();
  }

  async loadStatus() {
    try {
      const { address, lastValue, lastUpdated, lastError } =
        (await chrome.runtime.sendMessage({ type: "getStatus" })) || {};

      this.address = address ?? "";
      this.lastValue =
        typeof lastValue === "number" ? lastValue : this.parseNumber(lastValue);
      this.lastUpdated = typeof lastUpdated === "number" ? lastUpdated : null;
      this.lastError = lastError ?? "";

      if (this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      }

      if (this.address && ADDRESS_REGEX.test(this.address)) {
        await this.loadPositions({ address: this.address, silent: true });
      }
    } catch (error) {
      console.error("Failed to load popup status", error);
      this.lastError = "Unable to load current status.";
    }
  }

  parseNumber(value) {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
      this.lastValue = this.parseNumber(res.value);
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
      currentValue: this.parseNumber(raw?.currentValue),
      cashPnl: this.parseNumber(raw?.cashPnl),
      percentPnl: this.parseNumber(raw?.percentPnl),
      size: this.parseNumber(raw?.size),
      avgPrice: this.parseNumber(raw?.avgPrice),
      curPrice: this.parseNumber(raw?.curPrice),
      endDate: raw?.endDate || "",
      icon: raw?.icon || "",
      initialValue: this.parseNumber(raw?.initialValue),
      realizedPnl: this.parseNumber(raw?.realizedPnl),
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
    };
  }

  formatCurrency(value) {
    const num = this.parseNumber(value);
    if (num == null) return "—";
    return currencyFormatter.format(num);
  }

  formatSignedCurrency(value) {
    const num = this.parseNumber(value);
    if (num == null) return "—";
    const formatted = currencyFormatter.format(Math.abs(num));
    return num >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  formatPercent(value, { digits = 1 } = {}) {
    const num = this.parseNumber(value);
    if (num == null) return "—";
    const formatted = num.toFixed(digits);
    return num >= 0 ? `+${formatted}%` : `${formatted}%`;
  }

  formatNumber(value, options = {}) {
    const num = this.parseNumber(value);
    if (num == null) return "—";
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    });
    return formatter.format(num);
  }

  formatDate(value) {
    if (!value) return "No end date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No end date";
    return date.toLocaleDateString();
  }

  formatTimestamp(value) {
    if (!value) return "Unknown time";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString();
  }

  formatSide(side) {
    if (!side) return "";
    return side.toUpperCase();
  }

  trendClass(value) {
    const num = this.parseNumber(value);
    if (num == null || num === 0) return "neutral";
    return num > 0 ? "positive" : "negative";
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

  renderPosition(position) {
    const avgPriceText =
      position.avgPrice != null
        ? `@ ${this.formatNumber(position.avgPrice, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          })}`
        : "";
    const curPriceText =
      position.curPrice != null
        ? `→ ${this.formatNumber(position.curPrice, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          })}`
        : "";
    const sizeText =
      position.size != null ? `Size ${this.formatNumber(position.size)}` : "";

    const subtitleParts = [
      position.outcome,
      sizeText,
      avgPriceText,
      curPriceText,
    ].filter(Boolean);

    return html`
      <li
        class="position-row"
        @click=${() => this.openMarket(position.slug, position.eventSlug)}
        role="button"
        tabindex="0"
        @keydown=${(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.openMarket(position.slug, position.eventSlug);
          }
        }}
      >
        ${position.icon
          ? html`<img
              class="position-thumb"
              src=${position.icon}
              alt=""
              loading="lazy"
            />`
          : html`<div class="position-thumb placeholder">
              ${position.outcome?.[0] || "?"}
            </div>`}
        <div class="position-content">
          <div class="position-title">${position.title}</div>
          ${subtitleParts.length
            ? html`<div class="position-subtitle">
                ${subtitleParts.map((part) => html`<span>${part}</span>`)}
              </div>`
            : ""}
          <div class="position-subtitle">
            ${this.formatDate(position.endDate)}
          </div>
        </div>
        <div class="position-stats">
          <div class="position-stat-value">
            ${this.formatCurrency(position.currentValue)}
          </div>
          <div class="position-stat-pnl ${this.trendClass(position.cashPnl)}">
            ${this.formatSignedCurrency(position.cashPnl)}
            ${position.percentPnl != null
              ? html`<span>(${this.formatPercent(position.percentPnl)})</span>`
              : ""}
          </div>
        </div>
      </li>
    `;
  }

  renderTrade(trade) {
    const subtitleParts = [
      `${this.formatNumber(trade.size)} @ ${this.formatNumber(trade.price, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })}`,
      this.formatTimestamp(trade.timestamp),
    ];

    const sideClass =
      trade.side === "BUY" ? "history-side buy" : "history-side sell";

    return html`
      <li
        class="history-row"
        @click=${() => this.openMarket(trade.slug, trade.eventSlug)}
        role="button"
        tabindex="0"
        @keydown=${(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.openMarket(trade.slug, trade.eventSlug);
          }
        }}
      >
        ${trade.icon
          ? html`<img class="position-thumb" src=${trade.icon} alt="" />`
          : html`<div class="position-thumb placeholder">
              ${trade.outcome?.[0] || "?"}
            </div>`}
        <div class="history-content">
          <div class="history-title">${trade.title}</div>
          <div class="history-meta">
            <span class=${sideClass}>${this.formatSide(trade.side)}</span>
            ${trade.outcome ? html`<span>${trade.outcome}</span>` : ""}
            ${subtitleParts.map((text) => html`<span>${text}</span>`)}
          </div>
        </div>
      </li>
    `;
  }

  render() {
    const totalCurrentValue = this.positions.reduce(
      (sum, pos) => sum + (this.parseNumber(pos.currentValue) ?? 0),
      0,
    );
    const totalCashPnl = this.positions.reduce(
      (sum, pos) => sum + (this.parseNumber(pos.cashPnl) ?? 0),
      0,
    );
    const totalInitialValue = this.positions.reduce(
      (sum, pos) => sum + (this.parseNumber(pos.initialValue) ?? 0),
      0,
    );
    const totalPercent =
      totalInitialValue > 0 ? (totalCashPnl / totalInitialValue) * 100 : null;

    const isPositionsActive = this.activeTab === "positions";
    const isHistoryActive = this.activeTab === "history";
    const tabError = isHistoryActive ? this.tradesError : this.positionsError;
    const errorMessage = this.lastError || tabError;

    return html`
      <h1>Tidview</h1>
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
        <button @click=${this.handleSave} ?disabled=${this.isBusy}>
          ${this.isBusy ? "Working..." : "Save"}
        </button>
        <button
          class="secondary"
          @click=${this.handleRefresh}
          ?disabled=${this.isBusy}
        >
          Refresh
        </button>
      </div>
      ${this.lastValue != null
        ? html`<div class="value">
            Latest value: $${Number(this.lastValue).toLocaleString()}
          </div>`
        : ""}
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
      ${isPositionsActive
        ? html`
            <section class="tab-panel">
              <section class="portfolio">
                <div class="portfolio-header">
                  <span>Portfolio</span>
                  <span>${this.positions.length} positions</span>
                </div>
                <div class="portfolio-summary">
                  <div class="summary-block">
                    <span>Current Value</span>
                    <span class="summary-value">
                      ${this.formatCurrency(totalCurrentValue)}
                    </span>
                  </div>
                  <div class="summary-block">
                    <span>Total PnL</span>
                    <span class="summary-pnl ${this.trendClass(totalCashPnl)}">
                      ${this.formatSignedCurrency(totalCashPnl)}
                      ${totalPercent != null
                        ? html`<span
                            >(${this.formatPercent(totalPercent)})</span
                          >`
                        : ""}
                    </span>
                  </div>
                </div>
                ${this.positionsLoading
                  ? html`<div class="meta">Loading positions...</div>`
                  : this.positions.length === 0
                    ? html`<div class="meta">
                        No positions found for this address.
                      </div>`
                    : html`<ul class="positions-list">
                        ${repeat(
                          this.positions,
                          (pos) => pos.id,
                          (pos) => this.renderPosition(pos),
                        )}
                      </ul>`}
              </section>
            </section>
          `
        : ""}
      ${isHistoryActive
        ? html`
            <section class="tab-panel">
              <div class="portfolio-header">
                <span>Trade History</span>
                <span>${this.trades.length} trades</span>
              </div>
              ${this.tradesLoading
                ? html`<div class="meta">Loading history...</div>`
                : this.trades.length === 0
                  ? html`<div class="meta">
                      No trades found for this address.
                    </div>`
                  : html`<ul class="history-list">
                      ${repeat(
                        this.trades,
                        (trade) => trade.id,
                        (trade) => this.renderTrade(trade),
                      )}
                    </ul>`}
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
      ${errorMessage ? html`<div class="error">${errorMessage}</div>` : ""}
    `;
  }
}

customElements.define("tidview-popup", TidviewPopup);
