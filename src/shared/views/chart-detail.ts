import { esc, layout, nl2br } from "./layout";
import type { Album, Chart, ChartProgress } from "@/features/charts";

export interface ChartDetailOpts {
  chart: Chart;
  albums: Album[];
  progress: ChartProgress;
  filter: { decade?: number; genre?: string };
}

export function chartDetail(opts: ChartDetailOpts): string {
  const { chart, albums, progress, filter } = opts;
  const decades = collectDecades(albums);
  const genres = collectGenres(albums);
  const filtered = applyFilter(albums, filter);

  return layout({
    title: chart.title,
    body: `
      <h1>${esc(chart.title)}</h1>
      <p class="meta">
        ${albums.length} albums · imported ${esc(chart.imported_at)}
        ${chart.source_url ? ` · <a href="${esc(chart.source_url)}" target="_blank" rel="noopener">source</a>` : ""}
        · <form class="inline" method="post" action="/charts/${chart.id}/delete" onsubmit="return confirm('Delete this chart and all its listened flags?')">
            <button type="submit" class="danger small">Delete chart</button>
          </form>
      </p>
      <div class="progress-row">
        <div class="progress progress-listened"><div style="width:${progress.percent}%"></div></div>
        <span><strong>${progress.listened}</strong> / ${progress.total} (${progress.percent}%)</span>
      </div>

      <div class="filters">
        <div>
          <strong>Decade:</strong>
          <a href="/charts/${chart.id}" class="chip ${!filter.decade ? "active" : ""}">all</a>
          ${decades.map((d) => `<a href="/charts/${chart.id}?decade=${d}" class="chip ${filter.decade === d ? "active" : ""}">${d}s</a>`).join("")}
        </div>
        <div>
          <strong>Genre:</strong>
          <a href="/charts/${chart.id}" class="chip ${!filter.genre ? "active" : ""}">all</a>
          ${genres.map((g) => `<a href="/charts/${chart.id}?genre=${encodeURIComponent(g)}" class="chip ${filter.genre === g ? "active" : ""}">${esc(g)}</a>`).join("")}
        </div>
      </div>

      ${filtered.length === 0
        ? `<div class="empty">No albums match the current filter.</div>`
        : `<table>
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Cover</th>
                <th>Artist</th>
                <th>Title</th>
                <th class="year">Year</th>
                <th class="genres">Genres</th>
                <th class="num">Rating</th>
                <th class="num">Votes</th>
                <th>Listened</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((a) => albumRow(chart.id, a)).join("")}
            </tbody>
          </table>`}
    `,
  });
}

/**
 * Single album row — used by both the full table and the HTMX PATCH response.
 * Must be a complete <tr> with stable id so hx-target resolves after swap.
 */
export function albumRow(chartId: number, album: Album): string {
  const cover = album.image_url
    ? `<img class="cover" src="/cover?u=${encodeURIComponent(album.image_url)}" loading="lazy" alt="">`
    : `<div class="cover-placeholder">N/A</div>`;
  const rating = album.avg_rating !== null ? album.avg_rating.toFixed(2) : "—";
  const votes = album.rating_count !== null ? album.rating_count.toLocaleString() : "—";
  return `<tr id="row-${album.id}" class="${album.listened ? "listened" : ""}">
    <td class="rank">${album.rank}</td>
    <td>${cover}</td>
    <td>${esc(album.artist)}</td>
    <td class="title">${nl2br(album.title)}</td>
    <td class="year">${album.release_year ?? "—"}</td>
    <td class="genres">${esc(album.genres)}</td>
    <td class="num">${rating}</td>
    <td class="num">${votes}</td>
    <td>
      <input type="checkbox" ${album.listened ? "checked" : ""}
             hx-patch="/charts/${chartId}/albums/${album.id}"
             hx-trigger="change"
             hx-target="#row-${album.id}"
             hx-swap="outerHTML">
    </td>
  </tr>`;
}

function collectDecades(albums: Album[]): number[] {
  const set = new Set<number>();
  for (const a of albums) {
    if (a.release_year !== null) {
      set.add(Math.floor(a.release_year / 10) * 10);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function collectGenres(albums: Album[]): string[] {
  const set = new Set<string>();
  for (const a of albums) {
    for (const g of a.genres.split(",").map((s) => s.trim()).filter(Boolean)) {
      set.add(g);
    }
  }
  return Array.from(set).sort();
}

function applyFilter(
  albums: Album[],
  filter: { decade?: number; genre?: string },
): Album[] {
  return albums.filter((a) => {
    if (filter.decade !== undefined) {
      const d = a.release_year !== null ? Math.floor(a.release_year / 10) * 10 : null;
      if (d !== filter.decade) return false;
    }
    if (filter.genre) {
      const genres = a.genres.split(",").map((s) => s.trim());
      if (!genres.includes(filter.genre)) return false;
    }
    return true;
  });
}
