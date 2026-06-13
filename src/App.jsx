import { useState, useEffect } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwKNMqjsb1H6ZyGMKwx2IrLbbFzkpkx4DqAFMyAXucjXVLXQcCRWkTxzgci4SuhSgI/exec";
const DEADLINE_HOUR = 11;

const ROLES = [
  { key: "lingua", label: "PIC Lingua", emoji: "🔵", color: "#6366f1", subtitle: "NPS Lingua (New IELTS Only)" },
  { key: "intertest", label: "PIC Intertest", emoji: "🟣", color: "#a855f7", subtitle: "NPS Intertest" },
];
const TIER = {
  A: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", label: "Tier A", emoji: "✅", action: "Blasting ke teacher 3x/minggu (Senin, Rabu, Jumat)" },
  B: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", label: "Tier B", emoji: "⚠️", action: "Blasting ke teacher 4x/minggu (Senin, Rabu, Kamis, Jumat)" },
  C: { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", label: "Tier C", emoji: "🔴", action: "Blasting tiap hari sampai masuk Tier A" },
};
const PERIODS = ["Week 1", "Week 1 & Week 2", "Week 1, Week 2 & Week 3", "Week 1, Week 2, Week 3 & Week 4"];
const DAYS = ["Senin", "Kamis"];
const EMPTY = { reportDay: "Senin", period: "Week 1", tanggal: "", promoter: "", passive: "", detractor: "", rate: "", actionPlan: "" };

const S = {
  lbl: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 },
  inp: { width: "100%", padding: "9px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  card: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  nav: (a) => ({ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: a ? "#6366f1" : "transparent", color: a ? "#fff" : "#64748b", fontFamily: "inherit" }),
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
  return d === 1 ? "Senin" : d === 4 ? "Kamis" : null;
}

function TierBadge({ tier, small }) {
  const t = TIER[tier]; if (!t) return null;
  return <span style={{ padding: small ? "2px 8px" : "3px 10px", borderRadius: 20, background: t.bg, color: t.color, fontSize: small ? 10 : 11, fontWeight: 700, border: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{t.emoji} {t.label}</span>;
}

function ReportCard({ r }) {
  const [open, setOpen] = useState(false);
  const role = ROLES.find(x => x.key === r.role);
  const t = r.tier ? TIER[r.tier] : null;
  const d = new Date(r.createdat || r.createdAt);
  return (
    <div style={S.card}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span>{role?.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: role?.color }}>{role?.label}</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>— {r.hari} · {r.periode}</span>
          </div>
          <div style={{ fontSize: 11, color: "#475569", display: "flex", gap: 8, alignItems: "center" }}>
            <span>📅 {d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · 🕐 {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
            {(r.late === true || r.late === "TRUE") && <span style={{ color: "#f87171", fontWeight: 700, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", padding: "1px 7px", borderRadius: 10, fontSize: 10 }}>TERLAMBAT</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {t && <TierBadge tier={r.tier} />}
          <span style={{ color: "#475569", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["Responden", r.responden], ["Rate", r.rate ? `${r.rate}%` : "—"], ["NPS", r.nps || "—"]].map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {r.actionplan && <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#475569", marginBottom: 10 }}><strong style={{ color: "#64748b" }}>Action Plan: </strong>{r.actionplan}</div>}
          {t && <div style={{ padding: "8px 12px", borderRadius: 8, background: t.bg, color: t.color, fontSize: 12, border: `1px solid ${t.border}` }}>{t.emoji} <strong>{t.label}:</strong> {t.action}</div>}
        </div>
      )}
    </div>
  );
}

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

  const todayDay = getTodayDay();
  const today = todayStr();
  const todayByRole = {};
  ROLES.forEach(r => { todayByRole[r.key] = reports.find(x => x.tanggal === today && x.role === r.key && x.hari === todayDay); });
  const tier = calcTier(form.rate, nps);
  const t = tier ? TIER[tier] : null;
  const filtered = histFilter === "all" ? reports : reports.filter(r => r.role === histFilter);
  const monthKey = new Date().toISOString().slice(0, 7);

  const availableMonths = [...new Set(reports.map(r => (r.tanggal || r.createdat || r.createdAt || "").substring(0, 7)))].filter(Boolean).sort().reverse();
  const chartData = reports.filter(r => {
    const m = (r.tanggal || r.createdat || r.createdAt || "").substring(0, 7);
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
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "system-ui", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 36 }}>📊</div><div>Memuat data...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');* { box-sizing: border-box; margin: 0; } input:focus,select:focus,textarea:focus { border-color: rgba(99,102,241,0.6)!important; }
      .chart-group:hover .chart-bar { opacity: 0.4; }
      .chart-group .chart-bar:hover { opacity: 1; }
      .chart-tooltip { visibility: hidden; opacity: 0; transition: all 0.2s; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); background: #1e293b; color: #f8fafc; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 500; white-space: nowrap; pointer-events: none; z-index: 10; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); text-align: center; line-height: 1.4; }
      .chart-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: #1e293b transparent transparent transparent; }
      .chart-bar:hover .chart-tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>

      <div style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, background: "linear-gradient(90deg,#4f46e5,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NPS Weekly Report</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>LINGUA & INTERTEST · COMPOUNDING</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["dashboard","📊 Dashboard"],["form","✏️ Input"],["history","📋 Riwayat"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={S.nav(view===v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 20px" }}>

        {view === "dashboard" && (
          <div>
            {todayDay && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Status Hari Ini — {todayDay}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {ROLES.map(role => {
                    const rep = todayByRole[role.key];
                    const done = !!rep, late = rep?.late === true || rep?.late === "TRUE";
                    const time = rep ? new Date(rep.createdat || rep.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;
                    return (
                      <div key={role.key} style={{ borderRadius: 12, padding: "16px 18px", background: done?(late?"rgba(248,113,113,0.07)":"rgba(16,185,129,0.07)"):"rgba(245,158,11,0.07)", border:`1px solid ${done?(late?"rgba(248,113,113,0.28)":"rgba(16,185,129,0.28)"):"rgba(245,158,11,0.28)"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: role.color }}>{role.emoji} {role.label}</div>
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{role.subtitle}</div>
                          </div>
                          <div style={{ fontSize: 20 }}>{done?(late?"🔴":"✅"):"⏳"}</div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 13 }}>
                          {done ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ color: late?"#fca5a5":"#6ee7b7", fontWeight: 700 }}>{late?"TERLAMBAT":"Sudah diisi"}</span>
                              <span style={{ color: "#475569" }}>· {time}</span>
                              {rep.tier && <TierBadge tier={rep.tier} small />}
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: "#fcd34d", fontWeight: 600 }}>Belum diisi</span>
                              <button onClick={() => { setSelectedRole(role.key); setView("form"); }} style={{ fontSize: 11, padding: "3px 10px", background: role.color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Isi →</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {[{val:reports.length,label:"Total Report",col:"#818cf8"},{val:reports.filter(r=>r.createdat?.startsWith(monthKey)||r.createdAt?.startsWith(monthKey)).length,label:"Bulan Ini",col:"#38bdf8"},{val:reports.filter(r=>r.late===true||r.late==="TRUE").length,label:"Terlambat",col:"#f87171"}].map(s=>(
                <div key={s.label} style={{...S.card,margin:0,textAlign:"center",padding:"16px 12px"}}>
                  <div style={{fontSize:28,fontWeight:800,color:s.col}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:5,fontWeight:600}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* FILTER SECTION */}
            <div style={{ marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginRight: 8 }}>Filter</div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterMonth} onChange={e=>setChartFilterMonth(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#334155", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <option value="all">Bulan: Semua</option>
                  {availableMonths.map(m => <option key={m} value={m}>Bulan: {m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterRole} onChange={e=>setChartFilterRole(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#334155", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <option value="all">PIC: Semua</option>
                  {ROLES.map(r => <option key={r.key} value={r.key}>PIC: {r.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140, maxWidth: 200 }}>
                <select value={chartFilterPeriod} onChange={e=>setChartFilterPeriod(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#334155", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <option value="all">Periode: Semua</option>
                  {PERIODS.map(p => <option key={p} value={p}>Periode: {p}</option>)}
                </select>
              </div>
            </div>

            {/* CHART 1: NPS SCORE */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 32px", marginBottom: 24, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>📊 NPS Score by Week</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5" }}></div> PIC Lingua</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }}></div> PIC Intertest</div>
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
                          <div className="chart-bar" style={{ width: 32, height: `${Math.max(0, Math.min(100, b.lingua.nps))}%`, background: "#4f46e5", borderRadius: "6px 6px 0 0", position: "relative", minHeight: b.lingua.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                            {b.lingua.hasData && (
                              <div className="chart-tooltip">Lingua — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>NPS: {Math.round(b.lingua.nps)}</span></div>
                            )}
                          </div>
                        )}
                        {(chartFilterRole === "all" || chartFilterRole === "intertest") && (
                          <div className="chart-bar" style={{ width: 32, height: `${Math.max(0, Math.min(100, b.intertest.nps))}%`, background: "#8b5cf6", borderRadius: "6px 6px 0 0", position: "relative", minHeight: b.intertest.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                            {b.intertest.hasData && (
                              <div className="chart-tooltip">Intertest — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>NPS: {Math.round(b.intertest.nps)}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textAlign: "center", marginTop: 12 }}>{b.period.replace("Week", "W").replace(/Week/g, "W")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CHART 2: TIER */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 32px", marginBottom: 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>⭐ Tier by Week</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }}></div> Tier A</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></div> Tier B</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}></div> Tier C</div>
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
                    const getTierColor = (t) => t === 2 ? "#22c55e" : t === 1 ? "#f59e0b" : "#ef4444";
                    const getTierLabel = (t) => t === 2 ? "Tier A" : t === 1 ? "Tier B" : "Tier C";
                    const getTierHeight = (t) => t === 2 ? 100 : t === 1 ? 50 : 20;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, width: "100%", justifyContent: "center" }}>
                          {(chartFilterRole === "all" || chartFilterRole === "lingua") && (
                            <div className="chart-bar" style={{ width: 32, height: `${b.lingua.hasData ? getTierHeight(b.lingua.tier) : 0}%`, background: getTierColor(b.lingua.tier), borderRadius: "6px 6px 0 0", position: "relative", minHeight: b.lingua.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                              {b.lingua.hasData && (
                                <div className="chart-tooltip">Lingua — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>{getTierLabel(b.lingua.tier)}</span></div>
                              )}
                            </div>
                          )}
                          {(chartFilterRole === "all" || chartFilterRole === "intertest") && (
                            <div className="chart-bar" style={{ width: 32, height: `${b.intertest.hasData ? getTierHeight(b.intertest.tier) : 0}%`, background: getTierColor(b.intertest.tier), borderRadius: "6px 6px 0 0", position: "relative", minHeight: b.intertest.hasData ? 4 : 0, transition: "all 0.3s ease" }}>
                              {b.intertest.hasData && (
                                <div className="chart-tooltip">Intertest — {b.period}<br/><span style={{fontSize:14, fontWeight:700, color:"#fff"}}>{getTierLabel(b.intertest.tier)}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textAlign: "center", marginTop: 12 }}>{b.period.replace("Week", "W").replace(/Week/g, "W")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Report Terbaru</div>
            {reports.length === 0
              ? <div style={{...S.card,textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:40,marginBottom:10}}>📭</div><div style={{color:"#475569",marginBottom:14}}>Belum ada data.</div><button onClick={()=>setView("form")} style={{padding:"10px 28px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>+ Input Sekarang</button></div>
              : reports.slice(0,6).map((r,i)=><ReportCard key={i} r={r}/>)}
          </div>
        )}

        {view === "form" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: "#4f46e5" }}>✏️ Input Report NPS</div>
            {!selectedRole ? (
              <div>
                <div style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>Pilih role kamu:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {ROLES.map(role => (
                    <button key={role.key} onClick={() => setSelectedRole(role.key)}
                      style={{ padding: "28px 20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, cursor: "pointer", color: "#0f172a", fontFamily: "inherit", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{role.emoji}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: role.color }}>{role.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{role.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "12px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 22 }}>{ROLES.find(r=>r.key===selectedRole)?.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: ROLES.find(r=>r.key===selectedRole)?.color }}>{ROLES.find(r=>r.key===selectedRole)?.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
                  </div>
                  <button onClick={() => setSelectedRole(null)} style={{ fontSize: 12, color: "#64748b", background: "none", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>← Ganti</button>
                </div>
                <div style={S.card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Info Laporan</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><label style={S.lbl}>Hari</label><select value={form.reportDay} onChange={e=>setForm(p=>({...p,reportDay:e.target.value}))} style={S.inp}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
                    <div><label style={S.lbl}>Periode</label><select value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} style={S.inp}>{PERIODS.map(p=><option key={p}>{p}</option>)}</select></div>
                    <div><label style={S.lbl}>Tanggal</label><input type="date" value={form.tanggal} onChange={e=>setForm(p=>({...p,tanggal:e.target.value}))} style={S.inp}/></div>
                  </div>
                </div>
                <div style={{...S.card, border: t?`1px solid ${t.border}`:"1px solid #e2e8f0"}}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
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
                      {nps!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(nps)>=78?"#10b981":"#f87171"}}>{parseFloat(nps)>=78?"✅ NPS hijau":"⚠️ NPS merah"}</div>}
                    </div>
                    <div>
                      <label style={S.lbl}>Rate Responden (%) *</label>
                      <input type="number" min="0" max="100" step="0.1" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))} placeholder="0" style={S.inp}/>
                      {form.rate!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(form.rate)>=50?"#10b981":"#f87171"}}>{parseFloat(form.rate)>=50?"✅ Rate aman":"⚠️ Rate rendah"}</div>}
                    </div>
                  </div>
                  <div><label style={S.lbl}>Action Plan</label><textarea value={form.actionPlan} onChange={e=>setForm(p=>({...p,actionPlan:e.target.value}))} placeholder="Tulis action plan..." rows={3} style={{...S.inp,resize:"vertical"}}/></div>
                  {t&&<div style={{marginTop:12,padding:"9px 12px",borderRadius:8,background:t.bg,color:t.color,fontSize:12,border:`1px solid ${t.border}`}}>{t.emoji} <strong>{t.label}:</strong> {t.action}</div>}
                </div>
                <button onClick={handleSubmit} disabled={!!status} style={{width:"100%",padding:13,background:status==="success"?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:status?"not-allowed":"pointer",fontFamily:"inherit",opacity:status==="saving"?0.75:1}}>
                  {status==="saving"?"⏳ Menyimpan...":status==="success"?"✅ Berhasil!":"Simpan Report"}
                </button>
              </div>
            )}
          </div>
        )}

        {view === "history" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "#4f46e5" }}>📋 Riwayat Report</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["all","Semua"],["lingua","🔵 Lingua"],["intertest","🟣 Intertest"]].map(([k,l])=>(
                <button key={k} onClick={()=>setHistFilter(k)} style={{padding:"6px 14px",borderRadius:8,border:histFilter===k?"1px solid transparent":"1px solid #e2e8f0",cursor:"pointer",fontSize:12,fontWeight:600,background:histFilter===k?"#6366f1":"#ffffff",color:histFilter===k?"#fff":"#475569",fontFamily:"inherit"}}>{l}</button>
              ))}
              <div style={{marginLeft:"auto",fontSize:12,color:"#475569",alignSelf:"center"}}>{filtered.length} laporan</div>
            </div>
            {filtered.length===0
              ?<div style={{...S.card,textAlign:"center",padding:48,color:"#475569"}}>Tidak ada data</div>
              :filtered.map((r,i)=><ReportCard key={i} r={r}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
