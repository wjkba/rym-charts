import { esc, layout } from "./layout";
import type { Chart } from "../../features/charts";

export function chartEditForm(chart: Chart): string {
  return layout({
    title: `Edit ${chart.title}`,
    body: `
      <h1>Edit ${esc(chart.title)}</h1>
      <form class="upload-form" method="post" action="/charts/${chart.id}/edit">
        <label for="title">Chart title</label>
        <input type="text" id="title" name="title" value="${esc(chart.title)}" required>

        <label for="source_url">Source URL</label>
        <input type="url" id="source_url" name="source_url" value="${esc(chart.source_url ?? "")}" placeholder="https://rateyourmusic.com/…">

        <div class="form-actions">
          <button type="submit">Save changes</button>
          <a href="/charts/${chart.id}" class="btn secondary">Cancel</a>
        </div>
      </form>
    `,
  });
}
