import { esc, layout, nl2br } from "./layout";
import type { Stats } from "../../features/stats";

export function statsView(stats: Stats): string {
  const overallPct = stats.totalAlbums > 0
    ? Math.round((stats.totalListened / stats.totalAlbums) * 100)
    : 0;

  return layout({
    title: "Stats",
    body: `
      <h1>Stats</h1>

      <div class="stat-grid">
        <div class="stat-card"><div class="value">${stats.totalCharts}</div><div class="label">Charts</div></div>
        <div class="stat-card"><div class="value">${stats.totalAlbums}</div><div class="label">Albums tracked</div></div>
        <div class="stat-card"><div class="value">${stats.totalListened}</div><div class="label">Listened</div></div>
        <div class="stat-card"><div class="value">${stats.totalStarred}</div><div class="label">Starred</div></div>
        <div class="stat-card"><div class="value">${overallPct}%</div><div class="label">Completion</div></div>
      </div>

      <h2>By decade</h2>
      ${stats.byDecade.length === 0
        ? `<p class="meta">No albums with release years yet.</p>`
        : `<table>
            <thead><tr><th>Decade</th><th>Listened</th><th></th><th class="num">%</th></tr></thead>
            <tbody>
              ${stats.byDecade
                .map(
                  (d) => `<tr>
                    <td>${d.decade}s</td>
                    <td class="num">${d.listened} / ${d.total}</td>
                    <td><div class="progress progress-listened"><div style="width:${d.percent}%"></div></div></td>
                    <td class="num">${d.percent}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>`}

      <h2>Top genres <span class="meta">— of listened albums</span></h2>
      ${stats.topGenres.length === 0
        ? `<p class="meta">Nothing listened yet — check off an album to populate genres.</p>`
        : (() => {
            const visible = stats.topGenres.slice(0, 10);
            const hidden = stats.topGenres.length - visible.length;
            return `<table>
              <thead><tr><th>Genre</th><th class="num">Albums</th></tr></thead>
              <tbody>
                ${visible.map((g) => `<tr><td>${esc(g.genre)}</td><td class="num">${g.count}</td></tr>`).join("")}
                ${hidden > 0 ? `<tr><td class="meta">…and ${hidden} more</td><td></td></tr>` : ""}
              </tbody>
            </table>`;
          })()}

      <h2>Recently listened</h2>
      ${stats.recentAlbums.length === 0
        ? `<p class="meta">Nothing listened yet — check off an album on a chart.</p>`
        : `<table>
            <thead><tr><th>Artist</th><th>Title</th><th class="year">Year</th><th>Chart</th><th class="meta">When</th></tr></thead>
            <tbody>
              ${stats.recentAlbums
                .map(
                  (a) => `<tr>
                    <td>${esc(a.artist)}</td>
                    <td class="title">${nl2br(a.title)}</td>
                    <td class="year">${a.release_year ?? "—"}</td>
                    <td><a href="/charts/${a.chart_id}">${esc(a.chart_title)}</a></td>
                    <td class="meta">${esc(a.listened_at ?? "")}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>`}
    `,
  });
}
