export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const params = { ...req.query, ...(req.body || {}) };

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Data</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    :root { --col1: 34%; --col: 16.5%; }
    body { font-family: Arial, sans-serif; padding: 14px; background: #f6f8fb; }
    h3 { margin: 0; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .btn { background: #2f6ae5; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .card { background: #fff; padding: 14px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); margin-bottom: 14px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { border: 1px solid #e3e6eb; padding: 6px 8px; font-size: 13px; }
    th { background: #f1f3f6; text-align: left; }
    td.num { text-align: right; }
    colgroup col.c1 { width: var(--col1); }
    colgroup col.c2, col.c3, col.c4, col.c5 { width: var(--col); }
    .muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="muted" id="status">Loading...</div>
    <button class="btn" id="btnExportBoth">Export Both CSV</button>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>Invoiced Sales for Entire Sales Group</h3>
      <button class="btn" id="btnExportInvoiced">Export Invoiced CSV</button>
    </div>
    <table id="table-invoiced">
      <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
      <thead>
        <tr><th>Category</th><th>YTD</th><th>Last Year</th><th>Two Years Ago</th><th>Three Years Ago</th></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>Invoiced Sales From PF ID</h3>
      <button class="btn" id="btnExportMarketing">Export Marketing CSV</button>
    </div>
    <table id="table-marketing">
      <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
      <thead>
        <tr><th>Category</th><th>YTD</th><th>Last Year</th><th>Two Years Ago</th><th>Three Years Ago</th></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <script>
    const categories = [
      "Arts & Crafts","Elementary Math","Early Years","Healthcare","Literacy",
      "Physical Education","Science","Special Education","SI Manufacturing","Technology"
    ];

    const invoiced = [
      ["UF_CRM_1770346519029","UF_CRM_1770346601362","UF_CRM_1770346643167","UF_CRM_1770346666348"],
      ["UF_CRM_1770346926448","UF_CRM_1770346992533","UF_CRM_1770347026066","UF_CRM_1770347079857"],
      ["UF_CRM_1770360667616","UF_CRM_1770360695368","UF_CRM_1770360720872","UF_CRM_1770360751650"],
      ["UF_CRM_1770360789212","UF_CRM_1770360812010","UF_CRM_1770361799968","UF_CRM_1770361841245"],
      ["UF_CRM_1770361936776","UF_CRM_1770361960160","UF_CRM_1770361981561","UF_CRM_1770362137775"],
      ["UF_CRM_1770362174363","UF_CRM_1770362192096","UF_CRM_1770362213135","UF_CRM_1770362230995"],
      ["UF_CRM_1770362325383","UF_CRM_1770386723470","UF_CRM_1770386746335","UF_CRM_1770386765185"],
      ["UF_CRM_1770386875393","UF_CRM_1770386899802","UF_CRM_1770386958233","UF_CRM_1770387029159"],
      ["UF_CRM_1770387074621","UF_CRM_1770387092521","UF_CRM_1770387116755","UF_CRM_1770387141172"],
      ["UF_CRM_1770387187354","UF_CRM_1770387208104","UF_CRM_1770387227913","UF_CRM_1770387261150"]
    ];
    const invoicedTotals = ["UF_CRM_1771085744","UF_CRM_1771085781","UF_CRM_1771085952","UF_CRM_1771086032"];

    const marketing = [
      ["UF_CRM_1770387505317","UF_CRM_1770748984796","UF_CRM_1770749172206","UF_CRM_1770749245434"],
      ["UF_CRM_1770387624455","UF_CRM_1770749630183","UF_CRM_1770749668085","UF_CRM_1770749802133"],
      ["UF_CRM_1770387644036","UF_CRM_1770750087257","UF_CRM_1770750231099","UF_CRM_1770750387093"],
      ["UF_CRM_1770387665592","UF_CRM_1770750847374","UF_CRM_1770750890072","UF_CRM_1770750913403"],
      ["UF_CRM_1770387680074","UF_CRM_1770795946833","UF_CRM_1770796077991","UF_CRM_1770796101158"],
      ["UF_CRM_1770387699509","UF_CRM_1770812586","UF_CRM_1770812641","UF_CRM_1770812673"],
      ["UF_CRM_1770387717076","UF_CRM_1770796733017","UF_CRM_1770796754484","UF_CRM_1770797142682"],
      ["UF_CRM_1770387739736","UF_CRM_1770797760438","UF_CRM_1770797786453","UF_CRM_1770797814619"],
      ["UF_CRM_1770387763501","UF_CRM_1770799082188","UF_CRM_1770799287395","UF_CRM_1770799383915"],
      ["UF_CRM_1770387783234","UF_CRM_1770799796308","UF_CRM_1770799819633","UF_CRM_1770799843822"]
    ];
    const marketingTotals = ["UF_CRM_1771086089","UF_CRM_1771086133","UF_CRM_1771086200","UF_CRM_1771086238"];

    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

    function asMoney(value) {
      if (value === null || value === undefined || value === "") return "";
      const num = Number(String(value).replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? value : fmt.format(num);
    }

    function renderTable(tableId, fields, totals, data) {
      const tbody = document.querySelector(tableId + " tbody");
      tbody.innerHTML = "";
      fields.forEach((row, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + categories[i] + "</td>" +
          row.map(f => "<td class='num'>" + asMoney(data[f]) + "</td>").join("");
        tbody.appendChild(tr);
      });
      const trTotal = document.createElement("tr");
      trTotal.innerHTML = "<td><strong>Total</strong></td>" +
        totals.map(f => "<td class='num'><strong>" + asMoney(data[f]) + "</strong></td>").join("");
      tbody.appendChild(trTotal);
    }

    function tableToCSV(tableId) {
      const rows = document.querySelectorAll(tableId + " tr");
      const lines = [];
      rows.forEach(r => {
        const cols = Array.from(r.children).map(td => td.innerText.replace(/\\n/g, " "));
        lines.push(cols.join(","));
      });
      return lines.join("\\n");
    }

    function exportCSV(filename, content) {
      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    document.getElementById("btnExportInvoiced").addEventListener("click", () => {
      exportCSV("invoiced-sales.csv", tableToCSV("#table-invoiced"));
    });

    document.getElementById("btnExportMarketing").addEventListener("click", () => {
      exportCSV("marketing-code-sales.csv", tableToCSV("#table-marketing"));
    });

    document.getElementById("btnExportBoth").addEventListener("click", () => {
      const both = "Invoiced Sales\\n" + tableToCSV("#table-invoiced") + "\\n\\n" +
                   "Marketing Code Sales\\n" + tableToCSV("#table-marketing");
      exportCSV("sales-data.csv", both);
    });

    BX24.init(function() {
      const placementOptions = ${JSON.stringify(params.PLACEMENT_OPTIONS || "")};
      const options = placementOptions ? JSON.parse(placementOptions) : {};
      const companyId = options.ID || options.id;

      if (!companyId) {
        document.getElementById("status").innerText = "No company ID in placement options.";
        return;
      }

      BX24.callMethod("crm.company.get", { id: companyId }, function(result) {
        if (result.error()) {
          document.getElementById("status").innerText = "Error: " + result.error();
          return;
        }
        const data = result.data();
        renderTable("#table-invoiced", invoiced, invoicedTotals, data);
        renderTable("#table-marketing", marketing, marketingTotals, data);
        document.getElementById("status").innerText = "Loaded.";
      });
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
