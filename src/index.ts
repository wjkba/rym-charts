// App entry. Wires HTTP routes to features and views.
//
// Why no router abstraction: 8 routes total, single user, single deploy target.
// Flat top-level definitions are easier to scan than nested mounts.
//
// Note: no `export default app`. Bun auto-serves any default export that looks
// like a server config; combined with the explicit Bun.serve() below that
// would bind port 7331 twice. We control startup explicitly.

import { Hono } from "hono";
import {
  addAlbums,
  chartProgress,
  createChart,
  deleteChart,
  getChart,
  listAlbums,
  listCharts,
  listStarred,
  parseRymCsv,
  toggleListened,
  toggleStarred,
  updateChart,
  type AlbumRow,
  type Chart,
  type ChartProgress,
} from "./features/charts";
import { getStats } from "./features/stats";
import {
  albumRow,
  chartDetail,
  chartEditForm,
  chartsList,
  starredView,
  statsView,
  uploadForm,
} from "./shared/views";

const app = new Hono();

// --- meta ---

app.get("/healthz", (c) => c.text("ok"));

// --- charts list ---

app.get("/", (c) => {
  const charts = listCharts().map(
    (chart): Chart & ChartProgress => {
      const p = chartProgress(chart.id);
      return { ...chart, ...p };
    },
  );
  return c.html(chartsList(charts));
});

// --- upload ---

app.get("/charts/new", (c) => c.html(uploadForm()));

app.post("/charts", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = (await c.req.parseBody()) as Record<string, unknown>;
  } catch (err) {
    return c.text(`Could not parse multipart body: ${(err as Error).message}`, 400);
  }

  const file = body["file"];
  const titleRaw = body["title"];
  const urlRaw = body["source_url"];

  if (!(file instanceof File)) {
    return c.text("A CSV file is required.", 400);
  }

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const sourceUrl =
    typeof urlRaw === "string" && urlRaw.trim() ? urlRaw.trim() : null;

  const filename = file.name || "chart.csv";
  const content = await file.text();

  let albumRows: AlbumRow[];
  try {
    albumRows = parseRymCsv(content);
  } catch (err) {
    return c.text(`CSV parse error: ${(err as Error).message}`, 400);
  }

  if (albumRows.length === 0) {
    return c.text("CSV parsed to 0 albums — check the file format.", 400);
  }

  const derivedTitle =
    title ||
    filename
      .replace(/\.csv$/i, "")
      .replace(/^rym_album_charts_/, "")
      .replace(/_/g, " ")
      .trim() ||
    "Untitled chart";

  const chart = createChart({ title: derivedTitle, sourceUrl });
  addAlbums(chart.id, albumRows);

  return c.redirect(`/charts/${chart.id}`);
});

// --- chart detail with filters ---

app.get("/charts/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return c.text("invalid id", 400);

  const chart = getChart(id);
  if (!chart) return c.text("chart not found", 404);

  const albums = listAlbums(id);
  const progress = chartProgress(id);
  return c.html(chartDetail({ chart, albums, progress }));
});

// --- edit chart info ---

app.get("/charts/:id/edit", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return c.text("invalid id", 400);

  const chart = getChart(id);
  if (!chart) return c.text("chart not found", 404);

  return c.html(chartEditForm(chart));
});

app.post("/charts/:id/edit", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return c.text("invalid id", 400);

  const body = (await c.req.parseBody()) as Record<string, unknown>;
  const titleRaw = body["title"];
  const urlRaw = body["source_url"];

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const sourceUrl =
    typeof urlRaw === "string" && urlRaw.trim() ? urlRaw.trim() : null;

  if (!title) {
    return c.text("Chart title is required.", 400);
  }

  updateChart(id, { title, sourceUrl });
  return c.redirect(`/charts/${id}`);
});

// --- HTMX: toggle listened ---

app.patch("/charts/:id/albums/:albumId", (c) => {
  const chartId = parseId(c.req.param("id"));
  const albumId = parseId(c.req.param("albumId"));
  if (chartId === null || albumId === null) return c.text("invalid id", 400);

  const album = toggleListened(chartId, albumId);
  if (!album) return c.text("album not found", 404);
  return c.html(albumRow(chartId, album));
});

// --- HTMX: toggle starred ---

app.patch("/charts/:id/albums/:albumId/star", (c) => {
  const chartId = parseId(c.req.param("id"));
  const albumId = parseId(c.req.param("albumId"));
  if (chartId === null || albumId === null) return c.text("invalid id", 400);

  const album = toggleStarred(chartId, albumId);
  if (!album) return c.text("album not found", 404);
  // Return the updated chart-detail row. On /starred the button uses
  // hx-swap="delete" so the response is discarded; on chart-detail the
  // button uses hx-swap="outerHTML" so this replaces the row in place.
  return c.html(albumRow(chartId, album));
});

// --- delete (POST so plain HTML forms work without JS) ---

app.delete("/charts/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return c.text("invalid id", 400);
  deleteChart(id);
  return c.redirect("/");
});

app.post("/charts/:id/delete", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return c.text("invalid id", 400);
  deleteChart(id);
  return c.redirect("/");
});

// --- starred across all charts ---

app.get("/starred", (c) => c.html(starredView(listStarred())));

// --- stats ---

app.get("/stats", (c) => c.html(statsView(getStats())));

// --- cover proxy ---

app.get("/cover", async (c) => {
  const url = c.req.query("u");
  if (!url) return c.text("missing ?u= parameter", 400);
  if (!url.startsWith("https://e.snmc.io/")) {
    return c.text("only snmc.io URLs are proxied", 400);
  }

  try {
    const upstream = await fetch(url, {
      headers: { Referer: "https://rateyourmusic.com/" },
    });
    if (!upstream.ok) {
      return c.text(`upstream returned ${upstream.status}`, upstream.status as 400 | 404 | 500 | 502);
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return c.text(`cover fetch failed: ${(err as Error).message}`, 502);
  }
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

if (import.meta.main) {
  const port = Number(process.env["PORT"] ?? 7331);
  const dbPath = process.env["DB_PATH"] ?? "./data/rym-charts.db";
  console.log(`rym-charts listening on http://0.0.0.0:${port}`);
  console.log(`db: ${dbPath}`);
  Bun.serve({ port, fetch: app.fetch });
}
