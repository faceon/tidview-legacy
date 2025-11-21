import { LitElement, html } from "lit";
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
import { adoptTailwind } from "../tailwind-shared.js";

class PositionsList extends LitElement {
  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    adoptTailwind(this.renderRoot);
  }

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
        class="flex gap-3 p-3 border-t border-gray-200 first:border-t-0 cursor-pointer transition-colors duration-200 hover:bg-tid-bg-subtle"
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
              class="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500"
              src=${position.icon}
              alt=""
              loading="lazy"
            />`
          : html`<div
              class="w-10 h-10 rounded-md flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500"
            >
              ${position.outcome?.[0] || "?"}
            </div>`}

        <div class="flex-1 flex flex-col gap-1">
          <div class="text-[13px] font-semibold text-tid-text">
            ${position.title}
          </div>
          ${subtitleParts.length
            ? html`<div class="text-xs text-tid-muted flex gap-2 flex-wrap">
                ${subtitleParts.map((part) => html`<span>${part}</span>`)}
              </div>`
            : ""}
          <div class="text-xs text-tid-muted">
            ${formatDate(position.endDate)}
          </div>
        </div>

        <div class="text-right flex flex-col gap-1 text-xs">
          <div class="text-sm font-semibold text-tid-text">
            ${formatCurrency(position.currentValue)}
          </div>
          <div
            class="position-stat-pnl ${trendClass(
              position.cashPnl,
            )} text-[13px] font-semibold"
          >
            ${formatSignedCurrency(position.cashPnl)}
            ${position.percentPnl != null
              ? html`<span class="text-xs"
                  >(${formatPercent(position.percentPnl)})</span
                >`
              : ""}
          </div>
        </div>
      </li>
    `;
  }

  renderList(positions) {
    if (this.loading) {
      return html`<div class="text-xs text-tid-muted">
        Loading positions...
      </div>`;
    }

    if (!positions.length) {
      return html`<div class="text-xs text-tid-muted">
        No positions found for this address.
      </div>`;
    }

    return html`<ul class="m-0 p-0 list-none flex flex-col">
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
      <div class="flex items-center justify-between mb-3">
        <span class="font-medium">Portfolio</span>
        <span class="text-sm text-tid-muted"
          >${positions.length} positions</span
        >
      </div>

      <div class="flex items-start justify-between gap-4 mb-3">
        <div class="flex flex-col">
          <span class="text-xs text-tid-muted">Current Value</span>
          <span class="text-base font-semibold text-tid-text"
            >${formatCurrency(totalCurrentValue)}</span
          >
        </div>

        <div class="flex flex-col text-right">
          <span class="text-xs text-tid-muted">Total PnL</span>
          <span class="text-[13px] font-semibold ${trendClass(totalCashPnl)}">
            ${formatSignedCurrency(totalCashPnl)}
            ${totalPercent != null
              ? html`<span class="text-xs"
                  >(${formatPercent(totalPercent)})</span
                >`
              : ""}
          </span>
        </div>
      </div>

      ${this.renderList(positions)}
    `;
  }
}

customElements.define("positions-list", PositionsList);
