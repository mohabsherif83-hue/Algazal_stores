# Copilot instructions for Algazal Stores

## Repository shape

This repository is a small Node.js/Express storefront for an Arabic bridal and home-loungewear catalog. The app has two main layers:

- Backend: `server.js` exposes the storefront API and admin endpoints.
- Frontend: `public/index.html`, `public/app.js`, and `public/styles.css` render the browser UI and talk to the backend via `/api/*`.

The most important architectural fact is that product data is not stored in the repository at runtime. `server.js` reads and writes product records through a Google Apps Script endpoint (`PRODUCTS_API_URL`), and the app converts between the Google Apps Script schema and the browser-facing schema using `fromApiProduct()` and `toApiProduct()`.

`products.json` is a leftover artifact and is not used by the running app.

## Build, test, and validation commands

This project currently has a minimal package setup and no dedicated test or lint scripts:

```bash
npm install
npm start
npm run dev
```

Use `npm start` for the standard local server. Use `npm run dev` when you want the Node watcher enabled. The app listens on port `3000` by default.

For a quick smoke test while the server is running:

```bash
curl http://localhost:3000/api/products
curl -H "x-admin-password: 163859" http://localhost:3000/api/admin/products
```

There is no automated test suite or lint command configured in `package.json` today, so validation should be done with the running app and focused API checks rather than a broad test run.

## High-level architecture

- `server.js`
  - Sets up Express, serves static files from `public/`, and exposes:
    - `GET /api/products`: public catalog, returns only `available !== false` items.
    - `GET /api/admin/products`: admin catalog, protected by `x-admin-password`.
    - `POST /api/products`: adds a product to the external Apps Script backend, with validation and admin auth.
  - Centralizes validation in `validateProduct()` and schema conversion in `fromApiProduct()`/`toApiProduct()`.
  - Uses `crypto.timingSafeEqual()` to compare the admin password in a constant-time check.

- `public/app.js`
  - Manages category filters, search, cart state, and checkout behavior.
  - Fetches products from `/api/products` and renders them in the storefront.
  - Normalizes Google Drive image links through `driveImageUrl()` so product images render correctly.
  - Uses Arabic locale-aware formatting and search behavior (`ar-EG`, Arabic text filtering).

- `public/index.html` and `public/styles.css`
  - Build the storefront layout, cart drawer, product grid, and admin UI.
  - The site is designed as a single-page storefront with a WhatsApp-based order flow.

## Key conventions specific to this codebase

- The storefront is Arabic-first. Keep UI copy, category names, and user-facing validation messages in Arabic unless the task explicitly requires otherwise.
- Product data flows through a strict API contract with the Google Apps Script backend. Preserve field names and types when changing the schema:
  - `id`, `name`, `category`, `price`, `discount_price`, `image_url`, `description`, `in_stock`
- Admin protection is header-based, not cookie/session-based. Any admin route must continue to require the `x-admin-password` header.
- Product validation is intentionally centralized. When changing product fields or constraints, update `validateProduct()` and the server-side conversion functions together so the browser payload and Apps Script payload remain aligned.
- When adding or changing product image handling, keep the Google Drive image conversion logic consistent with `driveImageUrl()` in `public/app.js`.
- The app uses `fetch()` calls against the server rather than a separate frontend framework. Changes should stay compatible with the current static-file architecture instead of introducing a framework without a clear need.
- Deployment should assume a Node.js host and a static public directory. The repository includes `render.yaml`, and the app is intended to run in a Node environment without a persistent filesystem for inventory data.

## Deployment notes relevant to contributors

- The admin password is currently set in `server.js` as `163859` and is also documented in `README.md`.
- The app expects a Google Apps Script URL for the product backend and does not persist product inventory in local files.
- The repository is designed to be simple and low-ceremony; prefer surgical, direct changes to `server.js` and the browser assets instead of introducing extra frameworks or packages unless the requirement clearly justifies them.
