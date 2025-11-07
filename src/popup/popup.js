import { LitElement, html, css } from "lit";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

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
  };

  constructor() {
    super();
    this.address = "";
    this.lastValue = null;
    this.lastUpdated = null;
    this.lastError = "";
    this.statusMessage = "";
    this.isBusy = false;
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
      await this.refreshBalance({ recordTimestamp: true });
    } catch (error) {
      console.error("Failed to save address", error);
      this.lastError = error?.message || "Failed to save address.";
      this.statusMessage = "";
    } finally {
      this.isBusy = false;
    }
  }

  async handleRefresh() {
    this.isBusy = true;
    this.lastError = "";
    this.statusMessage = "Refreshing...";
    try {
      await this.refreshBalance({ recordTimestamp: true });
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
    } else {
      this.lastError = res?.error || "Unknown error";
      if (!recordTimestamp && this.lastUpdated) {
        this.statusMessage = `Last updated: ${new Date(this.lastUpdated).toLocaleString()}`;
      } else {
        this.statusMessage = "";
      }
    }
  }

  render() {
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
      ${this.statusMessage
        ? html`<div class="meta">${this.statusMessage}</div>`
        : ""}
      ${this.lastError ? html`<div class="error">${this.lastError}</div>` : ""}
    `;
  }
}

customElements.define("tidview-popup", TidviewPopup);
