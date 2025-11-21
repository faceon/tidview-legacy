# Tidview

**Market tides, made visible**

Tidview now ships as a single **Next.js 16 + Tailwind** project that powers both the hosted portfolio view and the Chrome MV3 extension bundle. The background worker continues to refresh storage and badge state, while the React UI is shared between the web and extension builds.

- **Endpoint used:** `GET https://data-api.polymarket.com/value?user=<0xAddress>`
- **Docs:** https://docs.polymarket.com/developers/misc-endpoints/data-api-value

## Development

### Web (Next.js)

```bash
npm run dev      # start Next.js locally on http://localhost:3000
npm run build    # production build for hosting
npm run start    # serve the production build locally
npm run lint     # apply Next + Chrome extension ESLint rules
npm run typecheck
```

The shared portfolio lives at `/portfolio`. The root `/` route links to it.

### Chrome extension

The existing `chrome/` + `src/background` files remain until the React UI fully replaces the Lit implementation. Extension-specific build tooling will be re-wired to consume the new shared modules in follow-up steps.
