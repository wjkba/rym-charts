// /starred page — albums starred across all charts.
//
// Starred state is per-album but spans charts, so the row format differs
// from the chart-detail row: we need a Chart column to show where the
// album came from, and the star button uses hx-swap="delete" so that
// unstarring removes the row in place rather than leaving a stale entry.

import { esc, layout, nl2br } from "./layout";
import type { StarredAlbum } from "../../features/charts";

export function starredView(albums: StarredAlbum[]): string {
  return layout({
    title: "Starred",
    body: `
      <h1>Starred</h1>
      <p class="meta">${albums.length} album${albums.length === 1 ? "" : "s"} starred across all charts.</p>

      ${albums.length === 0
        ? `<div class="empty">Nothing starred yet — click ★ on any album row to add it here.</div>`
        : `<table>
            <thead>
              <tr>
                <th>Cover</th>
                <th>Artist</th>
                <th>Title</th>
                <th class="year">Year</th>
                <th>Chart</th>
                <th class="star-cell">★</th>
              </tr>
            </thead>
            <tbody>
              ${albums.map((a) => starredRow(a)).join("")}
            </tbody>
          </table>`}
    `,
  });
}

function starredRow(album: StarredAlbum): string {
  const cover = album.image_url
    ? `<img class="cover" src="/cover?u=${encodeURIComponent(album.image_url)}" loading="lazy" alt="">`
    : `<div class="cover-placeholder">N/A</div>`;

  return `<tr id="row-${album.id}" class="${album.listened ? "listened" : ""}">
    <td>${cover}</td>
    <td>${esc(album.artist)}</td>
    <td class="title">${nl2br(album.title)}</td>
    <td class="year">${album.release_year ?? "—"}</td>
    <td><a href="/charts/${album.chart_id}">${esc(album.chart_title)}</a></td>
    <td class="star-cell">
      <button class="star on"
              hx-patch="/charts/${album.chart_id}/albums/${album.id}/star"
              hx-trigger="click"
              hx-target="#row-${album.id}"
              hx-swap="delete"
              title="Unstar"
              aria-label="Unstar">★</button>
    </td>
  </tr>`;
}
