// SQLite persistence for charts and albums.
//
// bun:sqlite is synchronous and lives inside the Bun process, so we don't
// need a connection pool or async wrappers. Schema is applied on every
// getDb() call via CREATE TABLE IF NOT EXISTS — small enough to skip migrations.
//
// Re-import is idempotent via UNIQUE(chart_id, artist, title) + INSERT OR IGNORE.

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Album, AlbumRow, Chart, ChartProgress } from "./schema";

let dbInstance: Database | null = null;

export interface DbOptions {
  path?: string;
  readonly?: boolean;
}

export function getDb(opts: DbOptions = {}): Database {
  if (dbInstance) return dbInstance;

  const path = opts.path ?? process.env["DB_PATH"] ?? "./data/rym-charts.db";

  if (!opts.readonly) {
    const dir = dirname(path);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(path, { create: !opts.readonly, readonly: opts.readonly });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  initSchema(db);

  if (!opts.readonly) {
    dbInstance = db;
  }
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function initSchema(db: Database): void {
  // Step 1: tables. CREATE TABLE IF NOT EXISTS is a no-op on existing dbs,
  // so an install upgraded from before the starred feature has the older
  // albums schema (no starred / starred_at columns).
  db.exec(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL DEFAULT 'rym',
      source_url TEXT,
      title TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      album_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
      rank INTEGER NOT NULL,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      release_date TEXT,
      release_year INTEGER,
      genres TEXT NOT NULL DEFAULT '',
      avg_rating REAL,
      rating_count INTEGER,
      review_count INTEGER,
      image_url TEXT,
      source_url TEXT,
      listened INTEGER NOT NULL DEFAULT 0,
      listened_at TEXT,
      starred INTEGER NOT NULL DEFAULT 0,
      starred_at TEXT,
      UNIQUE(chart_id, artist, title)
    );
  `);

  // Step 2: idempotent column adds for installs created before the starred
  // feature. SQLite returns "duplicate column name: starred" when the column
  // already exists; that's the happy path on re-runs. We run this BEFORE
  // creating indexes that reference these columns, otherwise an old db would
  // fail with "no such column: starred" at index creation.
  for (const stmt of [
    "ALTER TABLE albums ADD COLUMN starred INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE albums ADD COLUMN starred_at TEXT",
  ]) {
    try {
      db.exec(stmt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("duplicate column")) throw err;
    }
  }

  // Step 3: indexes. Safe to create now that the columns exist (or will
  // exist after step 2 added them).
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_albums_chart ON albums(chart_id);
    CREATE INDEX IF NOT EXISTS idx_albums_listened ON albums(listened);
    CREATE INDEX IF NOT EXISTS idx_albums_starred ON albums(starred);
    CREATE INDEX IF NOT EXISTS idx_albums_year ON albums(release_year);
  `);
}

// --- chart queries ---

export interface CreateChartOpts {
  title: string;
  sourceUrl?: string | null;
  source?: string;
}

export interface UpdateChartOpts {
  title: string;
  sourceUrl?: string | null;
}

export function createChart(opts: CreateChartOpts): Chart {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO charts (source, source_url, title)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(
    opts.source ?? "rym",
    opts.sourceUrl ?? null,
    opts.title,
  );
  const id = Number(result.lastInsertRowid);
  const chart = getChart(id);
  if (!chart) throw new Error(`Failed to create chart row ${id}`);
  return chart;
}

export function getChart(id: number): Chart | null {
  const db = getDb();
  return db.query<Chart, [number]>("SELECT * FROM charts WHERE id = ?").get(id) ?? null;
}

export function updateChart(id: number, opts: UpdateChartOpts): Chart {
  const db = getDb();
  const title = opts.title.trim();
  if (!title) {
    throw new Error("Chart title is required");
  }
  const sourceUrl = typeof opts.sourceUrl === "string" && opts.sourceUrl.trim()
    ? opts.sourceUrl.trim()
    : null;

  db.prepare("UPDATE charts SET title = ?, source_url = ? WHERE id = ?").run(
    title,
    sourceUrl,
    id,
  );

  const chart = getChart(id);
  if (!chart) {
    throw new Error(`Chart ${id} not found after update`);
  }
  return chart;
}

export function listCharts(): Chart[] {
  const db = getDb();
  return db
    .query<Chart, []>("SELECT * FROM charts ORDER BY imported_at DESC, id DESC")
    .all();
}

export function deleteChart(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM charts WHERE id = ?").run(id);
}

// --- album queries ---

export interface AddAlbumsResult {
  inserted: number;
  skipped: number;
}

export function addAlbums(chartId: number, albums: AlbumRow[]): AddAlbumsResult {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO albums (
      chart_id, rank, artist, title, release_date, release_year, genres,
      avg_rating, rating_count, review_count, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    for (const a of albums) {
      const result = stmt.run(
        chartId,
        a.rank,
        a.artist,
        a.title,
        a.release_date,
        a.release_year,
        a.genres,
        a.avg_rating,
        a.rating_count,
        a.review_count,
        a.image_url,
      );
      if (result.changes > 0) inserted++;
      else skipped++;
    }
    db.prepare(
      "UPDATE charts SET album_count = (SELECT COUNT(*) FROM albums WHERE chart_id = ?) WHERE id = ?",
    ).run(chartId, chartId);
  });
  tx();

  return { inserted, skipped };
}

export function listAlbums(chartId: number): Album[] {
  const db = getDb();
  return db
    .query<Album, [number]>(
      "SELECT * FROM albums WHERE chart_id = ? ORDER BY rank ASC",
    )
    .all(chartId);
}

export function toggleListened(chartId: number, albumId: number): Album | null {
  const db = getDb();
  const existing = db
    .query<Album, [number, number]>(
      "SELECT * FROM albums WHERE id = ? AND chart_id = ?",
    )
    .get(albumId, chartId);
  if (!existing) return null;

  const newListened: 0 | 1 = existing.listened === 1 ? 0 : 1;
  const newListenedAt = newListened === 1 ? new Date().toISOString() : null;

  db.prepare("UPDATE albums SET listened = ?, listened_at = ? WHERE id = ?").run(
    newListened,
    newListenedAt,
    albumId,
  );

  return { ...existing, listened: newListened, listened_at: newListenedAt };
}

export function toggleStarred(chartId: number, albumId: number): Album | null {
  const db = getDb();
  const existing = db
    .query<Album, [number, number]>(
      "SELECT * FROM albums WHERE id = ? AND chart_id = ?",
    )
    .get(albumId, chartId);
  if (!existing) return null;

  const newStarred: 0 | 1 = existing.starred === 1 ? 0 : 1;
  const newStarredAt = newStarred === 1 ? new Date().toISOString() : null;

  db.prepare("UPDATE albums SET starred = ?, starred_at = ? WHERE id = ?").run(
    newStarred,
    newStarredAt,
    albumId,
  );

  return { ...existing, starred: newStarred, starred_at: newStarredAt };
}

export type StarredAlbum = Album & { chart_title: string };

export function listStarred(): StarredAlbum[] {
  const db = getDb();
  return db
    .query<StarredAlbum, []>(
      `SELECT albums.*, charts.title AS chart_title
       FROM albums
       JOIN charts ON charts.id = albums.chart_id
       WHERE albums.starred = 1
       ORDER BY albums.starred_at DESC, albums.id DESC`,
    )
    .all();
}

export function chartProgress(chartId: number): ChartProgress {
  const db = getDb();
  const row = db
    .query<
      { total: number | bigint; listened: number | bigint | null },
      [number]
    >(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN listened = 1 THEN 1 ELSE 0 END) AS listened
       FROM albums WHERE chart_id = ?`,
    )
    .get(chartId);
  const total = Number(row?.total ?? 0);
  const listened = Number(row?.listened ?? 0);
  const percent = total > 0 ? Math.round((listened / total) * 100) : 0;
  return { total, listened, percent };
}
