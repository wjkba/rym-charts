# rym-charts

A self-hosted, single-user web app for tracking albums you've listened to from [RateYourMusic](https://rateyourmusic.com) chart exports.

You upload CSV files exported by a userscript that runs in your own browser; the app stores them, lets you check off albums as listened, and shows stats.

## Why this exists

RateYourMusic deployed Cloudflare in mid-2024. Direct scraping is no longer feasible — non-browser HTTP gets flat 403s, and RYM's own IP bans make it worse. Working scrapers need TLS fingerprint impersonation, a residential proxy, and a paid captcha solver. The maintainer of the most-starred Python scraper ([dbeley/rymscraper](https://github.com/dbeley/rymscraper)) archived the project and advises using a userscript instead.

So this app doesn't scrape at all. You install a userscript in your browser, click a button on any RYM chart page, and the script downloads a CSV that runs inside your authenticated browser session — Cloudflare sees a normal user, your IP never enters RYM's block list, and you get all the chart metadata in one file. Upload that CSV here.

## Quick start

```bash
git clone <repo> rym-charts
cd rym-charts
docker compose up -d --build
open http://localhost:7331
```

The SQLite database lives in `./data/rym-charts.db`. Stop the container with `docker compose down`. Delete `./data/` to wipe all state.

## CSV import: install the userscript once

1. Install a userscript manager: [Violentmonkey](https://violentmonkey.github.io/) (Firefox, Chrome, Edge, Safari) or [Tampermonkey](https://www.tampermonkey.net/).
2. Install [dbeley/download-album-charts.user.js](https://github.com/dbeley/rym-userscripts/raw/main/download-album-charts.user.js). (If that URL has moved, browse the [rym-userscripts repo](https://github.com/dbeley/rym-userscripts) for the latest file.)
3. On any RYM chart page (e.g. `https://rateyourmusic.com/charts/top/album/1970s/l:pl/`), a "Download CSV" button appears near the page header. Click it. Your browser saves a file like `rym_album_charts_top_1970_1970s_l_pl_2026-08-27_09-06-06.csv`.
4. Open `http://localhost:7331/charts/new`, fill in an optional title + source URL, pick the CSV, click **Upload**.
5. The chart detail page opens with the full table. Check off albums as you listen to them.

Re-uploading the same CSV is safe — duplicates are skipped (`UNIQUE(chart_id, artist, title)` + `INSERT OR IGNORE`).

## What the CSV contains

`title, artist, release_date, genres, average_rating, number_of_votes, number_of_reviews, image_url` — the standard columns from dbeley's userscript. The parser handles:

- **Multi-line quoted fields** (e.g. `David Tukhmanov` with Cyrillic title and artist)
- **`N/A`** in `number_of_reviews` (stored as NULL)
- **Vote shorthand** like `1k`, `1.2k`, `1.2m` → expanded to integers
- **Three `release_date` formats**: `1972`, `April 1978`, `19 January 1970`
- **Embedded escaped quotes** (`""Naga I""` → `"Naga I"`)
- **UTF-8** throughout (Polish, Cyrillic, Æ, etc.)

## Configuration

Environment variables (set in `docker-compose.yml` or pass to the container):

| Var | Default | Notes |
|-----|---------|-------|
| `PORT` | `7331` | HTTP listen port |
| `DB_PATH` | `/app/data/rym-charts.db` | SQLite file (the volume mount target must match) |

## Local development

Without Docker:

```bash
bun install
bun run dev      # hot-reload on src/
bun test         # parser unit tests
bun run start    # production server (no reload)
```

Requires [Bun](https://bun.sh) 1.1+. Data lives in `./data/rym-charts.db` unless `DB_PATH` is set.

## Stack

- **[Bun](https://bun.sh)** — runtime, package manager, test runner, native SQLite, native `fetch`
- **[Hono](https://hono.dev/)** — small HTTP framework, Web-standard `Request`/`Response`
- **[HTMX](https://htmx.org/)** — server-rendered HTML with progressive enhancement; no client framework, no build step
- **[bun:sqlite](https://bun.sh/docs/api/sqlite)** — synchronous SQLite, no separate DB process
- **[csv-parse](https://csv.js.org/parse/)** — RFC 4180 compliant CSV parser (multi-line, escaped quotes)

## Project layout

```
src/
  index.ts              — app entry, routes
  features/
    charts/
      schema.ts         — types (Chart, Album, AlbumRow)
      parser.ts         — CSV → AlbumRow[]
      db.ts             — schema + queries (charts, albums, listened toggle)
      index.ts          — public exports
    stats/
      stats.ts          — cross-chart aggregations
      index.ts          — public exports
  shared/
    views/              — HTML template functions
      layout.ts         — base layout, CSS, esc() helper
      upload-form.ts
      charts-list.ts
      chart-detail.ts   — includes albumRow() for HTMX swap
      stats-view.ts
test/
  fixtures/
    rym-1970s-polish.csv
  parser.test.ts        — 24 cases covering all edge cases
```

## Out of scope

- Real RYM scraping (Cloudflare + TOS blocks it — that's why this app exists)
- Last.fm / ListenBrainz scrobbling
- Multi-user / authentication
- Cover art uploading (RYM images are proxied as-is)
- Mobile apps
