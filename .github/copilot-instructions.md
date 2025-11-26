# Copilot Instructions for Tidview

## Architecture Snapshot

- Chrome MV3 extension (manifest in `src/static/manifest.json`) that shows a Polymarket wallet total in the toolbar badge and renders a Lit-based portfolio UI.
- `webpack.config.js` builds two entry points: the service worker (`background.js`) and the portfolio UI (`portfolio.js` + shared CSS). Static assets and HTML are copied into `dist/` for Chrome to load.
- `src/common/config.js` centralizes knob values (badge color, polling cadence, regex, portfolio path) and is the single source for `IS_DEVELOPMENT` behavior (side panel vs popup).

## Background Service Worker (`src/background/background.js`)

- Handles `onInstalled`, `onAlarm`, `onMessage`, and `storage.onChanged` events; keeps a single `refreshNow()` flow for all triggers.
- Poll cycle: `chrome.alarms.create("poll", { periodInMinutes: cfg.POLL_MINUTES })` and reuse the same refresh logic invoked by UI messages (`{ type: "refresh" }`).
- Fetches three data sources in parallel (`fetchPositionsValue`, `fetchCashValue`, `fetchPositions`) and writes numeric totals + timestamps into `chrome.storage.sync`, while heavier positions arrays go into `chrome.storage.session` to avoid sync quotas.
- Badge updates always run through `formatBadge()` from `src/common/format.js`; error flows set badge text to `-` and push the error copies into storage so the UI surfaces them.

## Portfolio UI (`src/portfolio/`)

- Entrypoint is `index.html` → `TidviewPortfolio.jsx` renders the React `<tidview-portfolio>` UI after importing shared Tailwind styles from `src/styles/tailwind.css`; `PositionsList.jsx` drives the sortable list and helper components such as `SettingsButton.jsx` provide the menu interactions.
- The component mirrors extension state via `chrome.storage.sync/session` reads on load plus `chrome.storage.onChanged` listeners, so any background writes instantly update the UI.
- User input (wallet address) is stored in sync storage only after passing `cfg.ADDRESS_REGEX`; saving/refreshing fire `chrome.runtime.sendMessage({ type: "refresh" })` and optimistically toggle `isBusy`/`positionsLoading` flags.
- Positions are normalized (`normalizePosition`) and sorted by `currentValue`, with derived totals (current value, cash PnL, percent PnL) shown in both the main value card and the positions summary.

## Data Sources & Utilities

- `src/api/portfolio-data.js` wraps all network calls: `fetchPositionsValue` and `fetchPositions` hit `https://data-api.polymarket.com`, while `fetchCashValue` performs a Polygon RPC `eth_call` against the USDC contract (balance scaled by `USDC_DECIMALS`). All helpers throw on unexpected payloads so the background worker can surface issues cleanly.
- `src/common/format.js` centralizes numeric parsing, badge formatting, signed currency, and trend classes. Reuse these helpers instead of ad-hoc `Intl.NumberFormat` instances to keep UI output consistent.
- `src/common/lit-dev-warn-suppressor.js` is injected before the portfolio entry during development builds to silence Lit’s dev-mode toast; keep it at the top of the `portfolio` entry array if new bundles are added.

## Storage & Messaging Patterns

- Sync keys: `address`, `positionsValue`, `cashValue`, `valuesUpdatedAt`, `valuesError`. Session keys: `positions`, `positionsUpdatedAt`, `positionsError`. The UI assumes these exact names and types when reconciling state.
- Messaging is one-way (UI → background) via `chrome.runtime.sendMessage({ type: "refresh" })`; listeners generally just trigger `refreshNow()` and rely on storage writes for UI updates. If you introduce new message types, remember to `return true` when responding asynchronously.
- Badge/title text lives exclusively in the background worker; UI never calls `chrome.action.*`, so keep that encapsulation intact.

## Build & Dev Workflow

- `npm install` once, then `npm run start` for watch mode or `npm run build` for production bundles; both drop artifacts into `dist/` with source maps (`devtool: "source-map"`).
- Load the unpacked extension from `dist/` in Chrome. In development (`NODE_ENV=development`), the action opens the portfolio in a side panel; production builds expect the popup path defined by `cfg.PORTFOLIO_PATH`.
- No automated tests exist; manual verification is done by saving a known 0x address and checking badge/UI updates.

## Conventions & Tips

- Always validate wallet strings with `cfg.ADDRESS_REGEX` before persisting or firing network requests; invalid addresses should surface as `"—"` in the UI and badge.
- Keep badge text short—use `formatBadge`, not raw numbers. For currency display inside the UI, prefer `formatCurrency`/`formatSignedCurrency`.
- When adding new background data, write only lightweight scalars to sync storage and prefer session storage (or `chrome.storage.local`) for bulky arrays to stay under Chrome’s quota.
- Material components (`@material/web/...`) are already bundled; import from there instead of adding new UI libraries unless necessary.
