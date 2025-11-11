import { LitElement, html, css, unsafeCSS } from "lit";
import { parseNumber } from "./components/format.js";
import popupCss from "./popup.css";
import "./components/positions-panel.js";
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-tonal-button.js";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

class TidviewPopup extends LitElement {
  static styles = css`
    ${unsafeCSS(popupCss)}
  `;

  static properties = {
    address: { type: String },
    hasAddress: { type: Boolean },
    lastValue: { type: Number },
    lastUpdated: { type: Number },
    lastError: { type: String },
    statusMessage: { type: String },
    isBusy: { type: Boolean },
    positions: { type: Array },
    positionsLoading: { type: Boolean },
    positionsUpdatedAt: { type: Number },
  };

  constructor() {
    super();
    this.address = "";
    this.hasAddress = false;
    this.lastValue = null;
    this.lastUpdated = null;
    this.lastError = "";
    this.statusMessage = "";
    this.isBusy = false;
    /** @type {any[]} */
    this.positions = [];
    this.positionsLoading = false;
    this.positionsUpdatedAt = null;
    this.boundOpenMarket = this.openMarket.bind(this);
  }

  render() {
    return html`
      <div class="scroll-area">
        <div class="top-controls">
          <div class="top-row">
            <h2>Portfolio</h2>

            <!-- wallet address -->
            <div
              class="address-chip"
              title=${this.address}
              ?hidden=${!this.hasAddress}
            >
              ${this.formatAddress(this.address)}
            </div>

            <!-- page reload button for debugging -->
            <md-outlined-button @click=${() => location.reload()}>
              <md-icon>↺</md-icon>
            </md-outlined-button>

            <!-- data fetch refresh button -->
            <md-filled-tonal-button
              type="button"
              class="top-refresh"
              @click=${this.handleRefresh}
              ?disabled=${this.isBusy || !this.hasAddress}
            >
              ${this.isBusy ? "..." : "Refresh"}
            </md-filled-tonal-button>
          </div>

          <!-- wallet address input -->
          <div
            class="address-form"
            style="display: ${this.hasAddress ? "none" : "block"}"
          >
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
        </div>
        <div class="content">
          ${this.lastError
            ? html`<div class="error">${this.lastError}</div>`
            : ""}
          ${this.lastValue != null
            ? html`<div class="value-card">
                Latest value: $${Number(this.lastValue).toLocaleString()}
              </div>`
            : ""}
          <section class="tab-panel">
            <tidview-positions-panel
              .positions=${/** @type {any} */ (this.positions)}
              .loading=${this.positionsLoading}
              .openMarket=${this.boundOpenMarket}
            ></tidview-positions-panel>
          </section>
          ${this.statusMessage
            ? html`<div class="meta">${this.statusMessage}</div>`
            : ""}
          ${this.positionsUpdatedAt
            ? html`<div class="meta">
                Positions refreshed:
                ${new Date(this.positionsUpdatedAt).toLocaleString()}
              </div>`
            : ""}
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadStatus();
  }

  async loadStatus() {
    try {
      const { address, lastValue, lastUpdated, lastError } =
        (await chrome.runtime.sendMessage({ type: "getStatus" })) || {};

      this.address = typeof address === "string" ? address.trim() : "";
      this.hasAddress = ADDRESS_REGEX.test(this.address);
      this.lastValue =
        typeof lastValue === "number" ? lastValue : parseNumber(lastValue);
      this.lastUpdated = typeof lastUpdated === "number" ? lastUpdated : null;
      this.lastError = lastError ?? "";

      if (this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      }

      if (this.hasAddress) {
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

  async handleSave() {
    const trimmed = this.address.trim();
    if (!ADDRESS_REGEX.test(trimmed)) {
      this.lastError = "Please enter a valid 0x address.";
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.lastError = "";
    this.statusMessage = "Saved. Refreshing...";
    try {
      await chrome.storage.sync.set({ address: trimmed });
      this.address = trimmed;
      const [badgeOk] = await Promise.all([
        this.refreshBalance({ recordTimestamp: true }),
        this.loadPositions({ address: trimmed }),
      ]);
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
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.lastError = "";
    this.statusMessage = "Refreshing...";
    try {
      this.address = trimmed;
      const [badgeOk] = await Promise.all([
        this.refreshBalance({ recordTimestamp: true }),
        this.loadPositions({ address: trimmed }),
      ]);
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
        this.statusMessage = "";
      }
      return 0;
    }

    if (!ADDRESS_REGEX.test(trimmed)) {
      if (!silent) {
        this.positions = [];
        this.positionsUpdatedAt = null;
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
      return normalized.length;
    } catch (error) {
      console.error("Failed to load positions", error);
      this.positions = [];
      this.positionsUpdatedAt = null;
      if (!silent) {
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
}

customElements.define("tidview-popup", TidviewPopup);
