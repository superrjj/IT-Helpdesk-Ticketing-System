import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Eye, Search, X, AlertTriangle, Pencil, Wrench, Loader } from "lucide-react";
import {
  getSessionUserId,
  insertActivityLog,
  notifyAdminsRepairStatusChanged,
} from "../../lib/audit-notifications";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type RepairStatus = "Pending" | "In Progress" | "Completed";

type RepairRow = {
  id: string;
  file_report_id: string | null;
  assigned_to: string[];
  problem: string | null;
  action_taken: string;
  status: RepairStatus;
  started_at: string | null;
  completed_at: string | null;
  ticket_number?: string | null;
  ticket_title?: string | null;
};

const BRAND = "#0a4c86";

function sanitize(val: string): string {
  return val
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .trim();
}

function validateForm(form: {
  status: RepairStatus;
  action_taken: string;
  problem: string;
  started_at: string;
  completed_at: string;
}): string {
  if (!["Pending", "In Progress", "Completed"].includes(form.status)) return "Invalid status.";
  if (form.action_taken.trim().length > 2000) return "Notes / action must be 2000 characters or less.";
  if (form.problem.trim().length > 500) return "Problem summary must be 500 characters or less.";
  if (form.started_at && form.completed_at) {
    if (new Date(form.completed_at) < new Date(form.started_at)) return "End date cannot be before start date.";
  }
  if (form.status === "Completed" && !form.completed_at.trim()) return "Set an end date when marking Completed.";
  if (form.status === "In Progress" && !form.started_at.trim()) return "Set a start date when marking In Progress.";
  return "";
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";

const MyRepairs: React.FC = () => {
  const userId = getSessionUserId();
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RepairRow | null>(null);
  const [focusedRepairId, setFocusedRepairId] = useState<string | null>(null);
  const [modal, setModal] = useState<"view" | "edit" | null>(null);
  const [form, setForm] = useState({
    status: "Pending" as RepairStatus,
    problem: "",
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
    const { data, error } = await supabase
      .from("repairs")
      .select(
        `
        id, file_report_id, assigned_to, problem, action_taken, status,
        started_at, completed_at,
        file_reports ( ticket_number, title )
      `
      )
      .contains("assigned_to", [userId])
      .in("status", ["Pending", "In Progress"])
      .order("created_at", { ascending: false });

    if (error) {
      showToast(error.message, "error");
      setRows([]);
    } else {
      setRows(
        (data ?? []).map((r: any) => ({
          ...r,
          assigned_to: Array.isArray(r.assigned_to) ? r.assigned_to : [],
          ticket_number: r.file_reports?.ticket_number ?? null,
          ticket_title: r.file_reports?.title ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [userId]);

  useEffect(() => {
    const targetId = localStorage.getItem("focus_repair_id");
    if (!targetId || rows.length === 0) return;
    const target = rows.find((r) => r.id === targetId);
    localStorage.removeItem("focus_repair_id");
    if (!target) return;
    setFocusedRepairId(targetId);
    setSelected(target);
    setModal("view");
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.ticket_number, r.ticket_title, r.problem, r.action_taken, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const openView = (r: RepairRow) => {
    setFocusedRepairId(r.id);
    setSelected(r);
    setModal("view");
  };

  const openEdit = (r: RepairRow) => {
    setFocusedRepairId(r.id);
    setSelected(r);
    setForm({
      status: r.status,
      problem: r.problem ?? "",
      action_taken: r.action_taken ?? "",
      started_at: r.started_at ? r.started_at.slice(0, 10) : "",
      completed_at: r.completed_at ? r.completed_at.slice(0, 10) : "",
    });
    setFormError("");
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError("");
    setSaving(false);
  };

  const save = async () => {
    if (!selected || !userId) return;
    if (!selected.assigned_to.includes(userId)) {
      setFormError("You are not assigned to this repair.");
      return;
    }
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    const payload = {
      status: form.status,
      problem: sanitize(form.problem) || null,
      action_taken: sanitize(form.action_taken),
      started_at: form.started_at ? new Date(form.started_at).toISOString() : null,
      completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("repairs").update(payload).eq("id", selected.id);
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    await insertActivityLog(supabase, {
      actorUserId: userId,
      action: "repair_technician_update",
      entityType: "repair",
      entityId: selected.id,
      meta: { status: form.status, repair_id: selected.id },
    });
    await notifyAdminsRepairStatusChanged(supabase, {
      repairId: selected.id,
      summary: (selected.ticket_number ? `${selected.ticket_number} — ` : "") + (selected.problem ?? "Repair"),
      status: form.status,
    });
    showToast("Repair updated.", "success");
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
    return <div style={{ padding: 24, color: "#94a3b8" }}>Session missing.</div>;
  }

  return (
    <>
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
            }}
          >
            {toast.msg}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={20} color={BRAND} /> My Repairs
          </h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            Active repair jobs assigned to you (Pending / In Progress). Completed jobs appear under Repair History.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: "0.9rem 1rem", marginBottom: "1rem" }}>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputStyle, paddingLeft: 32 }} />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Ticket", "Problem", "Status", "Start", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    <Loader size={20} style={{ marginRight: 8, verticalAlign: "middle" }} />
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    No active repairs assigned to you.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: focusedRepairId === r.id ? "rgba(10,76,134,0.08)" : "#fff",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: BRAND }}>
                      {r.ticket_number ?? "—"}
                      <div style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>{r.ticket_title}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", maxWidth: 220 }}>{r.problem ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>{r.status}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{fmtDate(r.started_at)}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => openView(r)} style={iconBtn}>
                          <Eye size={14} color={BRAND} />
                        </button>
                        <button type="button" onClick={() => openEdit(r)} style={iconBtn}>
                          <Pencil size={14} color={BRAND} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                width: "100%",
                maxWidth: 500,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Repair job</h3>
                <button type="button" onClick={closeModal} style={{ border: "none", background: "none", cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </div>

              {modal === "view" && (
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <strong>Ticket:</strong> {selected.ticket_number} — {selected.ticket_title}
                  </div>
                  <div>
                    <strong>Problem:</strong> {selected.problem ?? "—"}
                  </div>
                  <div>
                    <strong>Notes / action:</strong> {selected.action_taken || "—"}
                  </div>
                  <div>
                    <strong>Status:</strong> {selected.status}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {fmtDate(selected.started_at)} → {fmtDate(selected.completed_at)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <button type="button" onClick={() => openEdit(selected)} style={{ ...btnPrimary, border: `1.5px solid ${BRAND}`, background: "#fff", color: BRAND }}>
                      Update
                    </button>
                    <button type="button" onClick={closeModal} style={btnGhost}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal === "edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => {
                      setForm(f => ({ ...f, status: e.target.value as RepairStatus }));
                      setFormError("");
                    }}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Problem / summary</label>
                  <textarea
                    value={form.problem}
                    onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
                    rows={2}
                    maxLength={500}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Notes / action taken</label>
                  <textarea
                    value={form.action_taken}
                    onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
                    rows={3}
                    maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Start date</label>
                  <input type="date" value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))} style={inputStyle} />
                  <label style={{ fontSize: 12, fontWeight: 600 }}>End date</label>
                  <input type="date" value={form.completed_at} onChange={e => setForm(f => ({ ...f, completed_at: e.target.value }))} style={inputStyle} />
                  {formError && (
                    <div style={{ color: "#b91c1c", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                      <AlertTriangle size={14} /> {formError}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={closeModal} style={btnGhost}>
                      Cancel
                    </button>
                    <button type="button" onClick={save} disabled={saving} style={{ ...btnPrimary, background: BRAND, color: "#fff", opacity: saving ? 0.7 : 1 }}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnPrimary: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Poppins', sans-serif",
};

const btnGhost: React.CSSProperties = {
  ...btnPrimary,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

export default MyRepairs;
