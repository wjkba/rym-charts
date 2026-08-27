import { Hono } from "hono";

const app = new Hono();

app.get("/healthz", (c) => c.text("ok"));

export default app;

if (import.meta.main) {
  const port = Number(process.env["PORT"] ?? 7331);
  const dbPath = process.env["DB_PATH"] ?? "./data/rym-charts.db";

  console.log(`rym-charts listening on http://0.0.0.0:${port}`);
  console.log(`db: ${dbPath}`);

  Bun.serve({ port, fetch: app.fetch });
}
