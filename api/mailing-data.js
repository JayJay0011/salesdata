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
  <title>Mailing Data</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 14px; background: #f6f8fb; }
    .card { background:#fff; padding:14px; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
    h3 { margin: 0 0 8px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { border: 1px solid #e3e6eb; padding: 6px 8px; font-size: 13px; text-align: center; }
    th { background: #0c5b80; color: #fff; text-align: left; }
    td.cat { text-align:left; color:#1aa24a; font-weight:600; }
    .row { display:flex; gap:12px; margin-top:12px; }
    .row label { min-width:220px; color:#1aa24a; font-weight:600; }
    .row input { flex:1; padding:6px 8px; border:1px solid #ddd; border-radius:6px; }
    .readonly { background:#f3f3f3; }
    .actions { margin-top:12px; }
    .btn { background:#2f6ae5; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
    .muted { color:#666; font-size:12px; margin:6px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Mailing Data</h3>
    <div class="muted" id="status">Loading...</div>

    <table id="grid">
      <thead>
        <tr>
          <th>Category</th>
          <th>Current Year</th>
          <th>Last Year</th>
          <th>Two Years Ago</th>
          <th>Three Years Ago</th>
          <th>Do Not Mail</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <div class="row">
      <label>Mailing Data Source:</label>
      <input id="md56" type="text" />
    </div>
    <div class="row">
      <label>Customer Comments:</label>
      <input id="md57" type="text" />
    </div>
    <div class="row">
      <label>Database Directory:</label>
      <input id="dbdir" type="text" class="readonly" readonly />
    </div>

    <div class="actions">
      <button class="btn" id="saveBtn">Save</button>
    </div>
  </div>

  <script>
    const categories = [
      "Year",
      "Arts & Crafts",
      "Elementary Math",
      "Early Years",
      "General Education",
      "Healthcare",
      "Physical Education",
      "Science",
      "Technology",
      "SI Manufacturing",
      "Spare"
    ];

    // MD1..MD55 in row-major order (5 per row)
    const mdFields = [
      "UF_CRM_1771788890","UF_CRM_1771789194","UF_CRM_1771789262","UF_CRM_1771789587","UF_CRM_1771789699",
      "UF_CRM_1771789836","UF_CRM_1771790018","UF_CRM_1771790115","UF_CRM_1771790185","UF_CRM_1771790236",
      "UF_CRM_1771790548","UF_CRM_1771790604","UF_CRM_1771790703","UF_CRM_1771790773","UF_CRM_1771790830",
      "UF_CRM_1771790898","UF_CRM_1771791372","UF_CRM_1771791434","UF_CRM_1771792066","UF_CRM_1771792115",
      "UF_CRM_1771792400","UF_CRM_1771792467","UF_CRM_1771792520","UF_CRM_1771792572","UF_CRM_1771792836",
      "UF_CRM_1771792893","UF_CRM_1771792954","UF_CRM_1771793020","UF_CRM_1771793093","UF_CRM_1771793147",
      "UF_CRM_1771794171","UF_CRM_1771794236","UF_CRM_1771794364","UF_CRM_1771794405","UF_CRM_1771794453",
      "UF_CRM_1771794524","UF_CRM_1771794587","UF_CRM_1771794635","UF_CRM_1771794694","UF_CRM_1771794772",
      "UF_CRM_1771794901","UF_CRM_1771795006","UF_CRM_1771795073","UF_CRM_1771795244","UF_CRM_1771795319",
      "UF_CRM_1771795875","UF_CRM_1771795931","UF_CRM_1771795974","UF_CRM_1771796020","UF_CRM_1771796146",
      "UF_CRM_1771796660","UF_CRM_1771796772","UF_CRM_1771796835","UF_CRM_1771796899","UF_CRM_1771796982"
    ];

    const MD56 = "UF_CRM_1771797127";
    const MD57 = "UF_CRM_1771797165";
    const DB_DIR = "UF_CRM_1737893463724";

    const isChecked = (v) => v === "Y" || v === "1" || v === true;

    function buildGrid(data) {
      const tbody = document.querySelector("#grid tbody");
      tbody.innerHTML = "";
      let idx = 0;
      for (let r = 0; r < categories.length; r++) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td class='cat'>" + categories[r] + "</td>";
        for (let c = 0; c < 5; c++) {
          const field = mdFields[idx++];
          const checked = isChecked(data[field]);
          const td = document.createElement("td");
          td.innerHTML = "<input type='checkbox' data-field='" + field + "'" + (checked ? " checked" : "") + " />";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      document.getElementById("md56").value = data[MD56] || "";
      document.getElementById("md57").value = data[MD57] || "";
      document.getElementById("dbdir").value = data[DB_DIR] || "";
    }

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
        buildGrid(result.data());
        document.getElementById("status").innerText = "Loaded.";
      });

      document.getElementById("saveBtn").onclick = function() {
        const fields = {};
        document.querySelectorAll("#grid input[type=checkbox]").forEach(cb => {
          fields[cb.dataset.field] = cb.checked ? "Y" : "N";
        });
        fields[MD56] = document.getElementById("md56").value || "";
        fields[MD57] = document.getElementById("md57").value || "";

        BX24.callMethod("crm.company.update", { id: companyId, fields }, function(res) {
          if (res.error()) {
            document.getElementById("status").innerText = "Save error: " + res.error();
            return;
          }
          document.getElementById("status").innerText = "Saved.";
        });
      };
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
