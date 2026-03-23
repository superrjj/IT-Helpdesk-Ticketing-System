import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Eye, Search, X, AlertTriangle, Pencil, Ticket,
  Clock, Loader, Building2, User,
} from "lucide-react";
import {
  getSessionUserId,
  insertActivityLog,
  notifyAdminsTicketStatusChanged,
} from "../../lib/audit-notifications";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Status = "Pending" | "In Progress" | "Resolved";

type TicketRow = {
  id: string;
  ticket_number: string | null;
  title: string;
  description: string;
  status: Status;
  employee_name: string;
  department_id: string;
  issue_type: string;
  date_submitted: string;
  assigned_to: string[];
  action_taken: string;
  started_at: string | null;
  completed_at: string | null;
};

type DeptMap = Record<string, string>;

const BRAND = "#0a4c86";

function sanitize(val: string): string {
  return val
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .trim();
}

function validateTechUpdate(form: {
  status: Status;
  action_taken: string;
  started_at: string;
  completed_at: string;
}): string {
  if (!["Pending", "In Progress", "Resolved"].includes(form.status)) return "Invalid status.";
  if (form.action_taken.trim().length > 2000) return "Action taken must be 2000 characters or less.";
  // Validation rules per your spec:
  // - In Progress: requires start date only.
  // - Resolved: requires end date only.
  if (form.status === "In Progress" && !form.started_at.trim()) {
    return "Set a start date when status is In Progress.";
  }
  if (form.status === "Resolved" && !form.completed_at.trim()) {
    return "Set an end date when status is Resolved.";
  }
  // If both are provided, ensure chronological correctness.
  if (form.started_at.trim() && form.completed_at.trim()) {
    if (new Date(form.completed_at) < new Date(form.started_at)) return "End date cannot be before start date.";
  }
  return "";
}

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila",
      })
    : "—";

const statusStyle: Record<Status, { bg: string; color: string }> = {
  Pending: { bg: "rgba(59,130,246,0.10)", color: "#475569" },
  "In Progress": { bg: "rgba(234,179,8,0.11)", color: "#a16207" },
  Resolved: { bg: "rgba(22,163,74,0.10)", color: "#15803d" },
};

const MyTickets: React.FC = () => {
  const userId = getSessionUserId();
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [depts, setDepts] = useState<DeptMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null);
  const [modal, setModal] = useState<"view" | "work" | null>(null);
  const [form, setForm] = useState({
    status: "Pending" as Status,
    action_taken: "",
    started_at: "",
    completed_at: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: tix, error: e1 }, { data: dlist }] = await Promise.all([
      supabase
        .from("file_reports")
        .select(
          "id, ticket_number, title, description, status, employee_name, department_id, issue_type, date_submitted, assigned_to, action_taken, started_at, completed_at"
        )
        .contains("assigned_to", [userId])
        .order("date_submitted", { ascending: false }),
      supabase.from("departments").select("id, name"),
    ]);
    if (e1) {
      showToast(e1.message, "error");
      setRows([]);
    } else {
      setRows(
        (tix ?? []).map((r: any) => ({
          ...r,
          assigned_to: Array.isArray(r.assigned_to) ? r.assigned_to : [],
        }))
      );
    }
    const dm: DeptMap = {};
    (dlist ?? []).forEach((d: { id: string; name: string }) => {
      dm[d.id] = d.name;
    });
    setDepts(dm);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [userId]);

  useEffect(() => {
    const targetId = localStorage.getItem("focus_ticket_id");
    if (!targetId || rows.length === 0) return;
    const target = rows.find((r) => r.id === targetId);
    localStorage.removeItem("focus_ticket_id");
    if (!target) return;
    setFocusedTicketId(targetId);
    setSelected(target);
    setModal("view");
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.title, r.description, r.employee_name, r.ticket_number ?? "", r.issue_type, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const openView = (r: TicketRow) => {
    setFocusedTicketId(r.id);
    setSelected(r);
    setModal("view");
  };

  const openWork = (r: TicketRow) => {
    setFocusedTicketId(r.id);
    setSelected(r);
    setForm({
      status: (["Pending", "In Progress", "Resolved"].includes(r.status) ? r.status : "Pending") as Status,
      action_taken: r.action_taken ?? "",
      started_at: r.started_at ? r.started_at.slice(0, 10) : "",
      completed_at: r.completed_at ? r.completed_at.slice(0, 10) : "",
    });
    setFormError("");
    setModal("work");
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError("");
    setSaving(false);
  };

  const saveWork = async () => {
    if (!selected || !userId) return;
    if (!selected.assigned_to.includes(userId)) {
      setFormError("You are no longer assigned to this ticket.");
      return;
    }
    const err = validateTechUpdate(form);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    const payload = {
      status: form.status,
      action_taken: sanitize(form.action_taken),
      started_at: form.started_at ? new Date(form.started_at).toISOString() : null,
      completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("file_reports").update(payload).eq("id", selected.id);
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    await insertActivityLog(supabase, {
      actorUserId: userId,
      action: "ticket_technician_update",
      entityType: "file_report",
      entityId: selected.id,
      meta: { status: form.status, ticket_id: selected.id },
    });
    await notifyAdminsTicketStatusChanged(supabase, {
      ticketId: selected.id,
      ticketTitle: selected.title,
      ticketNumber: selected.ticket_number ?? null,
      status: form.status,
    });
    showToast("Ticket updated.", "success");
    setSaving(false);
    closeModal();
    fetchAll();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    fontFamily: "'Poppins', sans-serif",
    background: "#f8fafc",
    boxSizing: "border-box",
  };

  if (!userId) {
    return (
      <div style={{ padding: 24, fontFamily: "'Poppins', sans-serif", color: "#94a3b8" }}>
        Session missing. Please sign in again.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .mt-row:hover { background: #f8fafc !important; }
      `}</style>
      <div style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
        {toast && (
          <div
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              zIndex: 9999,
              padding: "0.65rem 1.1rem",
              borderRadius: 10,
              fontSize: 13,
              background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#15803d" : "#b91c1c",
              border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            {toast.msg}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Ticket size={20} color={BRAND} /> My Tickets
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
              Tickets assigned to you — update status, action taken, and dates.
            </p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: "0.9rem 1rem", marginBottom: "1rem" }}>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["ID", "Title", "Requester", "Office", "Status", "Submitted", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    <Loader size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    No tickets assigned to you.
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const st = statusStyle[r.status as Status] ?? statusStyle.Pending;
                  return (
                    <tr
                      key={r.id}
                      className="mt-row"
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: focusedTicketId === r.id ? "rgba(10,76,134,0.08)" : "#fff",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: BRAND }}>
                        {r.ticket_number?.trim() || `TKT-${r.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", maxWidth: 200 }}>{r.title}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.employee_name}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: 12 }}>{depts[r.department_id] ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtDate(r.date_submitted)}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            title="View"
                            onClick={() => openView(r)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                          >
                            <Eye size={14} color={BRAND} style={{ margin: "auto", display: "block" }} />
                          </button>
                          <button
                            type="button"
                            title="Update work"
                            onClick={() => openWork(r)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                          >
                            <Pencil size={14} color={BRAND} style={{ margin: "auto", display: "block" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {modal && selected && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "1.5rem",
                maxWidth: modal === "work" ? 520 : 480,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selected.title}</h3>
                <button type="button" onClick={closeModal} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <X size={18} />
                </button>
              </div>

              {modal === "view" && (
                <div style={{ fontSize: 13, color: "#374151", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <User size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    {selected.employee_name} · {depts[selected.department_id]}
                  </div>
                  <div>
                    <Building2 size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    {selected.issue_type}
                  </div>
                  <div>
                    <Clock size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    {fmtDate(selected.date_submitted)}
                  </div>
                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: 8, border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                    {selected.description || "—"}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BRAND, textTransform: "uppercase" }}>Your response</div>
                  <div style={{ fontSize: 13 }}>{selected.action_taken || "—"}</div>
                </div>
              )}

              {modal === "work" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => {
                      setForm(f => ({ ...f, status: e.target.value as Status }));
                      setFormError("");
                    }}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Start date</label>
                  <input
                    type="date"
                    value={form.started_at}
                    onChange={e => {
                      setForm(f => ({ ...f, started_at: e.target.value }));
                      setFormError("");
                    }}
                    style={inputStyle}
                  />
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>End date</label>
                  <input
                    type="date"
                    value={form.completed_at}
                    onChange={e => {
                      setForm(f => ({ ...f, completed_at: e.target.value }));
                      setFormError("");
                    }}
                    style={inputStyle}
                  />
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Action taken</label>
                  <textarea
                    value={form.action_taken}
                    onChange={e => {
                      setForm(f => ({ ...f, action_taken: e.target.value }));
                      setFormError("");
                    }}
                    rows={4}
                    maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  {formError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b91c1c", fontSize: 12, fontWeight: 600 }}>
                      <AlertTriangle size={14} /> {formError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={closeModal}
                      style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveWork}
                      disabled={saving}
                      style={{
                        padding: "0.5rem 1.2rem",
                        borderRadius: 8,
                        border: "none",
                        background: BRAND,
                        color: "#fff",
                        fontWeight: 600,
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {modal === "view" && (
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => openWork(selected)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 8,
                      border: `1.5px solid ${BRAND}`,
                      background: "#fff",
                      color: BRAND,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Update work
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MyTickets;
