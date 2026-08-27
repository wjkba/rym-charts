// Domain types for the charts feature.
// These are the shapes returned by db.ts and consumed by views/routes.

export interface Chart {
  id: number;
  source: string;
  source_url: string | null;
  title: string;
  imported_at: string;
  album_count: number;
}

/** Album as stored in the DB (all columns). */
export interface Album {
  id: number;
  chart_id: number;
  rank: number;
  artist: string;
  title: string;
  release_date: string | null;
  release_year: number | null;
  genres: string;
  avg_rating: number | null;
  rating_count: number | null;
  review_count: number | null;
  image_url: string | null;
  source_url: string | null;
  listened: 0 | 1;
  listened_at: string | null;
}

/** Album as produced by the CSV parser (no DB-assigned fields). */
export interface AlbumRow {
  rank: number;
  artist: string;
  title: string;
  release_date: string | null;
  release_year: number | null;
  genres: string;
  avg_rating: number | null;
  rating_count: number | null;
  review_count: number | null;
  image_url: string | null;
}

export interface ChartProgress {
  total: number;
  listened: number;
  percent: number;
}
