// HTML scaffolding + minimal CSS for every page. Single source of truth for
// layout so views stay consistent. HTMX is loaded from a CDN; no build step.

export interface LayoutOpts {
  title: string;
  body: string;
}

export function layout(opts: LayoutOpts): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(opts.title)} · rym-charts</title>
  <script src="https://unpkg.com/htmx.org@1.9.12" defer></script>
  <style>${css()}</style>
</head>
<body hx-boost="true">
  <nav>
    <a href="/" style="font-weight:600">rym-charts</a>
    <a href="/charts/new">Upload</a>
    <a href="/starred">Starred</a>
    <a href="/stats">Stats</a>
    <span class="spacer"></span>
    <span class="meta">single-user · self-hosted</span>
  </nav>
  <div class="container">
    ${opts.body}
  </div>
</body>
</html>`;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

function css(): string {
  return `
    :root {
      color-scheme: light dark;
      --bg: #f8f8f5;
      --fg: #1a1a1a;
      --muted: #666;
      --border: #d4d4d0;
      --accent: #2563eb;
      --danger: #dc2626;
      --listened: #16a34a;
      --bar-bg: #e5e5e0;
      --bar-fg: #2563eb;
      --row-hover: rgba(0,0,0,0.03);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #14141a;
        --fg: #e8e8e8;
        --muted: #999;
        --border: #2a2a30;
        --accent: #60a5fa;
        --danger: #f87171;
        --listened: #4ade80;
        --bar-bg: #2a2a30;
        --bar-fg: #60a5fa;
        --row-hover: rgba(255,255,255,0.04);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      background: var(--bg);
      color: var(--fg);
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem; }
    nav { display: flex; gap: 1rem; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    nav a { color: var(--fg); text-decoration: none; }
    nav a:hover { color: var(--accent); }
    nav .spacer { flex: 1; }
    h1, h2, h3 { font-weight: 600; line-height: 1.2; margin: 0 0 0.75rem; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.2rem; margin-top: 1.5rem; }
    a { color: var(--accent); }
    code { background: var(--bar-bg); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { font-weight: 600; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    tbody tr:hover { background: var(--row-hover); }
    tbody tr.listened { opacity: 0.55; }
    tbody tr.listened td.title { text-decoration: line-through; }
    .cover { width: 48px; height: 48px; object-fit: cover; background: var(--bar-bg); border-radius: 4px; display: block; }
    .cover-placeholder { width: 48px; height: 48px; background: var(--bar-bg); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 0.7rem; }
    .rank { color: var(--muted); font-variant-numeric: tabular-nums; width: 2.5rem; }
    .year { color: var(--muted); font-variant-numeric: tabular-nums; width: 4rem; }
    .genres { font-size: 0.85rem; color: var(--muted); max-width: 240px; }
    .num { font-variant-numeric: tabular-nums; text-align: right; width: 4rem; }
    button, .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      font: inherit;
      cursor: pointer;
      text-decoration: none;
    }
    button:hover, .btn:hover { opacity: 0.9; }
    button.danger { background: var(--danger); }
    button.small { padding: 0.2rem 0.6rem; font-size: 0.85rem; }
    input[type="text"], input[type="url"], input[type="file"] {
      display: block;
      width: 100%;
      padding: 0.5rem;
      margin: 0.25rem 0 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font: inherit;
      background: var(--bg);
      color: var(--fg);
    }
    input[type="file"] { padding: 0.4rem; }
    label { font-weight: 500; display: block; margin-top: 0.5rem; }
    .progress { background: var(--bar-bg); border-radius: 999px; overflow: hidden; height: 8px; min-width: 100px; flex: 1; max-width: 240px; }
    .progress > div { background: var(--bar-fg); height: 100%; transition: width 0.2s; }
    .progress-listened > div { background: var(--listened); }
    .progress-row { display: flex; gap: 0.75rem; align-items: center; margin: 0.75rem 0; }
    .meta { color: var(--muted); font-size: 0.9rem; }
    .chip {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: var(--bar-bg);
      border-radius: 999px;
      font-size: 0.8rem;
      color: var(--fg);
      text-decoration: none;
      margin-right: 0.25rem;
      margin-bottom: 0.25rem;
    }
    .chip:hover { background: color-mix(in srgb, var(--accent) 80%, transparent); color: white; }
    .chip.active { background: var(--accent); color: white; }
    .empty { padding: 2rem; text-align: center; color: var(--muted); }
    .upload-form { max-width: 500px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .stat-card { padding: 1rem; border: 1px solid var(--border); border-radius: 8px; }
    .stat-card .value { font-size: 1.6rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .stat-card .label { color: var(--muted); font-size: 0.85rem; }
    .filters { margin: 1rem 0; }
    .filters > div { margin-bottom: 0.5rem; }
    form.inline { display: inline; }
    .star {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.1rem 0.4rem;
      font-size: 1.2rem;
      line-height: 1;
      color: var(--muted);
      border-radius: 4px;
    }
    .star:hover { background: var(--bar-bg); color: #f59e0b; }
    .star.on { color: #f59e0b; }
    @media (prefers-color-scheme: dark) {
      .star.on { color: #fbbf24; }
    }
    td.star-cell { text-align: center; width: 3rem; }
    th.star-cell { text-align: center; }
  `;
}
