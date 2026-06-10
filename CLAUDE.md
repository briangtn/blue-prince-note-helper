# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal helper/tracker for the video game *Blue Prince* — record rooms drafted, codes found, people met, daily mansion layouts, notes, and the relationships between all of them. Single-user-ish, self-hosted. UI text is in French.

## Commands

```bash
npm run dev      # server (3001) + vite client (5173) concurrently — use this for development
npm run server   # API + WebSocket only (node server/index.js)
npm run client   # vite dev server only
npm run build    # production build -> dist/
npm start        # production: serves built dist/ AND the API from one node process on PORT (default 3001)
```

There is **no test suite and no linter** configured.

In dev, the vite client proxies `/api` to `http://localhost:3001` (see `vite.config.js`). In production a single Express process serves both the static `dist/` and the API.

One-off data scripts (run directly with node):
- `node server/import-notion.js` — idempotent import of hardcoded game data from an old Notion export.
- `node server/export-to-remote.js` — push local DB to a remote instance via its API (needs `REMOTE_URL`/`REMOTE_USER`/`REMOTE_PASS` env).

## Architecture

**Stack:** React 18 (Vite) frontend, Express backend, `better-sqlite3` (synchronous) for storage, native `ws` for live sync. No ORM, no state-management library. Routing is `react-router-dom` (`BrowserRouter` in `main.jsx`); each tab is a `<Route>` in `src/App.jsx` with its own URL (`/day`, `/rooms`, `/items`, `/crafts`, …) and the sidebar/top-bar drive navigation via `useNavigate`/`useLocation`. The Express catch-all (`app.get('*')`) serves `index.html` so deep links work.

**Backend (`server/`)**
- `db.js` — opens the SQLite DB (`DB_PATH` env, defaults to `data/blueprince.db`), creates all tables on boot via `CREATE TABLE IF NOT EXISTS`, and runs **idempotent inline migrations** (ALTER guarded by `PRAGMA table_info`, type re-categorization guarded by checking for legacy rows). Schema changes go here, as guarded migrations — there is no migration framework.
- `routes/*.js` — one Express Router per entity (rooms, codes, whiteboard, days, people, notes, links). Each imports `db` and runs prepared statements directly.
- `auth.js` — HTTP Basic auth middleware. **Disabled entirely unless all four of `AUTH_RO_USER/PASS` and `AUTH_RW_USER/PASS` are set.** RO credentials get 403 on any POST/PUT/DELETE.
- `index.js` — wiring + an **access-log middleware** (logs `[access] <iso> <ip> <method> <url> -> <status>` per request on `res.finish`) + the **WebSocket broadcast mechanism**: a middleware wraps `res.json` on every mutating request and, after success, broadcasts the first URL path segment (e.g. `rooms`) as a "channel" to all connected WS clients. This is how live multi-tab/multi-device sync works — no diffs are sent, just a "channel changed" ping.

**Frontend (`src/`)**
- `api/client.js` — the single `api` object: all HTTP calls, Basic-auth header from `localStorage` (`bp_user`/`bp_pass`), auto-logout-on-401.
- `api/useWs.js` — `useWs(callback, channels?)` hook. One shared singleton WebSocket with auto-reconnect; components subscribe to channel pings and re-fetch. **The standard data pattern is: fetch via `api` on mount, then `useWs` to re-fetch when the relevant channel pings.** There is no client-side cache.
- `api/roomCatalog.js` — embedded Blue Prince game knowledge (room name → category + gem cost). `lookupRoom(name)` auto-fills room type/cost when you type an exact room name. **Imported by `server/db.js` too** (used during migration), so it must stay isomorphic / dependency-free.
- `api/itemCatalog.js` — embedded item knowledge (item name → illustration URL + category, 65 items from the wiki). `lookupItem(name)`/`itemIconUrl(name)` reveal an item's illustration only on an **exact name match** — same anti-spoiler principle as rooms (the catalog is never listed wholesale in the UI). `api/craftCatalog.js` holds the 8 Workshop recipes (`lookupCraft(name)` matches a recipe by exact result name); `api/craftLogic.js` (`suggestCrafts(items, discovered)`) crosses recipes with an inventory and **only suggests recipes that are already discovered** (passed in `discovered`) AND craftable-now or missing-exactly-one (2+ short stays hidden). Both filters are anti-spoiler: undiscovered recipes are never surfaced.
  - **Items model:** `items` = the **permanent "known items" inventory** (everything ever discovered; `day_found` = first seen) — the `/items` tab. `run_items` = items found **during a specific run/day** (`routes/runItems.js`, channel `run-items`) — surfaced in the Day page's "Items & crafts" panel tab. Adding a run item (or discovering a craft) auto-registers the item name in the permanent `items` inventory so it stays known forever. Crafts are discovered by typing the exact craft name on the `/crafts` tab (or via the item-selection bench); discovering a craft also registers its result as a known item.
- `components/*.jsx` — one component per tab (DayView, RoomsView, PeopleView, CodesView, NotesView, plus extras: RelationsGraph, Genealogy, Whiteboard, DateCalc). `Whiteboard`/`RelationsGraph`/`Genealogy` use `@xyflow/react` for node graphs.
- `ui/` — `primitives.jsx` (shared inputs/buttons), `Icons.jsx`, `ThemeContext.jsx` (3 themes: blueprint/manoir/moderne, + sidebar/top-bar nav toggle). Styling is **inline styles driven by CSS variables** (`var(--bp-*)`), not Tailwind utility classes despite Tailwind being installed.
- `AuthContext.jsx` — login state, wraps everything; `App.jsx` shows `LoginForm` until authenticated.

**Cross-entity links.** The `links` table joins any two entities by `(from_type, from_id, to_type, to_id)`. `routes/links.js` resolves every entity type into a unified `{type, id, label}` catalog (`allEntities()`) and exposes a `/links/graph` endpoint that powers the RelationsGraph view. When adding a new linkable entity type, update both `allEntities()` in `routes/links.js` and `createEntity()` in `client.js`.

**Photos.** `routes/photos.js` (channel `photos`) is the photothèque: image files live on disk in `UPLOADS_DIR` (defaults to an `uploads/` folder next to the DB, same volume/PVC), only metadata is in the `photos` table. Upload is multipart via `multer` (disk storage, UUID filenames, image-only). Files are served statically at `/uploads/<filename>` **outside `/api`** so `<img>` tags work without the Basic-auth header. An app-side guard (`STORAGE_LIMIT_BYTES`, default 100 GB) rejects uploads with 413 once cumulative photo size would exceed the limit. Photos are a **linkable entity** (`type: 'photo'`) — attaching a photo creates a normal `links` row, so photos appear in the relations graph too; `photo` is marked `creatable: false` in `entities.js` (you attach a file, you don't type a name) so `CREATABLE_TYPES` excludes it from LinksPanel's "Nouveau" menu. UI: the `/photos` tab (`PhotosView`, with a storage-usage bar), `PhotoAttachModal` (the import-or-pick-from-library popup), `PhotosPanel` (per-entity thumbnails + "+ photo", sits next to `LinksPanel` in every detail view), and a shared `Lightbox`. In the chart, `persistence.size` is `100Gi` and `storage.limitBytes` feeds `STORAGE_LIMIT_BYTES`.

## Deployment

`Dockerfile` is a two-stage build (vite build → node runtime serving `dist/` + API). `chart/` is a Helm chart; `.github/workflows/docker-publish.yml` builds and pushes to GHCR. The SQLite DB lives on a mounted volume (`DB_PATH` / a PVC in the chart).
