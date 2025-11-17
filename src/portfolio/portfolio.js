import { LitElement, html, css, unsafeCSS } from "lit";
import { parseNumber, formatCurrency } from "../common/format.js";
import cfg from "../common/config.js";
import portfolioCss from "./portfolio.css";
import "./positions-section.js";
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/iconButton/icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/text-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/menu/menu.js";
import "@material/web/menu/menu-item.js";

class TidviewPortfolio extends LitElement {
  static styles = css`
    ${unsafeCSS(portfolioCss)}
  `;

  static properties = {
    address: { type: String },
    hasAddress: { type: Boolean },
    valuesUpdatedAt: { type: Number },
    valuesError: { type: String },
    statusMessage: { type: String },
    isBusy: { type: Boolean },
    /** @type {any[]} */
    positions: { type: Array },
    positionsLoading: { type: Boolean },
    positionsUpdatedAt: { type: Number },
    positionsValue: { type: Number },
    positionsError: { type: String },
    copied: { type: Boolean },
    cashValue: { type: Number },
    openInPopup: { type: Boolean },
  };

  constructor() {
    super();
    this.address = "";
    this.hasAddress = false;
    this.valuesUpdatedAt = null;
    this.valuesError = "";
    this.statusMessage = "";
    this.isBusy = false;
    this.positions = [];
    this.positionsLoading = false;
    this.positionsUpdatedAt = null;
    this.positionsValue = null;
    this.positionsError = "";
    this.copied = false;
    this.cashValue = null;
    this.openInPopup = false;
    this.lastActiveTabId = null;
  }

  render() {
    const positionsValue = parseNumber(this.positionsValue);
    const cashValue = parseNumber(this.cashValue);
    const totalValue =
      positionsValue == null && cashValue == null
        ? null
        : (positionsValue ?? 0) + (cashValue ?? 0);

    const displayValues = {
      total: formatCurrency(totalValue),
      positions: formatCurrency(positionsValue),
      cash: formatCurrency(cashValue),
    };
    const hasPortfolioValues = Object.values(displayValues).some(
      (value) => value !== "—",
    );

    return html`
      <div class="scroll-area">
        <!-- top row with title, address chip, and buttons -->
        <div class="top-controls">
          <div class="top-row">
            <img
              style="width: 16px; height: 16px"
              src="icons/icon16.png"
              alt="Tidview Logo"
            />
            <h3>Tidview</h3>
            <md-filled-icon-button
              @click=${this.handleRefresh}
              ?disabled=${this.isBusy || !this.hasAddress}
            >
              <md-icon>refresh</md-icon>
            </md-filled-icon-button>

            <md-icon-button
              style="position: relative"
              id="settings-anchor"
              @click=${() => {
                const menuEl = this.renderRoot.querySelector("#settings-menu");
                menuEl.open = !menuEl.open;
              }}
            >
              <md-icon>settings</md-icon>
            </md-icon-button>
            <md-menu id="settings-menu" anchor="settings-anchor">
              <md-menu-item>
                <md-text-button
                  class="address-chip ${this.hasAddress ? "" : "display-none"}"
                  title=${this.address}
                  @click=${this.handleCopyAddress}
                >
                  ${this.copied ? "copied" : this.formatAddress(this.address)}
                </md-text-button>
              </md-menu-item>
              <md-menu-item>
                <md-icon-button @click=${() => location.reload()}>
                  <md-icon>↺</md-icon>
                </md-icon-button>
              </md-menu-item>
              <md-menu-item>
                <md-outlined-button
                  type="button"
                  @click=${this.handleToggleOpenMode}
                >
                  ${this.openInPopup ? "to sidePanel" : "to popup"}
                </md-outlined-button>
              </md-menu-item>
            </md-menu>
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
          <div class="error ${!this.valuesError ? "display-none" : ""}">
            ${this.valuesError}
          </div>

          <div class="${hasPortfolioValues ? "" : "display-none"}">
            <!-- Total: latest positions value + cash -->
            <div class="value-rows">
              <div class="value-row value-total">
                <span>Total</span>
                <span>${displayValues.total}</span>
              </div>
              <div class="value-row">
                <span>Positions</span>
                <span>${displayValues.positions}</span>
              </div>
              <div class="value-row">
                <span>Cash</span>
                <span>${displayValues.cash}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- positions -->
        <div class="positions">
          <positions-section
            .positions=${/** @type {any} */ (this.positions)}
            .loading=${this.positionsLoading}
            .openMarket=${this.openMarket}
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
      chrome.storage.onChanged.addListener(this.handleStorageChange);
    }
    this.initFromStorage();
  }

  disconnectedCallback() {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }
    super.disconnectedCallback();
  }

  async initFromStorage() {
    try {
      if (!chrome?.storage?.sync || !chrome?.storage?.session) {
        return;
      }

      const [syncData, sessionData] = await Promise.all([
        chrome.storage.sync.get(),
        chrome.storage.session.get(),
      ]);

      const {
        address,
        valuesUpdatedAt,
        valuesError,
        positionsValue,
        cashValue,
        openInPopup,
      } = syncData;

      this.address = typeof address === "string" ? address.trim() : "";
      this.hasAddress = cfg.ADDRESS_REGEX.test(this.address);
      this.valuesUpdatedAt =
        typeof valuesUpdatedAt === "number"
          ? valuesUpdatedAt
          : parseNumber(valuesUpdatedAt);
      this.valuesError = valuesError ?? "";
      this.positionsValue =
        typeof positionsValue === "number"
          ? positionsValue
          : parseNumber(positionsValue);
      this.cashValue =
        typeof cashValue === "number" ? cashValue : parseNumber(cashValue);
      this.openInPopup = Boolean(openInPopup);

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
      this.valuesError = "Unable to load current status.";
      this.statusMessage = "";
    }
  }

  handleStorageChange = (changes, areaName) => {
    if (areaName === "sync") {
      let shouldUpdateStatus = false;

      if (Object.prototype.hasOwnProperty.call(changes, "address")) {
        const newAddressRaw = changes.address.newValue;
        const newAddress =
          typeof newAddressRaw === "string" ? newAddressRaw.trim() : "";
        const previousAddress = this.address;
        this.address = newAddress;
        this.hasAddress = cfg.ADDRESS_REGEX.test(newAddress);

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

      if (Object.prototype.hasOwnProperty.call(changes, "positionsValue")) {
        this.positionsValue = parseNumber(changes.positionsValue.newValue);
      }

      if (Object.prototype.hasOwnProperty.call(changes, "cashValue")) {
        this.cashValue = parseNumber(changes.cashValue.newValue);
      }

      if (Object.prototype.hasOwnProperty.call(changes, "valuesUpdatedAt")) {
        const rawValue = changes.valuesUpdatedAt.newValue;
        this.valuesUpdatedAt =
          typeof rawValue === "number" ? rawValue : parseNumber(rawValue);
        shouldUpdateStatus = true;
      }

      if (Object.prototype.hasOwnProperty.call(changes, "valuesError")) {
        const errorValue = changes.valuesError.newValue;
        this.valuesError = errorValue ? String(errorValue) : "";
        shouldUpdateStatus = true;
      }

      if (Object.prototype.hasOwnProperty.call(changes, "openInPopup")) {
        this.openInPopup = Boolean(changes.openInPopup.newValue);
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
  };

  updateStatusFromState() {
    if (this.valuesError) {
      this.statusMessage = "";
      return;
    }

    if (
      typeof this.valuesUpdatedAt === "number" &&
      !Number.isNaN(this.valuesUpdatedAt)
    ) {
      this.statusMessage = `Last updated: ${new Date(this.valuesUpdatedAt).toLocaleString()}`;
    } else {
      this.statusMessage = "";
    }
  }

  handleInput(event) {
    this.address = event.target.value;
  }

  async handleSave() {
    const trimmed = this.address.trim();
    if (!cfg.ADDRESS_REGEX.test(trimmed)) {
      this.lastError = "Please enter a valid 0x address.";
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.valuesError = "";
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
      this.valuesError = error?.message || "Failed to save address.";
      this.statusMessage = "";
      this.positionsLoading = false;
    } finally {
      this.isBusy = false;
    }
  }

  async handleRefresh() {
    const trimmed = this.address.trim();
    if (!cfg.ADDRESS_REGEX.test(trimmed)) {
      this.valuesError = "Please enter a valid 0x address.";
      this.statusMessage = "";
      return;
    }

    this.isBusy = true;
    this.valuesError = "";
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
      this.valuesError = error?.message || "Failed to refresh balance.";
      this.statusMessage = "";
      this.positionsLoading = false;
    } finally {
      this.isBusy = false;
    }
  }

  async handleToggleOpenMode() {
    if (!chrome?.storage?.sync) {
      return;
    }

    const nextValue = !this.openInPopup;
    this.openInPopup = nextValue;
    try {
      await chrome.storage.sync.set({ openInPopup: nextValue });
      await chrome.runtime.sendMessage({
        type: "setOpenMode",
        openInPopup: nextValue,
      });
      if (nextValue) {
        await this.openPopupView();
      } else {
        await this.openSidePanelView();
      }
    } catch (error) {
      console.error("Failed to toggle open mode", error);
    }
  }

  async openSidePanelView() {
    if (!chrome?.sidePanel || !chrome?.tabs?.query) {
      return;
    }

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tabs?.[0]?.id;
      if (typeof tabId === "number") {
        this.lastActiveTabId = tabId;
        await chrome.sidePanel.open({ tabId });
      } else {
        await chrome.sidePanel.open({});
      }
    } catch (error) {
      console.error("Failed to open side panel", error);
    }

    if (typeof window !== "undefined" && window.close) {
      window.close();
    }
  }

  async openPopupView() {
    await this.closeSidePanelIfNeeded();

    if (chrome?.action?.openPopup) {
      try {
        await chrome.action.openPopup();
      } catch (error) {
        console.error("Failed to open popup", error);
      }
    }
  }

  async closeSidePanelIfNeeded() {
    if (!chrome?.sidePanel) {
      return;
    }

    let tabIdCandidate = this.lastActiveTabId;
    if (typeof tabIdCandidate !== "number" && chrome?.tabs?.query) {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabIdCandidate = tabs?.[0]?.id;
      } catch (error) {
        console.error("Failed to query tabs for side panel close", error);
      }
    }

    if (typeof tabIdCandidate !== "number") {
      return;
    }

    try {
      await chrome.sidePanel.close({ tabId: tabIdCandidate });
    } catch (error) {
      console.error("Failed to close side panel", error);
    }
  }

  async requestRefresh({ recordTimestamp = false } = {}) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "refresh" });
      if (!res?.success) {
        throw new Error(res?.error || "Unknown error during refresh");
      }
      return true;
    } catch (error) {
      const errorMessage = error?.message || "Failed to refresh balance.";
      console.error("Failed to refresh", errorMessage);
      this.valuesError = errorMessage;
      if (!recordTimestamp && this.valuesUpdatedAt) {
        this.statusMessage = `Last updated: ${new Date(this.valuesUpdatedAt).toLocaleString()}`;
      } else {
        this.statusMessage = "";
      }
      return false;
    } finally {
      this.positionsLoading = false;
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

  openMarket = (slug, fallbackSlug) => {
    const finalSlug = slug || fallbackSlug;
    if (!finalSlug) return;
    const url = `https://polymarket.com/market/${finalSlug}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

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
