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

**Stack:** React 18 (Vite) frontend, Express backend, `better-sqlite3` (synchronous) for storage, native `ws` for live sync. No ORM, no state-management library, no router — tab switching is local `useState` in `src/App.jsx`.

**Backend (`server/`)**
- `db.js` — opens the SQLite DB (`DB_PATH` env, defaults to `data/blueprince.db`), creates all tables on boot via `CREATE TABLE IF NOT EXISTS`, and runs **idempotent inline migrations** (ALTER guarded by `PRAGMA table_info`, type re-categorization guarded by checking for legacy rows). Schema changes go here, as guarded migrations — there is no migration framework.
- `routes/*.js` — one Express Router per entity (rooms, codes, whiteboard, days, people, notes, links). Each imports `db` and runs prepared statements directly.
- `auth.js` — HTTP Basic auth middleware. **Disabled entirely unless all four of `AUTH_RO_USER/PASS` and `AUTH_RW_USER/PASS` are set.** RO credentials get 403 on any POST/PUT/DELETE.
- `index.js` — wiring + the **WebSocket broadcast mechanism**: a middleware wraps `res.json` on every mutating request and, after success, broadcasts the first URL path segment (e.g. `rooms`) as a "channel" to all connected WS clients. This is how live multi-tab/multi-device sync works — no diffs are sent, just a "channel changed" ping.

**Frontend (`src/`)**
- `api/client.js` — the single `api` object: all HTTP calls, Basic-auth header from `localStorage` (`bp_user`/`bp_pass`), auto-logout-on-401.
- `api/useWs.js` — `useWs(callback, channels?)` hook. One shared singleton WebSocket with auto-reconnect; components subscribe to channel pings and re-fetch. **The standard data pattern is: fetch via `api` on mount, then `useWs` to re-fetch when the relevant channel pings.** There is no client-side cache.
- `api/roomCatalog.js` — embedded Blue Prince game knowledge (room name → category + gem cost). `lookupRoom(name)` auto-fills room type/cost when you type an exact room name. **Imported by `server/db.js` too** (used during migration), so it must stay isomorphic / dependency-free.
- `components/*.jsx` — one component per tab (DayView, RoomsView, PeopleView, CodesView, NotesView, plus extras: RelationsGraph, Genealogy, Whiteboard, DateCalc). `Whiteboard`/`RelationsGraph`/`Genealogy` use `@xyflow/react` for node graphs.
- `ui/` — `primitives.jsx` (shared inputs/buttons), `Icons.jsx`, `ThemeContext.jsx` (3 themes: blueprint/manoir/moderne, + sidebar/top-bar nav toggle). Styling is **inline styles driven by CSS variables** (`var(--bp-*)`), not Tailwind utility classes despite Tailwind being installed.
- `AuthContext.jsx` — login state, wraps everything; `App.jsx` shows `LoginForm` until authenticated.

**Cross-entity links.** The `links` table joins any two entities by `(from_type, from_id, to_type, to_id)`. `routes/links.js` resolves every entity type into a unified `{type, id, label}` catalog (`allEntities()`) and exposes a `/links/graph` endpoint that powers the RelationsGraph view. When adding a new linkable entity type, update both `allEntities()` in `routes/links.js` and `createEntity()` in `client.js`.

## Deployment

`Dockerfile` is a two-stage build (vite build → node runtime serving `dist/` + API). `chart/` is a Helm chart; `.github/workflows/docker-publish.yml` builds and pushes to GHCR. The SQLite DB lives on a mounted volume (`DB_PATH` / a PVC in the chart).
