import React, { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
} from "lucide-react";

const brandBlue = "#0a4c86";
const cardShadow = "0 18px 45px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.08)";

const raStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  .ra-root {
    font-family: 'Poppins', sans-serif;
    color: #0f172a;
  }

  /* ── Stat cards ── */
  .ra-stat-card {
    background: #ffffff;
    border-radius: 18px;
    padding: 1.25rem 1.4rem;
    box-shadow: ${cardShadow};
    border: 1px solid rgba(15,23,42,0.07);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .ra-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 55px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.10);
  }

  /* ── Panel ── */
  .ra-panel {
    background: #ffffff;
    border-radius: 18px;
    padding: 1.3rem 1.4rem;
    box-shadow: 0 18px 40px rgba(15,23,42,0.08);
    border: 1px solid #e5e7eb;
  }

  .ra-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* ── Bar chart ── */
  .ra-bar-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
  }
  .ra-bar-label {
    font-size: 12px;
    color: #475569;
    font-weight: 500;
    width: 140px;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ra-bar-track {
    flex: 1;
    height: 10px;
    background: #f1f5f9;
    border-radius: 999px;
    overflow: hidden;
  }
  .ra-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
  }
  .ra-bar-value {
    font-size: 12px;
    font-weight: 600;
    color: #111827;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Status badge ── */
  .ra-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── Filter tabs ── */
  .ra-tab {
    padding: 0.38rem 0.85rem;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: transparent;
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.16s;
  }
  .ra-tab:hover { background: #f8fafc; }
  .ra-tab.active {
    background: ${brandBlue};
    border-color: ${brandBlue};
    color: #ffffff;
  }

  /* ── Export button ── */
  .ra-export-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.42rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid ${brandBlue};
    background: transparent;
    color: ${brandBlue};
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.16s, color 0.16s;
  }
  .ra-export-btn:hover {
    background: ${brandBlue};
    color: #ffffff;
  }

  /* ── Recent table ── */
  .ra-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ra-table th {
    text-align: left;
    padding: 0.5rem 0.5rem;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
    border-bottom: 1px solid #e5e7eb;
  }
  .ra-table td {
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    vertical-align: middle;
  }
  .ra-table tr:last-child td { border-bottom: none; }
  .ra-table tr:hover td { background: #f9fafb; }

  /* ── Donut chart ── */
  .ra-donut-legend {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .ra-donut-legend-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
  }
  .ra-donut-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    flex-shrink: 0;
  }
`;

// ── Static mock data (swap with Supabase queries) ─────────────────────────────

const statCards = [
  { label: "Total Tickets",    value: 128, accent: brandBlue,  icon: BarChart2,    delta: "+12 this month" },
  { label: "Resolved",         value: 94,  accent: "#16a34a",  icon: CheckCircle2, delta: "73% resolution rate" },
  { label: "Pending",          value: 21,  accent: "#ca8a04",  icon: Clock,        delta: "Avg. 2.4 days open" },
  { label: "Critical Issues",  value: 13,  accent: "#dc2626",  icon: AlertTriangle, delta: "Needs attention" },
];

const deptTickets = [
  { name: "Mayor's Office",      count: 24, color: brandBlue },
  { name: "Treasury",            count: 19, color: "#0369a1" },
  { name: "Engineering",         count: 17, color: "#0891b2" },
  { name: "Civil Registry",      count: 14, color: "#16a34a" },
  { name: "HRMO",                count: 12, color: "#ca8a04" },
  { name: "Budget Office",       count: 9,  color: "#9333ea" },
  { name: "Health Office",       count: 7,  color: "#dc2626" },
];

const maxDept = Math.max(...deptTickets.map(d => d.count));

const recentTickets = [
  { id: "TKT-041", equipment: "Desktop PC",     dept: "Treasury",        issue: "Blue screen on startup",     status: "Resolved",    date: "Mar 18" },
  { id: "TKT-040", equipment: "Printer",        dept: "Mayor's Office",  issue: "Paper jam, roller worn out", status: "In Progress", date: "Mar 17" },
  { id: "TKT-039", equipment: "UPS",            dept: "Engineering",     issue: "Battery not holding charge", status: "Pending",     date: "Mar 16" },
  { id: "TKT-038", equipment: "Laptop",         dept: "HRMO",            issue: "Keyboard keys unresponsive", status: "Resolved",    date: "Mar 15" },
  { id: "TKT-037", equipment: "Network Switch", dept: "Budget Office",   issue: "Port 4 not passing traffic", status: "Pending",     date: "Mar 14" },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  Resolved:    { bg: "rgba(22,163,74,0.12)",  color: "#15803d" },
  "In Progress": { bg: "rgba(234,179,8,0.12)", color: "#a16207" },
  Pending:     { bg: "rgba(220,38,38,0.12)",  color: "#b91c1c" },
};

const donutData = [
  { label: "Hardware",  value: 52, color: brandBlue },
  { label: "Software",  value: 31, color: "#0891b2" },
  { label: "Network",   value: 15, color: "#16a34a" },
  { label: "Others",    value: 8,  color: "#ca8a04" },
];
const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

// ── SVG donut ─────────────────────────────────────────────────────────────────
const DonutChart: React.FC = () => {
  const cx = 60, cy = 60, r = 48, strokeW = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
      {donutData.map((seg, i) => {
        const dash = (seg.value / donutTotal) * circ;
        const gap  = circ - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform="rotate(-90, 60, 60)"
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
          />
        );
        offset += dash + 1.5;
        return el;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="#111827" fontFamily="Poppins,sans-serif">
        {donutTotal}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="Poppins,sans-serif" letterSpacing="0.08em">
        TOTAL
      </text>
    </svg>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const ReportAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState("This Month");
  const tabs = ["This Week", "This Month", "This Quarter", "This Year"];

  return (
    <>
      <style>{raStyles}</style>
      <div className="ra-root" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>

        {/* ── Top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Reports & Analytics</h1>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0", fontWeight: 400 }}>
              IT Helpdesk performance overview — Tarlac City Government
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Period tabs */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {tabs.map(t => (
                <button
                  key={t}
                  className={`ra-tab${activeTab === t ? " active" : ""}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Export */}
            <button className="ra-export-btn">
              <Download size={13} strokeWidth={2.2} />
              Export PDF
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "0.9rem" }}>
          {statCards.map(({ label, value, accent, icon: Icon, delta }) => (
            <div key={label} className="ra-stat-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", fontWeight: 600 }}>
                  {label}
                </span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} strokeWidth={2} color={accent} />
                </div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{delta}</span>
            </div>
          ))}
        </div>

        {/* ── Middle row: bar chart + donut ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.1rem" }}>

          {/* Tickets by Department */}
          <div className="ra-panel">
            <div className="ra-panel-title">
              <TrendingUp size={15} color={brandBlue} strokeWidth={2.2} />
              Tickets by Department
            </div>
            {deptTickets.map(dept => (
              <div key={dept.name} className="ra-bar-row">
                <span className="ra-bar-label">{dept.name}</span>
                <div className="ra-bar-track">
                  <div
                    className="ra-bar-fill"
                    style={{
                      width: `${(dept.count / maxDept) * 100}%`,
                      background: dept.color,
                    }}
                  />
                </div>
                <span className="ra-bar-value">{dept.count}</span>
              </div>
            ))}
          </div>

          {/* Issue Categories donut */}
          <div className="ra-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="ra-panel-title">
              <BarChart2 size={15} color={brandBlue} strokeWidth={2.2} />
              Issue Categories
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.25rem" }}>
              <DonutChart />
            </div>
            <div className="ra-donut-legend">
              {donutData.map(seg => (
                <div key={seg.label} className="ra-donut-legend-row">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="ra-donut-dot" style={{ background: seg.color }} />
                    <span style={{ color: "#475569", fontWeight: 500 }}>{seg.label}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    {seg.value}
                    <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>
                      {" "}({Math.round((seg.value / donutTotal) * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent tickets table ── */}
        <div className="ra-panel">
          <div className="ra-panel-title" style={{ marginBottom: "0.5rem" }}>
            <Calendar size={15} color={brandBlue} strokeWidth={2.2} />
            Recent Tickets
          </div>
          <table className="ra-table">
            <thead>
              <tr>
                {["Ticket ID", "Equipment", "Department", "Issue", "Status", "Date"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTickets.map(t => {
                const { bg, color } = statusColors[t.status] ?? { bg: "#f1f5f9", color: "#64748b" };
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: brandBlue }}>{t.id}</td>
                    <td>{t.equipment}</td>
                    <td style={{ color: "#6b7280" }}>{t.dept}</td>
                    <td style={{ color: "#4b5563", maxWidth: 220 }}>{t.issue}</td>
                    <td>
                      <span className="ra-badge" style={{ background: bg, color }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: 12 }}>{t.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
};

export default ReportAnalytics;