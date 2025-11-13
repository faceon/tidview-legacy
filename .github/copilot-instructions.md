# Copilot Instructions for Tidview

## Architecture Overview

Chrome MV3 extension displaying Polymarket portfolio values as toolbar badge:

- **Background Service Worker** (`src/background/background.js`): API polling, badge updates, data persistence
- **portfolio UI** (`src/portfolio/`): LitElement-based wallet configuration interface
- **Manifest** (`src/static/manifest.json`): MV3 configuration

## Key Patterns

### Message Passing

```javascript
// portfolio → Background
await chrome.runtime.sendMessage({ type: "refresh" });

// Background listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "refresh") refreshNow().then(sendResponse);
  return true; // async
});
```

### Data Persistence

```javascript
await chrome.storage.sync.set({ address: addr });
const { address } = await chrome.storage.sync.get(["address"]);
```

### Badge Formatting

- `< 1000`: "950"
- `1000-9999`: "1.2k", "9k"
- `10k-999k`: "12k"
- `≥ 1M`: "2M"

### API Integration

```javascript
const url = `https://data-api.polymarket.com/value?user=${encodeURIComponent(
  address,
)}`;
const data = await fetch(url).then((r) => r.json());
const value = Array.isArray(data) ? data[0].value : data.value;
```

### Error States

- Invalid address: Badge "—"
- API errors: Badge "!"
- Success: Formatted value

### Polling

```javascript
chrome.alarms.create("poll", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll") refreshNow();
});
```

## Development Workflow

1. `npm run build` → bundles to `dist/`
2. `npm run start` → watch mode
3. Load unpacked extension from `dist/` in Chrome dev mode
4. Test with valid 0x address

## File Structure

- `src/background/background.js`: Core logic & API
- `src/common/format.js`: Utility functions for formatting
- `src/common/lit-dev-warn-suppressor.js`: Suppresses Lit development warnings
- `src/portfolio/portfolio.html`: Portfolio container referencing custom element
- `src/portfolio/portfolio.js`: LitElement portfolio web component
- `src/portfolio/portfolio.css`: Styles for portfolio UI
- `src/portfolio/positions-section.js`: Component for positions section
- `src/static/manifest.json`: Extension config
- `src/static/icons/`: Icons (16px, 48px, 128px)
- `src/static/fonts/`: Fonts
- `dist/`: Built files (webpack)

## Security Notes

- No sensitive data stored/transmitted
- Public API, no auth required
- Address validation: `/^0x[a-fA-F0-9]{40}$/`
- Webpack uses `devtool: 'source-map'` (no eval)
