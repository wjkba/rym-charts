// Aggregations across all charts. Pulled out of charts/db.ts because these
// queries scan the whole table and don't belong to any single chart.

import { getDb } from "../charts/db";
import type { Album } from "../charts/schema";

export interface Stats {
  totalCharts: number;
  totalAlbums: number;
  totalListened: number;
  totalStarred: number;
  topGenres: Array<{ genre: string; count: number }>;
  byDecade: Array<{ decade: number; total: number; listened: number; percent: number }>;
  recentAlbums: Array<Album & { chart_title: string }>;
}

export function getStats(): Stats {
  const db = getDb();

  const totals = db
    .query<
      { charts: number; albums: number; listened: number | null; starred: number | null },
      []
    >(
      `SELECT
         (SELECT COUNT(*) FROM charts) AS charts,
         (SELECT COUNT(*) FROM albums) AS albums,
         (SELECT SUM(CASE WHEN listened = 1 THEN 1 ELSE 0 END) FROM albums) AS listened,
         (SELECT SUM(CASE WHEN starred = 1 THEN 1 ELSE 0 END) FROM albums) AS starred`,
    )
    .get();

  const totalCharts = Number(totals?.charts ?? 0);
  const totalAlbums = Number(totals?.albums ?? 0);
  const totalListened = Number(totals?.listened ?? 0);
  const totalStarred = Number(totals?.starred ?? 0);

  // Genre split is post-query because genres is a comma-separated string.
  // Scoped to listened albums so the stats reflect what the user has actually
  // engaged with, not the full chart backlog.
  const genreRows = db
    .query<{ genres: string }, []>("SELECT genres FROM albums WHERE listened = 1")
    .all();
  const genreCounts = new Map<string, number>();
  for (const r of genreRows) {
    for (const g of r.genres.split(",").map((s) => s.trim()).filter(Boolean)) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const topGenres = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => (b.count - a.count) || a.genre.localeCompare(b.genre))
    .slice(0, 20);

  const decadeRows = db
    .query<
      { decade: number | null; total: number; listened: number | null },
      []
    >(
      `SELECT
         (release_year / 10) * 10 AS decade,
         COUNT(*) AS total,
         SUM(CASE WHEN listened = 1 THEN 1 ELSE 0 END) AS listened
       FROM albums
       WHERE release_year IS NOT NULL
       GROUP BY decade
       ORDER BY decade ASC`,
    )
    .all();
  const byDecade = decadeRows
    .filter((r): r is { decade: number; total: number; listened: number | null } => r.decade !== null)
    .map((r) => {
      const total = Number(r.total);
      const listened = Number(r.listened ?? 0);
      const percent = total > 0 ? Math.round((listened / total) * 100) : 0;
      return { decade: Number(r.decade), total, listened, percent };
    });

  const recentAlbums = db
    .query<Album & { chart_title: string }, []>(
      `SELECT albums.*, charts.title AS chart_title
       FROM albums
       JOIN charts ON charts.id = albums.chart_id
       WHERE albums.listened = 1
       ORDER BY albums.listened_at DESC
       LIMIT 10`,
    )
    .all();

  return { totalCharts, totalAlbums, totalListened, totalStarred, topGenres, byDecade, recentAlbums };
}
