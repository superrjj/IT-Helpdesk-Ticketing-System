import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Ticket, Wrench, Clock, CheckCircle, Loader } from "lucide-react";
import { getSessionUserId } from "../../lib/audit-notifications";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const BRAND = "#0a4c86";

const TechnicianDashboardHome: React.FC = () => {
  const userId = getSessionUserId();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState({ total: 0, pending: 0, inProg: 0, resolved: 0 });
  const [repairs, setRepairs] = useState({ active: 0, completed: 0 });

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [{ data: tix }, { data: repAll }] = await Promise.all([
        supabase
          .from("file_reports")
          .select("id, status")
          .contains("assigned_to", [userId]),
        supabase.from("repairs").select("id, status").contains("assigned_to", [userId]),
      ]);

      const t = tix ?? [];
      setTickets({
        total: t.length,
        pending: t.filter((x: any) => x.status === "Pending").length,
        inProg: t.filter((x: any) => x.status === "In Progress").length,
        resolved: t.filter((x: any) => x.status === "Resolved").length,
      });
      const r = repAll ?? [];
      setRepairs({
        active: r.filter((x: any) => x.status === "Pending" || x.status === "In Progress").length,
        completed: r.filter((x: any) => x.status === "Completed").length,
      });
      setLoading(false);
    };
    run();
  }, [userId]);

  const card = (label: string, value: number | string, sub: string, icon: React.ReactNode, color: string) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "1.15rem 1.25rem",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</span>
    </div>
  );

  if (!userId) {
    return <div style={{ padding: 24, color: "#94a3b8", fontFamily: "'Poppins', sans-serif" }}>Session missing.</div>;
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Technician Dashboard</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: "1.25rem" }}>Your assignments at a glance.</p>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
          <Loader size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Loading your stats…
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "0.9rem",
          }}
        >
          {card("My tickets", tickets.total, "Assigned to you", <Ticket size={18} />, BRAND)}
          {card("Ticket — Pending", tickets.pending, "Awaiting action", <Clock size={18} />, "#ca8a04")}
          {card("Ticket — In progress", tickets.inProg, "Being worked", <Wrench size={18} />, "#0369a1")}
          {card("Ticket — Resolved", tickets.resolved, "Closed tickets", <CheckCircle size={18} />, "#16a34a")}
          {card("Active repairs", repairs.active, "Pending / in progress", <Wrench size={18} />, "#0891b2")}
          {card("Repairs completed", repairs.completed, "Your finished jobs", <CheckCircle size={18} />, "#15803d")}
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboardHome;
