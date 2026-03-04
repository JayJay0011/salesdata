export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const entityTypeId = process.env.TENDER_ENTITY_TYPE_ID || "";

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
    table { border-collapse: collapse; width: 100%; min-width: 1800px; }
    th, td { border:1px solid #e3e6eb; padding:6px 8px; font-size:13px; }
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
  const FIELD_CODES = [
    "UF_CRM_1772619295","UF_CRM_1772619390","UF_CRM_1772619441","UF_CRM_1772619541","UF_CRM_1772619606",
    "UF_CRM_1772619752","UF_CRM_1772619871","UF_CRM_1772619911","UF_CRM_1772620002","UF_CRM_1772620138",
    "UF_CRM_1772620361","UF_CRM_1772620404","UF_CRM_1772620438","UF_CRM_1772620474","UF_CRM_1772620514",
    "UF_CRM_1772620555","UF_CRM_1772620595","UF_CRM_1772620645","UF_CRM_1772620840","UF_CRM_1772620969",
    "UF_CRM_1772621229","UF_CRM_1772621468","UF_CRM_1772621537"
  ];

  const statusEl = document.getElementById("status");
  const headRow = document.getElementById("headRow");
  const bodyRows = document.getElementById("bodyRows");

  let labels = {};
  let fieldMeta = {};
  let companyId = null;
  let contactId = null;
  let placement = "";

  function setStatus(t) { statusEl.textContent = t; }

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (res) => {
        if (res.error()) return reject(res.error() + (res.error_description ? " - " + res.error_description : ""));
        resolve(res.data());
      });
    });
  }

  function createCellInput(code, value) {
    const meta = fieldMeta[code] || {};
    const type = (meta.type || "").toLowerCase();
    const v = value == null ? "" : value;

    if (type === "date") {
      const d = String(v).slice(0,10);
      return '<input type="date" data-field="' + code + '" value="' + escapeHtml(d) + '">';
    }

    if (type === "enumeration" && Array.isArray(meta.items)) {
      const opts = ['<option value=""></option>'].concat(
        meta.items.map(i => '<option value="' + escapeHtml(i.VALUE) + '"' + (String(v) === String(i.VALUE) ? " selected" : "") + '>' + escapeHtml(i.VALUE) + '</option>')
      ).join("");
      return '<select data-field="' + code + '">' + opts + '</select>';
    }

    if (type === "text") {
      return '<textarea data-field="' + code + '">' + escapeHtml(v) + '</textarea>';
    }

    return '<input type="text" data-field="' + code + '" value="' + escapeHtml(v) + '">';
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderHeader() {
    headRow.innerHTML = "";
    const thAct = document.createElement("th");
    thAct.className = "actions-col";
    thAct.textContent = "Actions";
    headRow.appendChild(thAct);

    FIELD_CODES.forEach(code => {
      const th = document.createElement("th");
      th.textContent = labels[code] || code;
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

      FIELD_CODES.forEach(code => {
        const td = document.createElement("td");
        td.innerHTML = createCellInput(code, item[code]);
        tr.appendChild(td);
      });

      bodyRows.appendChild(tr);
    });
  }

  async function loadFieldsMeta() {
    const meta = await call("crm.item.fields", { entityTypeId: ENTITY_TYPE_ID });
    fieldMeta = meta || {};
    labels = {};
    FIELD_CODES.forEach(c => {
      labels[c] = (fieldMeta[c] && (fieldMeta[c].title || fieldMeta[c].name)) || c;
    });
  }

  async function listItems() {
    const filter = { parentId2: companyId };
    const select = ["id"].concat(FIELD_CODES);
    const items = await call("crm.item.list", { entityTypeId: ENTITY_TYPE_ID, filter, select });
    return Array.isArray(items.items) ? items.items : (Array.isArray(items) ? items : []);
  }

  function collectFieldsFromRow(tr) {
    const fields = {};
    tr.querySelectorAll("[data-field]").forEach(el => {
      fields[el.dataset.field] = (el.value || "").trim();
    });
    return fields;
  }

  async function addRow() {
    const fields = { parentId2: companyId };
    if (contactId) fields.parentId3 = contactId;
    const added = await call("crm.item.add", { entityTypeId: ENTITY_TYPE_ID, fields });
    const id = added.item ? added.item.id : added.id;
    const items = await listItems();
    renderRows(items);
    setStatus("Record added.");
  }

  async function saveRow(tr) {
    const id = tr.dataset.id;
    const fields = collectFieldsFromRow(tr);
    await call("crm.item.update", { entityTypeId: ENTITY_TYPE_ID, id, fields });
    setStatus("Saved record #" + id);
  }

  async function deleteRow(tr) {
    const id = tr.dataset.id;
    await call("crm.item.delete", { entityTypeId: ENTITY_TYPE_ID, id });
    tr.remove();
    setStatus("Deleted record #" + id);
  }

  async function resolveContext() {
    return new Promise((resolve) => {
      BX24.placement.info(async (p) => {
        placement = p && p.placement ? p.placement : "";
        const options = (p && p.options) || {};
        const id = options.ID || options.id;

        if (!id) return resolve({ error: "No record ID in placement." });

        try {
          if (placement === "CRM_CONTACT_DETAIL_TAB") {
            contactId = id;
            const c = await call("crm.contact.get", { id: contactId });
            companyId = c.COMPANY_ID || null;
            if (!companyId) return resolve({ error: "Contact has no linked company. Link company first." });
            return resolve({});
          }

          companyId = id;
          return resolve({});
        } catch (e) {
          return resolve({ error: String(e) });
        }
      });
    });
  }

  function bindEvents() {
    document.getElementById("addBtn").onclick = async () => {
      try { await addRow(); } catch(e) { setStatus("Add error: " + e); }
    };

    document.getElementById("reloadBtn").onclick = async () => {
      try {
        const items = await listItems();
        renderRows(items);
        setStatus("Reloaded.");
      } catch(e) { setStatus("Reload error: " + e); }
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
