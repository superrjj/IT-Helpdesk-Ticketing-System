import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ScrollText, Loader } from "lucide-react";
import { getSessionUserId } from "../../lib/audit-notifications";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const BRAND = "#0a4c86";

type Row = {
  id: string;
  action: string;
  entity_type: string;
  meta: Record<string, unknown>;
  created_at: string;
};

type Props = { isAdmin: boolean };

const ActivityLogPanel: React.FC<Props> = ({ isAdmin }) => {
  const userId = getSessionUserId();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const prettyAction = (action: string) => {
    if (action === "ticket_created") return "Created ticket";
    if (action === "ticket_updated") return "Updated ticket";
    if (action === "ticket_technician_update") return "Technician updated ticket";
    if (action === "repair_created") return "Created repair";
    if (action === "repair_updated") return "Updated repair";
    if (action === "repair_technician_update") return "Technician updated repair";
    return action;
  };

  const prettyEntity = (entityType: string) => {
    if (entityType === "file_report") return "Ticket Module";
    if (entityType === "repair") return "Repair Module";
    if (entityType === "incoming_unit") return "Incoming Units";
    if (entityType === "outgoing_unit") return "Outgoing Units";
    if (entityType === "user_account") return "User Accounts";
    return entityType;
  };

  const safeDetails = (row: Row) => {
    const meta = row.meta as Record<string, unknown>;
    const status = typeof meta.status === "string" ? meta.status : "";
    const assignees = typeof meta.new_assignees === "number" ? meta.new_assignees : null;
    const title = typeof meta.title === "string" ? meta.title : "";

    if (status) return `Status changed to ${status}`;
    if (assignees !== null) return `${assignees} new assignee(s) added`;
    if (title) return "Record updated";
    return "Action recorded";
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      let q = supabase
        .from("activity_log")
        .select("id, action, entity_type, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 400 : 200);

      if (!isAdmin && userId) {
        q = q.eq("actor_user_id", userId);
      } else if (!isAdmin && !userId) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await q;
      if (error) setRows([]);
      else
        setRows(
          (data ?? []).map((r: any) => ({
            ...r,
            meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>,
          }))
        );
      setLoading(false);
    };
    run();
  }, [isAdmin, userId]);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
        <ScrollText size={22} color={BRAND} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Activity Log</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            {isAdmin ? "Recent actions across the system." : "Actions you performed while signed in."}
          </p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["When", "Action", "Entity", "Details"].map(h => (
                <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  <Loader size={20} style={{ marginRight: 8, verticalAlign: "middle" }} />
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{prettyAction(r.action)}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: 12 }}>{prettyEntity(r.entity_type)}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#475569", maxWidth: 280, wordBreak: "break-word" }}>
                    {safeDetails(r)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLogPanel;
