import { LitElement, html, css } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  formatCurrency,
  formatSignedCurrency,
  formatPercent,
  formatNumber,
  formatDate,
  trendClass,
  parseNumber,
} from "./format.js";

class TidviewPositionsPanel extends LitElement {
  static properties = {
    positions: { type: Array },
    loading: { type: Boolean },
    openMarket: { type: Object },
  };

  constructor() {
    super();
    this.positions = [];
    this.loading = false;
    this.openMarket = null;
  }

  static styles = css`
    :host {
      display: block;
      margin-top: 14px;
    }

    .portfolio {
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
    }
  `;

  get safePositions() {
    return Array.isArray(this.positions) ? this.positions : [];
  }

  get summary() {
    const positions = this.safePositions;
    const totalCurrentValue = positions.reduce(
      (sum, pos) => sum + (parseNumber(pos.currentValue) ?? 0),
      0,
    );
    const totalCashPnl = positions.reduce(
      (sum, pos) => sum + (parseNumber(pos.cashPnl) ?? 0),
      0,
    );
    const totalInitialValue = positions.reduce(
      (sum, pos) => sum + (parseNumber(pos.initialValue) ?? 0),
      0,
    );
    const totalPercent =
      totalInitialValue > 0 ? (totalCashPnl / totalInitialValue) * 100 : null;

    return {
      totalCurrentValue,
      totalCashPnl,
      totalPercent,
    };
  }

  handleOpenMarket(slug, fallbackSlug) {
    if (typeof this.openMarket === "function") {
      this.openMarket(slug, fallbackSlug);
    }

    this.dispatchEvent(
      new CustomEvent("market-open", {
        detail: { slug, fallbackSlug },
        bubbles: true,
        composed: true,
      }),
    );
  }

  renderPosition(position) {
    const avgPriceText =
      position.avgPrice != null
        ? `@ ${formatNumber(position.avgPrice, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          })}`
        : "";
    const curPriceText =
      position.curPrice != null
        ? `→ ${formatNumber(position.curPrice, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          })}`
        : "";
    const sizeText =
      position.size != null ? `Size ${formatNumber(position.size)}` : "";

    const subtitleParts = [
      position.outcome,
      sizeText,
      avgPriceText,
      curPriceText,
    ].filter(Boolean);

    return html`
      <li
        class="position-row"
        @click=${() => this.handleOpenMarket(position.slug, position.eventSlug)}
        role="button"
        tabindex="0"
        @keydown=${(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.handleOpenMarket(position.slug, position.eventSlug);
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
          <div class="position-subtitle">${formatDate(position.endDate)}</div>
        </div>
        <div class="position-stats">
          <div class="position-stat-value">
            ${formatCurrency(position.currentValue)}
          </div>
          <div class="position-stat-pnl ${trendClass(position.cashPnl)}">
            ${formatSignedCurrency(position.cashPnl)}
            ${position.percentPnl != null
              ? html`<span>(${formatPercent(position.percentPnl)})</span>`
              : ""}
          </div>
        </div>
      </li>
    `;
  }

  renderList(positions) {
    if (this.loading) {
      return html`<div class="meta">Loading positions...</div>`;
    }

    if (!positions.length) {
      return html`<div class="meta">No positions found for this address.</div>`;
    }

    return html`<ul class="positions-list">
      ${repeat(
        positions,
        (pos) => pos.id,
        (pos) => this.renderPosition(pos),
      )}
    </ul>`;
  }

  render() {
    const positions = this.safePositions;
    const { totalCurrentValue, totalCashPnl, totalPercent } = this.summary;

    return html`
      <section class="portfolio">
        <div class="portfolio-header">
          <span>Portfolio</span>
          <span>${positions.length} positions</span>
        </div>
        <div class="portfolio-summary">
          <div class="summary-block">
            <span>Current Value</span>
            <span class="summary-value">
              ${formatCurrency(totalCurrentValue)}
            </span>
          </div>
          <div class="summary-block">
            <span>Total PnL</span>
            <span class="summary-pnl ${trendClass(totalCashPnl)}">
              ${formatSignedCurrency(totalCashPnl)}
              ${totalPercent != null
                ? html`<span>(${formatPercent(totalPercent)})</span>`
                : ""}
            </span>
          </div>
        </div>
        ${this.renderList(positions)}
      </section>
    `;
  }
}

customElements.define("tidview-positions-panel", TidviewPositionsPanel);
