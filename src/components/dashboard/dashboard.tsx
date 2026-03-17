import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./header";
import Equipment from "../equipment/equipment";
import Departments from "../department/department";
import DefectiveReports from "../defective-reports/defective-reports";
import Repairs from "../repairs/repairs";
import UserAccounts from "../accounts/user-accounts";

type StatCardProps = {
  label: string;
  value: string | number;
  accent?: "blue" | "red" | "yellow" | "green";
};

const accentColorMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  blue:   "#0a4c86",
  red:    "#dc2626",
  yellow: "#ca8a04",
  green:  "#16a34a",
};

const cardShadow =
  "0 18px 45px rgba(15,23,42,0.20), 0 1px 4px rgba(15,23,42,0.18)";

const StatCard: React.FC<StatCardProps> = ({ label, value, accent = "blue" }) => {
  const color = accentColorMap[accent];
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "1.25rem 1.4rem",
        boxShadow: cardShadow,
        border: "1px solid rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 700, color }}>{value}</span>
    </div>
  );
};

const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#94a3b8", fontSize: 14 }}>
    <span><strong>{label}</strong> — this page is under construction.</span>
  </div>
);

const DashboardHome: React.FC = () => (
  <main style={{ display: "grid", gridTemplateColumns: "2.1fr 1.2fr", gap: "1.2rem" }}>
    {/* Left column */}
    <section style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.9rem" }}>
        <StatCard label="Total equipment"   value={0} accent="blue"   />
        <StatCard label="Defective devices" value={0} accent="red"    />
        <StatCard label="Under repair"      value={0} accent="yellow" />
        <StatCard label="Active equipment"  value={0} accent="green"  />
      </div>

      <div style={{ background: "#ffffff", borderRadius: 18, padding: "1.2rem 1.3rem", boxShadow: "0 18px 40px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: "0.8rem" }}>Equipment Per Department</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111827" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              {["Department", "Total", "Defective", "Under repair"].map(h => (
                <th key={h} style={{ padding: "0.55rem 0.35rem", fontWeight: 500, color: "#6b7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "POSO",  total: 40, defective: 3, repair: 2 },
              { name: "CENRO", total: 18, defective: 1, repair: 0 },
              { name: "CEEMO", total: 22, defective: 2, repair: 1 },
              { name: "CHO",   total: 24, defective: 2, repair: 2 },
            ].map(row => (
              <tr key={row.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.55rem 0.35rem", fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: "0.55rem 0.35rem" }}>{row.total}</td>
                <td style={{ padding: "0.55rem 0.35rem", color: "#f97316", fontWeight: 500 }}>{row.defective}</td>
                <td style={{ padding: "0.55rem 0.35rem", color: "#eab308", fontWeight: 500 }}>{row.repair}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* Right column */}
    <section style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div style={{ background: "#ffffff", borderRadius: 18, padding: "1.2rem 1.3rem", boxShadow: "0 18px 40px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: "0.8rem" }}>Recent Repair Activities</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: 13 }}>
          {[
            { equipment: "Printer – City Mayor's Office",  detail: "Paper jam cleared, test print OK",      status: "Fixed",        date: "Mar 10" },
            { equipment: "CPU – City Agriculture Office",  detail: "Power supply replacement ongoing",      status: "Under Repair",  date: "Mar 09" },
            { equipment: "Monitor – City Legal Office",    detail: "Intermittent flicker reported",         status: "Pending",       date: "Mar 09" },
            { equipment: "Printer – City Health Office",   detail: "Scheduled maintenance completed",       status: "Fixed",         date: "Mar 08" },
          ].map(item => (
            <li key={item.equipment + item.date} style={{ padding: "0.65rem 0.7rem", borderRadius: 12, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>{item.equipment}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{item.date}</span>
              </div>
              <span style={{ fontSize: 12, color: "#4b5563" }}>{item.detail}</span>
              <span style={{
                marginTop: 4, alignSelf: "flex-start", padding: "2px 8px", borderRadius: 999,
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                background: item.status === "Fixed" ? "rgba(22,163,74,0.12)" : item.status === "Under Repair" ? "rgba(234,179,8,0.12)" : "rgba(248,113,113,0.12)",
                color:      item.status === "Fixed" ? "#15803d"              : item.status === "Under Repair" ? "#a16207"               : "#b91c1c",
              }}>
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </main>
);

const Dashboard: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const currentUserName = localStorage.getItem("session_user_full_name") || "User";

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) navigate("/");
  }, [navigate]);

  const renderPage = () => {
    switch (activeIndex) {
      case 0: return <DashboardHome />;
      case 1: return <Equipment />;
      case 2: return <Departments />;
      case 3: return <DefectiveReports />;
      case 4: return <Repairs />;
      case 5: return <ComingSoon label="Repair History" />;
      case 6: return <ComingSoon label="Reports" />;
      case 7: return <UserAccounts />;
      default: return <ComingSoon label="Page" />;
    }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      <div style={{
        minHeight: "100vh", display: "flex", background: "#f4f5fb",
        fontFamily: "'Poppins', sans-serif", color: "#0f172a",
      }}>
        <Sidebar activeIndex={activeIndex} onNavigate={setActiveIndex} />

        <div style={{
          flex: 1, padding: "1.4rem 1.8rem 1.8rem",
          display: "flex", flexDirection: "column", gap: "1.2rem",
        }}>
          <Header currentUserName={currentUserName} />
          {renderPage()}
        </div>
      </div>
    </>
  );
};

export default Dashboard;