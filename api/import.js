export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { password, type, rows } = body || {};

  if (!password || !type || !Array.isArray(rows)) {
    return res.status(400).json({ error: "Missing password, type, or rows." });
  }

  if (rows.length > 2000) {
    return res.status(400).json({ error: "Max 2000 rows per run. Please split the file." });
  }

  if (password !== process.env.IMPORT_PASSWORD) {
    return res.status(401).json({ error: "Invalid password." });
  }

  const WEBHOOK = process.env.BITRIX_WEBHOOK;
  if (!WEBHOOK) return res.status(500).json({ error: "Missing BITRIX_WEBHOOK env var." });

  const normalize = (s) => (s || "").replace(/\s+/g, " ").trim();
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SALES_GROUP_FIELD = "UF_CRM_1737151067313";
  const PF_ID_FIELD = "UF_CRM_1737150815389";
  const DB_DIR_FIELD = "UF_CRM_1737893463724";

  const CHART1_MAP = {
    "Arts and Crafts – YTD Sales": "UF_CRM_1770346519029",
    "Arts and Crafts – Last Year Sales": "UF_CRM_1770346601362",
    "Arts and Crafts – Two Years Ago Sales": "UF_CRM_1770346643167",
    "Arts and Crafts – Three Years Ago Sales": "UF_CRM_1770346666348",
    "Elementary Math – YTD Sales": "UF_CRM_1770346926448",
    "Elementary Math – Last Year Sales": "UF_CRM_1770346992533",
    "Elementary Math – Two Years Ago Sales": "UF_CRM_1770347026066",
    "Elementary Math – Three Years Ago Sales": "UF_CRM_1770347079857",
    "Early Years – YTD Sales": "UF_CRM_1770360667616",
    "Early Years – Last Year Sales": "UF_CRM_1770360695368",
    "Early Years – Two Years Ago Sales": "UF_CRM_1770360720872",
    "Early Years – Three Years Ago Sales": "UF_CRM_1770360751650",
    "Healthcare – YTD Sales": "UF_CRM_1770360789212",
    "Healthcare – Last Year Sales": "UF_CRM_1770360812010",
    "Healthcare – Two Years Ago Sales": "UF_CRM_1770361799968",
    "Healthcare – Three Years Ago Sales": "UF_CRM_1770361841245",
    "Literacy – YTD Sales": "UF_CRM_1770361936776",
    "Literacy – Last Year Sales": "UF_CRM_1770361960160",
    "Literacy – Two Years Ago Sales": "UF_CRM_1770361981561",
    "Literacy – Three Years Ago Sales": "UF_CRM_1770362137775",
    "Physical Education – YTD Sales": "UF_CRM_1770362174363",
    "Physical Education – Last Year Sales": "UF_CRM_1770362192096",
    "Physical Education – Two Years Ago Sales": "UF_CRM_1770362213135",
    "Physical Education – Three Years Ago Sales": "UF_CRM_1770362230995",
    "Science – YTD Sales": "UF_CRM_1770362325383",
    "Science – Last Year Sales": "UF_CRM_1770386723470",
    "Science – Two Years Ago Sales": "UF_CRM_1770386746335",
    "Science – Three Years Ago Sales": "UF_CRM_1770386765185",
    "Special Education – YTD Sales": "UF_CRM_1770386875393",
    "Special Education – Last Year Sales": "UF_CRM_1770386899802",
    "Special Education – Two Years Ago Sales": "UF_CRM_1770386958233",
    "Special Education – Three Years Ago Sales": "UF_CRM_1770387029159",
    "SI Manufacturing – YTD Sales": "UF_CRM_1770387074621",
    "SI Manufacturing – Last Year Sales": "UF_CRM_1770387092521",
    "SI Manufacturing – Two Years Ago Sales": "UF_CRM_1770387116755",
    "SI Manufacturing – Three Years Ago Sales": "UF_CRM_1770387141172",
    "Technology – YTD Sales": "UF_CRM_1770387187354",
    "Technology – Last Year Sales": "UF_CRM_1770387208104",
    "Technology – Two Years Ago Sales": "UF_CRM_1770387227913",
    "Technology – Three Years Ago Sales": "UF_CRM_1770387261150",
    "YTD Total Sales": "UF_CRM_1771085744",
    "Last Year Total Sales": "UF_CRM_1771085781",
    "Two Years Ago Total Sales": "UF_CRM_1771085952",
    "Three Years Ago Total Sales": "UF_CRM_1771086032",
  };

  const CHART2_MAP = {
    "Arts & Crafts – YTD Marketing Code Sales": "UF_CRM_1770387505317",
    "Arts & Crafts – Last Year Marketing Code Sales": "UF_CRM_1770748984796",
    "Arts & Crafts – Two Years Ago Marketing Code Sales": "UF_CRM_1770749172206",
    "Arts & Crafts – Three Years Ago Marketing Code Sales": "UF_CRM_1770749245434",
    "Elementary Math – YTD Marketing Code Sales": "UF_CRM_1770387624455",
    "Elementary Math – Last Year Marketing Code Sales": "UF_CRM_1770749630183",
    "Elementary Math – Two Years Ago Marketing Code Sales": "UF_CRM_1770749668085",
    "Elementary Math – Three Years Ago Marketing Code Sales": "UF_CRM_1770749802133",
    "Early Years – YTD Marketing Code Sales": "UF_CRM_1770387644036",
    "Early Years – Last Year Marketing Code Sales": "UF_CRM_1770750087257",
    "Early Years – Two Years Ago Marketing Code Sales": "UF_CRM_1770750231099",
    "Early Years – Three Years Ago Marketing Code Sales": "UF_CRM_1770750387093",
    "Healthcare – YTD Marketing Code Sales": "UF_CRM_1770387665592",
    "Healthcare – Last Year Marketing Code Sales": "UF_CRM_1770750847374",
    "Healthcare – Two Years Ago Marketing Code Sales": "UF_CRM_1770750890072",
    "Healthcare – Three Years Ago Marketing Code Sales": "UF_CRM_1770750913403",
    "Literacy – YTD Marketing Code Sales": "UF_CRM_1770387680074",
    "Literacy – Last Year Marketing Code Sales": "UF_CRM_1770795946833",
    "Literacy – Two Years Ago Marketing Code Sales": "UF_CRM_1770796077991",
    "Literacy – Three Years Ago Marketing Code Sales": "UF_CRM_1770796101158",
    "Physical Education – YTD Marketing Code Sales": "UF_CRM_1770387699509",
    "Physical Education – Last Year Marketing Code Sales": "UF_CRM_1770812586",
    "Physical Education – Two Years Ago Marketing Code Sales": "UF_CRM_1770812641",
    "Physical Education – Three Years Ago Marketing Code Sales": "UF_CRM_1770812673",
    "Science – YTD Marketing Code Sales": "UF_CRM_1770387717076",
    "Science – Last Year Marketing Code Sales": "UF_CRM_1770796733017",
    "Science – Two Years Ago Marketing Code Sales": "UF_CRM_1770796754484",
    "Science – Three Years Ago Marketing Code Sales": "UF_CRM_1770797142682",
    "Special Education – YTD Marketing Code Sales": "UF_CRM_1770387739736",
    "Special Education – Last Year Marketing Code Sales": "UF_CRM_1770797760438",
    "Special Education – Two Years Ago Marketing Code Sales": "UF_CRM_1770797786453",
    "Special Education – Three Years Ago Marketing Code Sales": "UF_CRM_1770797814619",
    "SI Manufacturing – YTD Marketing Code Sales": "UF_CRM_1770387763501",
    "SI Manufacturing – Last Year Marketing Code Sales": "UF_CRM_1770799082188",
    "SI Manufacturing – Two Years Ago Marketing Code Sales": "UF_CRM_1770799287395",
    "SI Manufacturing – Three Years Ago Marketing Code Sales": "UF_CRM_1770799383915",
    "Technology – YTD Marketing Code Sales": "UF_CRM_1770387783234",
    "Technology – Last Year Marketing Code Sales": "UF_CRM_1770799796308",
    "Technology – Two Years Ago Marketing Code Sales": "UF_CRM_1770799819633",
    "Technology – Three Years Ago Marketing Code Sales": "UF_CRM_1770799843822",
    "YTD Total PF": "UF_CRM_1771086089",
    "Last Year Total PF": "UF_CRM_1771086133",
    "Two Years Ago Total PF": "UF_CRM_1771086200",
    "Three Years Ago Total PF": "UF_CRM_1771086238",
  };

  const MAILING_MAP = {
    const MAILING_MAP = {
  "MD1": "UF_CRM_1771848988",
  "MD2": "UF_CRM_1771849025",
  "MD3": "UF_CRM_1771849056",
  "MD4": "UF_CRM_1771849090",
  "MD5": "UF_CRM_1771849117",
  "MD6": "UF_CRM_1771789836",
   "MD7": "UF_CRM_1771790018",
    "MD8": "UF_CRM_1771790115",
    "MD9": "UF_CRM_1771790185",
    "MD10": "UF_CRM_1771790236",
    "MD11": "UF_CRM_1771790548",
    "MD12": "UF_CRM_1771790604",
    "MD13": "UF_CRM_1771790703",
    "MD14": "UF_CRM_1771790773",
    "MD15": "UF_CRM_1771790830",
    "MD16": "UF_CRM_1771790898",
    "MD17": "UF_CRM_1771791372",
    "MD18": "UF_CRM_1771791434",
    "MD19": "UF_CRM_1771792066",
    "MD20": "UF_CRM_1771792115",
    "MD21": "UF_CRM_1771792400",
    "MD22": "UF_CRM_1771792467",
    "MD23": "UF_CRM_1771792520",
    "MD24": "UF_CRM_1771792572",
    "MD25": "UF_CRM_1771792836",
    "MD26": "UF_CRM_1771792893",
    "MD27": "UF_CRM_1771792954",
    "MD28": "UF_CRM_1771793020",
    "MD29": "UF_CRM_1771793093",
    "MD30": "UF_CRM_1771793147",
    "MD31": "UF_CRM_1771794171",
    "MD32": "UF_CRM_1771794236",
    "MD33": "UF_CRM_1771794364",
    "MD34": "UF_CRM_1771794405",
    "MD35": "UF_CRM_1771794453",
    "MD36": "UF_CRM_1771794524",
    "MD37": "UF_CRM_1771794587",
    "MD38": "UF_CRM_1771794635",
    "MD39": "UF_CRM_1771794694",
    "MD40": "UF_CRM_1771794772",
    "MD41": "UF_CRM_1771794901",
    "MD42": "UF_CRM_1771795006",
    "MD43": "UF_CRM_1771795073",
    "MD44": "UF_CRM_1771795244",
    "MD45": "UF_CRM_1771795319",
    "MD46": "UF_CRM_1771795875",
    "MD47": "UF_CRM_1771795931",
    "MD48": "UF_CRM_1771795974",
    "MD49": "UF_CRM_1771796020",
    "MD50": "UF_CRM_1771796146",
    "MD51": "UF_CRM_1771796660",
    "MD52": "UF_CRM_1771796772",
    "MD53": "UF_CRM_1771796835",
    "MD54": "UF_CRM_1771796899",
    "MD55": "UF_CRM_1771796982",
    "MD56": "UF_CRM_1771797127",
    "MD57": "UF_CRM_1771797165",
  };

  const map = type === "chart1" ? CHART1_MAP : type === "chart2" ? CHART2_MAP : MAILING_MAP;
  const keyHeader = type === "chart1" ? "Sales Group ID" : type === "chart2" ? "PF ID" : "Database Directory";
  const keyField = type === "chart1" ? SALES_GROUP_FIELD : type === "chart2" ? PF_ID_FIELD : DB_DIR_FIELD;

  const cleanNumber = (v) => {
    if (v === null || v === undefined) return "";
    return String(v).replace(/,/g, "").trim();
  };

  const callRaw = async (method, params, attempt = 0) => {
    const url = WEBHOOK.replace(/\/$/, "") + ${method}.json;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await r.json();

    if (data.error) {
      if ((data.error_description || "").toLowerCase().includes("too many requests") && attempt < 5) {
        await sleep(500 * (attempt + 1));
        return callRaw(method, params, attempt + 1);
      }
      throw new Error(data.error_description || data.error);
    }
    return data;
  };

  const listAllCompanies = async (fieldCode, value) => {
    const ids = [];
    let start = 0;

    while (true) {
      const data = await callRaw("crm.company.list", {
        filter: { [fieldCode]: value },
        select: ["ID"],
        start,
      });

      const batch = data.result || [];
      if (batch.length === 0) break;

      batch.forEach(item => ids.push(item.ID));
      if (data.next === undefined || data.next === null) break;
      start = data.next;
    }

    return ids;
  };

  let updated = 0, notFound = 0, errors = 0;
  const results = [];

  for (const rowRaw of rows) {
    try {
      const row = {};
      Object.keys(rowRaw).forEach(k => row[normalize(k)] = rowRaw[k]);

      const keyVal = (row[normalize(keyHeader)] || "").trim();
      if (!keyVal) {
        errors++;
        results.push({ status: "ERROR", reason: "Missing key", row });
        continue;
      }

      const ids = await listAllCompanies(keyField, keyVal);

      if (!ids || ids.length === 0) {
        notFound++;
        results.push({ status: "NOT_FOUND", reason: keyHeader + "=" + keyVal, row });
        continue;
      }

      const fields = {};
      Object.keys(map).forEach(h => {
        const v = row[normalize(h)];
       if (type === "mailing") {
  const isCheckbox = h.startsWith("MD") && parseInt(h.slice(2), 10) >= 6 && parseInt(h.slice(2), 10) <= 55;
  if (isCheckbox) {
    const vv = String(v || "").trim().toLowerCase();
    fields[map[h]] = vv === "y" ? "Y" : (vv === "n" ? "N" : v);
  } else {
    fields[map[h]] = v;
  }
} else {
  fields[map[h]] = cleanNumber(v);
}
      });

      for (const id of ids) {
        await callRaw("crm.company.update", { id, fields });
        updated++;
        results.push({ status: "UPDATED", reason: "ID=" + id, row });
        await sleep(150);
      }
    } catch (e) {
      errors++;
      results.push({ status: "ERROR", reason: e.message, row: rowRaw });
    }
  }

  return res.json({ updated, notFound, errors, results });
}
