import { css } from "lit";

export const sharedStyles = css`
  :host {
    --space-xxs: 2px;
    --space-xs: 4px;
    --space-compact: 6px;
    --space-sm: 8px;
    --space-md: 12px;
    --space-lg: 16px;
    --space-xl: 24px;

    --radius-sm: 8px;
    --radius-md: 10px;
    --radius-pill: 999px;

    --border-subtle: 1px solid #f1f1f1;
    --border-strong: 1px solid #ececec;

    --color-text: #111;
    --color-muted: #666;
    --color-subtle: #444;
    --color-positive: #107c41;
    --color-negative: #b00020;
    --color-neutral: #444;

    --bg-surface: #fff;
    --bg-subtle: #fafafa;
    --bg-muted: #f3f3f3;
    --bg-danger: #ffe6e6;
  }

  .display-none {
    display: none !important;
  }

  .meta {
    font-size: 12px;
    color: var(--color-muted);
  }

  .positive {
    color: var(--color-positive);
  }
  .negative {
    color: var(--color-negative);
  }
  .neutral {
    color: var(--color-neutral);
  }

  .error {
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background: var(--bg-danger);
    color: var(--color-negative);
    font-size: 12px;
  }

  /* Common Summary Block Styles */
  .portfolio-summary {
    display: flex;
    gap: var(--space-md);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    background: var(--bg-subtle);
  }

  .summary-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-size: 12px;
    color: #555;
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

  .summary-pnl span {
    font-size: 12px;
    font-weight: 400;
    margin-left: var(--space-xs);
  }
`;
