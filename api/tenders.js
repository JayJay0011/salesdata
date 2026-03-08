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
    .toolbar { display:flex; gap:8px; margin-bottom:10px; }
    .btn { background:#2f6ae5; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
    .btn.gray { background:#4b5563; }
    .btn.red { background:#b42318; }

    .table-wrap { overflow:auto; border:1px solid #e3e6eb; border-radius:6px; }
    table { border-collapse: collapse; width: 100%; min-width: 2400px; }
    th, td { border:1px solid #e3e6eb; padding:6px 8px; font-size:13px; vertical-align: top; }
    th { background:#0c5b80; color:#fff; text-align:left; white-space:nowrap; }
    td input, td select, td textarea { width:100%; box-sizing:border-box; border:1px solid #d7dbe2; border-radius:4px; padding:6px 8px; font-size:13px; }
    td textarea { min-height:34px; resize:vertical; }
    .actions-col { width:140px; white-space:nowrap; }
    .row-actions { display:flex; gap:6px; }
    .new-row { background:#fbfdff; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Tenders</h3>
    <div class="muted" id="status">Loading...</div>

    <div class="toolbar">
      <button class="btn" id="addBtn">Add Record</button>
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

  // REPLACE this with your new SPA field code for "Company Link ID"
  const COMPANY_LINK_FIELD = "UF_CRM_14_REPLACE_ME";

  const FIELDS = [
    { code: "UF_CRM_14_1772974250", label: "Tender #" },
    { code: "UF_CRM_14_1772975158", label: "Reminder Date" },
    { code: "UF_CRM_14_1772975701", label: "Active Date" },
    { code: "UF_CRM_14_1772976479", label: "Expiry Date" },
    { code: "UF_CRM_14_1772976511", label: "Currently Active?" },
    { code: "UF_CRM_14_1772976533", label: "Results" },
    { code: "UF_CRM_14_1772976696", label: "Comment from Tenders Department" },
    { code: "UF_CRM_14_1772976870", label: "Art Category" },
    { code: "UF_CRM_14_1772978571", label: "Elementary Math" },
    { code: "UF_CRM_14_1772979400", label: "Early Years" },
    { code: "UF_CRM_14_1772980445", label: "Healthcare" },
    { code: "UF_CRM_14_1772980703", label: "Literacy" },
    { code: "UF_CRM_14_1772980862", label: "Physical Education" },
    { code: "UF_CRM_14_1772981401", label: "Science" },
    { code: "UF_CRM_14_1772981424", label: "Special Education" },
    { code: "UF_CRM_14_1772981945", label: "Technology" },
    { code: "UF_CRM_14_1772982139", label: "SI Manufacturing" },
    { code: "UF_CRM_14_1772982287", label: "Eligible for Ext?" },
    { code: "UF_CRM_14_1772982484", label: "Tender Platform" },
    { code: "UF_CRM_14_1772982539", label: "Value of Total Tender" },
    { code: "UF_CRM_14_1772982627", label: "Awarded Value" },
    { code: "UF_CRM_14_1772982653", label: "Estimated Margin" },
    { code: "UF_CRM_14_1772982708", label: "Tender Contact" }
  ];

  const statusEl = document.getElementById("status");
  const headRow = document.getElementById("headRow");
  const bodyRows = document.getElementById("bodyRows");

  let fieldMeta = {};
  let companyId = null;
  let records = [];

  function setStatus(t) { statusEl.textContent = t; }

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (res) => {
        if (res.error()) return reject(res.error() + (res.error_description ? " - " + res.error_description : ""));
        resolve(res.data());
      });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function inputHtml(code, value) {
    const type = String((fieldMeta[code] && fieldMeta[code].type) || "").toLowerCase();
    const v = value == null ? "" : value;

    if (type === "date") return '<input type="date" value="' + esc(String(v).slice(0,10)) + '">';
    if (type === "boolean") {
      const y = String(v) === "Y" || String(v).toLowerCase() === "yes" || String(v) === "1";
      return '<select><option value=""></option><option value="Y"' + (y ? " selected" : "") + '>Yes</option><option value="N"' + (!y && v !== "" ? " selected" : "") + '>No</option></select>';
    }
    if (type === "enumeration" && Array.isArray(fieldMeta[code].items)) {
      const opts = ['<option value=""></option>'].concat(fieldMeta[code].items.map(i => {
        const sel = String(v) === String(i.VALUE) ? " selected" : "";
        return '<option value="' + esc(i.VALUE) + '"' + sel + '>' + esc(i.VALUE) + '</option>';
      })).join("");
      return '<select>' + opts + '</select>';
    }
    if (type === "text") return '<textarea>' + esc(v) + '</textarea>';
    return '<input type="text" value="' + esc(v) + '">';
  }

  function render() {
    headRow.innerHTML = "";
    bodyRows.innerHTML = "";

    const thA = document.createElement("th");
    thA.className = "actions-col";
    thA.textContent = "Actions";
    headRow.appendChild(thA);

    FIELDS.forEach(f => {
      const th = document.createElement("th");
      th.textContent = f.label;
      headRow.appendChild(th);
    });

    // Better UX: always show at least 1 row
    const rows = records.length ? records : [{ id: "", __new: true }];
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.dataset.id = r.id || "";
      if (r.__new) tr.classList.add("new-row");

      const tdA = document.createElement("td");
      tdA.className = "actions-col";
      tdA.innerHTML = '<div class="row-actions">' +
        '<button class="btn" data-act="' + (r.__new ? "create" : "save") + '">' + (r.__new ? "Create" : "Save") + '</button>' +
        (r.__new ? '<button class="btn red" data-act="remove-new">Remove</button>' : '<button class="btn red" data-act="del">Delete</button>') +
      '</div>';
      tr.appendChild(tdA);

      FIELDS.forEach(f => {
        const td = document.createElement("td");
        td.dataset.field = f.code;
        td.innerHTML = inputHtml(f.code, r[f.code] || "");
        tr.appendChild(td);
      });

      bodyRows.appendChild(tr);
    });
  }

  function parsePlacement() {
    let opts = {};
    try { opts = SERVER_PARAMS.PLACEMENT_OPTIONS ? JSON.parse(SERVER_PARAMS.PLACEMENT_OPTIONS) : {}; } catch (_) {}
    return {
      placement: SERVER_PARAMS.PLACEMENT || "",
      id: opts.ID || opts.id || SERVER_PARAMS.ID || ""
    };
  }

  async function resolveCompany() {
    const ctx = parsePlacement();
    if (!ctx.id) throw new Error("No record ID in placement.");
    if (ctx.placement === "CRM_CONTACT_DETAIL_TAB") {
      const c = await call("crm.contact.get", { id: ctx.id });
      if (!c.COMPANY_ID) throw new Error("Contact has no linked company.");
      return String(c.COMPANY_ID);
    }
    return String(ctx.id);
  }

  async function loadMeta() {
    fieldMeta = await call("crm.item.fields", { entityTypeId: ENTITY_TYPE_ID }) || {};
  }

  async function loadRecords() {
    const data = await call("crm.item.list", {
      entityTypeId: ENTITY_TYPE_ID,
      filter: { [COMPANY_LINK_FIELD]: companyId },
      select: ["id"].concat(FIELDS.map(f => f.code)).concat([COMPANY_LINK_FIELD])
    });
    records = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
  }

  function readRow(tr) {
    const fields = {};
    tr.querySelectorAll("td[data-field]").forEach(td => {
      const code = td.dataset.field;
      const el = td.querySelector("input,select,textarea");
      fields[code] = (el && el.value ? el.value.trim() : "");
    });
    fields[COMPANY_LINK_FIELD] = companyId;
    return fields;
  }

  async function createRow(tr) {
    const fields = readRow(tr);
    await call("crm.item.add", { entityTypeId: ENTITY_TYPE_ID, fields });
    await loadRecords();
    render();
    setStatus("Record created.");
  }

  async function saveRow(tr) {
    const id = tr.dataset.id;
    const fields = readRow(tr);
    await call("crm.item.update", { entityTypeId: ENTITY_TYPE_ID, id, fields });
    setStatus("Saved.");
  }

  async function deleteRow(tr) {
    const id = tr.dataset.id;
    await call("crm.item.delete", { entityTypeId: ENTITY_TYPE_ID, id });
    tr.remove();
    if (!bodyRows.children.length) {
      records = [];
      render();
    }
    setStatus("Deleted.");
  }

  function addBlankRow() {
    records.push({ id: "", __new: true });
    render();
  }

  function exportCSV() {
    const headers = FIELDS.map(f => f.label);
    const csvRows = [headers];

    const trs = bodyRows.querySelectorAll("tr");
    trs.forEach(tr => {
      const row = [];
      FIELDS.forEach(f => {
        const td = tr.querySelector('td[data-field="' + f.code + '"]');
        const el = td ? td.querySelector("input,select,textarea") : null;
        row.push(el ? (el.value || "") : "");
      });
      csvRows.push(row);
    });

    const escCsv = (v) => {
      const s = String(v == null ? "" : v);
      return /[",\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const csv = csvRows.map(r => r.map(escCsv).join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tenders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.getElementById("addBtn").onclick = () => addBlankRow();
    document.getElementById("reloadBtn").onclick = async () => {
      try { await loadRecords(); render(); setStatus("Reloaded."); }
      catch (e) { setStatus("Reload error: " + e.message); }
    };
    document.getElementById("exportBtn").onclick = exportCSV;

    bodyRows.onclick = async (ev) => {
      const btn = ev.target.closest("button[data-act]");
      if (!btn) return;
      const tr = btn.closest("tr");
      const act = btn.getAttribute("data-act");
      try {
        if (act === "create") await createRow(tr);
        if (act === "save") await saveRow(tr);
        if (act === "del") await deleteRow(tr);
        if (act === "remove-new") { tr.remove(); if (!bodyRows.children.length) { records = []; render(); } }
      } catch (e) {
        setStatus((act || "Action") + " error: " + e.message);
      }
    };
  }

  BX24.init(async () => {
    try {
      if (!ENTITY_TYPE_ID) throw new Error("Missing TENDER_ENTITY_TYPE_ID env var.");
      if (COMPANY_LINK_FIELD === "UF_CRM_14_1772985410") throw new Error("Set COMPANY_LINK_FIELD in tenders.js.");

      companyId = await resolveCompany();
      await loadMeta();
      await loadRecords();
      render();
      bindEvents();
      setStatus("Loaded.");
    } catch (e) {
      render();
      bindEvents();
      setStatus("Load error: " + e.message);
    }
  });
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
