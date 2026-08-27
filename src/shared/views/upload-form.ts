import { layout } from "./layout";

export function uploadForm(): string {
  return layout({
    title: "Upload chart",
    body: `
      <h1>Upload chart CSV</h1>
      <p class="meta">
        Export a chart from rateyourmusic.com using the
        <a href="https://github.com/dbeley/rymscraper" target="_blank" rel="noopener">dbeley userscript</a>,
        then upload the resulting <code>.csv</code> file here.
      </p>
      <form class="upload-form" method="post" action="/charts" enctype="multipart/form-data">
        <label for="title">Chart title <span class="meta">(optional — derived from filename if blank)</span></label>
        <input type="text" id="title" name="title" placeholder="e.g. Top albums of the 1970s (Polish-language)">

        <label for="source_url">Source URL <span class="meta">(optional)</span></label>
        <input type="url" id="source_url" name="source_url" placeholder="https://rateyourmusic.com/charts/top/album/1970s/l:pl/">

        <label for="file">CSV file</label>
        <input type="file" id="file" name="file" accept=".csv,text/csv" required>

        <button type="submit">Upload</button>
      </form>
    `,
  });
}
