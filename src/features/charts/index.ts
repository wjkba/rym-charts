// Public API for the charts feature.
// Everything outside src/features/charts should import from here, not internals.

export type { Chart, Album, AlbumRow, ChartProgress } from "./schema";
export { parseRymCsv, parseCount } from "./parser";
export {
  getDb,
  closeDb,
  createChart,
  getChart,
  updateChart,
  listCharts,
  deleteChart,
  addAlbums,
  listAlbums,
  toggleListened,
  toggleStarred,
  listStarred,
  chartProgress,
  type CreateChartOpts,
  type UpdateChartOpts,
  type AddAlbumsResult,
  type DbOptions,
  type StarredAlbum,
} from "./db";
