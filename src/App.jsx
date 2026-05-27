import { useState, useEffect } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydxuGZMfnLwMA4aq5wqokyPiZDLxwoCHOMg8LoB38spHGf642c_0Z-i8E7BS5WJ6g/exec";
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
const PERIODS = ["Week 1", "Week 1 & Week 2", "Week 1, Week 2 & Week 3"];
const DAYS = ["Senin", "Kamis"];
const EMPTY = { reportDay: "Senin", period: "Week 1", tanggal: "", responden: "", rate: "", nps: "", actionPlan: "" };

const S = {
  lbl: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 },
  inp: { width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 },
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
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["Responden", r.responden], ["Rate", r.rate ? `${r.rate}%` : "—"], ["NPS", r.nps || "—"]].map(([k, v]) => (
              <div key={k} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0" }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {r.actionplan && <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#94a3b8", marginBottom: 10 }}><strong style={{ color: "#64748b" }}>Action Plan: </strong>{r.actionplan}</div>}
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
    if (!form.responden || !form.rate || !form.nps) { alert("⚠️ Harap isi Responden, Rate, dan NPS."); return; }
    setStatus("saving");
    const now = new Date().toISOString();
    const payload = {
      id: Date.now(), role: selectedRole, hari: form.reportDay,
      periode: form.period, tanggal: form.tanggal,
      responden: form.responden, rate: form.rate, nps: form.nps,
      actionPlan: form.actionPlan, tier: calcTier(form.rate, form.nps),
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
  const tier = calcTier(form.rate, form.nps);
  const t = tier ? TIER[tier] : null;
  const filtered = histFilter === "all" ? reports : reports.filter(r => r.role === histFilter);
  const monthKey = new Date().toISOString().slice(0, 7);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "system-ui", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 36 }}>📊</div><div>Memuat data...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');* { box-sizing: border-box; margin: 0; } input:focus,select:focus,textarea:focus { border-color: rgba(99,102,241,0.6)!important; }`}</style>

      <div style={{ background: "#0a1221", borderBottom: "1px solid rgba(99,102,241,0.18)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, background: "linear-gradient(90deg,#a5b4fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NPS Weekly Report</div>
            <div style={{ fontSize: 10, color: "#1e3a5f", fontWeight: 600 }}>LINGUA & INTERTEST · COMPOUNDING</div>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Report Terbaru</div>
            {reports.length === 0
              ? <div style={{...S.card,textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:40,marginBottom:10}}>📭</div><div style={{color:"#475569",marginBottom:14}}>Belum ada data.</div><button onClick={()=>setView("form")} style={{padding:"10px 28px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>+ Input Sekarang</button></div>
              : reports.slice(0,6).map((r,i)=><ReportCard key={i} r={r}/>)}
          </div>
        )}

        {view === "form" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: "#c7d2fe" }}>✏️ Input Report NPS</div>
            {!selectedRole ? (
              <div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Pilih role kamu:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {ROLES.map(role => (
                    <button key={role.key} onClick={() => setSelectedRole(role.key)}
                      style={{ padding: "28px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, cursor: "pointer", color: "#e2e8f0", fontFamily: "inherit", textAlign: "left" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{role.emoji}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: role.color }}>{role.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{role.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                  <div style={{ fontSize: 22 }}>{ROLES.find(r=>r.key===selectedRole)?.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: ROLES.find(r=>r.key===selectedRole)?.color }}>{ROLES.find(r=>r.key===selectedRole)?.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
                  </div>
                  <button onClick={() => setSelectedRole(null)} style={{ fontSize: 12, color: "#64748b", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>← Ganti</button>
                </div>
                <div style={S.card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Info Laporan</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><label style={S.lbl}>Hari</label><select value={form.reportDay} onChange={e=>setForm(p=>({...p,reportDay:e.target.value}))} style={S.inp}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
                    <div><label style={S.lbl}>Periode</label><select value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} style={S.inp}>{PERIODS.map(p=><option key={p}>{p}</option>)}</select></div>
                    <div><label style={S.lbl}>Tanggal</label><input type="date" value={form.tanggal} onChange={e=>setForm(p=>({...p,tanggal:e.target.value}))} style={S.inp}/></div>
                  </div>
                </div>
                <div style={{...S.card, border: t?`1px solid ${t.border}`:"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{ROLES.find(r=>r.key===selectedRole)?.subtitle}</div>
                    {t && <TierBadge tier={tier}/>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={S.lbl}>Jumlah Responden *</label><input type="number" min="0" value={form.responden} onChange={e=>setForm(p=>({...p,responden:e.target.value}))} placeholder="0" style={S.inp}/></div>
                    <div>
                      <label style={S.lbl}>Rate Responden (%) *</label>
                      <input type="number" min="0" max="100" step="0.1" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))} placeholder="0" style={S.inp}/>
                      {form.rate!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(form.rate)>=50?"#10b981":"#f87171"}}>{parseFloat(form.rate)>=50?"✅ Rate aman":"⚠️ Rate rendah"}</div>}
                    </div>
                    <div>
                      <label style={S.lbl}>Skor NPS *</label>
                      <input type="number" min="-100" max="100" value={form.nps} onChange={e=>setForm(p=>({...p,nps:e.target.value}))} placeholder="0" style={S.inp}/>
                      {form.nps!==""&&<div style={{fontSize:11,marginTop:4,color:parseFloat(form.nps)>=78?"#10b981":"#f87171"}}>{parseFloat(form.nps)>=78?"✅ NPS hijau":"⚠️ NPS merah"}</div>}
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
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "#c7d2fe" }}>📋 Riwayat Report</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["all","Semua"],["lingua","🔵 Lingua"],["intertest","🟣 Intertest"]].map(([k,l])=>(
                <button key={k} onClick={()=>setHistFilter(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:histFilter===k?"#6366f1":"rgba(255,255,255,0.05)",color:histFilter===k?"#fff":"#64748b",fontFamily:"inherit"}}>{l}</button>
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
