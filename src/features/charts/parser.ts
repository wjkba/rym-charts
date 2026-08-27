// Parser for dbeley's RateYourMusic chart CSV export.
//
// Edge cases the real export exhibits and we must handle:
//   1. Multi-line quoted fields (titles/artists with literal newlines)
//   2. "N/A" for missing review_count (and occasionally other fields)
//   3. Standard RFC4180 "" escaping for embedded quotes
//   4. number_of_votes shorthand: "326", "1k", "1.2k", "1.2m"
//   5. Three release_date formats: "1972", "April 1978", "19 January 1970"
//   6. "N/A" as a literal artist name (Various Artists placeholder) — keep as-is
//   7. UTF-8 throughout (Polish, Cyrillic, Æ)
//
// We delegate to csv-parse/sync rather than rolling our own so case (1) Just Works.

import { parse } from "csv-parse/sync";
import type { AlbumRow } from "./schema";

interface RawRow {
  title?: string;
  artist?: string;
  release_date?: string;
  genres?: string;
  average_rating?: string;
  number_of_votes?: string;
  number_of_reviews?: string;
  image_url?: string;
}

export function parseRymCsv(content: string): AlbumRow[] {
  const records = parse(content, {
    columns: (header) => header.map((h: string) => h.trim()),
    skip_empty_lines: true,
    relax_quotes: false,
    relax_column_count: false,
    trim: false,
  }) as RawRow[];

  return records.map((r, idx) => {
    const releaseDate = (r.release_date ?? "").trim();
    return {
      rank: idx + 1,
      artist: r.artist ?? "",
      title: r.title ?? "",
      release_date: releaseDate === "" ? null : releaseDate,
      release_year: extractYear(releaseDate),
      genres: r.genres ?? "",
      avg_rating: parseRating(r.average_rating),
      rating_count: parseCount(r.number_of_votes),
      review_count: parseCount(r.number_of_reviews),
      image_url: emptyToNull(r.image_url),
    };
  });
}

function emptyToNull(s: string | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function extractYear(s: string): number | null {
  if (!s) return null;
  const m = s.match(/\b(?:19|20)\d{2}\b/);
  return m?.[0] ? Number(m[0]) : null;
}

function parseRating(s: string | undefined): number | null {
  if (s == null) return null;
  const t = s.trim();
  if (t === "" || t === "N/A") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse RYM's compact number notation: plain integers ("326") or suffixed
 * ("1k" = 1000, "1.2k" = 1200, "2m" = 2_000_000). Returns null for "N/A" or empty.
 */
export function parseCount(s: string | undefined): number | null {
  if (s == null) return null;
  const t = s.trim();
  if (t === "" || t === "N/A") return null;

  const lastChar = t[t.length - 1] ?? "";
  if (lastChar === "k" || lastChar === "K") {
    const n = Number(t.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000) : null;
  }
  if (lastChar === "m" || lastChar === "M") {
    const n = Number(t.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
