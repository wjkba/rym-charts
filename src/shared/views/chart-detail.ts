import { esc, layout, nl2br } from "./layout";
import type { Album, Chart, ChartProgress } from "../../features/charts";

export interface ChartDetailOpts {
  chart: Chart;
  albums: Album[];
  progress: ChartProgress;
}

export function chartDetail(opts: ChartDetailOpts): string {
  const { chart, albums, progress } = opts;

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

      ${albums.length === 0
        ? `<div class="empty">No albums in this chart.</div>`
        : `<table>
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Cover</th>
                <th>Artist</th>
                <th>Title</th>
                <th class="year">Year</th>
                <th class="genres">Genre</th>
                <th class="num">Rating</th>
                <th class="num">Votes</th>
                <th>Listened</th>
              </tr>
            </thead>
            <tbody>
              ${albums.map((a) => albumRow(chart.id, a)).join("")}
            </tbody>
          </table>`}
    `,
  });
}

/**
 * Single album row — used by both the full table and the HTMX PATCH response.
 * Must be a complete <tr> with stable id so hx-target resolves after swap.
 *
 * Genres: shows only the primary genre per row. The full comma-separated
 * list is kept as a title attribute for hover, so power users can still
 * see everything without the table becoming a wall of text.
 */
export function albumRow(chartId: number, album: Album): string {
  const cover = album.image_url
    ? `<img class="cover" src="/cover?u=${encodeURIComponent(album.image_url)}" loading="lazy" alt="">`
    : `<div class="cover-placeholder">N/A</div>`;
  const rating = album.avg_rating !== null ? album.avg_rating.toFixed(2) : "—";
  const votes = album.rating_count !== null ? album.rating_count.toLocaleString() : "—";

  const genres = album.genres
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = genres[0] ?? "";
  const genreCell = primary
    ? `<span title="${esc(album.genres)}">${esc(primary)}</span>`
    : `<span class="meta">—</span>`;

  return `<tr id="row-${album.id}" class="${album.listened ? "listened" : ""}">
    <td class="rank">${album.rank}</td>
    <td>${cover}</td>
    <td>${esc(album.artist)}</td>
    <td class="title">${nl2br(album.title)}</td>
    <td class="year">${album.release_year ?? "—"}</td>
    <td class="genres">${genreCell}</td>
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
