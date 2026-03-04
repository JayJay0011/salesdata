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
  <title>Tenders</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 14px; background: #f6f8fb; }
    .card { background:#fff; padding:14px; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
    h3 { margin: 0 0 8px; }
    .muted { color:#666; font-size:12px; margin:6px 0; }
    .grid { display:grid; grid-template-columns: 260px 1fr; gap:10px 14px; margin-top:10px; }
    label { font-weight:600; color:#1f2937; }
    input, select, textarea { width:100%; padding:7px 8px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; }
    textarea { min-height:70px; resize:vertical; }
    .actions { margin-top:14px; display:flex; gap:8px; }
    .btn { background:#2f6ae5; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:13px; }
    .btn.secondary { background:#4b5563; }
    .hint { margin-top:8px; font-size:12px; color:#6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Tenders</h3>
    <div class="muted" id="status">Loading...</div>

    <div class="grid">
      <label for="f_tender_no">Tender #</label>
      <input id="f_tender_no" type="text" />

      <label for="f_reminder">Reminder Date</label>
      <input id="f_reminder" type="date" />

      <label for="f_active_date">Active Date</label>
      <input id="f_active_date" type="date" />

      <label for="f_expiry_date">Expiry Date</label>
      <input id="f_expiry_date" type="date" />

      <label for="f_currently_active">Currently Active?</label>
      <select id="f_currently_active">
        <option value=""></option>
        <option value="Y">Yes</option>
        <option value="N">No</option>
      </select>

      <label for="f_results">Results</label>
      <select id="f_results">
        <option value=""></option>
        <option value="Being Prepared">Being Prepared</option>
        <option value="Submitted">Submitted</option>
        <option value="Fully Awarded">Fully Awarded</option>
        <option value="Partially Awarded">Partially Awarded</option>
        <option value="Unsucessful">Unsucessful</option>
        <option value="Pending Renewal">Pending Renewal</option>
        <option value="On Hold">On Hold</option>
      </select>

      <label for="f_comment">Comment from Tenders Department</label>
      <textarea id="f_comment"></textarea>

      <label for="f_art">Art Category</label>
      <select id="f_art">
        <option value=""></option>
        <option value="No Discount">No Discount</option>
        <option value="3% Discount">3% Discount</option>
        <option value="5% Discount">5% Discount</option>
        <option value="7% Discount">7% Discount</option>
        <option value="10% Discount">10% Discount</option>
        <option value="Fixed & 3% Discount">Fixed & 3% Discount</option>
        <option value="Fixed & 5% Discount">Fixed & 5% Discount</option>
        <option value="Fixed & 7% Discount">Fixed & 7% Discount</option>
        <option value="Fixed & 10% Discount">Fixed & 10% Discount</option>
      </select>

      <label for="f_elem">Elementary Math</label>
      <select id="f_elem"></select>

      <label for="f_early">Early Years</label>
      <select id="f_early"></select>

      <label for="f_health">Healthcare</label>
      <select id="f_health"></select>

      <label for="f_lit">Literacy</label>
      <select id="f_lit"></select>

      <label for="f_phy">Physical Education</label>
      <select id="f_phy"></select>

      <label for="f_sci">Science</label>
      <select id="f_sci"></select>

      <label for="f_spec">Special Education</label>
      <select id="f_spec"></select>

      <label for="f_tech">Technology</label>
      <select id="f_tech"></select>

      <label for="f_si">SI Manfuacturing</label>
      <select id="f_si"></select>

      <label for="f_ext">Eligible for Ext?</label>
      <select id="f_ext">
        <option value=""></option>
        <option value="Y">Yes</option>
        <option value="N">No</option>
      </select>

      <label for="f_platform">Tender Platform</label>
      <input id="f_platform" type="text" />

      <label for="f_total">Value of Total Tender</label>
      <input id="f_total" type="number" step="0.01" />

      <label for="f_awarded">Awarded Value</label>
      <input id="f_awarded" type="number" step="0.01" />

      <label for="f_margin">Estimated Margin (%)</label>
      <input id="f_margin" type="number" step="0.01" />

      <label for="f_contact">Tender Contact (User)</label>
      <input id="f_contact" type="number" step="1" />
    </div>

    <div class="actions">
      <button class="btn" id="saveBtn">Save</button>
      <button class="btn secondary" id="exportBtn">Export CSV</button>
    </div>
    <div class="hint">Stage A: one tender record per company. Stage B will support multiple rows per company.</div>
  </div>

  <script>
    const UF = {
      tenderNo: "UF_CRM_1772619295",
      reminderDate: "UF_CRM_1772619390",
      activeDate: "UF_CRM_1772619441",
      expiryDate: "UF_CRM_1772619541",
      currentlyActive: "UF_CRM_1772619606",
      results: "UF_CRM_1772619752",
      comment: "UF_CRM_1772619871",
      art: "UF_CRM_1772619911",
      elem: "UF_CRM_1772620002",
      early: "UF_CRM_1772620138",
      health: "UF_CRM_1772620361",
      lit: "UF_CRM_1772620404",
      phy: "UF_CRM_1772620438",
      sci: "UF_CRM_1772620474",
      spec: "UF_CRM_1772620514",
      tech: "UF_CRM_1772620555",
      si: "UF_CRM_1772620595",
      ext: "UF_CRM_1772620645",
      platform: "UF_CRM_1772620840",
      total: "UF_CRM_1772620969",
      awarded: "UF_CRM_1772621229",
      margin: "UF_CRM_1772621468",
      contact: "UF_CRM_1772621537"
    };

    const discountOpts = [
      "", "No Discount", "3% Discount", "5% Discount", "7% Discount",
      "10% Discount", "Fixed & 3% Discount", "Fixed & 5% Discount",
      "Fixed & 7% Discount", "Fixed & 10% Discount"
    ];

    function setDiscountSelect(id) {
      const el = document.getElementById(id);
      if (el.options.length > 0) return;
      discountOpts.forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        el.appendChild(o);
      });
    }

    ["f_elem","f_early","f_health","f_lit","f_phy","f_sci","f_spec","f_tech","f_si"].forEach(setDiscountSelect);

    function getPlacementInfo() {
      if (BX24.placement && BX24.placement.info) return BX24.placement.info();
      return {};
    }

    function valueOrEmpty(v) {
      return v === null || v === undefined ? "" : v;
    }

    function fill(data) {
      document.getElementById("f_tender_no").value = valueOrEmpty(data[UF.tenderNo]);
      document.getElementById("f_reminder").value = valueOrEmpty(data[UF.reminderDate]);
      document.getElementById("f_active_date").value = valueOrEmpty(data[UF.activeDate]);
      document.getElementById("f_expiry_date").value = valueOrEmpty(data[UF.expiryDate]);
      document.getElementById("f_currently_active").value = valueOrEmpty(data[UF.currentlyActive]);
      document.getElementById("f_results").value = valueOrEmpty(data[UF.results]);
      document.getElementById("f_comment").value = valueOrEmpty(data[UF.comment]);
      document.getElementById("f_art").value = valueOrEmpty(data[UF.art]);
      document.getElementById("f_elem").value = valueOrEmpty(data[UF.elem]);
      document.getElementById("f_early").value = valueOrEmpty(data[UF.early]);
      document.getElementById("f_health").value = valueOrEmpty(data[UF.health]);
      document.getElementById("f_lit").value = valueOrEmpty(data[UF.lit]);
      document.getElementById("f_phy").value = valueOrEmpty(data[UF.phy]);
      document.getElementById("f_sci").value = valueOrEmpty(data[UF.sci]);
      document.getElementById("f_spec").value = valueOrEmpty(data[UF.spec]);
      document.getElementById("f_tech").value = valueOrEmpty(data[UF.tech]);
      document.getElementById("f_si").value = valueOrEmpty(data[UF.si]);
      document.getElementById("f_ext").value = valueOrEmpty(data[UF.ext]);
      document.getElementById("f_platform").value = valueOrEmpty(data[UF.platform]);
      document.getElementById("f_total").value = valueOrEmpty(data[UF.total]);
      document.getElementById("f_awarded").value = valueOrEmpty(data[UF.awarded]);
      document.getElementById("f_margin").value = valueOrEmpty(data[UF.margin]);
      document.getElementById("f_contact").value = valueOrEmpty(data[UF.contact]);
    }

    function collectFields() {
      return {
        [UF.tenderNo]: document.getElementById("f_tender_no").value || "",
        [UF.reminderDate]: document.getElementById("f_reminder").value || "",
        [UF.activeDate]: document.getElementById("f_active_date").value || "",
        [UF.expiryDate]: document.getElementById("f_expiry_date").value || "",
        [UF.currentlyActive]: document.getElementById("f_currently_active").value || "",
        [UF.results]: document.getElementById("f_results").value || "",
        [UF.comment]: document.getElementById("f_comment").value || "",
        [UF.art]: document.getElementById("f_art").value || "",
        [UF.elem]: document.getElementById("f_elem").value || "",
        [UF.early]: document.getElementById("f_early").value || "",
        [UF.health]: document.getElementById("f_health").value || "",
        [UF.lit]: document.getElementById("f_lit").value || "",
        [UF.phy]: document.getElementById("f_phy").value || "",
        [UF.sci]: document.getElementById("f_sci").value || "",
        [UF.spec]: document.getElementById("f_spec").value || "",
        [UF.tech]: document.getElementById("f_tech").value || "",
        [UF.si]: document.getElementById("f_si").value || "",
        [UF.ext]: document.getElementById("f_ext").value || "",
        [UF.platform]: document.getElementById("f_platform").value || "",
        [UF.total]: document.getElementById("f_total").value || "",
        [UF.awarded]: document.getElementById("f_awarded").value || "",
        [UF.margin]: document.getElementById("f_margin").value || "",
        [UF.contact]: document.getElementById("f_contact").value || ""
      };
    }

    function exportCSV(fields) {
      const header = [
        "Tender #","Reminder Date","Active Date","Expiry Date","Currently Active?","Results",
        "Comment from Tenders Department","Art Category","Elementary Math","Early Years","Healthcare",
        "Literacy","Physical Education","Science","Special Education","Technology","SI Manfuacturing",
        "Eligible for Ext?","Tender Platform","Value of Total Tender","Awarded Value","Estimated Margin","Tender Contact"
      ];
      const row = [
        fields[UF.tenderNo], fields[UF.reminderDate], fields[UF.activeDate], fields[UF.expiryDate], fields[UF.currentlyActive], fields[UF.results],
        fields[UF.comment], fields[UF.art], fields[UF.elem], fields[UF.early], fields[UF.health],
        fields[UF.lit], fields[UF.phy], fields[UF.sci], fields[UF.spec], fields[UF.tech], fields[UF.si],
        fields[UF.ext], fields[UF.platform], fields[UF.total], fields[UF.awarded], fields[UF.margin], fields[UF.contact]
      ];
      const csv = header.join(",") + "\\n" + row.map(v => (v ?? "")).join(",");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tenders.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    BX24.init(function() {
      const info = getPlacementInfo();
      const options = info.options || {};
      const companyId = options.ID || options.id;

      if (!companyId) {
        document.getElementById("status").innerText = "No company ID in placement.";
        return;
      }

      BX24.callMethod("crm.company.get", { id: companyId }, function(result) {
        if (result.error()) {
          document.getElementById("status").innerText = "Error: " + result.error();
          return;
        }

        const data = result.data();
        fill(data);
        document.getElementById("status").innerText = "Loaded.";

        document.getElementById("saveBtn").onclick = function() {
          const fields = collectFields();
          BX24.callMethod("crm.company.update", { id: companyId, fields }, function(res2) {
            if (res2.error()) {
              document.getElementById("status").innerText = "Save error: " + res2.error();
              return;
            }
            document.getElementById("status").innerText = "Saved.";
          });
        };

        document.getElementById("exportBtn").onclick = function() {
          exportCSV(collectFields());
        };
      });
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
