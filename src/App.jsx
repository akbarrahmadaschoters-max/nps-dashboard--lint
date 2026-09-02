import { useState, useEffect, useMemo } from "react";
import { exportAirtableSyncToExcel, exportSingleRecordListToExcel, exportHistoryToExcel } from "./utils/exportToExcel";

// --- ORIGINAL GOOGLE APPS SCRIPT CONFIG ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwKNMqjsb1H6ZyGMKwx2IrLbbFzkpkx4DqAFMyAXucjXVLXQcCRWkTxzgci4SuhSgI/exec";
const DEADLINE_HOUR = 11;

const ROLES = [
  { key: "lingua", label: "PIC Lingua", emoji: "🔵", color: "#2563eb", subtitle: "NPS Lingua (New IELTS Only)" },
  { key: "intertest", label: "PIC Intertest", emoji: "🟣", color: "#7c3aed", subtitle: "NPS Intertest" },
];
const TIER = {
  A: { color: "#059669", bg: "#d1fae5", border: "#a7f3d0", label: "Tier A", emoji: "✅", action: "Blasting ke teacher 3x/minggu (Senin, Rabu, Jumat)" },
  B: { color: "#d97706", bg: "#fef3c7", border: "#fde68a", label: "Tier B", emoji: "⚠️", action: "Blasting ke teacher 4x/minggu (Senin, Rabu, Kamis, Jumat)" },
  C: { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", label: "Tier C", emoji: "🔴", action: "Blasting tiap hari sampai masuk Tier A" },
};
const PERIODS = ["Week 1", "Week 1 & Week 2", "Week 1, Week 2 & Week 3", "Week 1, Week 2, Week 3 & Week 4"];
const DAYS = ["Senin", "Kamis"];
const EMPTY = { reportDay: "Senin", period: "Week 1", tanggal: "", promoter: "", passive: "", detractor: "", rate: "", actionPlan: "" };

const S = {
  lbl: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 },
  inp: { width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit", transition: "all 0.2s" },
  card: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, marginBottom: 18, boxShadow: "0 10px 30px rgba(37,99,235,0.04)" },
  nav: (a) => ({ padding: "9px 20px", borderRadius: 30, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: a ? "#0f172a" : "transparent", color: a ? "#ffffff" : "#64748b", fontFamily: "inherit", transition: "all 0.2s ease", boxShadow: a ? "0 4px 14px rgba(15,23,42,0.2)" : "none" }),
};

function calcTier(rate, nps) {
  const r = parseFloat(rate), n = parseFloat(nps);
  if (isNaN(r) || isNaN(n)) return null;
  if (r >= 50 && n >= 78) return "A";
  if (n >= 78) return "B";
  return "C";
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function isLate(iso) {
  const d = new Date(iso), day = d.getDay();
  return (day === 1 || day === 4) && d.getHours() >= DEADLINE_HOUR;
}
function getTodayDay() {
  const d = new Date().getDay();
  return d === 1 ? "Senin" : d === 4 ? "Kamis" : "Senin";
}

function TierBadge({ tier, small }) {
  const t = TIER[tier]; if (!t) return null;
  return <span style={{ padding: small ? "2px 8px" : "5px 14px", borderRadius: 20, background: t.bg, color: t.color, fontSize: small ? 10 : 11, fontWeight: 800, border: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{t.emoji} {t.label}</span>;
}

function ReportCard({ r, onDelete }) {
  const [open, setOpen] = useState(false);
  const role = ROLES.find(x => x.key === r.role);
  const t = r.tier ? TIER[r.tier] : null;
  const d = new Date(r.createdat || r.createdAt);
  const targetId = r.id || r._id || r.createdAt || r.createdat;

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span>{role?.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: role?.color }}>{role?.label}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>— {r.hari} · {r.periode}</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 8, alignItems: "center" }}>
            <span>📅 {isNaN(d.getTime()) ? (r.tanggal || "—") : d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · 🕐 {isNaN(d.getTime()) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
            {(r.late === true || r.late === "TRUE") && <span style={{ color: "#dc2626", fontWeight: 700, background: "#fee2e2", border: "1px solid #fca5a5", padding: "1px 8px", borderRadius: 10, fontSize: 10 }}>TERLAMBAT</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {t && <TierBadge tier={r.tier} />}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(targetId);
              }}
              title="Hapus Report Ini"
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 2px 4px rgba(220,38,38,0.05)",
                transition: "all 0.2s ease"
              }}
            >
              <span>🗑️</span> Hapus
            </button>
          )}
          <span onClick={() => setOpen(!open)} style={{ color: "#94a3b8", fontSize: 11, cursor: "pointer", padding: "4px 6px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["Responden", r.responden], ["Rate", r.rate ? `${r.rate}%` : "—"], ["NPS", r.nps || "—"]].map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {r.actionplan && <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#334155", marginBottom: 10 }}><strong style={{ color: "#64748b" }}>Action Plan: </strong>{r.actionplan}</div>}
          {t && <div style={{ padding: "9px 14px", borderRadius: 10, background: t.bg, color: t.color, fontSize: 12, border: `1px solid ${t.border}` }}>{t.emoji} <strong>{t.label}:</strong> {t.action}</div>}
        </div>
      )}
    </div>
  );
}

// --- AIRTABLE CONFIG & EXACT VIEW RULES ---
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || "appdUbcKOQlcCnfNC";
const AIRTABLE_TABLE_ID = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tblD7hlP3deUSoEn1";

function formatDateISO(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function getReportMonth(r) {
  if (!r) return "";
  const val = r.tanggal || r.createdat || r.createdAt;
  if (!val) return "";
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 7);
  }
  const str = String(val).trim();
  if (str.length >= 7 && str.includes("-")) {
    return str.slice(0, 7);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 7);
}

// Extract Category using exact Airtable column
function getCategoryVal(fields) {
  const candidates = [
    fields["Kategori (from Tags - Detail Masalah LR)"],
    fields["Category Final"],
    fields["Tags - Kategori"],
    fields["Old Tags - Kategori"]
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    let str = Array.isArray(raw) ? raw.join(", ") : String(raw);
    str = str.trim();
    if (str && !str.startsWith("rec") && str !== "none") return str;
  }
  return "";
}

// Extract Subcategory NAME
function getSubcategoryVal(fields) {
  const candidates = [
    fields["Subkategori (from Tags - Detail Masalah LR)"],
    fields["Subcategory Final"],
    fields["Detail Masalah Final"],
    fields["Tags - Sub Kategori"],
    fields["Tags - Detail Masalah"]
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let str = Array.isArray(raw) ? raw.join(", ") : String(raw);
    str = str.trim();
    if (str && !str.startsWith("rec") && str !== "none" && str !== "Unassigned") {
      return str;
    }
  }
  return "";
}

// Check if ticket is Untagged
function isUntagged(fields) {
  const cat = getCategoryVal(fields).trim().toLowerCase();
  return !cat || cat === "" || cat === "none" || cat === "unassigned";
}

// Check if ticket is Unfollowed
function isUnfollowed(fields) {
  const nps = parseFloat(fields["NPS Score"]);
  const classification = String(fields["Classification"] || "").toLowerCase();
  const isTargetNps = (nps && nps <= 8) || classification.includes("detractor") || classification.includes("passive");
  const needFu = fields["Need FU?"] === "Yes" || fields["Need FU?"] === true;
  
  if (!isTargetNps && !needFu) return false;
  const statusFu = String(fields["Status Follow Up"] || fields["Hasil Follow Up"] || fields["Remarks Follow Up"] || "").trim();
  return !statusFu;
}

// EXACT MATCHING RULE FOR AIRTABLE VIEW "1-23 Agustus 2026 for Kak Akbar":
function isExactViewRecord(f) {
  const p = String(f["Program"] || "").toLowerCase();
  const ps = String(f["Program Spesifik"] || "").toLowerCase();

  if (p.includes("saa")) return false;
  if (p.includes("non")) return false;
  if (!ps || ps.trim() === "" || ps === "none") return false;
  if (["waa", "b2b", "gtog", "sg", "gre", "sing", "mini"].some(x => ps.includes(x))) return false;
  if (p.includes("b2b") || p.includes("waa")) return false;

  return true;
}

function isLinguaRecord(f) {
  if (!isExactViewRecord(f)) return false;
  const p = String(f["Program"] || "").toLowerCase();
  return p.includes("lingua");
}

function isIntertestRecord(f) {
  if (!isExactViewRecord(f)) return false;
  const p = String(f["Program"] || "").toLowerCase();
  return p.includes("interacademy") || p.includes("intertest");
}

function AirtableSyncTab({ onDirectSaveToSheets, onPrefillForm }) {
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [activeRole, setActiveRole] = useState("all_lint");
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [lastFetchedInfo, setLastFetchedInfo] = useState(null);
  const [airtableSubTab, setAirtableSubTab] = useState("insights");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function handleRunSync(targetRole) {
    if (!AIRTABLE_API_KEY || AIRTABLE_API_KEY.includes("YOUR_AIRTABLE")) {
      setErrorMsg("⚠️ Personal Access Token Airtable belum dipaste di file .env!");
      return;
    }

    setErrorMsg("");
    setSaveSuccessMsg("");
    setLoading(true);
    const roleName = targetRole === "lingua" ? "Lingua" : targetRole === "intertest" ? "Intertest / Interacademy" : "ALL LINT (Combined)";
    setActiveRole(targetRole);

    try {
      let formulaParts = [];
      if (startDate) formulaParts.push(`DATESTR({Submission Date}) >= '${startDate}'`);
      if (endDate) formulaParts.push(`DATESTR({Submission Date}) <= '${endDate}'`);
      
      let formula = formulaParts.length > 0 ? `AND(${formulaParts.join(",")})` : "";

      let allFetched = [];
      let offset = null;

      do {
        let params = new URLSearchParams({
          pageSize: "100",
          "sort[0][field]": "Submission Date",
          "sort[0][direction]": "desc"
        });
        
        if (formula) params.append("filterByFormula", formula);
        if (offset) params.append("offset", offset);

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?${params.toString()}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Airtable HTTP error ${res.status}`);
        }

        const json = await res.json();
        allFetched = allFetched.concat(json.records || []);
        offset = json.offset;
      } while (offset);

      setRecords(allFetched);
      setCurrentPage(1);
      setLastFetchedInfo({
        role: targetRole,
        roleName: roleName,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        totalFetched: allFetched.length,
        startDate,
        endDate,
      });
      setAirtableSubTab("insights");
    } catch (err) {
      console.error("Airtable sync error:", err);
      setErrorMsg(`⚠️ Gagal memanggil Airtable API: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const f = rec.fields || {};
      if (activeRole === "lingua") {
        return isLinguaRecord(f);
      } else if (activeRole === "intertest") {
        return isIntertestRecord(f);
      } else if (activeRole === "all_lint") {
        return isExactViewRecord(f);
      }
      return true;
    });
  }, [records, activeRole]);

  const analytics = useMemo(() => {
    let promoterCount = 0;
    let passiveCount = 0;
    let detractorCount = 0;

    const categoryMap = {};
    const categorySamplesMap = {};
    const subcategoryMap = {};
    const subcategorySamplesMap = {};
    const untaggedList = [];
    const unfollowedList = [];

    filteredRecords.forEach((rec) => {
      const f = rec.fields || {};
      const score = parseFloat(f["NPS Score"]);
      const classif = String(f["Classification"] || "").toLowerCase();

      let isDetractor = false;
      let isPassive = false;

      if (!isNaN(score)) {
        if (score >= 9) promoterCount++;
        else if (score >= 7) { passiveCount++; isPassive = true; }
        else { detractorCount++; isDetractor = true; }
      } else if (classif.includes("promoter")) promoterCount++;
      else if (classif.includes("passive")) { passiveCount++; isPassive = true; }
      else if (classif.includes("detractor")) { detractorCount++; isDetractor = true; }

      if (isDetractor || isPassive) {
        const cat = getCategoryVal(f) || "Unassigned / Empty";
        const sub = getSubcategoryVal(f) || "Unassigned / Empty";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        subcategoryMap[sub] = (subcategoryMap[sub] || 0) + 1;

        const rawComment = f["Hal yang bisa ditingkatkan"] || f["Saran/Kritik"] || f["Hal yang puas"] || f["Yang disukai"] || "";
        const commentStr = String(rawComment).trim();
        if (commentStr && commentStr.length > 3) {
          const sampleItem = {
            student: f["Name"] || f["Upper name"] || "Student",
            score: !isNaN(score) ? score : (f["Classification"] || "-"),
            comment: commentStr
          };

          if (!categorySamplesMap[cat]) categorySamplesMap[cat] = [];
          if (categorySamplesMap[cat].length < 2) {
            categorySamplesMap[cat].push(sampleItem);
          }

          if (!subcategorySamplesMap[sub]) subcategorySamplesMap[sub] = [];
          if (subcategorySamplesMap[sub].length < 2) {
            subcategorySamplesMap[sub].push(sampleItem);
          }
        }
      }

      if (isUntagged(f)) untaggedList.push(rec);
      if (isUnfollowed(f)) unfollowedList.push(rec);
    });

    const totalResponden = filteredRecords.length;
    const npsScore = totalResponden > 0 ? Math.round(((promoterCount - detractorCount) / totalResponden) * 100) : 0;
    const rateEst = totalResponden > 0 ? Math.min(100, Math.round((totalResponden / Math.max(totalResponden, 50)) * 100)) : 0;
    const tier = calcTier(rateEst, npsScore);

    const topCategories = Object.entries(categoryMap)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / Math.max(1, detractorCount + passiveCount)) * 100),
        samples: categorySamplesMap[name] || []
      }))
      .sort((a, b) => b.count - a.count);

    const topSubcategories = Object.entries(subcategoryMap)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / Math.max(1, detractorCount + passiveCount)) * 100),
        samples: subcategorySamplesMap[name] || []
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalResponden, promoterCount, passiveCount, detractorCount, npsScore, tier, rateEst,
      topCategories, topSubcategories, untaggedList, unfollowedList,
    };
  }, [filteredRecords]);

  const searchedRecords = useMemo(() => {
    if (!searchQuery.trim()) return filteredRecords;
    const q = searchQuery.toLowerCase();
    return filteredRecords.filter((rec) => {
      const f = rec.fields || {};
      const name = String(f["Name"] || f["Upper name"] || "").toLowerCase();
      const teacher = String(f["LMS Teacher"] || f["Nama Mentor"] || "").toLowerCase();
      const fb = String(f["Hal yang bisa ditingkatkan"] || f["Hal yang puas"] || "").toLowerCase();
      return name.includes(q) || teacher.includes(q) || fb.includes(q);
    });
  }, [filteredRecords, searchQuery]);

  const totalRawRecords = searchedRecords.length;
  const isShowAll = pageSize === "all";
  const numPageSize = isShowAll ? totalRawRecords : parseInt(pageSize, 10);
  const totalPages = isShowAll || totalRawRecords === 0 ? 1 : Math.ceil(totalRawRecords / numPageSize);

  const paginatedRawRecords = useMemo(() => {
    if (isShowAll) return searchedRecords;
    const start = (currentPage - 1) * numPageSize;
    return searchedRecords.slice(start, start + numPageSize);
  }, [searchedRecords, currentPage, numPageSize, isShowAll]);

  function handleDownloadPDF() {
    window.print();
  }

  async function handlePushToDashboard(targetRoleToPush) {
    const roleKey = targetRoleToPush || (activeRole === "intertest" ? "intertest" : "lingua");
    setSavingStatus("saving");
    setSaveSuccessMsg("");

    const topCatSummary = analytics.topCategories.slice(0, 2).map(c => `${c.name} (${c.pct}%)`).join(", ");
    const topSubSummary = analytics.topSubcategories.slice(0, 2).map(s => `${s.name} (${s.pct}%)`).join(", ");
    
    const actionPlanText = `Airtable Auto-Sync (${startDate} s/d ${endDate}): ${analytics.totalResponden} respon (${analytics.promoterCount} P, ${analytics.passiveCount} Pass, ${analytics.detractorCount} Det). Top Category: ${topCatSummary || "-"}. Top Subcategory: ${topSubSummary || "-"}. Untagged: ${analytics.untaggedList.length}, Unfollowed: ${analytics.unfollowedList.length}.`;

    const payload = {
      role: roleKey,
      reportDay: getTodayDay(),
      period: "Week 1, Week 2, Week 3 & Week 4",
      tanggal: todayStr(),
      promoter: analytics.promoterCount,
      passive: analytics.passiveCount,
      detractor: analytics.detractorCount,
      rate: analytics.rateEst,
      nps: analytics.npsScore,
      actionPlan: actionPlanText,
      tier: analytics.tier || "A",
    };

    const success = await onDirectSaveToSheets(payload);
    if (success) {
      setSavingStatus("success");
      setSaveSuccessMsg(`✅ Record baru (${roleKey === "lingua" ? "PIC Lingua" : "PIC Intertest"}) berhasil disimpan & muncul di Dashboard & Riwayat Google Sheets!`);
      setTimeout(() => setSavingStatus(null), 4000);
    } else {
      setSavingStatus("error");
      setErrorMsg("⚠️ Gagal menyimpan ke Google Sheets Apps Script.");
    }
  }

  function handlePrefillForm(targetRoleToPush) {
    const roleKey = targetRoleToPush || (activeRole === "intertest" ? "intertest" : "lingua");
    const topCatSummary = analytics.topCategories.slice(0, 2).map(c => `${c.name} (${c.pct}%)`).join(", ");
    
    onPrefillForm({
      role: roleKey,
      promoter: analytics.promoterCount,
      passive: analytics.passiveCount,
      detractor: analytics.detractorCount,
      rate: analytics.rateEst,
      actionPlan: `Airtable Auto-Sync (${startDate} s/d ${endDate}): ${analytics.totalResponden} respon (${analytics.promoterCount} P, ${analytics.passiveCount} Pass, ${analytics.detractorCount} Det). Top Issue: ${topCatSummary || "-"}.`,
    });
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e0e7ff", borderRadius: 28, padding: 32, margin: "10px 0 30px 0", boxShadow: "0 20px 50px rgba(37,99,235,0.06)" }}>
      {/* HEADER SECTION WITH ELECTRIC BLUE FLOATING BADGE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "6px 14px", borderRadius: 20, background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#ffffff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
              <span>⚡</span> Fast Sync
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
                Live Airtable Sync & Intelligence
              </h2>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: 500 }}>
                Integrasi data survey real-time Lingua, Intertest, & Combined ALL LINT
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {records.length > 0 && (
            <>
              <button onClick={() => exportAirtableSyncToExcel(filteredRecords, analytics, { activeRole, startDate, endDate })} style={{ padding: "9px 18px", borderRadius: 30, border: "1px solid #10b981", background: "linear-gradient(135deg, #059669, #10b981)", color: "#ffffff", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(16,185,129,0.25)" }}>
                <span>📊</span> Export to Excel (.xlsx)
              </button>
              <button onClick={handleDownloadPDF} style={{ padding: "9px 18px", borderRadius: 30, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <span>📄</span> Export / Download PDF
              </button>
            </>
          )}

          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 30, border: "1px solid #e2e8f0" }}>
            {[
              ["insights", "📊 Insights"],
              ["records", `📋 Raw (${filteredRecords.length})`],
              ["untagged", `🏷️ Belum Tag (${analytics.untaggedList.length})`],
              ["unfollowed", `📞 Belum FU (${analytics.unfollowedList.length})`],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setAirtableSubTab(k)} style={{ padding: "8px 16px", borderRadius: 24, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: airtableSubTab === k ? "#0f172a" : "transparent", color: airtableSubTab === k ? "#ffffff" : "#64748b", transition: "all 0.2s" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {saveSuccessMsg && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🎉</span> {saveSuccessMsg}
        </div>
      )}

      {/* FILTER PANEL WITH SOFT ICE BLUE GLASS */}
      <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", border: "1px solid #dbeafe", borderRadius: 20, padding: 20, marginBottom: 26, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>📅 Tanggal Mulai</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "10px 14px", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 12, color: "#0f172a", fontSize: 13, fontWeight: 600, outline: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>📅 Tanggal Selesai</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "10px 14px", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 12, color: "#0f172a", fontSize: 13, fontWeight: 600, outline: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }} />
          </div>
        </div>

        {/* 3 HIGH-CONTRAST EXECUTION PILL BUTTONS */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => handleRunSync("lingua")} disabled={loading} style={{ padding: "12px 22px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 6px 18px rgba(37,99,235,0.3)", transition: "all 0.2s" }}>
            {loading && activeRole === "lingua" ? "⏳ Fetching..." : "▶ Run Sync Lingua"}
          </button>
          <button onClick={() => handleRunSync("intertest")} disabled={loading} style={{ padding: "12px 22px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 6px 18px rgba(99,102,241,0.3)", transition: "all 0.2s" }}>
            {loading && activeRole === "intertest" ? "⏳ Fetching..." : "▶ Run Sync Intertest"}
          </button>
          <button onClick={() => handleRunSync("all_lint")} disabled={loading} style={{ padding: "12px 22px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 6px 18px rgba(5,150,105,0.3)", transition: "all 0.2s" }}>
            {loading && activeRole === "all_lint" ? "⏳ Fetching..." : "🌐 Run Sync ALL LINT"}
          </button>
        </div>
      </div>

      {lastFetchedInfo && (
        <div style={{ marginBottom: 24, padding: "12px 18px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
          <span>Program: <strong style={{ color: "#0f172a" }}>{lastFetchedInfo.roleName}</strong></span>
          <span>· Rentang: <strong style={{ color: "#0f172a" }}>{startDate}</strong> s/d <strong style={{ color: "#0f172a" }}>{endDate}</strong></span>
          <span>· Total Respon: <strong style={{ color: "#2563eb", fontSize: 14, fontWeight: 800 }}>{filteredRecords.length} records</strong> ({lastFetchedInfo.timestamp} WIB)</span>
        </div>
      )}

      {records.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "linear-gradient(135deg, #f8fafc, #ffffff)", borderRadius: 20, border: "2px dashed #cbd5e1" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Klik tombol Run Sync untuk memuat data Airtable real-time</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Pilih <strong>Run Sync Lingua</strong>, <strong>Run Sync Intertest</strong>, atau <strong>Run Sync ALL LINT</strong>.</div>
        </div>
      )}

      {/* INSIGHTS SUBTAB WITH CIRCULAR RING & VIBRANT BLUE STAT TILES (MATCHING NEW REFERENCE SCREENSHOT) */}
      {airtableSubTab === "insights" && records.length > 0 && (
        <div>
          {/* ACTION BANNER TO PUSH TO GOOGLE SHEETS */}
          <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "1px solid #93c5fd", borderRadius: 20, padding: "20px 24px", marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, boxShadow: "0 6px 20px rgba(37,99,235,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28 }}>✨</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e3a8a" }}>
                  Hasil Sync Siap Masuk ke Dashboard & Riwayat Weekly Report!
                </div>
                <div style={{ fontSize: 12, color: "#1e40af", marginTop: 3 }}>
                  Program: <strong>{activeRole === "intertest" ? "PIC Intertest" : "PIC Lingua"}</strong> · {analytics.totalResponden} Responden · NPS: <strong>{analytics.npsScore}</strong> · Tier: <strong>{analytics.tier}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => handlePrefillForm(activeRole === "intertest" ? "intertest" : "lingua")} style={{ padding: "10px 18px", borderRadius: 30, border: "1px solid #bfdbfe", background: "#ffffff", color: "#1d4ed8", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                ✏️ Edit Dulu di Form
              </button>
              <button onClick={() => handlePushToDashboard(activeRole === "intertest" ? "intertest" : "lingua")} disabled={savingStatus === "saving"} style={{ padding: "10px 22px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#ffffff", fontSize: 12, fontWeight: 800, cursor: savingStatus === "saving" ? "not-allowed" : "pointer", boxShadow: "0 6px 18px rgba(37,99,235,0.3)" }}>
                {savingStatus === "saving" ? "⏳ Menyimpan..." : "⚡ Push ke Dashboard (Google Sheets)"}
              </button>
            </div>
          </div>

          {/* ROW 1: 4 MAIN OVERVIEW STAT TILES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 20 }}>
            
            {/* CARD 1: CIRCULAR GAUGE RING FOR NPS SCORE */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 22, boxShadow: "0 10px 30px rgba(37,99,235,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>NPS SCORE</div>
              
              {/* CIRCULAR SVG RING */}
              <div style={{ position: "relative", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                  <circle cx="50" cy="50" r="40" stroke="url(#npsGradient)" strokeWidth="10" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Math.max(0, Math.min(100, analytics.npsScore))) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1s ease" }} />
                  <defs>
                    <linearGradient id="npsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: "absolute", fontSize: 30, fontWeight: 900, color: "#0f172a", letterSpacing: "-1px" }}>
                  {analytics.npsScore}
                </div>
              </div>
            </div>

            {/* CARD 2: VIBRANT COBALT BLUE GRADIENT CARD */}
            <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: 24, padding: 22, color: "#ffffff", boxShadow: "0 10px 25px rgba(37,99,235,0.25)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>STATUS TIER</div>
              {analytics.tier && TIER[analytics.tier] ? (
                <div>
                  <TierBadge tier={analytics.tier} />
                  <div style={{ fontSize: 11, color: "#eff6ff", marginTop: 8, lineHeight: 1.3, fontWeight: 500 }}>{TIER[analytics.tier].action}</div>
                </div>
              ) : <div style={{ fontSize: 13, color: "#bfdbfe", marginTop: 8 }}>—</div>}
            </div>

            {/* CARD 3: TIKET BELUM DI-TAG */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 22, color: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setAirtableSubTab("untagged")}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1px" }}>TIKET BELUM DI-TAG</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: analytics.untaggedList.length > 0 ? "#dc2626" : "#059669", marginTop: 4, letterSpacing: "-1px" }}>{analytics.untaggedList.length}</div>
              </div>
              <div style={{ fontSize: 11, color: "#2563eb", marginTop: 8, fontWeight: 800 }}>Lihat daftar untagged →</div>
            </div>

            {/* CARD 4: TIKET BELUM DI-FU */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 22, color: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setAirtableSubTab("unfollowed")}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "1px" }}>TIKET BELUM DI-FU</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: analytics.unfollowedList.length > 0 ? "#d97706" : "#059669", marginTop: 4, letterSpacing: "-1px" }}>{analytics.unfollowedList.length}</div>
              </div>
              <div style={{ fontSize: 11, color: "#d97706", marginTop: 8, fontWeight: 800 }}>Lihat daftar unfollowed →</div>
            </div>
          </div>

          {/* ROW 2: 3 RESPONSE BREAKDOWN CARDS (PROMOTER, PASSIVE, DETRACTOR) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18, marginBottom: 26 }}>
            {/* PROMOTER CARD */}
            <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #86efac", borderRadius: 24, padding: 22, color: "#166534", boxShadow: "0 10px 25px rgba(34,197,94,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#15803d" }}>PROMOTER (9-10)</div>
                <div style={{ fontSize: 24 }}>👍</div>
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#15803d", marginTop: 6, letterSpacing: "-1px" }}>
                {analytics.promoterCount}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#ffffff", padding: "2px 10px", borderRadius: 20, border: "1px solid #bbf7d0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  {analytics.totalResponden > 0 ? Math.round((analytics.promoterCount / analytics.totalResponden) * 100) : 0}%
                </span>
                <span>dari {analytics.totalResponden} respon</span>
              </div>
            </div>

            {/* PASSIVE CARD */}
            <div style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde047", borderRadius: 24, padding: 22, color: "#854d0e", boxShadow: "0 10px 25px rgba(234,179,8,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#b45309" }}>PASSIVE (7-8)</div>
                <div style={{ fontSize: 24 }}>😐</div>
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#b45309", marginTop: 6, letterSpacing: "-1px" }}>
                {analytics.passiveCount}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#854d0e", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#ffffff", padding: "2px 10px", borderRadius: 20, border: "1px solid #fef08a", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  {analytics.totalResponden > 0 ? Math.round((analytics.passiveCount / analytics.totalResponden) * 100) : 0}%
                </span>
                <span>dari {analytics.totalResponden} respon</span>
              </div>
            </div>

            {/* DETRACTOR CARD */}
            <div style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)", border: "1px solid #fca5a5", borderRadius: 24, padding: 22, color: "#991b1b", boxShadow: "0 10px 25px rgba(239,68,68,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#dc2626" }}>DETRACTOR (0-6)</div>
                <div style={{ fontSize: 24 }}>👎</div>
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#dc2626", marginTop: 6, letterSpacing: "-1px" }}>
                {analytics.detractorCount}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#ffffff", padding: "2px 10px", borderRadius: 20, border: "1px solid #fecaca", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  {analytics.totalResponden > 0 ? Math.round((analytics.detractorCount / analytics.totalResponden) * 100) : 0}%
                </span>
                <span>dari {analytics.totalResponden} respon</span>
              </div>
            </div>
          </div>


          {/* SECTION 1: EXECUTIVE SUMMARY CHART VISUAL GRAPHIC */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📊</span> Executive Summary Chart: Distribution per Category & Sub-category
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>Visual ringkasan persentase isu utama (Detractor & Passive) dari total respon.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* LEFT: CATEGORY VISUAL GRAPHIC */}
              <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 20, padding: 18 }}>
                <h5 style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💡</span> Mostly Category
                </h5>
                {analytics.topCategories.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Tidak ada data keluhan</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {analytics.topCategories.slice(0, 6).map((cat, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1e293b", fontWeight: 700 }}>
                          <span>{cat.name}</span>
                          <span style={{ color: "#2563eb", fontWeight: 800 }}>{cat.count} ({cat.pct}%)</span>
                        </div>
                        <div style={{ background: "#e2e8f0", height: 8, borderRadius: 6, marginTop: 5, overflow: "hidden" }}>
                          <div style={{ width: `${cat.pct}%`, height: "100%", background: "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 6, transition: "width 0.8s ease" }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: SUBCATEGORY VISUAL GRAPHIC */}
              <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 20, padding: 18 }}>
                <h5 style={{ fontSize: 13, fontWeight: 800, color: "#6366f1", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🔎</span> Mostly Sub-category
                </h5>
                {analytics.topSubcategories.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Tidak ada data subkategori</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {analytics.topSubcategories.slice(0, 6).map((sub, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1e293b", fontWeight: 700 }}>
                          <span>{sub.name}</span>
                          <span style={{ color: "#6366f1", fontWeight: 800 }}>{sub.count} ({sub.pct}%)</span>
                        </div>
                        <div style={{ background: "#e2e8f0", height: 8, borderRadius: 6, marginTop: 5, overflow: "hidden" }}>
                          <div style={{ width: `${sub.pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 6, transition: "width 0.8s ease" }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: DETAILING & NOTABLE SAMPLE COMMENTS */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, marginBottom: 26, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>💬</span> Detailing & Sample Feedback Komentar Nyata
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>Rincian sampel umpan balik langsung dari responden untuk setiap kategori dan subkategori.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* CATEGORY DETAILING & SAMPLES */}
              <div>
                <h5 style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💡</span> Detailing Sample Komen Kategori
                </h5>
                {analytics.topCategories.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Tidak ada data keluhan</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {analytics.topCategories.slice(0, 6).map((cat, idx) => (
                      <div key={idx} style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                          <span>{cat.name}</span>
                          <span style={{ color: "#2563eb", fontWeight: 800 }}>{cat.count} respon ({cat.pct}%)</span>
                        </div>
                        
                        {/* NOTABLE SAMPLE COMMENTS */}
                        {cat.samples && cat.samples.length > 0 ? (
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                            {cat.samples.map((s, sIdx) => (
                              <div key={sIdx} style={{ padding: "8px 12px", background: "#ffffff", borderLeft: "3px solid #2563eb", borderRadius: "0 10px 10px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                                  <span>💬 {s.student}</span>
                                  <span style={{ padding: "1px 6px", borderRadius: 10, background: s.score <= 6 ? "#fee2e2" : "#fef3c7", color: s.score <= 6 ? "#dc2626" : "#d97706", fontWeight: 800 }}>
                                    NPS: {s.score}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: "#334155", fontStyle: "italic", lineHeight: 1.4 }}>
                                  "{String(s.comment || "").length > 140 ? String(s.comment || "").substring(0, 140) + "..." : String(s.comment || "")}"
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 6 }}>Komen tidak tersedia.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SUBCATEGORY DETAILING & SAMPLES */}
              <div>
                <h5 style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🔎</span> Detailing Sample Komen Subkategori
                </h5>
                {analytics.topSubcategories.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Tidak ada data subkategori</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {analytics.topSubcategories.slice(0, 6).map((sub, idx) => (
                      <div key={idx} style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                          <span>{sub.name}</span>
                          <span style={{ color: "#6366f1", fontWeight: 800 }}>{sub.count} respon ({sub.pct}%)</span>
                        </div>

                        {/* NOTABLE SAMPLE COMMENTS */}
                        {sub.samples && sub.samples.length > 0 ? (
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                            {sub.samples.map((s, sIdx) => (
                              <div key={sIdx} style={{ padding: "8px 12px", background: "#ffffff", borderLeft: "3px solid #6366f1", borderRadius: "0 10px 10px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                                  <span>💬 {s.student}</span>
                                  <span style={{ padding: "1px 6px", borderRadius: 10, background: s.score <= 6 ? "#fee2e2" : "#fef3c7", color: s.score <= 6 ? "#dc2626" : "#d97706", fontWeight: 800 }}>
                                    NPS: {s.score}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: "#334155", fontStyle: "italic", lineHeight: 1.4 }}>
                                  "{String(s.comment || "").length > 140 ? String(s.comment || "").substring(0, 140) + "..." : String(s.comment || "")}"
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 6 }}>Komen tidak tersedia.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAW RECORDS TABLE */}
      {airtableSubTab === "records" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <input type="text" placeholder="🔍 Cari nama, mentor, atau feedback..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} style={{ padding: "10px 16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 13, width: 280, outline: "none" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#64748b" }}>
              <button onClick={() => exportSingleRecordListToExcel(searchedRecords, `NPS_Raw_Records_${activeRole}.xlsx`, "Raw Records")} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #059669", background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📥</span> Export Raw (.xlsx)
              </button>
              <span>Tampilkan per halaman:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(e.target.value); setCurrentPage(1); }} style={{ padding: "6px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", fontSize: 12, fontWeight: 700, outline: "none" }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">Semua ({totalRawRecords})</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, textAlign: "left", color: "#334155", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "12px 10px", width: 40 }}>#</th>
                  <th style={{ padding: "12px 10px" }}>Tanggal</th>
                  <th style={{ padding: "12px 10px" }}>Nama</th>
                  <th style={{ padding: "12px 10px" }}>Program</th>
                  <th style={{ padding: "12px 10px" }}>NPS</th>
                  <th style={{ padding: "12px 10px" }}>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRawRecords.map((r, i) => {
                  const globalIdx = isShowAll ? i + 1 : (currentPage - 1) * numPageSize + i + 1;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 10, color: "#94a3b8", fontWeight: 600 }}>{globalIdx}</td>
                      <td style={{ padding: 10 }}>{r.fields["Submission Date"] ? formatDateISO(r.fields["Submission Date"]) : "—"}</td>
                      <td style={{ padding: 10, fontWeight: 700, color: "#0f172a" }}>{r.fields["Name"] || r.fields["Upper name"] || "—"}</td>
                      <td style={{ padding: 10, color: "#2563eb", fontWeight: 600 }}>{r.fields["Program"] || "—"}</td>
                      <td style={{ padding: 10, fontWeight: 800 }}>{r.fields["NPS Score"] ?? "—"}</td>
                      <td style={{ padding: 10, color: "#64748b" }}>{r.fields["Hal yang bisa ditingkatkan"] || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS BAR */}
          {!isShowAll && totalRawRecords > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>
              <div>
                Menampilkan <strong style={{ color: "#0f172a" }}>{(currentPage - 1) * numPageSize + 1}</strong> s/d <strong style={{ color: "#0f172a" }}>{Math.min(currentPage * numPageSize, totalRawRecords)}</strong> dari <strong style={{ color: "#2563eb" }}>{totalRawRecords} records</strong>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: currentPage === 1 ? "#f8fafc" : "#ffffff", color: currentPage === 1 ? "#94a3b8" : "#0f172a", fontWeight: 700, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
                  ◀ Prev
                </button>
                <span style={{ padding: "0 8px", fontWeight: 700, color: "#0f172a" }}>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: currentPage === totalPages ? "#f8fafc" : "#ffffff", color: currentPage === totalPages ? "#94a3b8" : "#0f172a", fontWeight: 700, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UNTAGGED SUBTAB */}
      {airtableSubTab === "untagged" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>🏷️ Tiket Belum Di-Tag ({analytics.untaggedList.length})</h4>
            {analytics.untaggedList.length > 0 && (
              <button onClick={() => exportSingleRecordListToExcel(analytics.untaggedList, `NPS_Untagged_${activeRole}.xlsx`, "Belum Tagged")} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #059669", background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📥</span> Export Untagged (.xlsx)
              </button>
            )}
          </div>
          {analytics.untaggedList.map((r, i) => (
            <div key={i} style={{ padding: 12, borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{r.fields["Name"] || "Student"} — NPS: {r.fields["NPS Score"]}</div>
              <div style={{ color: "#64748b", marginTop: 3 }}>💬 {r.fields["Hal yang bisa ditingkatkan"] || "Kosong"}</div>
            </div>
          ))}
        </div>
      )}

      {/* UNFOLLOWED SUBTAB */}
      {airtableSubTab === "unfollowed" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>📞 Tiket Belum Di-Follow Up ({analytics.unfollowedList.length})</h4>
            {analytics.unfollowedList.length > 0 && (
              <button onClick={() => exportSingleRecordListToExcel(analytics.unfollowedList, `NPS_Belum_FU_${activeRole}.xlsx`, "Belum Follow Up")} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #059669", background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📥</span> Export Belum FU (.xlsx)
              </button>
            )}
          </div>
          {analytics.unfollowedList.map((r, i) => (
            <div key={i} style={{ padding: 12, borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: "#d97706" }}>{r.fields["Name"] || "Student"} — Score: {r.fields["NPS Score"]}</div>
              <div style={{ color: "#64748b", marginTop: 3 }}>💬 {r.fields["Hal yang bisa ditingkatkan"] || "Kosong"}</div>
            </div>
          ))}
        </div>
      )}

      {/* PRINT-ONLY PDF REPORT */}
      <div id="pdf-report-print" style={{ display: "none" }}>
        <style>{`
          @media print {
            body * { visibility: hidden!important; }
            #pdf-report-print, #pdf-report-print * { visibility: visible!important; }
            #pdf-report-print { display: block!important; position: absolute; left: 0; top: 0; width: 100%; color: #0f172a; font-family: system-ui, sans-serif; }
            .print-page-break { page-break-after: always; }
          }
        `}</style>

        <div style={{ borderBottom: "2px solid #2563eb", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", margin: 0 }}>NPS Intelligence & Survey Executive Report</h1>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              Program: <strong>{lastFetchedInfo?.roleName || "ALL LINT"}</strong> · Periode: <strong>{startDate} s/d {endDate}</strong>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "right" }}>
            Generated on: {new Date().toLocaleString("id-ID")}<br/>
            Source: Airtable Live Sync
          </div>
        </div>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: 6, marginBottom: 16 }}>1. Ringkasan NPS & Tier</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ border: "1px solid #cbd5e1", padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>NPS SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: analytics.npsScore >= 78 ? "#059669" : "#dc2626" }}>{analytics.npsScore}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{analytics.promoterCount} P · {analytics.passiveCount} Pass · {analytics.detractorCount} Det</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>STATUS TIER</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>Tier {analytics.tier || "—"}</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>TIKET UNTAGGED</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: analytics.untaggedList.length > 0 ? "#dc2626" : "#059669" }}>{analytics.untaggedList.length}</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>TIKET UNFOLLOWED</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: analytics.unfollowedList.length > 0 ? "#d97706" : "#059669" }}>{analytics.unfollowedList.length}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: 6, marginBottom: 16 }}>2. Analisis Keluhan (Category & Subcategory)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Mostly Category</h3>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f1f5f9" }}><th style={{ padding: 6, textAlign: "left" }}>Kategori</th><th style={{ padding: 6, textAlign: "right" }}>Jumlah</th></tr></thead>
                <tbody>{analytics.topCategories.map((c, i) => <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}><td style={{ padding: 6 }}>{c.name}</td><td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{c.count} ({c.pct}%)</td></tr>)}</tbody>
              </table>
            </div>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Mostly Subcategory</h3>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f1f5f9" }}><th style={{ padding: 6, textAlign: "left" }}>Subkategori</th><th style={{ padding: 6, textAlign: "right" }}>Jumlah</th></tr></thead>
                <tbody>{analytics.topSubcategories.map((s, i) => <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}><td style={{ padding: 6 }}>{s.name}</td><td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{s.count} ({s.pct}%)</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="print-page-break"></div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: 6, marginBottom: 16 }}>3. Data Raw Survey Lengkap ({searchedRecords.length} Records)</h2>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: 6, textAlign: "left" }}>#</th>
                <th style={{ padding: 6, textAlign: "left" }}>Tanggal</th>
                <th style={{ padding: 6, textAlign: "left" }}>Nama Student</th>
                <th style={{ padding: 6, textAlign: "left" }}>Program</th>
                <th style={{ padding: 6, textAlign: "center" }}>NPS</th>
                <th style={{ padding: 6, textAlign: "left" }}>Feedback Detail</th>
              </tr>
            </thead>
            <tbody>
              {searchedRecords.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 6 }}>{i + 1}</td>
                  <td style={{ padding: 6 }}>{r.fields["Submission Date"] ? formatDateISO(r.fields["Submission Date"]) : "—"}</td>
                  <td style={{ padding: 6, fontWeight: 700 }}>{r.fields["Name"] || r.fields["Upper name"] || "—"}</td>
                  <td style={{ padding: 6, color: "#2563eb" }}>{r.fields["Program"] || "—"}</td>
                  <td style={{ padding: 6, textAlign: "center", fontWeight: 800 }}>{r.fields["NPS Score"] ?? "—"}</td>
                  <td style={{ padding: 6 }}>{r.fields["Hal yang bisa ditingkatkan"] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APPLICATION WITH BOTH ORIGINAL DASHBOARD AND AIRTABLE TAB ---
export default function App() {
  const [view, setView] = useState("dashboard");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, tanggal: todayStr() });
  const [status, setStatus] = useState(null);
  const [histFilter, setHistFilter] = useState("all");

  const [chartFilterMonth, setChartFilterMonth] = useState("all");
  const [chartFilterRole, setChartFilterRole] = useState("all");
  const [chartFilterPeriod, setChartFilterPeriod] = useState("all");

  const pVal = parseInt(form.promoter) || 0;
  const passVal = parseInt(form.passive) || 0;
  const dVal = parseInt(form.detractor) || 0;
  const responden = (form.promoter === "" && form.passive === "" && form.detractor === "") ? "" : pVal + passVal + dVal;
  const nps = responden ? Math.round(((pVal - dVal) / responden) * 100) : "";

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const json = await res.json();
      if (json.status === "ok") setReports(json.data.reverse());
    } catch (_) {}
    setLoading(false);
  }

  async function handleDeleteReport(targetId) {
    if (!targetId) return;
    const confirmDelete = window.confirm("Apakah Anda yakin ingin menghapus laporan ini?");
    if (!confirmDelete) return;

    setReports((prev) => prev.filter((r) => (r.id || r._id || r.createdAt || r.createdat) !== targetId));

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "delete", id: targetId, createdAt: targetId }),
      });
    } catch (err) {
      console.error("Failed to delete report on Apps Script:", err);
    }
  }

  async function handleSubmit() {
    if (responden === "" || !form.rate || nps === "") { alert("⚠️ Harap isi Promoter, Passive, Detractor, dan Rate."); return; }
    setStatus("saving");
    const now = new Date().toISOString();
    const payload = {
      id: Date.now(), role: selectedRole, hari: form.reportDay,
      periode: form.period, tanggal: form.tanggal,
      responden: responden, rate: form.rate, nps: nps,
      actionPlan: form.actionPlan, tier: calcTier(form.rate, nps),
      late: isLate(now), createdAt: now,
    };
    try {
      await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
      setStatus("success");
      await fetchData();
    } catch (_) { setStatus("error"); return; }
    setTimeout(() => { setStatus(null); setView("dashboard"); setSelectedRole(null); setForm({ ...EMPTY, tanggal: todayStr() }); }, 1800);
  }

  async function handleDirectSaveToSheets(payloadData) {
    const now = new Date().toISOString();
    const fullPayload = {
      id: Date.now(),
      role: payloadData.role,
      hari: payloadData.reportDay || getTodayDay(),
      periode: payloadData.period || "Week 1, Week 2, Week 3 & Week 4",
      tanggal: payloadData.tanggal || todayStr(),
      responden: (payloadData.promoter + payloadData.passive + payloadData.detractor),
      promoter: payloadData.promoter,
      passive: payloadData.passive,
      detractor: payloadData.detractor,
      rate: payloadData.rate,
      nps: payloadData.nps,
      actionPlan: payloadData.actionPlan,
      tier: payloadData.tier || calcTier(payloadData.rate, payloadData.nps),
      late: isLate(now),
      createdAt: now,
    };

    try {
      await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(fullPayload) });
      await fetchData();
      return true;
    } catch (err) {
      console.error("Failed to push to Apps Script:", err);
      return false;
    }
  }

  function handlePrefillFormFromAirtable(prefillData) {
    setSelectedRole(prefillData.role);
    setForm({
      ...EMPTY,
      reportDay: getTodayDay(),
      period: "Week 1, Week 2, Week 3 & Week 4",
      tanggal: todayStr(),
      promoter: String(prefillData.promoter),
      passive: String(prefillData.passive),
      detractor: String(prefillData.detractor),
      rate: String(prefillData.rate),
      actionPlan: prefillData.actionPlan || "",
    });
    setView("form");
  }

  const todayDay = getTodayDay();
  const today = todayStr();
  const todayByRole = {};
  ROLES.forEach(r => { todayByRole[r.key] = reports.find(x => x.tanggal === today && x.role === r.key && x.hari === todayDay); });
  const tier = calcTier(form.rate, nps);
  const t = tier ? TIER[tier] : null;
  const filtered = histFilter === "all" ? reports : reports.filter(r => r.role === histFilter);
  const monthKey = new Date().toISOString().slice(0, 7);

  const availableMonths = [...new Set(reports.map(r => getReportMonth(r)))].filter(Boolean).sort().reverse();
  const chartData = reports.filter(r => {
    const m = getReportMonth(r);
    if (chartFilterMonth !== "all" && m !== chartFilterMonth) return false;
    if (chartFilterRole !== "all" && r.role !== chartFilterRole) return false;
    if (chartFilterPeriod !== "all" && r.periode !== chartFilterPeriod) return false;
    return true;
  });
  const periodsToShow = chartFilterPeriod === "all" ? PERIODS : [chartFilterPeriod];
  const chartBars = periodsToShow.map(p => {
    const periodData = chartData.filter(r => r.periode === p);
    const linguaData = periodData.filter(r => r.role === "lingua");
    const linguaNps = linguaData.length ? linguaData.reduce((sum, r) => sum + parseFloat(r.nps||0), 0) / linguaData.length : 0;
    const linguaTierAvg = linguaData.length ? Math.round(linguaData.reduce((sum, r) => sum + (r.tier === "A" ? 2 : r.tier === "B" ? 1 : 0), 0) / linguaData.length) : null;
    const intertestData = periodData.filter(r => r.role === "intertest");
    const intertestNps = intertestData.length ? intertestData.reduce((sum, r) => sum + parseFloat(r.nps||0), 0) / intertestData.length : 0;
    const intertestTierAvg = intertestData.length ? Math.round(intertestData.reduce((sum, r) => sum + (r.tier === "A" ? 2 : r.tier === "B" ? 1 : 0), 0) / intertestData.length) : null;
    return {
      period: p,
      lingua: { nps: linguaNps, tier: linguaTierAvg, hasData: linguaData.length > 0 },
      intertest: { nps: intertestNps, tier: intertestTierAvg, hasData: intertestData.length > 0 }
    };
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontFamily: "system-ui", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 40 }}>⚡</div><div style={{ fontWeight: 700 }}>Memuat data Google Sheets...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 40%, #e0e7ff 100%)", color: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');* { box-sizing: border-box; margin: 0; } input:focus,select:focus,textarea:focus { border-color: #2563eb!important; }
      .chart-group:hover .chart-bar { opacity: 0.45; }
      .chart-group .chart-bar:hover { opacity: 1; }
      .chart-tooltip { visibility: hidden; opacity: 0; transition: all 0.2s; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); background: #0f172a; color: #ffffff; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 500; white-space: nowrap; pointer-events: none; z-index: 10; box-shadow: 0 10px 20px rgba(0,0,0,0.15); text-align: center; line-height: 1.4; }
      .chart-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: #0f172a transparent transparent transparent; }
      .chart-bar:hover .chart-tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>

      {/* MAIN TOP NAVIGATION DOCK */}
      <div style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, background: "linear-gradient(90deg, #2563eb, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NPS Weekly Report</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.8px" }}>LINGUA & INTERTEST · COMPOUNDING</div>
          </div>
          <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 30, border: "1px solid #e2e8f0" }}>
            {[
              ["dashboard","📊 Dashboard"],
              ["form","✏️ Input"],
              ["history","📋 Riwayat"],
              ["airtable","🚀 Airtable Live Sync"]
            ].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={S.nav(view===v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "26px 20px" }}>

        {/* TAB 1: ORIGINAL DASHBOARD WITH CLEAN BLUE GLASS & BAR CHARTS */}
        {view === "dashboard" && (
          <div>
            {/* 3 SUMMARY KPI CARDS REDESIGNED */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 26 }}>
              {/* CARD 1: TOTAL REPORT */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "22px 24px", boxShadow: "0 10px 30px rgba(37,99,235,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Total Report</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#2563eb", marginTop: 4, letterSpacing: "-1px" }}>{reports.length}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>Semua laporan tersimpan</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#2563eb" }}>
                  📊
                </div>
              </div>

              {/* CARD 2: BULAN INI */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "22px 24px", boxShadow: "0 10px 30px rgba(37,99,235,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Bulan Ini</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#0284c7", marginTop: 4, letterSpacing: "-1px" }}>
                    {reports.filter(r => getReportMonth(r) === monthKey).length}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>Periode {monthKey}</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#0284c7" }}>
                  📅
                </div>
              </div>

              {/* CARD 3: TERLAMBAT */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "22px 24px", boxShadow: "0 10px 30px rgba(239,68,68,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px" }}>Terlambat</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", marginTop: 4, letterSpacing: "-1px" }}>
                    {reports.filter(r=>r.late===true||r.late==="TRUE").length}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>Perlu perhatian deadline</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#dc2626" }}>
                  🚨
                </div>
              </div>
            </div>

            {/* FILTER SECTION */}
            <div style={{ marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginRight: 8 }}>Filter</div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterMonth} onChange={e=>setChartFilterMonth(e.target.value)} style={{ width: "100%", padding: "9px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <option value="all">Bulan: Semua</option>
                  {availableMonths.map(m => <option key={m} value={m}>Bulan: {m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterRole} onChange={e=>setChartFilterRole(e.target.value)} style={{ width: "100%", padding: "9px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <option value="all">PIC: Semua</option>
                  {ROLES.map(r => <option key={r.key} value={r.key}>PIC: {r.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterPeriod} onChange={e=>setChartFilterPeriod(e.target.value)} style={{ width: "100%", padding: "9px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <option value="all">Periode: Semua</option>
                  {PERIODS.map(p => <option key={p} value={p}>Periode: {p}</option>)}
                </select>
              </div>
            </div>

            {/* WIDGET INSIGHT PERGERAKAN TIER (SUBMITTED REPORTS) */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: "0 10px 30px rgba(37,99,235,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🏆</span> Insight Pergerakan & Distribusi Tier (Submitted Reports)
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Rekapitulasi pencapaian Tier A, Tier B, dan Tier C dari {chartData.length} laporan terpilih
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "4px 12px", borderRadius: 20, border: "1px solid #bfdbfe" }}>
                  Grand Total: {chartData.length} Laporan
                </div>
              </div>

              {(() => {
                let lA = 0, lB = 0, lC = 0;
                let iA = 0, iB = 0, iC = 0;

                chartData.forEach(r => {
                  const t = r.tier;
                  if (r.role === "lingua") {
                    if (t === "A") lA++; else if (t === "B") lB++; else if (t === "C") lC++;
                  } else if (r.role === "intertest") {
                    if (t === "A") iA++; else if (t === "B") iB++; else if (t === "C") iC++;
                  }
                });

                const totA = lA + iA;
                const totB = lB + iB;
                const totC = lC + iC;
                const grandTot = chartData.length || 1;

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    {/* COLUMN 1: PIC LINGUA */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>🔵 PIC Lingua</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{lA + lB + lC} Laporan</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#d1fae5", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                          <span style={{ fontWeight: 700, color: "#059669" }}>✅ Tier A</span>
                          <span style={{ fontWeight: 900, color: "#059669" }}>{lA} <small style={{ fontWeight: 600 }}>({Math.round((lA / Math.max(1, lA+lB+lC)) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fde68a" }}>
                          <span style={{ fontWeight: 700, color: "#d97706" }}>⚠️ Tier B</span>
                          <span style={{ fontWeight: 900, color: "#d97706" }}>{lB} <small style={{ fontWeight: 600 }}>({Math.round((lB / Math.max(1, lA+lB+lC)) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
                          <span style={{ fontWeight: 700, color: "#dc2626" }}>🔴 Tier C</span>
                          <span style={{ fontWeight: 900, color: "#dc2626" }}>{lC} <small style={{ fontWeight: 600 }}>({Math.round((lC / Math.max(1, lA+lB+lC)) * 100)}%)</small></span>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: PIC INTERTEST */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed" }}>🟣 PIC Intertest</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{iA + iB + iC} Laporan</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#d1fae5", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                          <span style={{ fontWeight: 700, color: "#059669" }}>✅ Tier A</span>
                          <span style={{ fontWeight: 900, color: "#059669" }}>{iA} <small style={{ fontWeight: 600 }}>({Math.round((iA / Math.max(1, iA+iB+iC)) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fde68a" }}>
                          <span style={{ fontWeight: 700, color: "#d97706" }}>⚠️ Tier B</span>
                          <span style={{ fontWeight: 900, color: "#d97706" }}>{iB} <small style={{ fontWeight: 600 }}>({Math.round((iB / Math.max(1, iA+iB+iC)) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
                          <span style={{ fontWeight: 700, color: "#dc2626" }}>🔴 Tier C</span>
                          <span style={{ fontWeight: 900, color: "#dc2626" }}>{iC} <small style={{ fontWeight: 600 }}>({Math.round((iC / Math.max(1, iA+iB+iC)) * 100)}%)</small></span>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: GRAND TOTAL ALL LINT */}
                    <div style={{ background: "linear-gradient(135deg, #eff6ff, #e0e7ff)", border: "1px solid #bfdbfe", borderRadius: 20, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#1e3a8a" }}>🌐 Grand Total ALL LINT</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#2563eb" }}>100% Total</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#ffffff", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                          <span style={{ fontWeight: 700, color: "#059669" }}>✅ Total Tier A</span>
                          <span style={{ fontWeight: 900, color: "#059669" }}>{totA} <small style={{ fontWeight: 600 }}>({Math.round((totA / grandTot) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#ffffff", borderRadius: 10, border: "1px solid #fde68a" }}>
                          <span style={{ fontWeight: 700, color: "#d97706" }}>⚠️ Total Tier B</span>
                          <span style={{ fontWeight: 900, color: "#d97706" }}>{totB} <small style={{ fontWeight: 600 }}>({Math.round((totB / grandTot) * 100)}%)</small></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: "#ffffff", borderRadius: 10, border: "1px solid #fca5a5" }}>
                          <span style={{ fontWeight: 700, color: "#dc2626" }}>🔴 Total Tier C</span>
                          <span style={{ fontWeight: 900, color: "#dc2626" }}>{totC} <small style={{ fontWeight: 600 }}>({Math.round((totC / grandTot) * 100)}%)</small></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CHART 1: NPS SCORE BAR CHART */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "26px 32px", marginBottom: 24, boxShadow: "0 10px 30px rgba(37,99,235,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>📊 NPS Score by Week</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }}></div> PIC Lingua</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7c3aed" }}></div> PIC Intertest</div>
                </div>
              </div>
              <div style={{ position: "relative", height: 220, marginLeft: 40, marginTop: 10 }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
                  {[100, 75, 50, 25, 0].map((v, i) => (
                    <div key={v} style={{ position: "absolute", top: `${100 - v}%`, left: 0, right: 0, borderTop: i === 4 ? "1px solid #cbd5e1" : "1px dashed #f1f5f9" }}>
                      <div style={{ position: "absolute", left: -40, top: -7, fontSize: 11, color: "#94a3b8", fontWeight: 500, width: 30, textAlign: "right" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="chart-group" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 20px" }}>
                  {chartBars.map((b, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, width: "100%", justifyContent: "center" }}>
                        {(chartFilterRole === "all" || chartFilterRole === "lingua") && (
                          <div className="chart-bar" style={{ width: 32, height: `${Math.max(0, Math.min(100, b.lingua.nps))}%`, background: "linear-gradient(180deg, #3b82f6, #1d4ed8)", borderRadius: "8px 8px 0 0", position: "relative", minHeight: b.lingua.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                            {b.lingua.hasData && (
                              <div className="chart-tooltip">Lingua — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>NPS: {Math.round(b.lingua.nps)}</span></div>
                            )}
                          </div>
                        )}
                        {(chartFilterRole === "all" || chartFilterRole === "intertest") && (
                          <div className="chart-bar" style={{ width: 32, height: `${Math.max(0, Math.min(100, b.intertest.nps))}%`, background: "linear-gradient(180deg, #8b5cf6, #6d28d9)", borderRadius: "8px 8px 0 0", position: "relative", minHeight: b.intertest.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                            {b.intertest.hasData && (
                              <div className="chart-tooltip">Intertest — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>NPS: {Math.round(b.intertest.nps)}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textAlign: "center", marginTop: 12 }}>{b.period.replace("Week", "W").replace(/Week/g, "W")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CHART 2: TIER BAR CHART */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "26px 32px", marginBottom: 32, boxShadow: "0 10px 30px rgba(37,99,235,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>⭐ Tier by Week</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#059669" }}></div> Tier A</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#d97706" }}></div> Tier B</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626" }}></div> Tier C</div>
                </div>
              </div>
              <div style={{ position: "relative", height: 220, marginLeft: 40, marginTop: 10 }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
                  {[ {lbl:"Tier A", val:100}, {lbl:"Tier B", val:50}, {lbl:"Tier C", val:0} ].map((t, i) => (
                    <div key={t.lbl} style={{ position: "absolute", top: `${100 - t.val}%`, left: 0, right: 0, borderTop: i === 2 ? "1px solid #cbd5e1" : "1px dashed #f1f5f9" }}>
                      <div style={{ position: "absolute", left: -46, top: -7, fontSize: 11, color: "#94a3b8", fontWeight: 500, width: 36, textAlign: "right" }}>{t.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="chart-group" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 20px" }}>
                  {chartBars.map((b, i) => {
                    const getTierColor = (t) => t === 2 ? "linear-gradient(180deg, #10b981, #059669)" : t === 1 ? "linear-gradient(180deg, #f59e0b, #d97706)" : "linear-gradient(180deg, #ef4444, #dc2626)";
                    const getTierLabel = (t) => t === 2 ? "Tier A" : t === 1 ? "Tier B" : "Tier C";
                    const getTierHeight = (t) => t === 2 ? 100 : t === 1 ? 50 : 20;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, width: "100%", justifyContent: "center" }}>
                          {(chartFilterRole === "all" || chartFilterRole === "lingua") && (
                            <div className="chart-bar" style={{ width: 32, height: `${b.lingua.hasData ? getTierHeight(b.lingua.tier) : 0}%`, background: getTierColor(b.lingua.tier), borderRadius: "8px 8px 0 0", position: "relative", minHeight: b.lingua.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                              {b.lingua.hasData && (
                                <div className="chart-tooltip">Lingua — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>{getTierLabel(b.lingua.tier)}</span></div>
                              )}
                            </div>
                          )}
                          {(chartFilterRole === "all" || chartFilterRole === "intertest") && (
                            <div className="chart-bar" style={{ width: 32, height: `${b.intertest.hasData ? getTierHeight(b.intertest.tier) : 0}%`, background: getTierColor(b.intertest.tier), borderRadius: "8px 8px 0 0", position: "relative", minHeight: b.intertest.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                              {b.intertest.hasData && (
                                <div className="chart-tooltip">Intertest — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>{getTierLabel(b.intertest.tier)}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textAlign: "center", marginTop: 12 }}>{b.period.replace("Week", "W").replace(/Week/g, "W")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Report Terbaru</div>
            {reports.length === 0
              ? <div style={{...S.card,textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:40,marginBottom:10}}>📭</div><div style={{color:"#64748b",marginBottom:14}}>Belum ada data.</div><button onClick={()=>setView("form")} style={{padding:"10px 28px",background:"linear-gradient(135deg, #2563eb, #3b82f6)",color:"#fff",border:"none",borderRadius:30,cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:"inherit"}}>+ Input Sekarang</button></div>
              : reports.slice(0,6).map((r,i)=><ReportCard key={r.id || r.createdAt || i} r={r} onDelete={handleDeleteReport}/>)}
          </div>
        )}

        {/* TAB 2: ORIGINAL FORM INPUT */}
        {view === "form" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 20, color: "#2563eb" }}>✏️ Input Report NPS</div>
            {!selectedRole ? (
              <div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Pilih role kamu:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {ROLES.map(role => (
                    <button key={role.key} onClick={() => setSelectedRole(role.key)}
                      style={{ padding: "28px 20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, cursor: "pointer", color: "#0f172a", fontFamily: "inherit", textAlign: "left", boxShadow: "0 10px 30px rgba(37,99,235,0.04)" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{role.emoji}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: role.color }}>{role.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{role.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "14px 18px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 24 }}>{ROLES.find(r=>r.key===selectedRole)?.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: ROLES.find(r=>r.key===selectedRole)?.color }}>{ROLES.find(r=>r.key===selectedRole)?.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
                  </div>
                  <button onClick={() => setSelectedRole(null)} style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>← Ganti</button>
                </div>
                <div style={S.card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Info Laporan</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><label style={S.lbl}>Hari</label><select value={form.reportDay} onChange={e=>setForm(p=>({...p,reportDay:e.target.value}))} style={S.inp}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
                    <div><label style={S.lbl}>Periode</label><select value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} style={S.inp}>{PERIODS.map(p=><option key={p}>{p}</option>)}</select></div>
                    <div><label style={S.lbl}>Tanggal</label><input type="date" value={form.tanggal} onChange={e=>setForm(p=>({...p,tanggal:e.target.value}))} style={S.inp}/></div>
                  </div>
                </div>
                <div style={{...S.card, border: t?`1px solid ${t.border}`:"1px solid #e2e8f0"}}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
                    {t && <TierBadge tier={tier}/>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={S.lbl}>Promoter *</label><input type="number" min="0" value={form.promoter} onChange={e=>setForm(p=>({...p,promoter:e.target.value}))} placeholder="0" style={S.inp}/></div>
                    <div><label style={S.lbl}>Passive *</label><input type="number" min="0" value={form.passive} onChange={e=>setForm(p=>({...p,passive:e.target.value}))} placeholder="0" style={S.inp}/></div>
                    <div><label style={S.lbl}>Detractor *</label><input type="number" min="0" value={form.detractor} onChange={e=>setForm(p=>({...p,detractor:e.target.value}))} placeholder="0" style={S.inp}/></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.lbl}>Jml Responden</label>
                      <input type="text" value={responden} disabled style={{...S.inp, background: "#f8fafc", color: "#64748b", cursor: "not-allowed"}}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Skor NPS</label>
                      <input type="text" value={nps} disabled style={{...S.inp, background: "#f8fafc", color: "#64748b", cursor: "not-allowed"}}/>
                      {nps!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(nps)>=78?"#059669":"#dc2626"}}>{parseFloat(nps)>=78?"✅ NPS hijau":"⚠️ NPS merah"}</div>}
                    </div>
                    <div>
                      <label style={S.lbl}>Rate Responden (%) *</label>
                      <input type="number" min="0" max="100" step="0.1" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))} placeholder="0" style={S.inp}/>
                      {form.rate!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(form.rate)>=50?"#059669":"#dc2626"}}>{parseFloat(form.rate)>=50?"✅ Rate aman":"⚠️ Rate rendah"}</div>}
                    </div>
                  </div>
                  <div><label style={S.lbl}>Action Plan</label><textarea value={form.actionPlan} onChange={e=>setForm(p=>({...p,actionPlan:e.target.value}))} placeholder="Tulis action plan..." rows={3} style={{...S.inp,resize:"vertical"}}/></div>
                  {t&&<div style={{marginTop:12,padding:"9px 14px",borderRadius:10,background:t.bg,color:t.color,fontSize:12,border:`1px solid ${t.border}`}}>{t.emoji} <strong>{t.label}:</strong> {t.action}</div>}
                </div>
                <button onClick={handleSubmit} disabled={!!status} style={{width:"100%",padding:14,background:status==="success"?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:30,fontSize:15,fontWeight:800,cursor:status?"not-allowed":"pointer",fontFamily:"inherit",opacity:status==="saving"?0.75:1,boxShadow:"0 8px 24px rgba(37,99,235,0.3)"}}>
                  {status==="saving"?"⏳ Menyimpan...":status==="success"?"✅ Berhasil!":"Simpan Report"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORIGINAL REPORT HISTORY */}
        {view === "history" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 18, color: "#2563eb" }}>📋 Riwayat Report</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
              {[["all","Semua"],["lingua","🔵 Lingua"],["intertest","🟣 Intertest"]].map(([k,l])=>(
                <button key={k} onClick={()=>setHistFilter(k)} style={{padding:"8px 18px",borderRadius:24,border:histFilter===k?"1px solid transparent":"1px solid #cbd5e1",cursor:"pointer",fontSize:12,fontWeight:700,background:histFilter===k?"#0f172a":"#ffffff",color:histFilter===k?"#fff":"#475569",fontFamily:"inherit"}}>{l}</button>
              ))}
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
                {filtered.length > 0 && (
                  <button onClick={() => exportHistoryToExcel(filtered)} style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid #059669", background: "linear-gradient(135deg, #059669, #10b981)", color: "#ffffff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(16,185,129,0.2)" }}>
                    <span>📊</span> Export Riwayat (.xlsx)
                  </button>
                )}
                <div style={{fontSize:12,color:"#64748b"}}>{filtered.length} laporan</div>
              </div>
            </div>
            {filtered.length===0
              ?<div style={{...S.card,textAlign:"center",padding:48,color:"#64748b"}}>Tidak ada data</div>
              :filtered.map((r,i)=><ReportCard key={r.id || r.createdAt || i} r={r} onDelete={handleDeleteReport}/>)}
          </div>
        )}

        {/* TAB 4: NEW TAB - LIVE AIRTABLE SYNC & INTELLIGENCE */}
        {view === "airtable" && <AirtableSyncTab onDirectSaveToSheets={handleDirectSaveToSheets} onPrefillForm={handlePrefillFormFromAirtable} />}

      </div>
    </div>
  );
}
