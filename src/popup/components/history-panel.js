import { LitElement, html, css } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  formatNumber,
  formatTimestamp,
  formatSide,
  ensurePositiveInteger,
} from "./format.js";

class TidviewHistoryPanel extends LitElement {
  static properties = {
    trades: { type: Array },
    loading: { type: Boolean },
    openMarket: { type: Object },
    page: { type: Number },
    pageSize: { type: Number },
    openOnly: { type: Boolean, attribute: "open-only", reflect: true },
  };

  constructor() {
    super();
    this.trades = [];
    this.loading = false;
    this.openMarket = null;
    this.page = 1;
    this.pageSize = 5;
    this.openOnly = true;
  }

  static styles = css`
    :host {
      display: block;
    }

    .history-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 13px;
      font-weight: 600;
    }

    .history-header span {
      font-size: 12px;
      font-weight: 400;
      color: #666;
    }

    .history-controls {
      display: flex;
      justify-content: flex-end;
      font-size: 12px;
      color: #444;
    }

    .history-controls label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }

    .history-controls input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: #111;
    }

    .history-list {
      list-style: none;
      margin: 0;
      padding: 0;
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

    .history-group {
      padding: 12px 0;
      border-top: 1px solid #f2f2f2;
    }

    .history-group:first-child {
      border-top: none;
      padding-top: 0;
    }

    .history-group-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      cursor: pointer;
    }

    .history-group-header:focus-visible,
    .history-trade-row:focus-visible {
      outline: 2px solid #111;
      outline-offset: 2px;
    }

    .history-group-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }

    .history-group-title {
      font-size: 13px;
      font-weight: 600;
      color: #111;
    }

    .history-group-meta {
      font-size: 11px;
      color: #666;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .history-tag {
      font-size: 11px;
      color: #555;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .history-trade-list {
      list-style: none;
      margin: 10px 0 0;
      padding: 0 0 0 52px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .history-trade-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    .history-trade-top {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .history-trade-meta {
      font-size: 11px;
      color: #666;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .history-side.buy {
      color: #107c41;
    }

    .history-side.sell {
      color: #b00020;
    }

    .history-pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      font-size: 12px;
    }

    .pagination-button {
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f7f7f7;
      color: #111;
      cursor: pointer;
    }

    .pagination-button[disabled] {
      opacity: 0.6;
      cursor: default;
    }

    .pagination-info {
      color: #555;
    }

    .meta {
      font-size: 12px;
      color: #666;
    }
  `;

  get safeTrades() {
    return Array.isArray(this.trades) ? this.trades : [];
  }

  groupTrades(trades = []) {
    const groupsMap = new Map();

    for (const trade of trades) {
      const key = trade.slug || trade.eventSlug || trade.title || trade.id;
      let group = groupsMap.get(key);

      if (!group) {
        group = {
          key,
          title: trade.title || "Unnamed market",
          slug: trade.slug || "",
          eventSlug: trade.eventSlug || "",
          icon: trade.icon || "",
          latestTimestamp: trade.timestamp ?? null,
          trades: [],
          closed: true,
          _positionByOutcome: new Map(),
          hasActivePosition: false,
        };
        groupsMap.set(key, group);
      }

      if (!group.icon && trade.icon) {
        group.icon = trade.icon;
      }

      if (
        trade.timestamp != null &&
        (group.latestTimestamp == null ||
          trade.timestamp > group.latestTimestamp)
      ) {
        group.latestTimestamp = trade.timestamp;
      }
      const tradeClosed = trade?.isClosed === true;
      group.closed = group.closed && tradeClosed;

      const sizeValue = Number(trade?.size);
      if (Number.isFinite(sizeValue) && sizeValue !== 0) {
        const outcomeKey = trade?.outcome || "__default__";
        const signedSize = trade?.side === "SELL" ? -sizeValue : sizeValue;
        const positions = group._positionByOutcome;
        const previous = positions.get(outcomeKey) || 0;
        positions.set(outcomeKey, previous + signedSize);
      }

      group.trades.push(trade);
    }

    const groups = Array.from(groupsMap.values());

    const tolerance = 1e-6;

    groups.forEach((group) => {
      group.trades.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      if (group._positionByOutcome instanceof Map) {
        group.hasActivePosition = Array.from(
          group._positionByOutcome.values(),
        ).some((value) => Math.abs(value) > tolerance);
      } else {
        group.hasActivePosition = false;
      }
      delete group._positionByOutcome;
    });

    groups.sort((a, b) => (b.latestTimestamp ?? 0) - (a.latestTimestamp ?? 0));

    return groups;
  }

  getVisibleGroups(allGroups = this.groupTrades(this.safeTrades)) {
    if (!Array.isArray(allGroups)) {
      return [];
    }
    if (!this.openOnly) {
      return allGroups;
    }
    return allGroups.filter((group) => group.hasActivePosition);
  }

  countTrades(groups = []) {
    return Array.isArray(groups)
      ? groups.reduce((total, group) => total + group.trades.length, 0)
      : 0;
  }

  handleOpenOnlyToggle(event) {
    const next = Boolean(event?.target?.checked);
    if (this.openOnly === next) {
      return;
    }

    this.openOnly = next;

    this.dispatchEvent(
      new CustomEvent("open-only-change", {
        detail: { openOnly: next },
        bubbles: true,
        composed: true,
      }),
    );

    if (this.page !== 1) {
      this.dispatchEvent(
        new CustomEvent("page-change", {
          detail: { page: 1 },
          bubbles: true,
          composed: true,
        }),
      );
    }
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

  renderTradeRow(trade) {
    const subtitleParts = [
      `${formatNumber(trade.size)} @ ${formatNumber(trade.price, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })}`,
      formatTimestamp(trade.timestamp),
    ];

    const sideClass =
      trade.side === "BUY" ? "history-side buy" : "history-side sell";

    return html`
      <li
        class="history-trade-row"
        @click=${() => this.handleOpenMarket(trade.slug, trade.eventSlug)}
        role="button"
        tabindex="0"
        @keydown=${(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.handleOpenMarket(trade.slug, trade.eventSlug);
          }
        }}
      >
        <div class="history-trade-top">
          <span class=${sideClass}>${formatSide(trade.side)}</span>
          ${trade.outcome ? html`<span>${trade.outcome}</span>` : ""}
        </div>
        <div class="history-trade-meta">
          ${subtitleParts.map((text) => html`<span>${text}</span>`)}
        </div>
      </li>
    `;
  }

  renderTradeGroup(group) {
    return html`
      <li class="history-group">
        <div
          class="history-group-header"
          role="button"
          tabindex="0"
          @click=${() => this.handleOpenMarket(group.slug, group.eventSlug)}
          @keydown=${(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              this.handleOpenMarket(group.slug, group.eventSlug);
            }
          }}
        >
          ${group.icon
            ? html`<img class="position-thumb" src=${group.icon} alt="" />`
            : html`<div class="position-thumb placeholder">
                ${group.title?.[0] || "?"}
              </div>`}
          <div class="history-group-content">
            <div class="history-group-title">${group.title}</div>
            <div class="history-group-meta">
              <span>${group.trades.length} trades</span>
              ${group.latestTimestamp != null
                ? html`<span>
                    Latest ${formatTimestamp(group.latestTimestamp)}
                  </span>`
                : ""}
              ${group.closed
                ? html`<span class="history-tag" aria-label="Closed market">
                    Closed
                  </span>`
                : ""}
            </div>
          </div>
        </div>
        <ul class="history-trade-list">
          ${repeat(
            group.trades,
            (trade) => trade.id,
            (trade) => this.renderTradeRow(trade),
          )}
        </ul>
      </li>
    `;
  }

  handlePageChange(delta) {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }

    const groups = this.getVisibleGroups();
    if (!groups.length) {
      return;
    }

    const pageSize = ensurePositiveInteger(this.pageSize, 5);
    const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
    const currentPage = Math.min(
      Math.max(ensurePositiveInteger(this.page, 1), 1),
      totalPages,
    );
    const nextPage = Math.min(Math.max(1, currentPage + delta), totalPages);

    if (nextPage !== currentPage) {
      this.dispatchEvent(
        new CustomEvent("page-change", {
          detail: { page: nextPage },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  renderPagination(currentPage, totalPages) {
    if (totalPages <= 1) {
      return html``;
    }

    return html`
      <div class="history-pagination">
        <button
          type="button"
          class="pagination-button"
          @click=${() => this.handlePageChange(-1)}
          ?disabled=${currentPage <= 1}
        >
          Prev
        </button>
        <span class="pagination-info">
          Page ${currentPage} of ${totalPages}
        </span>
        <button
          type="button"
          class="pagination-button"
          @click=${() => this.handlePageChange(1)}
          ?disabled=${currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    `;
  }

  renderContent(
    groups,
    currentPage,
    totalPages,
    { hasTrades = false, filteredOutInactive = false } = {},
  ) {
    if (this.loading) {
      return html`<div class="meta">Loading history...</div>`;
    }

    if (!groups.length) {
      if (hasTrades && filteredOutInactive) {
        return html`<div class="meta">
          All markets are hidden by "Open market only". Uncheck it to view all
          trades.
        </div>`;
      }
      return html`<div class="meta">No trades found for this address.</div>`;
    }

    const pageSize = ensurePositiveInteger(this.pageSize, 5);
    const start = (currentPage - 1) * pageSize;
    const pagedGroups = groups.slice(start, start + pageSize);

    return html`
      <ul class="history-list">
        ${repeat(
          pagedGroups,
          (group) => group.key,
          (group) => this.renderTradeGroup(group),
        )}
      </ul>
      ${this.renderPagination(currentPage, totalPages)}
    `;
  }

  render() {
    const trades = this.safeTrades;
    const allGroups = this.groupTrades(trades);
    const visibleGroups = this.getVisibleGroups(allGroups);
    const totalTrades = trades.length;
    const visibleTrades = this.countTrades(visibleGroups);
    const totalMarkets = visibleGroups.length;
    const hiddenMarkets = Math.max(0, allGroups.length - visibleGroups.length);
    const hiddenTrades = Math.max(0, totalTrades - visibleTrades);
    const pageSize = ensurePositiveInteger(this.pageSize, 5);
    const totalPages = totalMarkets ? Math.ceil(totalMarkets / pageSize) : 0;
    const currentPage = totalPages
      ? Math.min(Math.max(ensurePositiveInteger(this.page, 1), 1), totalPages)
      : 1;
    const filterSummaryActive = this.openOnly && hiddenMarkets > 0;
    const content = this.renderContent(visibleGroups, currentPage, totalPages, {
      hasTrades: totalTrades > 0,
      filteredOutInactive: filterSummaryActive,
    });

    return html`
      <section class="history-section">
        <div class="history-header">
          <span>Trade History</span>
          <span>
            ${visibleTrades} trades / ${totalMarkets} markets
            ${filterSummaryActive
              ? html`<span>(${hiddenTrades} trades filtered)</span>`
              : ""}
          </span>
        </div>
        <div class="history-controls">
          <label>
            <input
              type="checkbox"
              @change=${(event) => this.handleOpenOnlyToggle(event)}
              .checked=${this.openOnly}
            />
            Open market only
          </label>
        </div>
        ${content}
      </section>
    `;
  }
}

customElements.define("tidview-history-panel", TidviewHistoryPanel);
