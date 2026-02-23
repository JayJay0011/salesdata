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
    .actions { margin-top:12px; display:flex; gap:8px; }
    .btn { background:#2f6ae5; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
    .btn.secondary { background:#4b5563; }
    .muted { color:#666; font-size:12px; margin:6px 0; }
    .disabled { opacity:0.6; pointer-events:none; }
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
      <button class="btn secondary" id="exportBtn">Export CSV</button>
    </div>
  </div>

  <script>
    const categories = [
      "Year","Arts & Crafts","Elementary Math","Early Years","General Education",
      "Healthcare","Physical Education","Science","Technology","SI Manufacturing","Spare"
    ];

    // Year row (text fields)
    const yearFields = [
      "UF_CRM_1771848988",
      "UF_CRM_1771849025",
      "UF_CRM_1771849056",
      "UF_CRM_1771849090",
      "UF_CRM_1771849117"
    ];

    // MD6..MD55 checkboxes (row-major order, 10 rows x 5)
    const mdFields = [
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

    // User-based permissions
    const ALLOWED_EDIT_USER_IDS = [1, 26];

    const isChecked = (v) => v === "Y" || v === "1" || v === true;

    function buildGrid(data) {
      const tbody = document.querySelector("#grid tbody");
      tbody.innerHTML = "";

      // Year row (text)
      const trYear = document.createElement("tr");
      trYear.innerHTML = "<td class='cat'>Year</td>";
      for (let i = 0; i < 5; i++) {
        const field = yearFields[i];
        const td = document.createElement("td");
        td.innerHTML = "<input type='text' data-field='" + field + "' value='" + (data[field] || "") + "' />";
        trYear.appendChild(td);
      }
      tbody.appendChild(trYear);

      // Remaining rows (checkboxes)
      let idx = 0;
      for (let r = 1; r < categories.length; r++) {
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

    function setEditable(canEdit) {
      const inputs = document.querySelectorAll("#grid input, #md56, #md57");
      if (!canEdit) {
        inputs.forEach(i => i.disabled = true);
        document.getElementById("saveBtn").classList.add("disabled");
      }
    }

    function exportCSV(data) {
      const headers = ["Category","Current Year","Last Year","Two Years Ago","Three Years Ago","Do Not Mail"];
      const rows = [];

      // Year row
      rows.push([
        "Year",
        data[yearFields[0]] || "",
        data[yearFields[1]] || "",
        data[yearFields[2]] || "",
        data[yearFields[3]] || "",
        data[yearFields[4]] || ""
      ]);

      // checkbox rows
      let idx = 0;
      for (let r = 1; r < categories.length; r++) {
        const row = [categories[r]];
        for (let c = 0; c < 5; c++) {
          const field = mdFields[idx++];
          row.push(isChecked(data[field]) ? "Y" : "N");
        }
        rows.push(row);
      }

      rows.push(["Mailing Data Source", data[MD56] || ""]);
      rows.push(["Customer Comments", data[MD57] || ""]);
      rows.push(["Database Directory", data[DB_DIR] || ""]);

      const csv = [headers.join(",")].concat(rows.map(r => r.join(","))).join("\\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mailing-data.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    BX24.init(function() {
      const placementOptions = ${JSON.stringify(params.PLACEMENT_OPTIONS || "")};
      const options = placementOptions ? JSON.parse(placementOptions) : {};
      const companyId = options.ID || options.id;

      if (!companyId) {
        document.getElementById("status").innerText = "No company ID in placement options.";
        return;
      }

      BX24.callMethod("user.current", {}, function(u) {
        const user = u.data() || {};
        const canEdit = ALLOWED_EDIT_USER_IDS.length === 0 || ALLOWED_EDIT_USER_IDS.includes(user.ID);
        setEditable(canEdit);
      });

      BX24.callMethod("crm.company.get", { id: companyId }, function(result) {
        if (result.error()) {
          document.getElementById("status").innerText = "Error: " + result.error();
          return;
        }
        const data = result.data();
        buildGrid(data);
        document.getElementById("status").innerText = "Loaded.";

        document.getElementById("exportBtn").onclick = function() {
          exportCSV(data);
        };
      });

      document.getElementById("saveBtn").onclick = function() {
        const fields = {};
        document.querySelectorAll("#grid input[type=checkbox]").forEach(cb => {
          fields[cb.dataset.field] = cb.checked ? "Y" : "N";
        });
        document.querySelectorAll("#grid input[type=text]").forEach(tb => {
          fields[tb.dataset.field] = tb.value || "";
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
