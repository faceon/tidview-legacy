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

  /* Shared CSS variables only — structural classes were migrated to Tailwind utilities
     so we keep the design tokens here for small CSS pieces that still rely on them. */
`;
