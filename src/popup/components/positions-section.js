import { LitElement, html, css, unsafeCSS } from "lit";
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
import sharedCss from "../popup.css";

class PositionsSection extends LitElement {
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
    ${unsafeCSS(sharedCss)}
  `;

  get safePositions() {
    return Array.isArray(this.positions) ? this.positions : [];
  }

  handleOpenMarket(slug, eventSlug) {
    if (this.openMarket) {
      this.openMarket(slug, eventSlug);
    }
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

customElements.define("positions-section", PositionsSection);
