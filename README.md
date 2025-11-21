# Tidview Monorepo

Tidview is now a single Next.js 15 (App Router) workspace that renders the Polymarket portfolio UI for both the public website (`tidview.com`) and the Chrome Extension popup/side panel. The background polling logic stays inside the MV3 service worker so alarms and fetches continue to run even when the site is closed.

## Requirements

- Node.js 18.18+ (Vercel/Next.js 15 baseline)
- npm 9+
- Chrome 120+ for Manifest V3 + side panel support

## Install

```bash
npm install
```

## Available scripts

| Command                   | Description                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Next.js dev server (website + portfolio at `/portfolio`).                               |
| `npm run dev:extension`   | Start Next.js dev server on port `4000` with `TARGET=extension` (mirrors the popup page locally). |
| `npm run build:web`       | Production build for the website / Vercel deployment.                                             |
| `npm run build:extension` | Runs the Chrome bundler (see below).                                                              |
| `npm run build`           | Convenience wrapper for `build:web` + `build:extension`.                                          |
| `npm run lint`            | Next.js lint rules.                                                                               |
| `npm run format`          | Prettier over the repo.                                                                           |

## Building the Chrome Extension

1. Export the UI + bundle the background worker:
   ```bash
   npm run build:extension
   ```
2. Load the unpacked extension from `chrome/dist` in Chrome (`chrome://extensions` → "Load unpacked").
3. Choose the manifest variant:
   - `chrome/manifest.extension.json` → default production bundle (copied automatically).
   - `chrome/manifest.web.json` → alternative template with extra host permissions (copy manually if needed).

The build script performs the following steps:

- `TARGET=extension next build` → writes the static export to `out/`.
- Copies the export into `chrome/dist` and flattens `portfolio/index.html` → `portfolio.html` for the popup/side panel.
- Bundles `chrome/src/background/service-worker.ts` into `chrome/dist/background.js` with esbuild.
- Copies the manifest + icons into `chrome/dist`.

## Repository layout

```
├─ src/app                   # Next.js App Router routes (marketing site + /portfolio)
├─ src/components            # Shared UI, shadcn/ui primitives, portfolio surface
├─ src/lib                   # Config, formatters, chrome helpers, Polymarket fetchers
├─ src/types                 # Shared TypeScript contracts
├─ public/icons              # Action icons reused by the extension
├─ chrome/
│  ├─ manifest.*.json        # MV3 manifests (web + extension flavours)
│  ├─ src/background         # Service worker entry (alarms + polling)
│  ├─ scripts/build-extension.mjs
│  └─ dist/                  # Generated extension bundle (gitignored)
└─ next.config.mjs / tailwind.config.ts / tsconfig.json
```

## Development Notes

- The Chrome environment and the website reuse the same React components. The UI stores data in Chrome storage when running inside the extension and falls back to browser `localStorage` + live fetches on the web.
- Badge updates still flow exclusively through the background worker (`chrome/src/background/service-worker.ts`).
- The portfolio UI writes only lightweight scalars into sync storage (values, timestamps) and keeps heavy position arrays in session storage to stay under quota.
- shadcn/ui primitives live under `src/components/ui`. Extend as needed using the Tailwind + CVA helpers already in place.

Happy shipping! 🚀
