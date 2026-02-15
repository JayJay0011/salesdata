export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  // Bitrix sends params in query string + POST body
  const params = { ...req.query, ...(req.body || {}) };

  // You can log params during testing
  // console.log(params);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bitrix Embedded App</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 12px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 6px; }
    th { background: #f7f7f7; text-align: left; }
  </style>
</head>
<body>
  <h3>Company Data</h3>
  <div id="status">Loading...</div>
  <table id="data-table">
    <thead>
      <tr><th>Field</th><th>Value</th></tr>
    </thead>
    <tbody></tbody>
  </table>

  <script>
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
        const tbody = document.querySelector("#data-table tbody");
        tbody.innerHTML = "";

        Object.keys(data).forEach(function(key) {
          const tr = document.createElement("tr");
          tr.innerHTML = "<td>" + key + "</td><td>" + (data[key] ?? "") + "</td>";
          tbody.appendChild(tr);
        });

        document.getElementById("status").innerText = "Loaded.";
      });
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
