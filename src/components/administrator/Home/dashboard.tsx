import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../dashboard/sidebar";
import Header from "../dashboard/header";
import Departments from "../Management/department";
import FileReports from "../Ticket & Repairs/submitTicket";
import ReportAnalytics from "../Reports/report-analytics";
import UserAccounts from "../Management/user-accounts";
import IncomingUnits from "../Units/incomingUnits";
import OutgoingUnits from "../Units/outgoingUnits";
import Repairs from "../repairs/repairs";
import TechnicianDashboardHome from "../../technician/technician-dashboard-home";
import MyTickets from "../../technician/my-tickets";
import ActivityLogPanel from "../../technician/activity-log-panel";
import {
  Ticket, Clock, CheckCircle, CircleArrowDown,
  CircleArrowUp, TrendingUp, Activity,
  BarChart3, AlertTriangle, RefreshCw, ArrowUpRight,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(lerp(0, target, ease)));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

type IssueCount = { type: string; count: number };
type DeptRow    = { name: string; tickets: number; repairs: number };
type DashData = {
  totalTickets:      number;
  pendingTickets:    number;
  resolvedTickets:   number;
  inProgressTickets: number;
  incomingUnits:     number;
  outgoingUnits:     number;
  issueBreakdown:    IssueCount[];
  deptRows:          DeptRow[];
  weeklyTickets:     number[];
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  label: string; value: number; sub?: string;
  icon: React.ReactNode; accent: string; delay?: number;
  onClick?: () => void;
}> = ({ label, value, sub, icon, accent, delay = 0, onClick }) => {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  const displayed = useCountUp(visible ? value : 0);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fafbff" : "#fff",
        borderRadius: 20,
        padding: "1.3rem 1.4rem",
        border: `1px solid ${hovered ? accent + "40" : "#e8edf5"}`,
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        position: "relative",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms, border-color 0.2s, background 0.2s, box-shadow 0.2s`,
        boxShadow: hovered ? `0 4px 20px ${accent}18` : "0 2px 12px rgba(10,76,134,0.05)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "20px 20px 0 0" }} />
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: accent, opacity: hovered ? 0.1 : 0.06, transition: "opacity 0.2s" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>
          {icon}
        </div>
        {onClick && (
          <ArrowUpRight size={14} color={hovered ? accent : "#cbd5e1"} style={{ transition: "color 0.2s", transform: hovered ? "translate(2px, -2px)" : "none", transitionProperty: "color, transform" }} />
        )}
      </div>

      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-1px", fontFamily: "'DM Sans', sans-serif" }}>
          {displayed}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%",
            height: `${Math.max((v / max) * 44, 4)}px`,
            background: i === data.length - 1 ? color : `${color}50`,
            borderRadius: 4,
            transition: "height 0.6s ease",
          }} />
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
};

// ── Donut Chart ───────────────────────────────────────────────────────────────
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52, cx = 64, cy = 64, stroke = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.4rem" }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const gap  = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ + circ / 4}
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0f172a" fontFamily="'DM Sans', sans-serif">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600} letterSpacing="1">TOTAL</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map(d => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginLeft: "auto" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Horizontal Bar ────────────────────────────────────────────────────────────
const HorizBar: React.FC<{ label: string; value: number; max: number; color: string; rank: number }> = ({ label, value, max, color, rank }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / Math.max(max, 1)) * 100), rank * 120 + 200);
    return () => clearTimeout(t);
  }, [value, max, rank]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{value}</span>
      </div>
      <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 4, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
};

// ── Dashboard Home ────────────────────────────────────────────────────────────
const DashboardHome: React.FC<{ onNavigate: (label: string) => void }> = ({ onNavigate }) => {
  const [data, setData]           = useState<DashData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshed, setRefreshed] = useState(false);

  const load = async () => {
    setLoading(true);
    const today = new Date();
    const [
      { data: tickets },
      { data: incoming },
      { data: outgoing },
      { data: depts },
    ] = await Promise.all([
      supabase.from("file_reports").select("status, issue_type, date_submitted, department_id"),
      supabase.from("incoming_units").select("id"),
      supabase.from("outgoing_units").select("id"),
      supabase.from("departments").select("id, name").order("name"),
    ]);

    const weeklyTickets = Array(7).fill(0);
    (tickets ?? []).forEach(t => {
      const diff = Math.floor((today.getTime() - new Date(t.date_submitted).getTime()) / 86400000);
      if (diff >= 0 && diff < 7) weeklyTickets[6 - diff]++;
    });

    const typeCounts: Record<string, number> = {};
    (tickets ?? []).forEach(t => {
      const k = t.issue_type === "Network / Internet" ? "Internet" : (t.issue_type ?? "Other");
      typeCounts[k] = (typeCounts[k] ?? 0) + 1;
    });
    const issueBreakdown: IssueCount[] = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const deptRows: DeptRow[] = (depts ?? []).map(dept => ({
      name: dept.name,
      tickets: (tickets ?? []).filter(t => t.department_id === dept.id).length,
      repairs: 0,
    })).filter(d => d.tickets > 0).sort((a, b) => b.tickets - a.tickets).slice(0, 5);

    setData({
      totalTickets:      (tickets ?? []).length,
      pendingTickets:    (tickets ?? []).filter(t => t.status === "Pending").length,
      resolvedTickets:   (tickets ?? []).filter(t => t.status === "Resolved").length,
      inProgressTickets: (tickets ?? []).filter(t => t.status === "In Progress").length,
      incomingUnits:     (incoming ?? []).length,
      outgoingUnits:     (outgoing ?? []).length,
      issueBreakdown,
      deptRows,
      weeklyTickets,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshed(true);
    await load();
    setTimeout(() => setRefreshed(false), 600);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0a4c86", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Loading dashboard…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!data) return null;

  const donutData = [
    { label: "Pending",     value: data.pendingTickets,    color: "#f59e0b" },
    { label: "In Progress", value: data.inProgressTickets, color: "#3b82f6" },
    { label: "Resolved",    value: data.resolvedTickets,   color: "#10b981" },
  ];
  const issueColors = ["#0a4c86", "#7c3aed", "#0891b2", "#f59e0b", "#ef4444"];
  const maxIssue = Math.max(...data.issueBreakdown.map(i => i.count), 1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .dash-new *, .dash-new { box-sizing: border-box; }
        .dash-new { font-family: 'DM Sans', sans-serif; }
        .refresh-btn:hover { background: #f1f5f9 !important; }
        .dept-row-h:hover { background: #f8fafc !important; }
        @media (max-width: 1100px) {
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-mid-grid { grid-template-columns: 1fr !important; }
          .dash-bot-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 580px) {
          .dash-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="dash-new" style={{ color: "#0f172a", paddingRight: 8 }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button className="refresh-btn" onClick={handleRefresh} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0.45rem 0.9rem", borderRadius: 10,
            border: "1px solid #e2e8f0", background: "#fff",
            fontSize: 12, fontWeight: 600, color: "#475569",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            transition: "background 0.15s",
          }}>
            <RefreshCw size={13} style={{ transform: refreshed ? "rotate(360deg)" : "rotate(0deg)", transition: "transform 0.5s ease" }} />
            Refresh
          </button>
        </div>

        {/* KPI Grid — 6 cards, 3 columns, all clickable */}
        <div className="dash-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem", marginBottom: "1.2rem" }}>
          <KPI label="Total Tickets"   value={data.totalTickets}      icon={<Ticket size={17} />}          accent="#0a4c86" delay={0}   sub="All time submissions" onClick={() => onNavigate("Submit Ticket")} />
          <KPI label="Pending"         value={data.pendingTickets}    icon={<Clock size={17} />}           accent="#f59e0b" delay={60}  sub="Awaiting action"      onClick={() => onNavigate("Submit Ticket")} />
          <KPI label="In Progress"     value={data.inProgressTickets} icon={<Activity size={17} />}        accent="#3b82f6" delay={120} sub="Being handled"        onClick={() => onNavigate("Submit Ticket")} />
          <KPI label="Resolved"        value={data.resolvedTickets}   icon={<CheckCircle size={17} />}     accent="#10b981" delay={180} sub="Issues closed"        onClick={() => onNavigate("Submit Ticket")} />
          <KPI label="Incoming Units"  value={data.incomingUnits}     icon={<CircleArrowDown size={17} />} accent="#8b5cf6" delay={240} sub="Logged for repair"    onClick={() => onNavigate("Incoming Units")} />
          <KPI label="Outgoing Units"  value={data.outgoingUnits}     icon={<CircleArrowUp size={17} />}   accent="#10b981" delay={300} sub="Returned to users"    onClick={() => onNavigate("Outgoing Units")} />
        </div>

        {/* Mid row */}
        <div className="dash-mid-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "1.3rem", border: "1px solid #e8edf5", boxShadow: "0 2px 12px rgba(10,76,134,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.1rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0a4c8615", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={14} color="#0a4c86" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Ticket Status</span>
            </div>
            <DonutChart data={donutData} />
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "1.3rem", border: "1px solid #e8edf5", boxShadow: "0 2px 12px rgba(10,76,134,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0a4c8615", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity size={14} color="#0a4c86" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Tickets This Week</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Last 7 days</span>
            </div>
            <Sparkline data={data.weeklyTickets} color="#0a4c86" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid #f1f5f9" }}>
              {[
                { label: "Total this week", value: data.weeklyTickets.reduce((a, b) => a + b, 0), color: "#0a4c86" },
                { label: "Daily avg",       value: (data.weeklyTickets.reduce((a, b) => a + b, 0) / 7).toFixed(1), color: "#64748b" },
                { label: "Peak day",        value: Math.max(...data.weeklyTickets), color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="dash-bot-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "1.3rem", border: "1px solid #e8edf5", boxShadow: "0 2px 12px rgba(10,76,134,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.1rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#ef444415", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={14} color="#ef4444" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Recurring Issue Types</span>
            </div>
            {data.issueBreakdown.length === 0 ? (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "1.5rem 0" }}>No issue data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.issueBreakdown.slice(0, 5).map((item, i) => (
                  <HorizBar key={item.type} label={item.type} value={item.count} max={maxIssue} color={issueColors[i] ?? "#0a4c86"} rank={i} />
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "1.3rem", border: "1px solid #e8edf5", boxShadow: "0 2px 12px rgba(10,76,134,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.1rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#8b5cf615", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={14} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Top Departments by Tickets</span>
            </div>
            {data.deptRows.length === 0 ? (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "1.5rem 0" }}>No department data yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {["#", "Department", "Tickets"].map(h => (
                      <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: h === "Tickets" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.deptRows.map((row, i) => {
                    const pct = (row.tickets / (data.deptRows[0]?.tickets ?? 1)) * 100;
                    return (
                      <tr key={row.name} className="dept-row-h" style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.15s" }}>
                        <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700, color: "#cbd5e1", fontSize: 12, width: 28 }}>{i + 1}</td>
                        <td style={{ padding: "0.6rem 0.5rem" }}>
                          <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>{row.name}</div>
                          <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#8b5cf6", borderRadius: 2, transition: "width 0.6s ease" }} />
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem 0.5rem", textAlign: "right", fontWeight: 800, color: "#8b5cf6", fontSize: 15 }}>{row.tickets}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Dashboard shell ───────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [activeLabel, setActiveLabel] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const openSidebar  = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const currentUserName = localStorage.getItem("session_user_full_name") || "User";
  const userRole        = localStorage.getItem("session_user_role") || "";
  const isAdmin         = userRole === "Administrator";
  const isTechnician    = userRole === "IT Technician";

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) navigate("/");
  }, [navigate]);

  const PAGE_MAP: Record<string, React.ReactNode> = {
    "Home":                isTechnician ? <TechnicianDashboardHome /> : <DashboardHome onNavigate={setActiveLabel} />,
    "Submit Ticket":       <FileReports />,
    "Repair History":      <Repairs />,
    "My Tickets":          <MyTickets />,
    "Incoming Units":      <IncomingUnits readOnly={isTechnician} />,
    "Outgoing Units":      <OutgoingUnits readOnly={isTechnician} />,
    "Departments":         <Departments />,
    "User Accounts":       isAdmin ? <UserAccounts />    : <DashboardHome onNavigate={setActiveLabel} />,
    "Reports & Analytics": isAdmin ? <ReportAnalytics /> : <DashboardHome onNavigate={setActiveLabel} />,
    "Activity Log":        <ActivityLogPanel isAdmin={isAdmin} />,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .adm-scroll-area::-webkit-scrollbar { width: 8px; height: 8px; }
        .adm-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .adm-scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .adm-scroll-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media (max-width: 1024px) {
          .adm-main-wrap { padding: 1rem 1rem 1.2rem !important; }
        }
        @media (max-width: 640px) {
          .adm-main-wrap { padding: 0.75rem 0.75rem 1rem !important; }
        }
      `}</style>
      <div style={{
        height: "100vh",
        minHeight: 0,
        display: "flex",
        overflow: "hidden",
        background: "#f4f5fb",
        fontFamily: "'Poppins', sans-serif",
        color: "#0f172a",
      }}>
        <Sidebar
          activeLabel={activeLabel}
          onNavigate={setActiveLabel}
          userRole={userRole}
          isMobileOpen={sidebarOpen}
          onMobileClose={closeSidebar}
        />
        <div className="adm-main-wrap" style={{
          flex: 1,
          minHeight: 0,
          padding: "1.4rem 1.8rem 1.8rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          overflow: "hidden",
        }}>
          <div style={{ flexShrink: 0 }}>
            <Header
              currentUserName={currentUserName}
              userRole={userRole}
              onMenuClick={openSidebar}
              onNotificationNavigate={
                isTechnician
                  ? (entityType: string, entityId: string | null) => {
                      if (entityType === "file_report") {
                        if (entityId) localStorage.setItem("focus_ticket_id", entityId);
                        setActiveLabel("My Tickets");
                      }
                    }
                  : undefined
              }
            />
          </div>
          <div className="adm-scroll-area" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "0.5rem" }}>
            {PAGE_MAP[activeLabel] ?? <DashboardHome onNavigate={setActiveLabel} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;