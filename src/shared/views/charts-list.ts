import { esc, layout } from "./layout";
import type { Chart, ChartProgress } from "@/features/charts";

export type ChartWithProgress = Chart & ChartProgress;

export function chartsList(charts: ChartWithProgress[]): string {
  return layout({
    title: "Charts",
    body: charts.length === 0
      ? `<h1>Charts</h1>
         <div class="empty">
           No charts yet. <a href="/charts/new">Upload your first chart</a>.
         </div>`
      : `<h1>Charts</h1>
         <p><a class="btn" href="/charts/new">Upload new chart</a></p>
         <table>
           <thead>
             <tr>
               <th>Title</th>
               <th>Albums</th>
               <th>Listened</th>
               <th>Imported</th>
               <th></th>
             </tr>
           </thead>
           <tbody>
             ${charts
               .map((c) => {
                 const pct = c.total > 0 ? Math.round((c.listened / c.total) * 100) : 0;
                 return `<tr>
                   <td><a href="/charts/${c.id}">${esc(c.title)}</a></td>
                   <td class="num">${c.total}</td>
                   <td>
                     <div class="progress-row" style="margin:0">
                       <div class="progress progress-listened"><div style="width:${pct}%"></div></div>
                       <span class="num">${pct}%</span>
                     </div>
                   </td>
                   <td class="meta">${esc(c.imported_at)}</td>
                   <td>
                     <form class="inline" method="post" action="/charts/${c.id}/delete" onsubmit="return confirm('Delete this chart?')">
                       <button type="submit" class="danger small">Delete</button>
                     </form>
                   </td>
                 </tr>`;
               })
               .join("")}
           </tbody>
         </table>`,
  });
}
