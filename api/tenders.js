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
    td input, td select, td textarea {
      width:100%; box-sizing:border-box; border:1px solid #d7dbe2; border-radius:4px; padding:6px 8px; font-size:13px;
    }
    td textarea { min-height:34px; resize:vertical; }
    .actions-col { width:130px; white-space:nowrap; }
    .row-actions { display:flex; gap:6px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Tenders</h3>
    <div class="muted" id="status">Loading...</div>

    <div class="toolbar">
      <button class="btn" id="addBtn">Add Record</button>
      <button class="btn gray" id="reloadBtn">Reload</button>
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

  function setStatus(t) { statusEl.textContent = t; }

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (res) => {
        if (res.error()) return reject(res.error() + (res.error_description ? " - " + res.error_description : ""));
        resolve(res.data());
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function createInput(meta, value) {
    const type = String((meta && meta.type) || "").toLowerCase();
    const v = value == null ? "" : value;

    if (type === "date") {
      const d = String(v).slice(0, 10);
      return '<input type="date" value="' + escapeHtml(d) + '">';
    }

    if (type === "boolean") {
      const yes = String(v) === "Y" || String(v) === "1" || String(v).toLowerCase() === "yes";
      return '<select><option value=""></option><option value="Y"' + (yes ? " selected" : "") + '>Yes</option><option value="N"' + (!yes && v !== "" ? " selected" : "") + '>No</option></select>';
    }

    if (type === "enumeration" && Array.isArray(meta.items)) {
      const opts = ['<option value=""></option>'].concat(
        meta.items.map(i => {
          const selected = String(v) === String(i.VALUE) ? " selected" : "";
          return '<option value="' + escapeHtml(i.VALUE) + '"' + selected + '>' + escapeHtml(i.VALUE) + '</option>';
        })
      ).join("");
      return '<select>' + opts + '</select>';
    }

    if (type === "text") {
      return '<textarea>' + escapeHtml(v) + '</textarea>';
    }

    return '<input type="text" value="' + escapeHtml(v) + '">';
  }

  function renderHeader() {
    headRow.innerHTML = "";
    const thA = document.createElement("th");
    thA.className = "actions-col";
    thA.textContent = "Actions";
    headRow.appendChild(thA);

    FIELDS.forEach(f => {
      const th = document.createElement("th");
      th.textContent = f.label;
      headRow.appendChild(th);
    });
  }

  function renderRows(items) {
    bodyRows.innerHTML = "";

    items.forEach(item => {
      const tr = document.createElement("tr");
      tr.dataset.id = item.id;

      const tdA = document.createElement("td");
      tdA.className = "actions-col";
      tdA.innerHTML = '<div class="row-actions">' +
        '<button class="btn" data-act="save">Save</button>' +
        '<button class="btn red" data-act="del">Delete</button>' +
      '</div>';
      tr.appendChild(tdA);

      FIELDS.forEach(f => {
        const td = document.createElement("td");
        td.dataset.field = f.code;
        td.innerHTML = createInput(fieldMeta[f.code] || {}, item[f.code]);
        tr.appendChild(td);
      });

      bodyRows.appendChild(tr);
    });
  }

  async function loadFieldsMeta() {
    const meta = await call("crm.item.fields", { entityTypeId: ENTITY_TYPE_ID });
    fieldMeta = meta || {};
  }

  async function listItems() {
    const filter = { parentId4: companyId }; // company link
    const select = ["id"].concat(FIELDS.map(f => f.code));
    const data = await call("crm.item.list", { entityTypeId: ENTITY_TYPE_ID, filter, select });
    if (data && Array.isArray(data.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  function collectRow(tr) {
    const out = {};
    tr.querySelectorAll("td[data-field]").forEach(td => {
      const code = td.dataset.field;
      const el = td.querySelector("input,select,textarea");
      if (!el) return;
      let val = (el.value || "").trim();

      const type = String((fieldMeta[code] && fieldMeta[code].type) || "").toLowerCase();
      if (type === "boolean") {
        if (val === "Y" || val === "yes" || val === "Yes") val = "Y";
        else if (val === "N" || val === "no" || val === "No") val = "N";
      }

      out[code] = val;
    });
    return out;
  }

  async function addRow() {
    await call("crm.item.add", {
      entityTypeId: ENTITY_TYPE_ID,
      fields: { parentId4: companyId }
    });
    const items = await listItems();
    renderRows(items);
    setStatus("Record added.");
  }

  async function saveRow(tr) {
    const id = tr.dataset.id;
    const fields = collectRow(tr);
    await call("crm.item.update", { entityTypeId: ENTITY_TYPE_ID, id, fields });
    setStatus("Saved record #" + id);
  }

  async function deleteRow(tr) {
    const id = tr.dataset.id;
    await call("crm.item.delete", { entityTypeId: ENTITY_TYPE_ID, id });
    tr.remove();
    setStatus("Deleted record #" + id);
  }

  function parseServerPlacementOptions() {
    const raw = SERVER_PARAMS.PLACEMENT_OPTIONS;
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }

  async function resolveContext() {
    const pOpts = parseServerPlacementOptions();
    const pPlacement = SERVER_PARAMS.PLACEMENT || "";
    const pId = pOpts.ID || pOpts.id || SERVER_PARAMS.ID || null;

    let sdkPlacement = "";
    let sdkOpts = {};
    try {
      if (BX24.placement && typeof BX24.placement.info === "function") {
        const r = BX24.placement.info();
        if (r && typeof r === "object") {
          sdkPlacement = r.placement || "";
          sdkOpts = r.options || {};
        }
      }
    } catch (_) {}

    const placement = sdkPlacement || pPlacement || "";
    const options = Object.keys(sdkOpts).length ? sdkOpts : pOpts;
    const id = options.ID || options.id || pId;

    if (!id) return { error: "No record ID in placement." };

    if (placement === "CRM_CONTACT_DETAIL_TAB") {
      try {
        const c = await call("crm.contact.get", { id });
        companyId = c.COMPANY_ID || null;
        if (!companyId) return { error: "Contact has no linked company." };
      } catch (e) {
        return { error: String(e) };
      }
    } else {
      companyId = id;
    }

    return {};
  }

  function bindEvents() {
    document.getElementById("addBtn").onclick = async () => {
      try { await addRow(); } catch (e) { setStatus("Add error: " + e); }
    };

    document.getElementById("reloadBtn").onclick = async () => {
      try {
        const items = await listItems();
        renderRows(items);
        setStatus("Reloaded.");
      } catch (e) {
        setStatus("Reload error: " + e);
      }
    };

    bodyRows.onclick = async (ev) => {
      const btn = ev.target.closest("button[data-act]");
      if (!btn) return;
      const tr = btn.closest("tr");
      const act = btn.getAttribute("data-act");
      try {
        if (act === "save") await saveRow(tr);
        if (act === "del") await deleteRow(tr);
      } catch (e) {
        setStatus((act === "save" ? "Save" : "Delete") + " error: " + e);
      }
    };
  }

  BX24.init(async () => {
    if (!ENTITY_TYPE_ID) {
      setStatus("Missing TENDER_ENTITY_TYPE_ID env var.");
      return;
    }

    const ctx = await resolveContext();
    if (ctx.error) {
      setStatus(ctx.error);
      return;
    }

    try {
      await loadFieldsMeta();
      renderHeader();
      const items = await listItems();
      renderRows(items);
      bindEvents();
      setStatus("Loaded.");
    } catch (e) {
      setStatus("Load error: " + e);
    }
  });
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}

