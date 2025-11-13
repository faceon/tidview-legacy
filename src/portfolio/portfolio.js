import { LitElement, html, css, unsafeCSS } from "lit";
import { parseNumber, formatCurrency } from "../common/format.js";
import portfolioCss from "./portfolio.css";
import "./positions-section.js";
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-tonal-button.js";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const STORAGE_SYNC_KEYS = [
  "address",
  "totalValue",
  "positionsValue",
  "cashBalance",
  "lastUpdated",
  "lastError",
];
const STORAGE_SESSION_KEYS = [
  "positions",
  "positionsUpdatedAt",
  "positionsError",
];

class TidviewPortfolio extends LitElement {
  static styles = css`
    ${unsafeCSS(portfolioCss)}
  `;

  static properties = {
    address: { type: String },
    hasAddress: { type: Boolean },
    totalValue: { type: Number },
    lastUpdated: { type: Number },
    lastError: { type: String },
    statusMessage: { type: String },
    isBusy: { type: Boolean },
    /** @type {any[]} */
    positions: { type: Array },
    positionsLoading: { type: Boolean },
    positionsUpdatedAt: { type: Number },
    positionsValue: { type: Number },
    positionsError: { type: String },
    copied: { type: Boolean },
    cashBalance: { type: Number },
  };

  constructor() {
    super();
    this.address = "";
    this.hasAddress = false;
    this.totalValue = null;
    this.lastUpdated = null;
    this.lastError = "";
    this.statusMessage = "";
    this.isBusy = false;
    this.positions = [];
    this.positionsLoading = false;
    this.positionsUpdatedAt = null;
    this.positionsValue = null;
    this.positionsError = "";
    this.boundOpenMarket = this.openMarket.bind(this);
    this.copied = false;
    this.cashBalance = null;
    this.boundStorageChange = this.handleStorageChange.bind(this);
  }

  render() {
    const positionsValueNumber = parseNumber(this.positionsValue);
    const cashValueNumber = parseNumber(this.cashBalance);
    const storedTotal = parseNumber(this.totalValue);
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
            .positions=${/** @type {any} */ (this.positions)}
            .loading=${this.positionsLoading}
            .openMarket=${this.boundOpenMarket}
          ></positions-section>

          ${this.positionsError
            ? html`<div class="meta error">${this.positionsError}</div>`
            : ""}
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
    this.initFromStorage();
  }

  disconnectedCallback() {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.boundStorageChange);
    }
    super.disconnectedCallback();
  }

  async initFromStorage() {
    try {
      if (!chrome?.storage?.sync || !chrome?.storage?.session) {
        return;
      }

      const [syncData, sessionData] = await Promise.all([
        chrome.storage.sync.get(STORAGE_SYNC_KEYS),
        chrome.storage.session.get(STORAGE_SESSION_KEYS),
      ]);

      const {
        address,
        totalValue,
        lastUpdated,
        lastError,
        positionsValue,
        cashBalance,
      } = syncData;

      this.address = typeof address === "string" ? address.trim() : "";
      this.hasAddress = ADDRESS_REGEX.test(this.address);
      this.totalValue =
        typeof totalValue === "number" ? totalValue : parseNumber(totalValue);
      this.lastUpdated =
        typeof lastUpdated === "number"
          ? lastUpdated
          : parseNumber(lastUpdated);
      this.lastError = lastError ?? "";
      this.positionsValue =
        typeof positionsValue === "number"
          ? positionsValue
          : parseNumber(positionsValue);
      this.cashBalance =
        typeof cashBalance === "number"
          ? cashBalance
          : parseNumber(cashBalance);

      const hasPositionsData = Array.isArray(sessionData?.positions);
      this.positionsLoading = this.hasAddress && !hasPositionsData;

      this.applyPositionsState(
        {
          positions: sessionData?.positions,
          positionsUpdatedAt: sessionData?.positionsUpdatedAt,
          positionsError: sessionData?.positionsError,
        },
        { silent: true },
      );

      this.updateStatusFromState();
    } catch (error) {
      console.error("Failed to initialize from storage", error);
      this.lastError = "Unable to load current status.";
      this.statusMessage = "";
    }
  }

  handleStorageChange(changes, areaName) {
    if (areaName === "sync") {
      let shouldUpdateStatus = false;

      if (Object.prototype.hasOwnProperty.call(changes, "address")) {
        const newAddressRaw = changes.address.newValue;
        const newAddress =
          typeof newAddressRaw === "string" ? newAddressRaw.trim() : "";
        const previousAddress = this.address;
        this.address = newAddress;
        this.hasAddress = ADDRESS_REGEX.test(newAddress);

        if (this.hasAddress && newAddress !== previousAddress) {
          this.positions = [];
          this.positionsValue = null;
          this.positionsUpdatedAt = null;
          this.positionsError = "";
          this.positionsLoading = true;
        }

        if (!this.hasAddress) {
          this.positions = [];
          this.positionsValue = null;
          this.positionsUpdatedAt = null;
          this.positionsError = "";
          this.positionsLoading = false;
        }
      }

      if (Object.prototype.hasOwnProperty.call(changes, "totalValue")) {
        this.totalValue = parseNumber(changes.totalValue.newValue);
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

      return;
    }

    if (areaName === "session") {
      const sessionUpdate = {};

      if (Object.prototype.hasOwnProperty.call(changes, "positions")) {
        sessionUpdate.positions = changes.positions.newValue;
      }

      if (Object.prototype.hasOwnProperty.call(changes, "positionsUpdatedAt")) {
        sessionUpdate.positionsUpdatedAt = changes.positionsUpdatedAt.newValue;
      }

      if (Object.prototype.hasOwnProperty.call(changes, "positionsError")) {
        sessionUpdate.positionsError = changes.positionsError.newValue;
      }

      if (Object.keys(sessionUpdate).length) {
        this.applyPositionsState(sessionUpdate);
      }
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
    this.positionsLoading = true;
    this.positionsError = "";
    try {
      await chrome.storage.sync.set({ address: trimmed });
      this.address = trimmed;
      const refreshOk = await this.requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        this.statusMessage = `Refreshed at ${new Date().toLocaleString()}`;
      }
    } catch (error) {
      console.error("Failed to save address", error);
      this.lastError = error?.message || "Failed to save address.";
      this.statusMessage = "";
      this.positionsLoading = false;
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
    this.positionsLoading = true;
    this.positionsError = "";
    try {
      this.address = trimmed;
      const refreshOk = await this.requestRefresh({ recordTimestamp: true });
      if (refreshOk) {
        this.statusMessage = `Refreshed at ${new Date().toLocaleString()}`;
      }
    } catch (error) {
      console.error("Failed to refresh balance", error);
      this.lastError = error?.message || "Failed to refresh balance.";
      this.statusMessage = "";
      this.positionsLoading = false;
    } finally {
      this.isBusy = false;
    }
  }

  async requestRefresh({ recordTimestamp = false } = {}) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "refresh" });
      if (res?.ok) {
        if (Object.prototype.hasOwnProperty.call(res, "totalValue")) {
          this.totalValue = parseNumber(res.totalValue);
        }
        if (Object.prototype.hasOwnProperty.call(res, "positionsValue")) {
          this.positionsValue = parseNumber(res.positionsValue);
        }
        if (Object.prototype.hasOwnProperty.call(res, "cashBalance")) {
          this.cashBalance = parseNumber(res.cashBalance);
        }
        if (recordTimestamp) {
          this.lastUpdated = Date.now();
          this.statusMessage = `Updated: ${new Date(this.lastUpdated).toLocaleString()}`;
        }
        this.lastError = res?.error ? String(res.error) : "";
        return true;
      }

      const errorMessage = res?.error || "Unknown error";
      this.lastError = errorMessage;
      if (!recordTimestamp && this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      } else {
        this.statusMessage = "";
      }
      this.positionsLoading = false;
      return false;
    } catch (error) {
      console.error("Failed to refresh portfolio", error);
      const message = error?.message || "Failed to refresh balance.";
      this.lastError = message;
      if (!recordTimestamp && this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      } else {
        this.statusMessage = "";
      }
      this.positionsLoading = false;
      return false;
    }
  }

  applyPositionsState(state, { silent = false } = {}) {
    let touched = false;

    if (Object.prototype.hasOwnProperty.call(state, "positions")) {
      const rawPositions = state.positions;
      if (typeof rawPositions === "undefined") {
        // Positions not yet available
      } else if (Array.isArray(rawPositions)) {
        const normalized = rawPositions.map((entry) =>
          this.normalizePosition(entry),
        );
        normalized.sort(
          (a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0),
        );
        this.positions = normalized;
        const computedValue = normalized.reduce((sum, pos) => {
          const value = parseNumber(pos?.currentValue);
          return value != null ? sum + value : sum;
        }, 0);
        this.positionsValue = computedValue;
        touched = true;
      } else {
        this.positions = [];
        this.positionsValue = null;
        touched = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(state, "positionsUpdatedAt")) {
      const rawUpdatedAt = state.positionsUpdatedAt;
      if (typeof rawUpdatedAt !== "undefined") {
        this.positionsUpdatedAt =
          typeof rawUpdatedAt === "number" && !Number.isNaN(rawUpdatedAt)
            ? rawUpdatedAt
            : null;
        touched = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(state, "positionsError")) {
      const errorValue = state.positionsError;
      if (typeof errorValue !== "undefined") {
        this.positionsError = errorValue ? String(errorValue) : "";
        if (!silent && this.positionsError) {
          this.statusMessage = "";
        }
        touched = true;
      }
    }

    if (touched) {
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
