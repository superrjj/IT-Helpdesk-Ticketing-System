import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, Pencil, Trash2, Eye, Search,
  ChevronUp, ChevronDown, X, AlertTriangle,
  ChevronLeft, ChevronRight, FileText,
  Monitor, Cpu, Wifi, Building2,
  Clock, CheckCircle, AlertCircle, Loader, User, Users,
  Ticket,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ── Types ──────────────────────────────────────────────────────────────────────
type IssueType = "Hardware" | "Software" | "Network / Internet";
type Status    = "Pending" | "In Progress" | "Resolved";
type SortField = "title" | "issue_type" | "status" | "date_submitted";
type SortDir   = "asc" | "desc";
type ModalMode = "add" | "edit" | "view" | null;

type FileReport = {
  id:             string;
  employee_name:  string;
  department_id:  string;
  issue_type:     IssueType;
  title:          string;
  description:    string; 
  status:         Status;
  date_submitted: string;
  assigned_to:    string[];
  action_taken:   string;
  started_at:     string | null;
  completed_at:   string | null;
  created_at:     string;
  updated_at:     string;
  technician_names?: string[];
};

type Department = { id: string; name: string };
type UserOption  = { id: string; full_name: string; role: string };

type AdminForm = {
  employee_name:  string;
  department_id:  string;
  issue_type:     IssueType;
  title:          string;
  description:    string;
  date_submitted: string;
  assigned_to:    string[];
};

type FormState = AdminForm;

const BRAND     = "#0a4c86";
const PAGE_SIZE = 10;

const ISSUE_TYPES: IssueType[] = ["Hardware", "Software", "Network / Internet"];
const STATUSES:    Status[]    = ["Pending", "In Progress", "Resolved"];

const ISSUE_TYPE_CONFIG: Record<IssueType, { icon: React.ReactNode; bg: string; activeBg: string; color: string; border: string }> = {
  "Hardware":           { icon: <Cpu size={14} />,     bg: "#f8fafc", activeBg: "rgba(10,76,134,0.08)",  color: "#0a4c86", border: "#0a4c86" },
  "Software":           { icon: <Monitor size={14} />, bg: "#f8fafc", activeBg: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "#7c3aed" },
  "Network / Internet": { icon: <Wifi size={14} />,    bg: "#f8fafc", activeBg: "rgba(6,182,212,0.08)",  color: "#0891b2", border: "#0891b2" },
};

const ISSUE_TYPE_BADGE_CONFIG: Record<IssueType, { icon: React.ReactNode; bg: string; color: string }> = {
  "Hardware":           { icon: <Cpu size={11} />,     bg: "rgba(10,76,134,0.09)",  color: "#0a4c86" },
  "Software":           { icon: <Monitor size={11} />, bg: "rgba(124,58,237,0.09)", color: "#7c3aed" },
  "Network / Internet": { icon: <Wifi size={11} />,    bg: "rgba(6,182,212,0.09)",  color: "#0891b2" },
};

const STATUS_CONFIG: Record<Status, { icon: React.ReactNode; bg: string; color: string }> = {
  "Pending":        { icon: <AlertCircle size={11} />, bg: "rgba(59,130,246,0.10)", color: "#475569" },
  "In Progress": { icon: <Loader size={11} />,      bg: "rgba(234,179,8,0.11)",  color: "#a16207" },
  "Resolved":    { icon: <CheckCircle size={11} />, bg: "rgba(22,163,74,0.10)",  color: "#15803d" },
};

function sanitize(val: string): string {
  return val.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;").trim();
}

function validateForm(form: FormState): string {
  const title = form.title.trim();
  if (!title)              return "Title is required.";
  if (title.length < 5)    return "Title must be at least 5 characters.";
  if (title.length > 150)  return "Title must be 150 characters or less.";
  if (!form.employee_name.trim()) return "Employee name is required.";
  if (form.employee_name.trim().length > 100) return "Employee name must be 100 characters or less.";
  if (!form.department_id) return "Department is required.";
  if (form.assigned_to.length === 0) return "Please assign at least one IT Staff.";
  if (form.description.trim().length > 2000) return "Description must be 2000 characters or less.";
  if (!ISSUE_TYPES.includes(form.issue_type)) return "Invalid issue type.";
  if (!form.date_submitted) return "Date submitted is required.";
  return "";
}

const emptyForm = (): FormState => ({
  employee_name:  "",
  department_id:  "",
  issue_type:     "Hardware",
  title:          "",
  description:    "",
  date_submitted: new Date().toISOString().slice(0, 10),
  assigned_to:    [],
});

function friendlyError(msg: string): string {
  if (msg.includes("foreign key"))  return "Cannot complete — a referenced record no longer exists.";
  if (msg.includes("not-null") || msg.includes("null value")) return "A required field is missing.";
  if (msg.includes("unique"))       return "A duplicate record already exists.";
  return msg;
}

// ✅ CHANGED: full month name, Philippine timezone
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" }) : "—";

// ── Badges ─────────────────────────────────────────────────────────────────────
const IssueTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const cfg = ISSUE_TYPE_BADGE_CONFIG[type as IssueType]
    ?? { icon: <Cpu size={11} />, bg: "rgba(10,76,134,0.09)", color: "#0a4c86" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {type}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status as Status]
    ?? { icon: <AlertCircle size={11} />, bg: "rgba(100,116,139,0.09)", color: "#475569" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {status}
    </span>
  );
};

const TechnicianCell: React.FC<{ names: string[] }> = ({ names }) => {
  if (!names || names.length === 0) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "nowrap", gap: 4, overflow: "hidden" }}>
      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(10,76,134,0.07)", color: BRAND, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: names.length > 1 ? 140 : 200 }}>
        {names[0]}
      </span>
      {names.length > 1 && (
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: `${BRAND}18`, color: BRAND, whiteSpace: "nowrap", flexShrink: 0 }}>
          +{names.length - 1}
        </span>
      )}
    </div>
  );
};

const TechnicianChips: React.FC<{ names: string[] }> = ({ names }) => {
  if (!names || names.length === 0) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {names.map((name, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(10,76,134,0.07)", color: BRAND }}>
          {name}
        </span>
      ))}
    </div>
  );
};

const TechnicianPicker: React.FC<{
  users: UserOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  hasError: boolean;
}> = ({ users, selected, onChange, hasError }) => {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <div style={{ border: `1px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, background: "#f8fafc", maxHeight: 130, overflowY: "auto", padding: "0.4rem", display: "flex", flexDirection: "column", gap: 2 }}>
      {users.length === 0 ? (
        <div style={{ padding: "0.5rem", fontSize: 12, color: "#94a3b8" }}>No active IT Staff found.</div>
      ) : users.map(u => {
        const active = selected.includes(u.id);
        return (
          <button key={u.id} type="button" onClick={() => toggle(u.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.45rem 0.6rem", borderRadius: 6, border: "none", background: active ? `${BRAND}10` : "transparent", cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.12s" }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${active ? BRAND : "#cbd5e1"}`, background: active ? BRAND : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {active && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? BRAND : "#374151", fontFamily: "'Poppins', sans-serif" }}>
              {u.full_name}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{u.role}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const SubmitTicket: React.FC = () => {
  const [reports, setReports]         = useState<FileReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [itStaff, setItStaff]         = useState<UserOption[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterIssueType, setFilterIssueType] = useState("All");
  const [filterStatus, setFilterStatus]       = useState("All");
  const [sortField, setSortField]     = useState<SortField>("date_submitted");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");
  const [page, setPage]               = useState(1);
  const [modalMode, setModalMode]     = useState<ModalMode>(null);
  const [selected, setSelected]       = useState<FileReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileReport | null>(null);
  const [form, setForm]               = useState<FormState>(emptyForm());
  const [formError, setFormError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const userMap = useMemo(() => {
    const m: Record<string, UserOption> = {};
    itStaff.forEach(u => { m[u.id] = u; });
    return m;
  }, [itStaff]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: reportData, error: reportError },
      { data: depts },
      { data: staff },
    ] = await Promise.all([
      supabase.from("file_reports").select("*").order(sortField, { ascending: sortDir === "asc" }),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("user_accounts").select("id, full_name, role").eq("is_active", true).eq("role", "IT Technician").order("full_name"),
    ]);
    // Set lookup tables first so names resolve immediately when reports render
    setDepartments((depts ?? []) as Department[]);
    setItStaff((staff ?? []) as UserOption[]);
    if (reportError) { showToast(friendlyError(reportError.message), "error"); setReports([]); }
    else setReports((reportData ?? []).map((r: any) => ({ ...r, assigned_to: Array.isArray(r.assigned_to) ? r.assigned_to : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [sortField, sortDir]);

  const reportsWithNames = useMemo(() =>
    reports.map(r => ({
      ...r,
      technician_names: (r.assigned_to ?? [])
        .map(id => userMap[id]?.full_name)
        .filter(Boolean) as string[],
    })),
  [reports, userMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reportsWithNames.filter(r => {
      const matchSearch    = !q || [r.title, r.description, r.employee_name, r.issue_type, ...(r.technician_names ?? [])].some(v => v.toLowerCase().includes(q));
      const matchIssueType = filterIssueType === "All" || r.issue_type === filterIssueType;
      const matchStatus    = filterStatus    === "All" || r.status      === filterStatus;
      return matchSearch && matchIssueType && matchStatus;
    });
  }, [reportsWithNames, search, filterIssueType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterIssueType, filterStatus]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

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

  const counts = useMemo(() => ({
    total:      reports.length,
    open:       reports.filter(r => r.status === "Pending").length,
    inProgress: reports.filter(r => r.status === "In Progress").length,
    resolved:   reports.filter(r => r.status === "Resolved").length,
  }), [reports]);

  const closeModal = () => {
    setModalMode(null); setSelected(null);
    setForm(emptyForm()); setFormError(""); setSubmitting(false);
  };
  const openAdd  = () => { closeModal(); setModalMode("add"); };
  const openEdit = (r: FileReport) => {
    closeModal(); setSelected(r);
    setForm({
      employee_name:  r.employee_name,
      department_id:  r.department_id,
      issue_type:     r.issue_type,
      title:          r.title,
      description:    r.description,
      date_submitted: r.date_submitted.slice(0, 10),
      assigned_to:    Array.isArray(r.assigned_to) ? r.assigned_to : [],
    });
    setModalMode("edit");
  };
  const openView = (r: FileReport) => { setSelected(r); setModalMode("view"); };

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    const err = validateForm(form);
    if (err) { setFormError(err); return; }
    setSubmitting(true);

    const payload = {
      employee_name:  sanitize(form.employee_name),
      department_id:  form.department_id,
      issue_type:     form.issue_type,
      title:          sanitize(form.title),
      description:    sanitize(form.description),
      date_submitted: new Date(form.date_submitted).toISOString(),
      assigned_to:    form.assigned_to,
    };

    if (modalMode === "add") {
      const { error } = await supabase.from("file_reports").insert({ ...payload, status: "Pending" });
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast("Ticket submitted successfully.", "success");
    } else if (modalMode === "edit" && selected) {
      const { error } = await supabase.from("file_reports").update(payload).eq("id", selected.id);
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast("Ticket updated successfully.", "success");
    }

    setSubmitting(false);
    closeModal();
    fetchAll();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("file_reports").delete().eq("id", deleteTarget.id);
    if (error) showToast(friendlyError(error.message), "error");
    else showToast(`Ticket "${deleteTarget.title}" deleted.`, "success");
    setDeleteTarget(null);
    fetchAll();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif",
    outline: "none", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name ?? id;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .ticket-root, .ticket-root * { box-sizing: border-box; }
        .ticket-row:hover { background: #f8fafc !important; }
        .icon-btn-ticket:hover { background: #f1f5f9 !important; }
        .modal-overlay-ticket { animation: ticketFadeIn 0.15s ease; }
        @keyframes ticketFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal-box-ticket { animation: ticketSlideUp 0.18s ease; }
        @keyframes ticketSlideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .ticket-filter { padding: 0.4rem 0.65rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-family: 'Poppins', sans-serif; color: #475569; outline: none; cursor: pointer; }
        .ticket-filter:focus { border-color: #0a4c86; }
        .ticket-issue-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .ticket-issue-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-size: 12px; font-family: 'Poppins', sans-serif; font-weight: 600; color: #64748b; transition: all 0.15s; white-space: nowrap; user-select: none; }
        .ticket-issue-pill:hover { border-color: #94a3b8; background: #f1f5f9; }
        .ticket-issue-pill.active-hw  { border-color: #0a4c86; background: rgba(10,76,134,0.08);  color: #0a4c86; }
        .ticket-issue-pill.active-sw  { border-color: #7c3aed; background: rgba(124,58,237,0.08); color: #7c3aed; }
        .ticket-issue-pill.active-net { border-color: #0891b2; background: rgba(6,182,212,0.08);  color: #0891b2; }
        .ticket-detail-row { display: flex; gap: 8px; font-size: 13px; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .ticket-detail-row:last-child { border-bottom: none; }
        .ticket-detail-label { font-size: 12px; font-weight: 600; color: #64748b; min-width: 140px; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
        @media (max-width: 1024px) { .ticket-stat-cards { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .ticket-stat-cards { grid-template-columns: 1fr !important; } .ticket-header-row { flex-direction: column; align-items: flex-start !important; } }
      `}</style>

      <div className="ticket-root" style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, padding: "0.65rem 1.1rem", borderRadius: 10, fontSize: 13, fontWeight: 500, background: toast.type === "success" ? "#dcfce7" : "#fee2e2", color: toast.type === "success" ? "#15803d" : "#b91c1c", border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxWidth: 380 }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="ticket-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={20} color={BRAND} /> Submit Ticket
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>
              Report IT issues and assign them directly to IT Staff.
            </p>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
            <Plus size={15} /> Submit Ticket
          </button>
        </div>

        {/* Stat cards */}
        <div className="ticket-stat-cards" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.2rem" }}>
          {[
            { label: "Total Tickets", value: counts.total,      color: BRAND,     icon: <Ticket size={16} /> },
            { label: "Pending",          value: counts.open,       color: "#475569", icon: <FileText size={16} /> },
            { label: "In Progress",   value: counts.inProgress, color: "#a16207", icon: <Loader size={16} /> },
            { label: "Resolved",      value: counts.resolved,   color: "#15803d", icon: <CheckCircle size={16} /> },
          ].map(c => (
            <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: "0.9rem 1rem", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color }}>
                  {c.icon}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.2rem", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…" style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
            <select className="ticket-filter" value={filterIssueType} onChange={e => setFilterIssueType(e.target.value)}>
              <option value="All">All Issue Types</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="ticket-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                    { label: "Problem",     field: "title"          as SortField },
                    { label: "Issue Type",  field: "issue_type"     as SortField },
                    { label: "Employee",    field: null },
                    { label: "Office",      field: null },
                    { label: "Assigned To", field: null },
                    { label: "Status",      field: "status"         as SortField },
                    { label: "Submitted",   field: "date_submitted" as SortField },
                    { label: "Actions",     field: null },
                  ] as { label: string; field: SortField | null }[]).map(col => (
                    <th key={col.label} onClick={() => col.field && toggleSort(col.field)}
                      style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", cursor: col.field ? "pointer" : "default", userSelect: "none" }}>
                      {col.label}{col.field && <SortIcon field={col.field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No tickets found.</td></tr>
                ) : paginated.map(r => (
                  <tr key={r.id} className="ticket-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><IssueTypeBadge type={r.issue_type} /></td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.employee_name}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: BRAND, background: "rgba(10,76,134,0.07)", padding: "2px 9px", borderRadius: 999 }}>
                        <Building2 size={11} /> {getDepartmentName(r.department_id)}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", maxWidth: 180 }}>
                      <TechnicianCell names={r.technician_names ?? []} />
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}><StatusBadge status={r.status} /></td>
                    {/* ✅ CHANGED: full month name, Philippine timezone */}
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(r.date_submitted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { icon: <Eye size={14} />,    title: "View",   fn: () => openView(r),        color: BRAND },
                          { icon: <Pencil size={14} />, title: "Edit",   fn: () => openEdit(r),        color: BRAND },
                          { icon: <Trash2 size={14} />, title: "Delete", fn: () => setDeleteTarget(r), color: "#dc2626" },
                        ].map((btn, i) => (
                          <button key={i} title={btn.title} className="icon-btn-ticket" onClick={btn.fn}
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
          <div className="modal-overlay-ticket" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div className="modal-box-ticket" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 620, maxHeight: "calc(100vh - 32px)", overflowY: "auto", boxShadow: "0 24px 60px rgba(15,23,42,0.2)" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {modalMode === "add" ? "Submit New Ticket" : "Edit Ticket"}
                </h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>

                {/* Issue Type pills — 3 options only */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Issue Type <span style={{ color: "#dc2626" }}>*</span></label>
                  <div className="ticket-issue-pills">
                    {ISSUE_TYPES.map(type => {
                      const active = form.issue_type === type;
                      const cls = type === "Hardware" ? "active-hw" : type === "Software" ? "active-sw" : "active-net";
                      return (
                        <button key={type} type="button" className={`ticket-issue-pill${active ? ` ${cls}` : ""}`}
                          onClick={() => { setForm(f => ({ ...f, issue_type: type })); setFormError(""); }}>
                          {ISSUE_TYPE_CONFIG[type].icon} {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Issue Title <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(""); }}
                    placeholder="Brief description of the issue" maxLength={150}
                    style={{ ...inputStyle, borderColor: formError && !form.title.trim() ? "#fca5a5" : "#e2e8f0" }} />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>{form.title.length}/150</div>
                </div>

                {/* Employee Name */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Employee Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={form.employee_name} onChange={e => { setForm(f => ({ ...f, employee_name: e.target.value })); setFormError(""); }}
                    placeholder="e.g. Juan Dela Cruz" maxLength={100}
                    style={{ ...inputStyle, borderColor: formError && !form.employee_name.trim() ? "#fca5a5" : "#e2e8f0" }} />
                </div>

                {/* Department */}
                <div>
                  <label style={labelStyle}>Department <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.department_id} onChange={e => { setForm(f => ({ ...f, department_id: e.target.value })); setFormError(""); }}
                    style={{ ...selectStyle, borderColor: formError && !form.department_id ? "#fca5a5" : "#e2e8f0" }}>
                    <option value="">— Select department —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {/* Date Submitted */}
                <div>
                  <label style={labelStyle}>Date Submitted <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="date" value={form.date_submitted} max={today}
                    onChange={e => { setForm(f => ({ ...f, date_submitted: e.target.value })); setFormError(""); }}
                    style={{ ...inputStyle, borderColor: formError && !form.date_submitted ? "#fca5a5" : "#e2e8f0" }} />
                </div>

                {/* Assign IT Staff */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} color="#475569" /> Assign IT Technician <span style={{ color: "#dc2626" }}>*</span>
                    {form.assigned_to.length > 0 && (
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: BRAND, background: `${BRAND}10`, padding: "1px 8px", borderRadius: 999 }}>
                        {form.assigned_to.length} selected
                      </span>
                    )}
                  </label>
                  <TechnicianPicker
                    users={itStaff}
                    selected={form.assigned_to}
                    onChange={ids => { setForm(f => ({ ...f, assigned_to: ids })); setFormError(""); }}
                    hasError={!!(formError && form.assigned_to.length === 0)}
                  />
                </div>

                {/* Description */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Description <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Provide detailed information about the issue..." rows={3} maxLength={2000}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>{form.description.length}/2000</div>
                </div>
              </div>

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
                  {submitting ? "Saving…" : modalMode === "add" ? "Submit Ticket" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ View Modal ══ */}
        {modalMode === "view" && selected && (
          <div className="modal-overlay-ticket" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div className="modal-box-ticket" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 32px)", overflowY: "auto", boxShadow: "0 24px 60px rgba(15,23,42,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 8 }}>{selected.title}</h2>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <IssueTypeBadge type={selected.issue_type} />
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", flexShrink: 0 }}><X size={18} /></button>
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND, marginBottom: 4 }}>Ticket Information</div>
              <div style={{ display: "flex", flexDirection: "column", marginBottom: "1rem" }}>
                {[
                  { label: "Employee",    value: selected.employee_name, icon: <User size={12} /> },
                  { label: "Department",  value: getDepartmentName(selected.department_id), icon: <Building2 size={12} /> },
                  {
                    // ✅ CHANGED: full month name, Philippine timezone
                    label: "Submitted",
                    value: new Date(selected.date_submitted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" }),
                    icon: <Clock size={12} />,
                  },
                  { label: "Assigned To", value: <TechnicianChips names={(selected.assigned_to ?? []).map(id => userMap[id]?.full_name).filter(Boolean) as string[]} />, icon: <Users size={12} /> },
                ].map(row => (
                  <div key={row.label} className="ticket-detail-row">
                    <span className="ticket-detail-label">{row.icon} {row.label}</span>
                    <span style={{ color: "#0f172a", flex: 1 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Description</div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
                    {selected.description}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#15803d", marginBottom: 4, marginTop: "0.5rem" }}>IT Technician Response</div>
              <div style={{ display: "flex", flexDirection: "column", marginBottom: "1rem" }}>
                {[
                  { label: "Start Date", value: fmtDate(selected.started_at),  icon: <Clock size={12} /> },
                  { label: "End Date",   value: fmtDate(selected.completed_at), icon: <Clock size={12} /> },
                ].map(row => (
                  <div key={row.label} className="ticket-detail-row">
                    <span className="ticket-detail-label">{row.icon} {row.label}</span>
                    <span style={{ color: "#0f172a" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selected.action_taken ? (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Action Taken</div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
                    {selected.action_taken}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "0.6rem 0.8rem", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#94a3b8", marginBottom: "1rem" }}>
                  No action taken yet — pending IT Technician response.
                </div>
              )}

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

        {/* ══ Delete Confirm ══ */}
        {deleteTarget && (
          <div className="modal-overlay-ticket" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div className="modal-box-ticket" style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(15,23,42,0.2)", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Delete Ticket?</h2>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.4rem" }}>
                Permanently delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.
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

export default SubmitTicket;