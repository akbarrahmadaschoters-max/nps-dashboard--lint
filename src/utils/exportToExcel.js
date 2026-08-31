import * as XLSX from "xlsx";

/**
 * Format helper to extract category value from Airtable fields
 */
function getCategoryVal(fields) {
  const candidates = [
    fields["Kategori (from Tags - Detail Masalah LR)"],
    fields["Category Final"],
    fields["Tags - Kategori"],
    fields["Old Tags - Kategori"],
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    let str = Array.isArray(raw) ? raw.join(", ") : String(raw);
    str = str.trim();
    if (str && !str.startsWith("rec") && str !== "none") return str;
  }
  return "-";
}

/**
 * Format helper to extract subcategory value from Airtable fields
 */
function getSubcategoryVal(fields) {
  const candidates = [
    fields["Subkategori (from Tags - Detail Masalah LR)"],
    fields["Subcategory Final"],
    fields["Detail Masalah Final"],
    fields["Tags - Sub Kategori"],
    fields["Tags - Detail Masalah"],
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let str = Array.isArray(raw) ? raw.join(", ") : String(raw);
    str = str.trim();
    if (str && !str.startsWith("rec") && str !== "none" && str !== "Unassigned") {
      return str;
    }
  }
  return "-";
}

/**
 * Helper to compute column widths automatically
 */
function setAutoColumnWidths(worksheet, data) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const colWidths = keys.map((key) => {
    let maxLen = String(key).length;
    data.forEach((row) => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
  });
  worksheet["!cols"] = colWidths;
}

/**
 * Maps record object to clean row object for Excel export
 */
function mapRecordToRow(rec, idx) {
  const f = rec.fields || {};
  const score = parseFloat(f["NPS Score"]);
  let npsType = "Unknown";
  if (!isNaN(score)) {
    if (score >= 9) npsType = "Promoter";
    else if (score >= 7) npsType = "Passive";
    else npsType = "Detractor";
  } else {
    npsType = f["Classification"] || "-";
  }

  const tanggal = f["Created Time"] || f["Tanggal Survey"] || f["Date"] || f["Timestamp"] || "-";
  const formattedDate = typeof tanggal === "string" && tanggal.length > 10 ? tanggal.substring(0, 10) : tanggal;

  return {
    "No": idx + 1,
    "ID Record": rec.id || "-",
    "Tanggal": formattedDate,
    "Nama Responden": f["Name"] || f["Upper name"] || "-",
    "Program": f["Program"] || "-",
    "Program Spesifik": f["Program Spesifik"] || "-",
    "LMS Teacher / Mentor": f["LMS Teacher"] || f["Nama Mentor"] || "-",
    "NPS Score": !isNaN(score) ? score : "-",
    "Kategori NPS": npsType,
    "Kategori Issues": getCategoryVal(f),
    "Subkategori Issues": getSubcategoryVal(f),
    "Feedback (Yang Puas)": f["Hal yang puas"] || f["Yang disukai"] || "-",
    "Feedback (Perlu Ditingkatkan)": f["Hal yang bisa ditingkatkan"] || f["Saran/Kritik"] || "-",
    "Status Follow Up": f["Status Follow Up"] || f["Hasil Follow Up"] || f["Remarks Follow Up"] || "Belum FU",
    "Follow Up By": f["Follow up by"] || f["PIC Follow Up"] || "-",
  };
}

/**
 * Main export function for Live Airtable Sync (Multi-Sheet Workbook)
 */
export function exportAirtableSyncToExcel(records, analytics, metadata = {}) {
  const workbook = XLSX.utils.book_new();
  const { activeRole = "ALL LINT", startDate = "", endDate = "" } = metadata;

  // 1. SUMMARY SHEET
  const summaryData = [
    { "Metric": "Program Filter", "Nilai": activeRole.toUpperCase() },
    { "Metric": "Rentang Tanggal", "Nilai": `${startDate} s/d ${endDate}` },
    { "Metric": "Total Responden", "Nilai": analytics.totalResponden },
    { "Metric": "Promoter Count (9-10)", "Nilai": analytics.promoterCount },
    { "Metric": "Passive Count (7-8)", "Nilai": analytics.passiveCount },
    { "Metric": "Detractor Count (0-6)", "Nilai": analytics.detractorCount },
    { "Metric": "NPS Score", "Nilai": analytics.npsScore },
    { "Metric": "Estimated Response Rate (%)", "Nilai": `${analytics.rateEst}%` },
    { "Metric": "Status Tier", "Nilai": analytics.tier ? `Tier ${analytics.tier}` : "-" },
    { "Metric": "Jumlah Belum Tag", "Nilai": analytics.untaggedList ? analytics.untaggedList.length : 0 },
    { "Metric": "Jumlah Belum Follow Up", "Nilai": analytics.unfollowedList ? analytics.unfollowedList.length : 0 },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  setAutoColumnWidths(summarySheet, summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary & Insights");

  // 2. RAW RECORDS SHEET
  const rawRows = records.map((rec, i) => mapRecordToRow(rec, i));
  const rawSheet = XLSX.utils.json_to_sheet(rawRows);
  setAutoColumnWidths(rawSheet, rawRows);
  XLSX.utils.book_append_sheet(workbook, rawSheet, "Raw Data");

  // 3. CATEGORY BREAKDOWN SHEET
  if (analytics.topCategories && analytics.topCategories.length > 0) {
    const catRows = analytics.topCategories.map((c, i) => ({
      "No": i + 1,
      "Nama Kategori Issues": c.name,
      "Jumlah Issus (Detractor/Passive)": c.count,
      "Persentase (%)": `${c.pct}%`,
    }));
    const catSheet = XLSX.utils.json_to_sheet(catRows);
    setAutoColumnWidths(catSheet, catRows);
    XLSX.utils.book_append_sheet(workbook, catSheet, "Category Breakdown");
  }

  // 4. SUBCATEGORY BREAKDOWN SHEET
  if (analytics.topSubcategories && analytics.topSubcategories.length > 0) {
    const subRows = analytics.topSubcategories.map((s, i) => ({
      "No": i + 1,
      "Nama Subkategori Issues": s.name,
      "Jumlah Issues (Detractor/Passive)": s.count,
      "Persentase (%)": `${s.pct}%`,
    }));
    const subSheet = XLSX.utils.json_to_sheet(subRows);
    setAutoColumnWidths(subSheet, subRows);
    XLSX.utils.book_append_sheet(workbook, subSheet, "Subcategory Breakdown");
  }

  // 5. UNTAGGED SHEET
  if (analytics.untaggedList && analytics.untaggedList.length > 0) {
    const untaggedRows = analytics.untaggedList.map((rec, i) => mapRecordToRow(rec, i));
    const untaggedSheet = XLSX.utils.json_to_sheet(untaggedRows);
    setAutoColumnWidths(untaggedSheet, untaggedRows);
    XLSX.utils.book_append_sheet(workbook, untaggedSheet, "Belum Tagged");
  }

  // 6. UNFOLLOWED SHEET
  if (analytics.unfollowedList && analytics.unfollowedList.length > 0) {
    const unfollowedRows = analytics.unfollowedList.map((rec, i) => mapRecordToRow(rec, i));
    const unfollowedSheet = XLSX.utils.json_to_sheet(unfollowedRows);
    setAutoColumnWidths(unfollowedSheet, unfollowedRows);
    XLSX.utils.book_append_sheet(workbook, unfollowedSheet, "Belum Follow Up");
  }

  // Generate Filename
  const dateStr = new Date().toISOString().substring(0, 10);
  const cleanRole = activeRole.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fileName = `NPS_Airtable_Sync_${cleanRole}_${dateStr}.xlsx`;

  // Save File
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export a single list of Airtable records to Excel
 */
export function exportSingleRecordListToExcel(records, customFileName = "NPS_Data.xlsx", sheetName = "Data") {
  const workbook = XLSX.utils.book_new();
  const rows = records.map((rec, i) => mapRecordToRow(rec, i));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  setAutoColumnWidths(worksheet, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, customFileName);
}

/**
 * Export saved weekly reports history to Excel
 */
export function exportHistoryToExcel(reports) {
  if (!reports || reports.length === 0) return;

  const workbook = XLSX.utils.book_new();
  const rows = reports.map((r, i) => ({
    "No": i + 1,
    "ID Report": r.id || r._id || "-",
    "Program / Role": r.role === "lingua" ? "PIC Lingua" : r.role === "intertest" ? "PIC Intertest" : r.role || "-",
    "Hari": r.hari || r.reportDay || "-",
    "Periode": r.period || "-",
    "Tanggal Report": r.tanggal || "-",
    "Promoter": parseInt(r.promoter || 0, 10),
    "Passive": parseInt(r.passive || 0, 10),
    "Detractor": parseInt(r.detractor || 0, 10),
    "Total Responden": (parseInt(r.promoter || 0, 10) + parseInt(r.passive || 0, 10) + parseInt(r.detractor || 0, 10)),
    "NPS Score": parseFloat(r.nps || 0),
    "Rate Responden (%)": `${r.rate || 0}%`,
    "Status Tier": r.tier ? `Tier ${r.tier}` : "-",
    "Action Plan / Catatan": r.actionPlan || r.action_plan || "-",
    "Waktu Simpan": r.createdat || r.createdAt || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  setAutoColumnWidths(worksheet, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Report NPS");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `NPS_Riwayat_Report_${dateStr}.xlsx`);
}
