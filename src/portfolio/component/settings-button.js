import { LitElement, html } from "lit";
import { formatAddress } from "../../common/format.js";
import { sharedStyles } from "../sharedStyles";
import { adoptTailwind } from "../tailwind-shared.js";
import cfg from "../../common/config.js";
import "@material/web/iconButton/filled-icon-button.js";
import "@material/web/iconButton/icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/menu/menu.js";
import "@material/web/menu/menu-item.js";

class SettingsButton extends LitElement {
  static styles = [sharedStyles];

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    adoptTailwind(this.renderRoot);
  }

  static properties = {
    address: { type: String },
    copied: { type: Boolean },
    openInPopup: { type: Boolean },
  };

  constructor() {
    super();
    this.address = "";
    this.copied = false;
    this.openInPopup = true;
    this.lastActiveTabId = null;
  }

  get hasAddress() {
    return cfg.ADDRESS_REGEX.test(this.address);
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

  render() {
    return html` <md-icon-button
        style="position: relative;"
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
            class="${this.hasAddress ? "" : "display-none"}"
            title=${this.address}
            @click=${this.handleCopyAddress}
          >
            ${this.copied ? "copied" : formatAddress(this.address)}
          </md-text-button>
        </md-menu-item>

        <md-menu-item>
          <md-text-button @click=${this.handleToggleOpenMode}>
            ${this.openInPopup ? "open in sidepanel" : "open in popup"}
          </md-text-button>
        </md-menu-item>
      </md-menu>`;
  }

  async handleToggleOpenMode(e) {
    e.stopPropagation();
    e.preventDefault();
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
}

customElements.define("settings-button", SettingsButton);
