import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "./sidebar";
import Header from "./header";
import Equipment from "../equipment/equipment";
import Departments from "../department/department";
import FileReports from "../submit-ticket/submitTicket";
import Repairs from "../repairs/repairs";
import UserAccounts from "../accounts/user-accounts";

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

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

type DepartmentStats = {
  name: string;
  total: number;
  defective: number;
  repair: number;
};

type RepairActivity = {
  equipment: string;
  detail: string;
  status: string;
  date: string;
};

const DashboardHome: React.FC = () => {
  const [totalEquipment, setTotalEquipment] = useState(0);
  const [defectiveCount, setDefectiveCount] = useState(0);
  const [repairCount, setRepairCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [deptStats, setDeptStats] = useState<DepartmentStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<RepairActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch all equipment with their status and department
      const { data: equipment } = await supabase
        .from("equipment")
        .select("status, department_id");

      if (equipment) {
        setTotalEquipment(equipment.length);
        setDefectiveCount(equipment.filter(e => e.status === "Defective").length);
        setRepairCount(equipment.filter(e => e.status === "Under Repair").length);
        setActiveCount(equipment.filter(e => e.status === "Active").length);

        // Fetch all departments
        const { data: departments } = await supabase
          .from("departments")
          .select("id, name")
          .order("name", { ascending: true });

        if (departments) {
          // Calculate stats for each department
          const stats: DepartmentStats[] = departments.map(dept => {
            const deptEquipment = equipment.filter(e => e.department_id === dept.id);
            return {
              name: dept.name,
              total: deptEquipment.length,
              defective: deptEquipment.filter(e => e.status === "Defective").length,
              repair: deptEquipment.filter(e => e.status === "Under Repair").length,
            };
          }).filter(s => s.total > 0); // Only show departments with equipment

          setDeptStats(stats);
        }
      }

      // Fetch recent repair activities
      const { data: repairs } = await supabase
        .from("repairs")
        .select(`
          id,
          issue_description,
          status,
          created_at,
          equipment (
            name,
            departments (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(4);

      if (repairs) {
        const activities: RepairActivity[] = repairs.map((r: any) => {
          const equipmentName = r.equipment?.name || "Unknown Equipment";
          const deptName = r.equipment?.departments?.name || "Unknown Department";
          
          return {
            equipment: `${equipmentName} – ${deptName}`,
            detail: r.issue_description || "No description provided",
            status: r.status === "completed" ? "Fixed" : 
                   r.status === "in_progress" ? "Under Repair" : "Pending",
            date: new Date(r.created_at).toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric" 
            }),
          };
        });
        setRecentActivities(activities);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "60vh",
        color: "#94a3b8",
        fontSize: 14,
        fontWeight: 500,
      }}>
        Loading dashboard data...
      </div>
    );
  }

  return (
    <main style={{ display: "grid", gridTemplateColumns: "2.1fr 1.2fr", gap: "1.2rem" }}>
      {/* Left column */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.9rem" }}>
          <StatCard label="Total equipment"   value={totalEquipment} accent="blue"   />
          <StatCard label="Defective devices" value={defectiveCount} accent="red"    />
          <StatCard label="Under repair"      value={repairCount}    accent="yellow" />
          <StatCard label="Active equipment"  value={activeCount}    accent="green"  />
        </div>

        <div style={{ background: "#ffffff", borderRadius: 18, padding: "1.2rem 1.3rem", boxShadow: "0 18px 40px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: "0.8rem" }}>Equipment Per Department</h2>
          {deptStats.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "2rem 0" }}>
              No department data available
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111827" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  {["Department", "Total", "Defective", "Under repair"].map(h => (
                    <th key={h} style={{ padding: "0.55rem 0.35rem", fontWeight: 500, color: "#6b7280" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptStats.map(row => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.55rem 0.35rem", fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: "0.55rem 0.35rem" }}>{row.total}</td>
                    <td style={{ padding: "0.55rem 0.35rem", color: "#f97316", fontWeight: 500 }}>{row.defective}</td>
                    <td style={{ padding: "0.55rem 0.35rem", color: "#eab308", fontWeight: 500 }}>{row.repair}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Right column */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <div style={{ background: "#ffffff", borderRadius: 18, padding: "1.2rem 1.3rem", boxShadow: "0 18px 40px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: "0.8rem" }}>Recent Repair Activities</h2>
          {recentActivities.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "2rem 0" }}>
              No recent repair activities
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: 13 }}>
              {recentActivities.map((item, idx) => (
                <li key={idx} style={{ padding: "0.65rem 0.7rem", borderRadius: 12, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 2 }}>
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
          )}
        </div>
      </section>
    </main>
  );
};

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
      case 1: return <FileReports />;
      case 2: return <Repairs />;
      case 3: return <Equipment />;
      case 4: return <Departments />;
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