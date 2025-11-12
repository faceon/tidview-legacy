import { LitElement, html, css, unsafeCSS } from "lit";
import { parseNumber, formatCurrency } from "../common/format.js";
import portfolioCss from "./portfolio.css";
import "./positions-section.js";
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-tonal-button.js";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

class TidviewPortfolio extends LitElement {
  static styles = css`
    ${unsafeCSS(portfolioCss)}
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
    positionsValue: { type: Number },
    copied: { type: Boolean },
    cashBalance: { type: Number },
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
    this.positions = [];
    this.positionsLoading = false;
    this.positionsUpdatedAt = null;
    this.positionsValue = null;
    this.boundOpenMarket = this.openMarket.bind(this);
    this.copied = false;
    this.cashBalance = null;
    this.boundStorageChange = this.handleStorageChange.bind(this);
  }

  render() {
    const positionsValueNumber = parseNumber(this.positionsValue);
    const cashValueNumber = parseNumber(this.cashBalance);
    const storedTotal = parseNumber(this.lastValue);
    const computedTotal =
      storedTotal != null
        ? storedTotal
        : positionsValueNumber != null || cashValueNumber != null
          ? (positionsValueNumber ?? 0) + (cashValueNumber ?? 0)
          : null;

    const totalDisplay = formatCurrency(computedTotal);
    const positionsDisplay = formatCurrency(positionsValueNumber);
    const cashDisplay = formatCurrency(cashValueNumber);
    const hasPortfolioValues =
      totalDisplay !== "—" || positionsDisplay !== "—" || cashDisplay !== "—";

    return html`
      <div class="scroll-area">
        <!-- top row with title, address chip, and buttons -->
        <div class="top-controls">
          <div class="top-row">
            <h2>Portfolio</h2>
            <div
              class="address-chip ${this.hasAddress ? "" : "display-none"}"
              title=${this.address}
              @click=${this.handleCopyAddress}
            >
              ${this.copied ? "copied" : this.formatAddress(this.address)}
            </div>

            <md-outlined-button @click=${() => location.reload()}>
              <md-icon>↺</md-icon>
            </md-outlined-button>

            <md-filled-tonal-button
              type="button"
              class="top-refresh"
              @click=${this.handleRefresh}
              ?disabled=${this.isBusy || !this.hasAddress}
            >
              ${this.isBusy ? "..." : "Refresh"}
            </md-filled-tonal-button>
          </div>

          <div class="address-form ${this.hasAddress ? "display-none" : ""}">
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

        <!-- value card -->
        <div class="value-card">
          <div class="error ${!this.lastError ? "display-none" : ""}">
            ${this.lastError}
          </div>

          <div class="${hasPortfolioValues ? "" : "display-none"}">
            <!-- Total: latest positions value + cash -->
            <div class="value-rows">
              <div class="value-row value-total">
                <span>Total</span>
                <span>${totalDisplay}</span>
              </div>
              <div class="value-row">
                <span>Positions</span>
                <span>${positionsDisplay}</span>
              </div>
              <div class="value-row">
                <span>Cash</span>
                <span>${cashDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- positions -->
        <div class="positions">
          <positions-section
            .positions=${this.positions}
            .loading=${this.positionsLoading}
            .openMarket=${this.boundOpenMarket}
          ></positions-section>

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
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.boundStorageChange);
    }
    this.loadStatus();
  }

  disconnectedCallback() {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.boundStorageChange);
    }
    super.disconnectedCallback();
  }

  async loadStatus() {
    try {
      const {
        address,
        lastValue,
        lastUpdated,
        lastError,
        positionsValue,
        cashBalance,
      } = (await chrome.runtime.sendMessage({ type: "getStatus" })) || {};

      this.positionsValue =
        typeof positionsValue === "number"
          ? positionsValue
          : parseNumber(positionsValue);
      this.cashBalance =
        typeof cashBalance === "number"
          ? cashBalance
          : parseNumber(cashBalance);

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
      console.error("Failed to load portfolio status", error);
      this.lastError = "Unable to load current status.";
    }
  }

  handleStorageChange(changes, areaName) {
    if (areaName !== "sync") {
      return;
    }

    let shouldUpdateStatus = false;

    if (Object.prototype.hasOwnProperty.call(changes, "address")) {
      const newAddressRaw = changes.address.newValue;
      const newAddress =
        typeof newAddressRaw === "string" ? newAddressRaw.trim() : "";
      const previousAddress = this.address;
      this.address = newAddress;
      this.hasAddress = ADDRESS_REGEX.test(newAddress);

      if (this.hasAddress && newAddress !== previousAddress) {
        this.loadPositions({ address: newAddress, silent: true });
      }

      if (!this.hasAddress) {
        this.positions = [];
        this.positionsValue = null;
        this.positionsUpdatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(changes, "lastValue")) {
      this.lastValue = parseNumber(changes.lastValue.newValue);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
      this.positionsValue = parseNumber(changes.positionsValue.newValue);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "cashBalance")) {
      this.cashBalance = parseNumber(changes.cashBalance.newValue);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "lastUpdated")) {
      const rawValue = changes.lastUpdated.newValue;
      this.lastUpdated =
        typeof rawValue === "number" ? rawValue : parseNumber(rawValue);
      shouldUpdateStatus = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "lastError")) {
      const errorValue = changes.lastError.newValue;
      this.lastError = errorValue ? String(errorValue) : "";
      shouldUpdateStatus = true;
    }

    if (shouldUpdateStatus) {
      this.updateStatusFromState();
    }
  }

  updateStatusFromState() {
    if (this.lastError) {
      this.statusMessage = "";
      return;
    }

    if (
      typeof this.lastUpdated === "number" &&
      !Number.isNaN(this.lastUpdated)
    ) {
      this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
    } else {
      this.statusMessage = "";
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
      this.positionsValue = parseNumber(res.positionsValue);
      this.cashBalance = parseNumber(res.cashBalance);
      if (recordTimestamp) {
        this.lastUpdated = Date.now();
        this.statusMessage = `Updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      }
      this.lastError = res?.error ? String(res.error) : "";
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
      this.positionsValue = null;
      return 0;
    }

    if (!ADDRESS_REGEX.test(trimmed)) {
      if (!silent) {
        this.positions = [];
        this.positionsUpdatedAt = null;
        this.statusMessage = "";
      }
      this.positionsValue = null;
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
      this.positionsValue = normalized.reduce((sum, pos) => {
        const value = parseNumber(pos?.currentValue);
        return value != null ? sum + value : sum;
      }, 0);
      return normalized.length;
    } catch (error) {
      console.error("Failed to load positions", error);
      this.positions = [];
      this.positionsUpdatedAt = null;
      this.positionsValue = null;
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

  handleCopyAddress() {
    if (!this.hasAddress) return;
    navigator.clipboard
      .writeText(this.address)
      .then(() => {
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000); // 2초 후 원래 표시로 복귀
      })
      .catch((error) => {
        console.error("Failed to copy address", error);
      });
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

customElements.define("tidview-portfolio", TidviewPortfolio);
