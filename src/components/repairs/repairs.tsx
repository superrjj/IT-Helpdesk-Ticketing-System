import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, Pencil, Trash2, Eye, Search,
  ChevronUp, ChevronDown, X, AlertTriangle,
  ChevronLeft, ChevronRight, Wrench,
} from "lucide-react";

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ── Types ──────────────────────────────────────────────────────────────────────
type RepairStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
type SortField    = "status" | "created_at" | "started_at" | "completed_at";
type SortDir      = "asc" | "desc";
type ModalMode    = "add" | "edit" | "view" | null;

type Repair = {
  id:           string;
  report_id:    string | null;
  equipment_id: string | null;
  assigned_to:  string | null;
  diagnosis:    string;
  action_taken: string;
  status:       RepairStatus;
  cost:         number | null;
  started_at:   string | null;
  completed_at: string | null;
  created_at:   string;
  updated_at:   string;
  // joined
  equipment_name?:   string;
  equipment_serial?: string;
  report_title?:     string;
  technician_name?:  string;
};

type EquipmentOption = { id: string; name: string; serial_number: string };
type UserOption      = { id: string; full_name: string; username: string };
type ReportOption    = { id: string; title: string; equipment_id: string | null };

type FormState = {
  report_id:    string;
  equipment_id: string;
  assigned_to:  string;
  diagnosis:    string;
  action_taken: string;
  status:       RepairStatus;
  cost:         string;
  started_at:   string;
  completed_at: string;
};

const BRAND     = "#0a4c86";
const PAGE_SIZE = 10;
const REPAIR_STATUSES: RepairStatus[] = ["Pending", "In Progress", "Completed", "Cancelled"];

// ── Security: sanitize free-text ──────────────────────────────────────────────
function sanitize(val: string): string {
  return val
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .trim();
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateForm(form: FormState): string {
  if (!form.equipment_id)
    return "Please select the equipment being repaired.";
  if (!form.assigned_to)
    return "Please assign a technician.";
  if (!REPAIR_STATUSES.includes(form.status))
    return "Invalid status selected.";
  if (form.diagnosis.trim().length > 2000)
    return "Diagnosis must be 2000 characters or less.";
  if (form.action_taken.trim().length > 2000)
    return "Action taken must be 2000 characters or less.";
  if (form.cost !== "" && form.cost !== null) {
    const n = parseFloat(form.cost);
    if (isNaN(n) || n < 0)       return "Cost must be a positive number.";
    if (n > 9_999_999.99)        return "Cost value is too large.";
  }
  if (form.started_at && form.completed_at) {
    if (new Date(form.completed_at) < new Date(form.started_at))
      return "Completed date cannot be before the start date.";
  }
  if ((form.status === "Completed") && !form.completed_at)
    return "Please set a completion date for Completed repairs.";
  if ((form.status === "In Progress" || form.status === "Completed") && !form.started_at)
    return "Please set a start date for In Progress / Completed repairs.";
  return "";
}

const emptyForm = (): FormState => ({
  report_id:    "",
  equipment_id: "",
  assigned_to:  "",
  diagnosis:    "",
  action_taken: "",
  status:       "Pending",
  cost:         "",
  started_at:   "",
  completed_at: "",
});

// ── Friendly DB error mapper ──────────────────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes("foreign key"))
    return "Cannot complete — a referenced record no longer exists.";
  if (msg.includes("not-null") || msg.includes("null value"))
    return "A required field is missing.";
  if (msg.includes("unique"))
    return "A duplicate record already exists.";
  return msg;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const RepairStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; color: string }> = {
    "Pending":     { bg: "rgba(100,116,139,0.10)", color: "#475569" },
    "In Progress": { bg: "rgba(234,179,8,0.12)",   color: "#a16207" },
    "Completed":   { bg: "rgba(22,163,74,0.10)",   color: "#15803d" },
    "Cancelled":   { bg: "rgba(220,38,38,0.10)",   color: "#b91c1c" },
  };
  const s = map[status] ?? { bg: "rgba(100,116,139,0.10)", color: "#475569" };
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 999, fontSize: 11,
      fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color,
    }}>{status}</span>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtCost = (cost: number | null) =>
  cost != null ? `₱${cost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

// ── Main component ────────────────────────────────────────────────────────────
const Repairs: React.FC = () => {
  const [repairs, setRepairs]       = useState<Repair[]>([]);
  const [equipment, setEquipment]   = useState<EquipmentOption[]>([]);
  const [users, setUsers]           = useState<UserOption[]>([]);
  const [reports, setReports]       = useState<ReportOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortField, setSortField]   = useState<SortField>("created_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [page, setPage]             = useState(1);
  const [modalMode, setModalMode]   = useState<ModalMode>(null);
  const [selected, setSelected]     = useState<Repair | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Repair | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [formError, setFormError]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRepairs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repairs")
      .select(`
        id, report_id, equipment_id, assigned_to,
        diagnosis, action_taken, status, cost,
        started_at, completed_at, created_at, updated_at,
        equipment ( name, serial_number ),
        defective_reports ( title ),
        user_accounts ( full_name )
      `)
      .order(sortField, { ascending: sortDir === "asc" });

    if (error) {
      showToast(friendlyError(error.message), "error");
      setRepairs([]);
    } else {
      setRepairs((data ?? []).map((r: any) => ({
        ...r,
        equipment_name:   r.equipment?.name           ?? null,
        equipment_serial: r.equipment?.serial_number  ?? null,
        report_title:     r.defective_reports?.title  ?? null,
        technician_name:  r.user_accounts?.full_name  ?? null,
      })));
    }
    setLoading(false);
  };

  const fetchDropdowns = async () => {
    const [{ data: eq }, { data: ua }, { data: dr }] = await Promise.all([
      supabase.from("equipment").select("id, name, serial_number").order("name"),
      supabase.from("user_accounts").select("id, full_name, username").eq("is_active", true).order("full_name"),
      supabase.from("defective_reports").select("id, title, equipment_id").in("status", ["Open", "In Progress"]).order("created_at", { ascending: false }),
    ]);
    setEquipment((eq ?? []) as EquipmentOption[]);
    setUsers((ua ?? []) as UserOption[]);
    setReports((dr ?? []) as ReportOption[]);
  };

  useEffect(() => { fetchRepairs(); }, [sortField, sortDir]);
  useEffect(() => { fetchDropdowns(); }, []);

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repairs.filter(r => {
      const matchSearch = !q || [
        r.equipment_name ?? "", r.report_title ?? "",
        r.technician_name ?? "", r.diagnosis, r.action_taken,
      ].some(v => v.toLowerCase().includes(q));
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [repairs, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterStatus]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const SortIcon = ({ field }: { field: SortField }) => (
    <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 4, verticalAlign: "middle" }}>
      <ChevronUp   size={10} color={sortField === field && sortDir === "asc"  ? BRAND : "#cbd5e1"} />
      <ChevronDown size={10} color={sortField === field && sortDir === "desc" ? BRAND : "#cbd5e1"} />
    </span>
  );

  // ── Stat counts ───────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:      repairs.length,
    pending:    repairs.filter(r => r.status === "Pending").length,
    inProgress: repairs.filter(r => r.status === "In Progress").length,
    completed:  repairs.filter(r => r.status === "Completed").length,
    cancelled:  repairs.filter(r => r.status === "Cancelled").length,
  }), [repairs]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setForm(emptyForm());
    setFormError("");
    setSubmitting(false);
  };

  const openAdd = () => { closeModal(); setModalMode("add"); };

  const openEdit = (r: Repair) => {
    closeModal();
    setSelected(r);
    setForm({
      report_id:    r.report_id    ?? "",
      equipment_id: r.equipment_id ?? "",
      assigned_to:  r.assigned_to  ?? "",
      diagnosis:    r.diagnosis,
      action_taken: r.action_taken,
      status:       r.status,
      cost:         r.cost != null ? String(r.cost) : "",
      started_at:   r.started_at   ? r.started_at.slice(0, 10)   : "",
      completed_at: r.completed_at ? r.completed_at.slice(0, 10) : "",
    });
    setModalMode("edit");
  };

  const openView = (r: Repair) => { setSelected(r); setModalMode("view"); };

  // ── When report is selected, auto-fill equipment ──────────────────────────
  const handleReportChange = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    setForm(f => ({
      ...f,
      report_id:    reportId,
      equipment_id: report?.equipment_id ?? f.equipment_id,
    }));
    setFormError("");
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateForm(form);
    if (err) { setFormError(err); return; }

    setSubmitting(true);

    const payload = {
      report_id:    form.report_id    || null,
      equipment_id: form.equipment_id || null,
      assigned_to:  form.assigned_to  || null,
      diagnosis:    sanitize(form.diagnosis),
      action_taken: sanitize(form.action_taken),
      status:       form.status,
      cost:         form.cost !== "" ? parseFloat(form.cost) : null,
      started_at:   form.started_at   ? new Date(form.started_at).toISOString()   : null,
      completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : null,
    };

    if (modalMode === "add") {
      const { error } = await supabase.from("repairs").insert(payload);
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast("Repair job created successfully.", "success");
    } else if (modalMode === "edit" && selected) {
      const { error } = await supabase.from("repairs").update(payload).eq("id", selected.id);
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast("Repair job updated successfully.", "success");
    }

    setSubmitting(false);
    closeModal();
    fetchRepairs();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("repairs").delete().eq("id", deleteTarget.id);
    if (error) showToast(friendlyError(error.message), "error");
    else showToast("Repair job deleted.", "success");
    setDeleteTarget(null);
    fetchRepairs();
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif",
    outline: "none", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .rp-root, .rp-root * { box-sizing: border-box; }
        .rp-row:hover { background: #f8fafc !important; }
        .icon-btn-rp:hover { background: #f1f5f9 !important; }
        .modal-overlay-rp { animation: rpFadeIn 0.15s ease; }
        @keyframes rpFadeIn { from { opacity:0 } to { opacity:1 } }
        .modal-box-rp { animation: rpSlideUp 0.18s ease; }
        @keyframes rpSlideUp { from { transform:translateY(16px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .rp-filter { padding:0.4rem 0.65rem; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; font-size:12px; font-family:'Poppins',sans-serif; color:#475569; outline:none; cursor:pointer; }
        .rp-filter:focus { border-color:#0a4c86; }
        .rp-detail-row { display:flex; gap:8px; font-size:13px; padding:0.5rem 0; border-bottom:1px solid #f1f5f9; }
        .rp-detail-row:last-child { border-bottom:none; }
        .rp-detail-label { font-size:12px; font-weight:600; color:#64748b; min-width:130px; flex-shrink:0; }
      `}</style>

      <div className="rp-root" style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 24, zIndex: 9999,
            padding: "0.65rem 1.1rem", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
            color:      toast.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxWidth: 380,
          }}>{toast.msg}</div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 2, display: "flex", alignItems: "center", gap: 8 }}>
              <Wrench size={20} color={BRAND} /> Repairs
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>Track and manage equipment repair jobs.</p>
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: 10, border: "none",
            background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Poppins', sans-serif",
          }}>
            <Plus size={15} /> New Repair
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.2rem" }}>
          {[
            { label: "Total",       value: counts.total,      color: BRAND     },
            { label: "Pending",     value: counts.pending,    color: "#475569" },
            { label: "In Progress", value: counts.inProgress, color: "#a16207" },
            { label: "Completed",   value: counts.completed,  color: "#15803d" },
            { label: "Cancelled",   value: counts.cancelled,  color: "#b91c1c" },
          ].map(c => (
            <div key={c.label} style={{
              background: "#fff", borderRadius: 14, padding: "0.85rem 1rem",
              border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.07)", overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.2rem", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repairs…"
                style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
            <select className="rp-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {REPAIR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
              Page {page}/{totalPages}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {([
                    { label: "Equipment",   field: null },
                    { label: "Linked Report", field: null },
                    { label: "Technician",  field: null },
                    { label: "Status",      field: "status"       as SortField },
                    { label: "Cost",        field: null },
                    { label: "Started",     field: "started_at"   as SortField },
                    { label: "Completed",   field: "completed_at" as SortField },
                    { label: "Created",     field: "created_at"   as SortField },
                    { label: "Actions",     field: null },
                  ] as { label: string; field: SortField | null }[]).map(col => (
                    <th key={col.label}
                      onClick={() => col.field && toggleSort(col.field)}
                      style={{
                        padding: "0.7rem 1rem", textAlign: "left", fontWeight: 600,
                        color: "#475569", fontSize: 12, letterSpacing: "0.04em",
                        textTransform: "uppercase", whiteSpace: "nowrap",
                        cursor: col.field ? "pointer" : "default", userSelect: "none",
                      }}>
                      {col.label}{col.field && <SortIcon field={col.field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No repair jobs found.</td></tr>
                ) : paginated.map(r => (
                  <tr key={r.id} className="rp-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {r.equipment_name
                        ? <div>
                            <div style={{ fontWeight: 600 }}>{r.equipment_name}</div>
                            {r.equipment_serial && <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{r.equipment_serial}</div>}
                          </div>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                    <td style={{ padding: "0.75rem 1rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.report_title
                        ? <span style={{ padding: "2px 7px", borderRadius: 6, background: "rgba(220,38,38,0.07)", color: "#b91c1c", fontSize: 12, fontWeight: 600 }}>{r.report_title}</span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {r.technician_name ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}><RepairStatusBadge status={r.status} /></td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>
                      {fmtCost(r.cost)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(r.started_at)}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(r.completed_at)}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { icon: <Eye size={14} />,    title: "View",   fn: () => openView(r),       color: BRAND },
                          { icon: <Pencil size={14} />, title: "Edit",   fn: () => openEdit(r),       color: BRAND },
                          { icon: <Trash2 size={14} />, title: "Delete", fn: () => setDeleteTarget(r), color: "#dc2626" },
                        ].map((btn, i) => (
                          <button key={i} title={btn.title} className="icon-btn-rp" onClick={btn.fn}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: btn.color, transition: "background 0.15s" }}>
                            {btn.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.2rem", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: page === 1 ? "#cbd5e1" : "#475569" }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: n === page ? BRAND : "#fff", color: n === page ? "#fff" : "#475569", fontWeight: n === page ? 600 : 400, cursor: "pointer", fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: page === totalPages ? "#cbd5e1" : "#475569" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ══ Add / Edit Modal ══ */}
        {(modalMode === "add" || modalMode === "edit") && (
          <div className="modal-overlay-rp" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div className="modal-box-rp" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 580, maxHeight: "calc(100vh - 32px)", overflowY: "auto", boxShadow: "0 24px 60px rgba(15,23,42,0.2)" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {modalMode === "add" ? "New Repair Job" : "Edit Repair Job"}
                </h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>

                {/* Linked defective report — optional, full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Linked Defective Report <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <select value={form.report_id} onChange={e => handleReportChange(e.target.value)} style={selectStyle}>
                    <option value="">— None (proactive repair) —</option>
                    {reports.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                  {form.report_id && (
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                      Equipment has been auto-filled from the selected report.
                    </p>
                  )}
                </div>

                {/* Equipment — full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Equipment <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.equipment_id}
                    onChange={e => { setForm(f => ({ ...f, equipment_id: e.target.value })); setFormError(""); }}
                    style={{ ...selectStyle, borderColor: formError && !form.equipment_id ? "#fca5a5" : "#e2e8f0" }}>
                    <option value="">— Select equipment —</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name}{eq.serial_number ? ` (${eq.serial_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned technician */}
                <div>
                  <label style={labelStyle}>Assigned Technician <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.assigned_to}
                    onChange={e => { setForm(f => ({ ...f, assigned_to: e.target.value })); setFormError(""); }}
                    style={{ ...selectStyle, borderColor: formError && !form.assigned_to ? "#fca5a5" : "#e2e8f0" }}>
                    <option value="">— Select technician —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={labelStyle}>Status <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.status}
                    onChange={e => {
                      const s = e.target.value as RepairStatus;
                      setForm(f => ({
                        ...f,
                        status: s,
                        started_at:   (s === "Pending") ? "" : f.started_at,
                        completed_at: (s !== "Completed") ? "" : f.completed_at,
                      }));
                      setFormError("");
                    }}
                    style={selectStyle}>
                    {REPAIR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Start date — shown when In Progress or Completed */}
                {(form.status === "In Progress" || form.status === "Completed") && (
                  <div>
                    <label style={labelStyle}>Start Date <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="date" value={form.started_at} max={today}
                      onChange={e => { setForm(f => ({ ...f, started_at: e.target.value })); setFormError(""); }}
                      style={{ ...inputStyle, borderColor: formError && !form.started_at ? "#fca5a5" : "#e2e8f0" }}
                    />
                  </div>
                )}

                {/* Completion date — shown only when Completed */}
                {form.status === "Completed" && (
                  <div>
                    <label style={labelStyle}>Completion Date <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="date" value={form.completed_at}
                      min={form.started_at || undefined} max={today}
                      onChange={e => { setForm(f => ({ ...f, completed_at: e.target.value })); setFormError(""); }}
                      style={{ ...inputStyle, borderColor: formError && !form.completed_at ? "#fca5a5" : "#e2e8f0" }}
                    />
                  </div>
                )}

                {/* Cost */}
                <div>
                  <label style={labelStyle}>
                    Repair Cost (₱) <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input type="number" min="0" step="0.01" value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>

                {/* Diagnosis — full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Diagnosis <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea value={form.diagnosis}
                    onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                    placeholder="What was found to be wrong with the equipment…"
                    rows={3} maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>{form.diagnosis.length}/2000</div>
                </div>

                {/* Action taken — full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Action Taken <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea value={form.action_taken}
                    onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
                    placeholder="Describe what was done to fix the equipment…"
                    rows={3} maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>{form.action_taken.length}/2000</div>
                </div>
              </div>

              {/* Validation error */}
              {formError && (
                <div style={{ marginTop: "0.85rem", padding: "0.55rem 0.8rem", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} /> {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                <button onClick={closeModal} style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting} style={{ padding: "0.5rem 1.2rem", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Poppins', sans-serif", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Saving…" : modalMode === "add" ? "Create Repair" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ View Modal ══ */}
        {modalMode === "view" && selected && (
          <div className="modal-overlay-rp" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div className="modal-box-rp" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 540, maxHeight: "calc(100vh - 32px)", overflowY: "auto", boxShadow: "0 24px 60px rgba(15,23,42,0.2)" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 6 }}>
                    {selected.equipment_name ?? "Repair Job"}
                  </h2>
                  <RepairStatusBadge status={selected.status} />
                </div>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", flexShrink: 0 }}><X size={18} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { label: "Equipment",       value: selected.equipment_name ? `${selected.equipment_name}${selected.equipment_serial ? ` — ${selected.equipment_serial}` : ""}` : "—" },
                  { label: "Linked Report",   value: selected.report_title ?? "—" },
                  { label: "Technician",      value: selected.technician_name ?? "—" },
                  { label: "Cost",            value: fmtCost(selected.cost) },
                  { label: "Started",         value: fmtDate(selected.started_at) },
                  { label: "Completed",       value: fmtDate(selected.completed_at) },
                  { label: "Created",         value: fmtDate(selected.created_at) },
                ].map(row => (
                  <div key={row.label} className="rp-detail-row">
                    <span className="rp-detail-label">{row.label}</span>
                    <span style={{ color: "#0f172a" }}>{row.value}</span>
                  </div>
                ))}

                {selected.diagnosis && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Diagnosis</div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
                      {selected.diagnosis}
                    </div>
                  </div>
                )}

                {selected.action_taken && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Action Taken</div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
                      {selected.action_taken}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                <button onClick={() => { closeModal(); openEdit(selected); }}
                  style={{ padding: "0.5rem 1rem", borderRadius: 8, border: `1.5px solid ${BRAND}`, background: "#fff", color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={closeModal}
                  style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Delete Confirm Modal ══ */}
        {deleteTarget && (
          <div className="modal-overlay-rp" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div className="modal-box-rp" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(15,23,42,0.2)", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Delete Repair Job?</h2>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.4rem" }}>
                This will permanently delete the repair job for <strong>{deleteTarget.equipment_name ?? "this equipment"}</strong>. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ padding: "0.5rem 1.1rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{ padding: "0.5rem 1.1rem", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
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

export default Repairs;