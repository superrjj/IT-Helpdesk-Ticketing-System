import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, Pencil, Trash2, Eye, Search,
  ChevronUp, ChevronDown, X, AlertTriangle,
  ChevronLeft, ChevronRight, Package,
  Clock, User, Users, Inbox,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type SortField = "date_received" | "unit_name" | "reported_by" | "created_at";
type SortDir = "asc" | "desc";
type ModalMode = "add" | "edit" | "view" | null;

type IncomingUnitRow = {
  id: string;
  date_received: string;
  unit_name: string;
  reported_by: string;
  received_by_user_id: string | null;
  issue_description: string;
  created_at: string;
  updated_at: string;
};

type UserOption = { id: string; full_name: string; role: string };

type FormState = {
  date_received: string;
  unit_name: string;
  reported_by: string;
  received_by_user_id: string;
  issue_description: string;
};

const BRAND = "#0a4c86";
const PAGE_SIZE = 10;

function sanitize(val: string): string {
  return val
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .trim();
}

function validateForm(form: FormState): string {
  if (!form.date_received) return "Date received is required.";

  const receivedDay = new Date(`${form.date_received}T12:00:00`);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (receivedDay > endOfToday) return "Date received cannot be in the future.";

  const unit = form.unit_name.trim();
  if (!unit) return "Unit name is required.";
  if (unit.length < 2) return "Unit name must be at least 2 characters.";
  if (unit.length > 200) return "Unit name must be 200 characters or less.";

  const reporter = form.reported_by.trim();
  if (!reporter) return "Reported by (employee name) is required.";
  if (reporter.length > 100) return "Reported by must be 100 characters or less.";

  if (!form.received_by_user_id.trim())
    return "Please select the IT staff member who received the unit.";

  const desc = form.issue_description.trim();
  if (!desc) return "Issue description is required.";
  if (desc.length < 10) return "Issue description must be at least 10 characters.";
  if (desc.length > 2000) return "Issue description must be 2000 characters or less.";

  return "";
}

function friendlyError(msg: string): string {
  if (msg.includes("foreign key")) return "Cannot complete — a referenced user account no longer exists.";
  if (msg.includes("not-null") || msg.includes("null value")) return "A required field is missing.";
  if (msg.includes("unique")) return "A duplicate record already exists.";
  return msg;
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

const emptyForm = (): FormState => ({
  date_received: new Date().toISOString().slice(0, 10),
  unit_name: "",
  reported_by: "",
  received_by_user_id: "",
  issue_description: "",
});

const StaffSinglePicker: React.FC<{
  users: UserOption[];
  selectedId: string;
  onChange: (id: string) => void;
  hasError: boolean;
}> = ({ users, selectedId, onChange, hasError }) => (
  <div
    style={{
      border: `1px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
      borderRadius: 8,
      background: "#f8fafc",
      maxHeight: 160,
      overflowY: "auto",
      padding: "0.4rem",
      display: "flex",
      flexDirection: "column",
      gap: 2,
    }}
  >
    {users.length === 0 ? (
      <div style={{ padding: "0.5rem", fontSize: 12, color: "#94a3b8" }}>No active IT staff found.</div>
    ) : (
      users.map(u => {
        const active = selectedId === u.id;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onChange(u.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              border: "none",
              background: active ? `${BRAND}10` : "transparent",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "background 0.12s",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                flexShrink: 0,
                border: `1.5px solid ${active ? BRAND : "#cbd5e1"}`,
                background: active ? BRAND : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {active && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
              )}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? BRAND : "#374151",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {u.full_name}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{u.role}</span>
          </button>
        );
      })
    )}
  </div>
);

const IncomingUnits: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const [rows, setRows] = useState<IncomingUnitRow[]>([]);
  const [itStaff, setItStaff] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date_received");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<IncomingUnitRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncomingUnitRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const userMap = useMemo(() => {
    const m: Record<string, UserOption> = {};
    itStaff.forEach(u => {
      m[u.id] = u;
    });
    return m;
  }, [itStaff]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: unitData, error: unitError }, { data: staff }] = await Promise.all([
      supabase.from("incoming_units").select("*").order(sortField, { ascending: sortDir === "asc" }),
      supabase
        .from("user_accounts")
        .select("id, full_name, role")
        .eq("is_active", true)
        .eq("role", "IT Technician")
        .order("full_name"),
    ]);

    setItStaff((staff ?? []) as UserOption[]);

    if (unitError) {
      showToast(friendlyError(unitError.message), "error");
      setRows([]);
    } else {
      setRows((unitData ?? []) as IncomingUnitRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [sortField, sortDir]);

  const rowsWithNames = useMemo(
    () =>
      rows.map(r => ({
        ...r,
        receiver_name: r.received_by_user_id
          ? userMap[r.received_by_user_id]?.full_name ?? "—"
          : "—",
      })),
    [rows, userMap]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsWithNames.filter(r => {
      if (!q) return true;
      const blob = [r.unit_name, r.reported_by, r.issue_description, r.receiver_name ?? ""]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rowsWithNames, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 4, verticalAlign: "middle" }}>
      <ChevronUp size={10} color={sortField === field && sortDir === "asc" ? BRAND : "#cbd5e1"} />
      <ChevronDown size={10} color={sortField === field && sortDir === "desc" ? BRAND : "#cbd5e1"} />
    </span>
  );

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setForm(emptyForm());
    setFormError("");
    setSubmitting(false);
  };

  const openAdd = () => {
    closeModal();
    setModalMode("add");
  };

  const openEdit = (r: IncomingUnitRow) => {
    closeModal();
    setSelected(r);
    setForm({
      date_received: r.date_received.slice(0, 10),
      unit_name: r.unit_name,
      reported_by: r.reported_by,
      received_by_user_id: r.received_by_user_id ?? "",
      issue_description: r.issue_description,
    });
    setModalMode("edit");
  };

  const openView = (r: IncomingUnitRow) => {
    setSelected(r);
    setModalMode("view");
  };

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);

    const basePayload = {
      date_received: new Date(form.date_received).toISOString(),
      unit_name: sanitize(form.unit_name),
      reported_by: sanitize(form.reported_by),
      received_by_user_id: form.received_by_user_id || null,
      issue_description: sanitize(form.issue_description),
    };

    if (modalMode === "add") {
      const { error } = await supabase.from("incoming_units").insert(basePayload);
      if (error) {
        setFormError(friendlyError(error.message));
        setSubmitting(false);
        return;
      }
      showToast("Incoming unit recorded successfully.", "success");
    } else if (modalMode === "edit" && selected) {
      const { error } = await supabase
        .from("incoming_units")
        .update({
          ...basePayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) {
        setFormError(friendlyError(error.message));
        setSubmitting(false);
        return;
      }
      showToast("Record updated successfully.", "success");
    }

    setSubmitting(false);
    closeModal();
    fetchAll();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("incoming_units").delete().eq("id", deleteTarget.id);
    if (error) showToast(friendlyError(error.message), "error");
    else showToast(`Removed "${deleteTarget.unit_name}" from incoming units.`, "success");
    setDeleteTarget(null);
    fetchAll();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    fontFamily: "'Poppins', sans-serif",
    outline: "none",
    color: "#0f172a",
    background: "#f8fafc",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
    display: "block",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .iu-root, .iu-root * { box-sizing: border-box; }
        .iu-row:hover { background: #f8fafc !important; }
        .icon-btn-iu:hover { background: #f1f5f9 !important; }
        .modal-overlay-iu { animation: iuFadeIn 0.15s ease; }
        @keyframes iuFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal-box-iu { animation: iuSlideUp 0.18s ease; }
        @keyframes iuSlideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .iu-detail-row { display: flex; gap: 8px; font-size: 13px; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .iu-detail-row:last-child { border-bottom: none; }
        .iu-detail-label { font-size: 12px; font-weight: 600; color: #64748b; min-width: 160px; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
      `}</style>

      <div className="iu-root" style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
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
              fontWeight: 500,
              background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#15803d" : "#b91c1c",
              border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              maxWidth: 380,
            }}
          >
            {toast.msg}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Inbox size={20} color={BRAND} /> Incoming Units
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>
              {readOnly
                ? "View-only list of units received by IT (you cannot add or change records)."
                : "Log equipment received by the IT office for repair or service."}
            </p>
          </div>
          {!readOnly && (
            <button
              onClick={openAdd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: 10,
                border: "none",
                background: BRAND,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <Plus size={15} /> Log incoming unit
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.2rem",
          }}
        >
          {[
            {
              label: "Total logged",
              value: rows.length,
              color: BRAND,
              icon: <Package size={16} />,
            },
            {
              label: "This list (filtered)",
              value: filtered.length,
              color: "#475569",
              icon: <Search size={16} />,
            },
          ].map(c => (
            <div
              key={c.label}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "0.9rem 1rem",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${c.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: c.color,
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {c.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.9rem 1.2rem",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.65rem",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search unit, employee, receiver, issue…"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
              Page {page}/{totalPages}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {(
                    [
                      { label: "Date received", field: "date_received" as SortField },
                      { label: "Unit name", field: "unit_name" as SortField },
                      { label: "Reported by", field: "reported_by" as SortField },
                      { label: "Received by", field: null },
                      { label: "Issue", field: null },
                      { label: "Logged", field: "created_at" as SortField },
                      { label: "Actions", field: null },
                    ] as { label: string; field: SortField | null }[]
                  ).map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.field && toggleSort(col.field)}
                      style={{
                        padding: "0.7rem 1rem",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#475569",
                        fontSize: 12,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        cursor: col.field ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                      Loading…
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                      No incoming units found.
                    </td>
                  </tr>
                ) : (
                  paginated.map(r => (
                    <tr
                      key={r.id}
                      className="iu-row"
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    >
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        {fmtDate(r.date_received)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 1rem",
                          fontWeight: 600,
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.unit_name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.reported_by}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.receiver_name}</td>
                      <td
                        style={{
                          padding: "0.75rem 1rem",
                          color: "#64748b",
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.issue_description}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
                        {fmtDate(r.created_at)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {(
                            readOnly
                              ? [{ icon: <Eye size={14} />, title: "View", fn: () => openView(r), color: BRAND }]
                              : [
                                  { icon: <Eye size={14} />, title: "View", fn: () => openView(r), color: BRAND },
                                  { icon: <Pencil size={14} />, title: "Edit", fn: () => openEdit(r), color: BRAND },
                                  {
                                    icon: <Trash2 size={14} />,
                                    title: "Delete",
                                    fn: () => setDeleteTarget(r),
                                    color: "#dc2626",
                                  },
                                ]
                          ).map((btn, i) => (
                            <button
                              key={i}
                              title={btn.title}
                              className="icon-btn-iu"
                              onClick={btn.fn}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: btn.color,
                                transition: "background 0.15s",
                              }}
                            >
                              {btn.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.2rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: page === 1 ? "#cbd5e1" : "#475569",
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: n === page ? BRAND : "#fff",
                    color: n === page ? "#fff" : "#475569",
                    fontWeight: n === page ? 600 : 400,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: page === totalPages ? "#cbd5e1" : "#475569",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {!readOnly && (modalMode === "add" || modalMode === "edit") && (
          <div
            className="modal-overlay-iu"
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
              className="modal-box-iu"
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "1.6rem",
                width: "100%",
                maxWidth: 620,
                maxHeight: "calc(100vh - 32px)",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.2rem",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {modalMode === "add" ? "Log incoming unit" : "Edit incoming unit"}
                </h2>
                <button
                  onClick={closeModal}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                <div>
                  <label style={labelStyle}>
                    Date received <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_received}
                    max={today}
                    onChange={e => {
                      setForm(f => ({ ...f, date_received: e.target.value }));
                      setFormError("");
                    }}
                    style={{
                      ...inputStyle,
                      borderColor:
                        formError && !form.date_received ? "#fca5a5" : "#e2e8f0",
                    }}
                  />
                </div>
                <div />

                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Unit name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    value={form.unit_name}
                    onChange={e => {
                      setForm(f => ({ ...f, unit_name: e.target.value }));
                      setFormError("");
                    }}
                    placeholder="e.g. Dell Latitude 5420 — Asset tag AT-1024"
                    maxLength={200}
                    style={{ ...inputStyle }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>
                    {form.unit_name.length}/200
                  </div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Reported by <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    value={form.reported_by}
                    onChange={e => {
                      setForm(f => ({ ...f, reported_by: e.target.value }));
                      setFormError("");
                    }}
                    placeholder="Employee who brought or reported the unit"
                    maxLength={100}
                    style={{ ...inputStyle }}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} color="#475569" />
                    Received by (IT staff) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <StaffSinglePicker
                    users={itStaff}
                    selectedId={form.received_by_user_id}
                    onChange={id => {
                      setForm(f => ({ ...f, received_by_user_id: id }));
                      setFormError("");
                    }}
                    hasError={!!(formError && !form.received_by_user_id)}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Issue description <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    value={form.issue_description}
                    onChange={e => {
                      setForm(f => ({ ...f, issue_description: e.target.value }));
                      setFormError("");
                    }}
                    placeholder="Describe the problem or service requested…"
                    rows={4}
                    maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>
                    {form.issue_description.length}/2000
                  </div>
                </div>
              </div>

              {formError && (
                <div
                  style={{
                    marginTop: "0.85rem",
                    padding: "0.55rem 0.8rem",
                    borderRadius: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={13} /> {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                <button
                  onClick={closeModal}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.2rem",
                    borderRadius: 8,
                    border: "none",
                    background: BRAND,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "'Poppins', sans-serif",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Saving…" : modalMode === "add" ? "Save record" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalMode === "view" && selected && (
          <div
            className="modal-overlay-iu"
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
              className="modal-box-iu"
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "1.6rem",
                width: "100%",
                maxWidth: 560,
                maxHeight: "calc(100vh - 32px)",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1.2rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 8 }}>
                    {selected.unit_name}
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: BRAND,
                      background: `${BRAND}12`,
                      padding: "2px 10px",
                      borderRadius: 999,
                    }}
                  >
                    Incoming unit
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: BRAND,
                  marginBottom: 4,
                }}
              >
                Receipt details
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginBottom: "1rem" }}>
                {[
                  { label: "Date received", value: fmtDate(selected.date_received), icon: <Clock size={12} /> },
                  { label: "Reported by", value: selected.reported_by, icon: <User size={12} /> },
                  {
                    label: "Received by",
                    value: selected.received_by_user_id
                      ? userMap[selected.received_by_user_id]?.full_name ?? "—"
                      : "—",
                    icon: <Users size={12} />,
                  },
                  {
                    label: "Logged on",
                    value: fmtDate(selected.created_at),
                    icon: <Clock size={12} />,
                  },
                ].map(row => (
                  <div key={row.label} className="iu-detail-row">
                    <span className="iu-detail-label">
                      {row.icon} {row.label}
                    </span>
                    <span style={{ color: "#0f172a", flex: 1 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                Issue description
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "0.75rem",
                  lineHeight: 1.7,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13,
                  marginBottom: "1rem",
                }}
              >
                {selected.issue_description}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                {!readOnly && (
                  <button
                    onClick={() => {
                      closeModal();
                      openEdit(selected);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 8,
                      border: `1.5px solid ${BRAND}`,
                      background: "#fff",
                      color: BRAND,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Poppins', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
                <button
                  onClick={closeModal}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {!readOnly && deleteTarget && (
          <div
            className="modal-overlay-iu"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="modal-box-iu"
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "1.6rem",
                width: "100%",
                maxWidth: 380,
                boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Delete record?</h2>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.4rem" }}>
                Permanently remove <strong>&quot;{deleteTarget.unit_name}&quot;</strong>? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: 8,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default IncomingUnits;
