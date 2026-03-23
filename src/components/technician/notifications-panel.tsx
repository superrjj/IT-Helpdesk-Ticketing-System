import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader, CheckCheck } from "lucide-react";
import {
  getSessionUserId,
  dispatchNotificationsChanged,
  NOTIFICATIONS_CHANGED_EVENT,
} from "../../lib/audit-notifications";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const BRAND = "#0a4c86";

type Row = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const NotificationsPanel: React.FC = () => {
  const userId = getSessionUserId();
  const role = typeof window !== "undefined" ? localStorage.getItem("session_user_role") || "" : "";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("app_notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setRows([]);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const onChange = () => fetchRows();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
  }, [fetchRows]);

  const markRead = async (id: string) => {
    await supabase.from("app_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    dispatchNotificationsChanged();
    fetchRows();
  };

  const handleSelectNotification = async (row: Row) => {
    setSelectedNotificationId(row.id);
    if (!row.read_at) await markRead(row.id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    const unread = rows.filter(r => !r.read_at).map(r => r.id);
    if (unread.length === 0) return;
    await supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
    dispatchNotificationsChanged();
    fetchRows();
  };

  if (!userId) {
    return <div style={{ padding: 24, color: "#94a3b8", fontFamily: "'Poppins', sans-serif" }}>Session missing.</div>;
  }

  if (role === "Administrator") {
    return (
      <div style={{ padding: 24, color: "#94a3b8", fontFamily: "'Poppins', sans-serif" }}>
        Notifications are not available for administrators.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Notifications</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Assignments and updates for your account.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0.45rem 0.9rem",
            borderRadius: 8,
            border: `1px solid ${BRAND}`,
            background: "#fff",
            color: BRAND,
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
            <Loader size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No notifications yet.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map(r => (
              <li
                key={r.id}
                onClick={() => { void handleSelectNotification(r); }}
                style={{
                  padding: "1rem 1.15rem",
                  borderBottom: "1px solid #f1f5f9",
                  background:
                    selectedNotificationId === r.id
                      ? "rgba(10,76,134,0.10)"
                      : r.read_at
                        ? "#fff"
                        : "rgba(10,76,134,0.04)",
                  borderLeft:
                    selectedNotificationId === r.id
                      ? `4px solid ${BRAND}`
                      : "4px solid transparent",
                  cursor: "pointer",
                  transition: "background 0.15s, border-left-color 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {r.type.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{r.title}</div>
                    {r.body ? <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{r.body}</div> : null}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                      {new Date(r.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                    </div>
                  </div>
                  {!r.read_at && (
                    <button
                      type="button"
                      onClick={() => markRead(r.id)}
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: BRAND,
                        background: `${BRAND}12`,
                        border: "none",
                        borderRadius: 8,
                        padding: "0.35rem 0.65rem",
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
