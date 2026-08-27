// Unit tests for the RYM CSV parser, exercising every edge case the real export
// exhibits. The fixture (test/fixtures/rym-1970s-polish.csv) is the actual
// output the user downloaded from rateyourmusic.com via dbeley's userscript.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseCount, parseRymCsv } from "../src/features/charts";

const FIXTURE_PATH = "test/fixtures/rym-1970s-polish.csv";
const fixture = readFileSync(FIXTURE_PATH, "utf-8");
const rows = parseRymCsv(fixture);

describe("parseRymCsv — fixture integrity", () => {
  test("parses all 100 albums from the real 1970s polish export", () => {
    expect(rows.length).toBe(100);
  });

  test("assigns sequential 1-based rank by row order", () => {
    expect(rows[0]?.rank).toBe(1);
    expect(rows[99]?.rank).toBe(100);
  });

  test("every row has a non-empty artist and title", () => {
    for (const r of rows) {
      expect(r.artist.length).toBeGreaterThan(0);
      expect(r.title.length).toBeGreaterThan(0);
    }
  });
});

describe("parseRymCsv — multi-line quoted fields", () => {
  test("record split across 3 physical lines (22-24) is read as one row", () => {
    // The David Tukhmanov record has title + artist both spanning newlines.
    // Naive split('\n') would split it into 3 garbage rows.
    // Total count and rank uniqueness are the strongest signal.
    expect(rows.length).toBe(100);
    const ranks = new Set(rows.map((r) => r.rank));
    expect(ranks.size).toBe(100);
    const multi = rows.find((r) => r.artist.includes("David Tukhmanov"));
    expect(multi).toBeDefined();
    expect(multi?.title).toContain("On the Crest of My Memory");
    expect(multi?.title).toContain("По волне моей памяти");
    expect(multi?.artist).toContain("Давид Тухманов");
  });
});

describe("parseRymCsv — release_date formats", () => {
  test("extracts year from day+month+year '19 January 1970'", () => {
    const row = rows.find((r) => r.release_date === "19 January 1970");
    expect(row).toBeDefined();
    expect(row?.release_year).toBe(1970);
  });

  test("extracts year from month+year 'April 1978'", () => {
    const row = rows.find((r) => r.release_date === "April 1978");
    expect(row).toBeDefined();
    expect(row?.release_year).toBe(1978);
  });

  test("extracts year from year-only '1972'", () => {
    const yearOnlyRows = rows.filter((r) => /^\d{4}$/.test(r.release_date ?? ""));
    expect(yearOnlyRows.length).toBeGreaterThan(20);
    for (const r of yearOnlyRows) {
      expect(r.release_year).toBe(Number(r.release_date));
    }
  });
});

describe("parseRymCsv — number_of_votes shorthand", () => {
  test("'2k' → 2000, '1k' → 1000", () => {
    const twoK = rows.filter((r) => r.rating_count === 2_000);
    expect(twoK.length).toBe(2);
    const oneK = rows.filter((r) => r.rating_count === 1_000);
    expect(oneK.length).toBe(1);
  });

  test("plain integer '870' is preserved as 870", () => {
    const r = rows.find((row) => row.rating_count === 870);
    expect(r).toBeDefined();
    expect(r?.artist).toContain("Grechuta");
  });

  test("all rows have a non-null rating_count (the fixture has no missing votes)", () => {
    expect(rows.every((r) => r.rating_count !== null)).toBe(true);
  });
});

describe("parseRymCsv — N/A and missing fields", () => {
  test("N/A in number_of_reviews → null (29 rows in this fixture)", () => {
    const naReviews = rows.filter((r) => r.review_count === null);
    expect(naReviews.length).toBe(29);
  });

  test("'N/A' as artist string is preserved (Various Artists placeholder, 1 row)", () => {
    const variousArtists = rows.filter((r) => r.artist === "N/A");
    expect(variousArtists.length).toBe(1);
  });
});

describe("parseRymCsv — embedded escaped quotes", () => {
  test('handles ""Naga I"" → title contains "Naga I"', () => {
    const naga = rows.find((r) => r.title.includes("Naga I"));
    expect(naga).toBeDefined();
  });
});

describe("parseCount — unit tests", () => {
  test.each([
    ["326", 326],
    ["1k", 1_000],
    ["2K", 2_000],
    ["1.2k", 1_200],
    ["1.2m", 1_200_000],
    ["3M", 3_000_000],
    ["0", 0],
  ])("parseCount(%j) === %i", (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });

  test.each([
    ["N/A", null],
    ["", null],
    [undefined, null],
    ["   ", null],
  ])("parseCount(%j) === null", (input, expected) => {
    expect(parseCount(input as string | undefined)).toBe(expected);
  });
});
