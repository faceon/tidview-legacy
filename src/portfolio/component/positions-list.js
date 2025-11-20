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
} from "../../common/format.js";
import { sharedStyles } from "../sharedStyles";

class PositionsList extends LitElement {
  static styles = [
    sharedStyles,
    css`
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
      }

      li {
        display: flex;
        gap: var(--space-md);
        padding: var(--space-md);
        border-top: 1px solid #f2f2f2;
        cursor: pointer;
        transition: background-color 0.2s;
        margin: 0;
        border-radius: 0;
      }

      li:hover {
        background-color: var(--bg-subtle);
      }
      li:first-child {
        border-top: none;
      }

      .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }

      .title {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
      }

      .subtitle {
        font-size: 11px;
        color: var(--color-muted);
        display: flex;
        gap: var(--space-sm);
        flex-wrap: wrap;
      }

      .stats {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        font-size: 12px;
      }

      .value {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
      }

      .thumb {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        object-fit: cover;
        flex-shrink: 0;
        background: #f4f4f4;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #777;
      }

      .summary-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text);
      }

      .summary-pnl {
        font-size: 13px;
        font-weight: 600;
      }
    `,
  ];

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
              class="thumb"
              src=${position.icon}
              alt=""
              loading="lazy"
            />`
          : html`<div class="thumb">${position.outcome?.[0] || "?"}</div>`}
        <div class="content">
          <div class="title">${position.title}</div>
          ${subtitleParts.length
            ? html`<div class="subtitle">
                ${subtitleParts.map((part) => html`<span>${part}</span>`)}
              </div>`
            : ""}
          <div class="subtitle">${formatDate(position.endDate)}</div>
        </div>
        <div class="stats">
          <div class="value">${formatCurrency(position.currentValue)}</div>
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

    return html`<ul>
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
      <div class="row-container">
        <span>Portfolio</span>
        <span>${positions.length} positions</span>
      </div>
      <div class="row-container">
        <div class="col-container">
          <span>Current Value</span>
          <span class="summary-value">
            ${formatCurrency(totalCurrentValue)}
          </span>
        </div>
        <div class="col-container">
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
    `;
  }
}

customElements.define("positions-list", PositionsList);
