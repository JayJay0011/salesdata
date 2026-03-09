export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const entityTypeId = process.env.TENDER_ENTITY_TYPE_ID || "";
  const params = { ...req.query, ...(req.body || {}) };

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tenders</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 14px; background: #f6f8fb; }
    .card { background:#fff; padding:14px; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.06); }
    h3 { margin: 0 0 8px; }
    .muted { color:#666; font-size:12px; margin:6px 0 10px; }
    .toolbar { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
    .btn { background:#2f6ae5; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
    .btn.gray { background:#4b5563; }

    .table-wrap { overflow:auto; border:1px solid #e3e6eb; border-radius:6px; }
    table { border-collapse: collapse; width:100%; min-width:2600px; table-layout: fixed; }
    th, td { border:1px solid #e3e6eb; padding:6px 8px; font-size:13px; vertical-align:top; width:180px; }
    th { background:#0c5b80; color:#fff; text-align:left; white-space:nowrap; }
    td input, td select, td textarea {
      width:100%; box-sizing:border-box; border:1px solid #d7dbe2; border-radius:4px; padding:6px 8px; font-size:13px; background:#fff;
    }
    td textarea { min-height:34px; resize:vertical; }
    .rowno { width:64px !important; text-align:center; color:#444; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Tenders</h3>
    <div class="muted" id="status">Loading...</div>

    <div class="toolbar">
      <button class="btn" id="saveAllBtn">Save All</button>
      <button class="btn gray" id="addRowBtn">Add Record</button>
      <button class="btn gray" id="reloadBtn">Reload</button>
      <button class="btn gray" id="exportBtn">Export CSV</button>
    </div>

    <div class="table-wrap">
      <table id="grid">
        <thead><tr id="headRow"></tr></thead>
        <tbody id="bodyRows"></tbody>
      </table>
    </div>
  </div>

<script>
(() => {
  const ENTITY_TYPE_ID = Number("${entityTypeId}");
  const SERVER_PARAMS = ${JSON.stringify(params)};
  const COMPANY_LINK_FIELD = "UF_CRM_14_1772985410";
  const MIN_ROWS = 10;
  const AUTO_SAVE_DELAY = 800;

  const RESULTS_OPTIONS = [
    "",
    "Being Prepared",
    "Submitted",
    "Fully Awarded",
    "Partially Awarded",
    "Unsucessful",
    "Pending Renewal",
    "On Hold"
  ];

  const DISCOUNT_OPTIONS = [
    "",
    "Fixed",
    "3% Discount",
    "5% Discount",
    "7% Discount",
    "10% Discount",
    "Fixed & 3% Discount",
    "Fixed & 5% Discount",
    "Fixed & 7% Discount",
    "Fixed & 10% Discount",
    "No Discount"
  ];

  const FIELDS = [
    { code: "UF_CRM_14_1772974250", label: "Tender #", ui: "text" },
    { code: "UF_CRM_14_1772975158", label: "Reminder Date", ui: "date" },
    { code: "UF_CRM_14_1772975701", label: "Active Date", ui: "date" },
    { code: "UF_CRM_14_1772976479", label: "Expiry Date", ui: "date" },
    { code: "UF_CRM_14_1772976511", label: "Currently Active?", ui: "boolean" },
    { code: "UF_CRM_14_1772976533", label: "Results", ui: "select", options: RESULTS_OPTIONS },
    { code: "UF_CRM_14_1772976696", label: "Comment from Tenders Department", ui: "textarea" },

    { code: "UF_CRM_14_1772976870", label: "Art Category", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772978571", label: "Elementary Math", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772979400", label: "Early Years", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772980445", label: "Healthcare", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772980703", label: "Literacy", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772980862", label: "Physical Education", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772981401", label: "Science", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772981424", label: "Special Education", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772981945", label: "Technology", ui: "select", options: DISCOUNT_OPTIONS },
    { code: "UF_CRM_14_1772982139", label: "SI Manufacturing", ui: "select", options: DISCOUNT_OPTIONS },

    { code: "UF_CRM_14_1772982287", label: "Eligible for Ext?", ui: "boolean" },
    { code: "UF_CRM_14_1772982484", label: "Tender Platform", ui: "text" },
    { code: "UF_CRM_14_1772982539", label: "Value of Total Tender", ui: "money" },
    { code: "UF_CRM_14_1772982627", label: "Awarded Value", ui: "money" },
    { code: "UF_CRM_14_1772982653", label: "Estimated Margin", ui: "number" },
    { code: "UF_CRM_14_1772982708", label: "Tender Contact", ui: "text" }
  ];

  const statusEl = document.getElementById("status");
  const headRow = document.getElementById("headRow");
  const bodyRows = document.getElementById("bodyRows");

  let companyId = "";
  let rowsData = [];
  const autoTimers = new Map();

  function setStatus(msg) { statusEl.textContent = msg; }
  function errText(e) { return String(e && e.message ? e.message : e); }

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (resObj) => {
        if (resObj.error()) {
          return reject((resObj.error() || "Error") + (resObj.error_description ? " - " + resObj.error_description : ""));
        }
        resolve(resObj.data());
      });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeDate(v) {
    if (!v) return "";
    return String(v).slice(0, 10);
  }

  function moneyInput(value) {
    return '<input type="text" inputmode="decimal" placeholder="0.00 CAD" value="' + esc(value || "") + '">';
  }

  function inputHtml(field, value) {
    const v = value == null ? "" : value;

    if (field.ui === "date") {
      return '<input type="date" value="' + esc(normalizeDate(v)) + '">';
    }

    if (field.ui === "boolean") {
      const vv = String(v).toLowerCase();
      const yes = vv === "1" || vv === "y" || vv === "yes" || vv === "true";
      const no = vv === "0" || vv === "n" || vv === "no" || vv === "false";
      return '<select>' +
        '<option value=""></option>' +
        '<option value="1"' + (yes ? " selected" : "") + '>Yes</option>' +
        '<option value="0"' + (no ? " selected" : "") + '>No</option>' +
      '</select>';
    }

    if (field.ui === "select") {
      const opts = (field.options || []).map(o => {
        const sel = String(v) === String(o) ? " selected" : "";
        return '<option value="' + esc(o) + '"' + sel + '>' + esc(o) + '</option>';
      }).join("");
      return '<select>' + opts + '</select>';
    }

    if (field.ui === "textarea") {
      return '<textarea>' + esc(v) + '</textarea>';
    }

    if (field.ui === "money") {
      return moneyInput(v);
    }

    if (field.ui === "number") {
      return '<input type="text" inputmode="decimal" placeholder="0.00" value="' + esc(v) + '">';
    }

    return '<input type="text" value="' + esc(v) + '">';
  }

  function renderHeader() {
    headRow.innerHTML = "";
    const thNo = document.createElement("th");
    thNo.className = "rowno";
    thNo.textContent = "#";
    headRow.appendChild(thNo);

    FIELDS.forEach(f => {
      const th = document.createElement("th");
      th.textContent = f.label;
      headRow.appendChild(th);
    });
  }

  function renderRows() {
    bodyRows.innerHTML = "";
    rowsData.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.dataset.id = r.id || "";

      const tdNo = document.createElement("td");
      tdNo.className = "rowno";
      tdNo.textContent = String(idx + 1);
      tr.appendChild(tdNo);

      FIELDS.forEach(f => {
        const td = document.createElement("td");
        td.dataset.field = f.code;
        td.innerHTML = inputHtml(f, r.values[f.code] || "");
        tr.appendChild(td);
      });

      bodyRows.appendChild(tr);
    });

    wireAutoSave();
  }

  function parsePlacementOptions() {
    try {
      return SERVER_PARAMS.PLACEMENT_OPTIONS ? JSON.parse(SERVER_PARAMS.PLACEMENT_OPTIONS) : {};
    } catch (_) {
      return {};
    }
  }

  async function resolveCompanyId() {
    const opts = parsePlacementOptions();
    const placement = SERVER_PARAMS.PLACEMENT || "";
    const id = opts.ID || opts.id || SERVER_PARAMS.ID || "";

    if (!id) throw new Error("No record ID in placement.");

    if (placement === "CRM_CONTACT_DETAIL_TAB") {
      const c = await call("crm.contact.get", { id });
      if (!c.COMPANY_ID) throw new Error("Contact has no linked company.");
      return String(c.COMPANY_ID);
    }

    return String(id);
  }

  function linkMatches(itemVal, currentCompanyId) {
    if (itemVal == null) return false;
    const target = String(currentCompanyId);

    if (Array.isArray(itemVal)) return itemVal.map(String).includes(target);

    if (typeof itemVal === "object") {
      if (itemVal.ID != null) return String(itemVal.ID) === target;
      if (itemVal.VALUE != null) return String(itemVal.VALUE) === target;
      return Object.values(itemVal).map(String).includes(target);
    }

    return String(itemVal) === target;
  }

  async function loadRecords() {
    const select = ["id", "title", COMPANY_LINK_FIELD].concat(FIELDS.map(f => f.code));
    const data = await call("crm.item.list", { entityTypeId: ENTITY_TYPE_ID, select });

    const allItems = Array.isArray(data && data.items) ? data.items : (Array.isArray(data) ? data : []);
    const items = allItems.filter(it => linkMatches(it[COMPANY_LINK_FIELD], companyId));

    rowsData = items.map(it => {
      const v = {};
      FIELDS.forEach(f => { v[f.code] = it[f.code] || ""; });
      return { id: String(it.id || ""), values: v };
    });

    while (rowsData.length < MIN_ROWS) {
      const blank = {};
      FIELDS.forEach(f => { blank[f.code] = ""; });
      rowsData.push({ id: "", values: blank });
    }
  }

  function addBlankRow() {
    const blank = {};
    FIELDS.forEach(f => { blank[f.code] = ""; });
    rowsData.push({ id: "", values: blank });
    renderRows();
  }

  function sanitizeValue(field, raw) {
    const v = String(raw || "").trim();
    if (field.ui === "money" || field.ui === "number") return v.replace(/[$,]/g, "");
    return v;
  }

  function readDomIntoRows() {
    const trs = Array.from(bodyRows.querySelectorAll("tr"));
    rowsData = trs.map(tr => {
      const values = {};
      FIELDS.forEach(f => {
        const td = tr.querySelector('td[data-field="' + f.code + '"]');
        const el = td ? td.querySelector("input,select,textarea") : null;
        values[f.code] = sanitizeValue(f, el && el.value != null ? el.value : "");
      });
      return { id: tr.dataset.id || "", values };
    });
  }

  function isRowEmpty(values) {
    return FIELDS.every(f => !String(values[f.code] || "").trim());
  }

  function tenderTitle(values) {
    return values["UF_CRM_14_1772974250"] || ("Tender " + new Date().toISOString());
  }

  async function upsertSingleRow(tr) {
    const row = { id: tr.dataset.id || "", values: {} };

    FIELDS.forEach(f => {
      const td = tr.querySelector('td[data-field="' + f.code + '"]');
      const el = td ? td.querySelector("input,select,textarea") : null;
      row.values[f.code] = sanitizeValue(f, el && el.value != null ? el.value : "");
    });

    if (isRowEmpty(row.values)) return;

    const fields = { ...row.values };
    fields[COMPANY_LINK_FIELD] = String(companyId);
    fields.title = tenderTitle(row.values);

    if (row.id) {
      await call("crm.item.update", { entityTypeId: ENTITY_TYPE_ID, id: row.id, fields });
      setStatus("Auto-saved (updated row " + row.id + ")");
    } else {
      const created = await call("crm.item.add", { entityTypeId: ENTITY_TYPE_ID, fields });
      const newId = (created && created.item && created.item.id) ? created.item.id : (created && created.id ? created.id : "");
      tr.dataset.id = String(newId || "");
      setStatus("Auto-saved (created row " + tr.dataset.id + ")");
    }
  }

  function wireAutoSave() {
    bodyRows.querySelectorAll("tr").forEach(tr => {
      tr.querySelectorAll("input,select,textarea").forEach(el => {
        const handler = () => {
          const key = tr;
          if (autoTimers.has(key)) clearTimeout(autoTimers.get(key));
          autoTimers.set(key, setTimeout(() => {
            upsertSingleRow(tr).catch(e => setStatus("Auto-save error: " + errText(e)));
          }, AUTO_SAVE_DELAY));
        };
        el.addEventListener("change", handler);
        el.addEventListener("blur", handler);
      });
    });
  }

  async function saveAll() {
    readDomIntoRows();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rowsData) {
      if (isRowEmpty(row.values)) {
        skipped++;
        continue;
      }

      const fields = { ...row.values };
      fields[COMPANY_LINK_FIELD] = String(companyId);
      fields.title = tenderTitle(row.values);

      if (row.id) {
        await call("crm.item.update", { entityTypeId: ENTITY_TYPE_ID, id: row.id, fields });
        updated++;
      } else {
        await call("crm.item.add", { entityTypeId: ENTITY_TYPE_ID, fields });
        created++;
      }
    }

    setStatus("Saved. Created=" + created + ", Updated=" + updated + ", Skipped empty=" + skipped);
  }

  function exportCSV() {
    readDomIntoRows();

    const headers = FIELDS.map(f => f.label);
    const rows = [headers];

    rowsData.forEach(r => {
      if (isRowEmpty(r.values)) return;
      rows.push(FIELDS.map(f => r.values[f.code] || ""));
    });

    const csvEsc = (v) => {
      const s = String(v == null ? "" : v);
      return /[",\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const csv = rows.map(r => r.map(csvEsc).join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tenders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.getElementById("addRowBtn").onclick = addBlankRow;
    document.getElementById("reloadBtn").onclick = async () => {
      try {
        await loadRecords();
        renderRows();
        setStatus("Reloaded.");
      } catch (e) {
        setStatus("Reload error: " + errText(e));
      }
    };
    document.getElementById("exportBtn").onclick = exportCSV;
    document.getElementById("saveAllBtn").onclick = async () => {
      try {
        await saveAll();
      } catch (e) {
        setStatus("Save error: " + errText(e));
      }
    };
  }

  BX24.init(async () => {
    try {
      if (!ENTITY_TYPE_ID) throw new Error("Missing TENDER_ENTITY_TYPE_ID env var.");
      companyId = await resolveCompanyId();
      await loadRecords();
      renderHeader();
      renderRows();
      bindEvents();
      setStatus("Loaded.");
    } catch (e) {
      renderHeader();
      rowsData = [];
      while (rowsData.length < MIN_ROWS) {
        const blank = {};
        FIELDS.forEach(f => { blank[f.code] = ""; });
        rowsData.push({ id: "", values: blank });
      }
      renderRows();
      bindEvents();
      setStatus("Load error: " + errText(e));
    }
  });
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
