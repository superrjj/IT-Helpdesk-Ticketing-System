import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, Pencil, Trash2, Search,
  ChevronUp, ChevronDown, X, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ── Types ──────────────────────────────────────────────────────────────────────
type EquipmentStatus = "Active" | "Defective" | "Under Repair" | "Retired";

type EquipmentRow = {
  id: string;
  department_id: string | null;
  name: string;
  type: string;
  brand: string;
  serial_number: string;
  status: EquipmentStatus;
  created_at: string;
  updated_at: string;
  department_name?: string;
};

type Department = {
  id: string;
  name: string;
};

type SortField = "name" | "type" | "brand" | "status" | "created_at";
type SortDir   = "asc" | "desc";
type ModalMode = "add" | "edit" | null;

const BRAND     = "#0a4c86";
const PAGE_SIZE = 10;

const STATUSES: EquipmentStatus[] = ["Active", "Defective", "Under Repair", "Retired"];

const EQUIPMENT_TYPES = [
  "Desktop", "Laptop", "Printer", "Scanner", "Monitor",
  "Keyboard", "Mouse", "UPS", "Network Switch", "Router",
  "Projector", "Server", "External Drive", "Webcam", "Others",
];

// ── Status badge ───────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; color: string }> = {
    Active:         { bg: "rgba(22,163,74,0.12)",   color: "#15803d" },
    Defective:      { bg: "rgba(220,38,38,0.12)",   color: "#b91c1c" },
    "Under Repair": { bg: "rgba(234,179,8,0.12)",   color: "#a16207" },
    Retired:        { bg: "rgba(100,116,139,0.12)", color: "#475569" },
  };
  const s = map[status] ?? { bg: "rgba(100,116,139,0.12)", color: "#475569" };
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 999, fontSize: 11,
      fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  );
};

// ── Friendly error mapper ──────────────────────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes("equipment_serial") || (msg.includes("unique") && msg.includes("serial")))
    return "A piece of equipment with that serial number already exists.";
  if (msg.includes("unique constraint"))
    return "This record already exists. Please check for duplicates.";
  if (msg.includes("foreign key"))
    return "Cannot complete this action because related records exist.";
  if (msg.includes("not-null") || msg.includes("null value"))
    return "A required field is missing. Please fill in all required fields.";
  return msg;
}

// ── Form validation ────────────────────────────────────────────────────────────
type FormState = {
  name: string;
  type: string;
  brand: string;
  serial_number: string;
  status: EquipmentStatus;
  department_id: string;
};

function validateForm(form: FormState): string {
  if (!form.name.trim())          return "Equipment name is required.";
  if (form.name.trim().length > 100) return "Equipment name must be 100 characters or less.";
  if (!form.type.trim())          return "Equipment type is required.";
  if (!form.brand.trim())         return "Brand is required.";
  if (form.brand.trim().length > 60) return "Brand must be 60 characters or less.";
  if (!form.serial_number.trim()) return "Serial number is required.";
  if (form.serial_number.trim().length > 60) return "Serial number must be 60 characters or less.";
  if (!STATUSES.includes(form.status)) return "Invalid status selected.";
  return "";
}

const emptyForm = (): FormState => ({
  name: "",
  type: "",
  brand: "",
  serial_number: "",
  status: "Active",
  department_id: "",
});

// ── Main component ─────────────────────────────────────────────────────────────
const Equipment: React.FC = () => {
  const [rows, setRows]             = useState<EquipmentRow[]>([]);
  const [departments, setDepts]     = useState<Department[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");
  const [sortField, setSortField]   = useState<SortField>("created_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [page, setPage]             = useState(1);
  const [modalMode, setModalMode]   = useState<ModalMode>(null);
  const [selected, setSelected]     = useState<EquipmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentRow | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [formError, setFormError]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchEquipment = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        id, department_id, name, type, brand, serial_number,
        status, created_at, updated_at,
        departments ( name )
      `)
      .order(sortField, { ascending: sortDir === "asc" });

    if (error) {
      showToast(friendlyError(error.message), "error");
      setRows([]);
    } else {
      const mapped: EquipmentRow[] = (data ?? []).map((r: any) => ({
        ...r,
        department_name: r.departments?.name ?? null,
      }));
      setRows(mapped);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });
    setDepts((data ?? []) as Department[]);
  };

  useEffect(() => { fetchEquipment(); }, [sortField, sortDir]);
  useEffect(() => { fetchDepartments(); }, []);

  // ── Filter + sort client-side ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchSearch = !q || [r.name, r.type, r.brand, r.serial_number, r.department_name ?? ""]
        .some(v => v.toLowerCase().includes(q));
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      const matchDept   = filterDept   === "All" || r.department_id === filterDept;
      return matchSearch && matchStatus && matchDept;
    });
  }, [rows, search, filterStatus, filterDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterStatus, filterDept]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // ── Sort toggle ──────────────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Modal helpers ────────────────────────────────────────────────────────────
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

  const openEdit = (r: EquipmentRow) => {
    closeModal();
    setSelected(r);
    setForm({
      name:          r.name,
      type:          r.type,
      brand:         r.brand,
      serial_number: r.serial_number,
      status:        r.status,
      department_id: r.department_id ?? "",
    });
    setModalMode("edit");
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateForm(form);
    if (err) { setFormError(err); return; }

    // Check serial number uniqueness
    const dupQ = supabase
      .from("equipment")
      .select("id")
      .ilike("serial_number", form.serial_number.trim());
    if (modalMode === "edit" && selected) dupQ.neq("id", selected.id);
    const { data: dupData } = await dupQ.limit(1);
    if (dupData && dupData.length > 0) {
      setFormError("A piece of equipment with that serial number already exists.");
      return;
    }

    setSubmitting(true);
    const payload = {
      name:          form.name.trim(),
      type:          form.type.trim(),
      brand:         form.brand.trim(),
      serial_number: form.serial_number.trim(),
      status:        form.status,
      department_id: form.department_id || null,
    };

    if (modalMode === "add") {
      const { error } = await supabase.from("equipment").insert(payload);
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast(`Equipment "${payload.name}" added successfully.`, "success");
    } else if (modalMode === "edit" && selected) {
      const { error } = await supabase.from("equipment").update(payload).eq("id", selected.id);
      if (error) { setFormError(friendlyError(error.message)); setSubmitting(false); return; }
      showToast(`Equipment "${payload.name}" updated successfully.`, "success");
    }

    setSubmitting(false);
    closeModal();
    fetchEquipment();
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("equipment").delete().eq("id", deleteTarget.id);
    if (error) showToast(friendlyError(error.message), "error");
    else showToast(`"${deleteTarget.name}" has been deleted.`, "success");
    setDeleteTarget(null);
    fetchEquipment();
  };

  // ── Sort icon ────────────────────────────────────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => (
    <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 4, verticalAlign: "middle" }}>
      <ChevronUp   size={10} color={sortField === field && sortDir === "asc"  ? BRAND : "#cbd5e1"} />
      <ChevronDown size={10} color={sortField === field && sortDir === "desc" ? BRAND : "#cbd5e1"} />
    </span>
  );

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif",
    outline: "none", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: "pointer", appearance: "auto",
  };

  // ── Summary counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:      rows.length,
    active:     rows.filter(r => r.status === "Active").length,
    defective:  rows.filter(r => r.status === "Defective").length,
    repair:     rows.filter(r => r.status === "Under Repair").length,
    retired:    rows.filter(r => r.status === "Retired").length,
  }), [rows]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .eq-root, .eq-root * { box-sizing: border-box; }
        .eq-row:hover { background: #f8fafc !important; }
        .icon-btn-eq:hover { background: #f1f5f9 !important; }
        .modal-overlay-eq { animation: eqFadeIn 0.15s ease; }
        @keyframes eqFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal-box-eq { animation: eqSlideUp 0.18s ease; }
        @keyframes eqSlideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .eq-filter-select { padding: 0.4rem 0.65rem; border-radius: 8; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-family: 'Poppins', sans-serif; color: #475569; outline: none; cursor: pointer; }
        .eq-filter-select:focus { border-color: #0a4c86; }
      `}</style>

      <div className="eq-root" style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 24, zIndex: 9999,
            padding: "0.65rem 1.1rem", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
            color:      toast.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxWidth: 380,
          }}>
            {toast.msg}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: 2 }}>Equipment</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>Manage all IT equipment across departments.</p>
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: 10, border: "none",
            background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Poppins', sans-serif",
          }}>
            <Plus size={15} /> Add Equipment
          </button>
        </div>

        {/* ── Summary stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.2rem" }}>
          {[
            { label: "Total",       value: counts.total,     color: BRAND,     bg: "rgba(10,76,134,0.07)"  },
            { label: "Active",      value: counts.active,    color: "#15803d", bg: "rgba(22,163,74,0.08)"  },
            { label: "Defective",   value: counts.defective, color: "#b91c1c", bg: "rgba(220,38,38,0.08)"  },
            { label: "Under Repair",value: counts.repair,    color: "#a16207", bg: "rgba(234,179,8,0.08)"  },
            { label: "Retired",     value: counts.retired,   color: "#475569", bg: "rgba(100,116,139,0.08)"},
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
        <div style={{
          background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0",
          boxShadow: "0 4px 24px rgba(15,23,42,0.07)", overflow: "hidden",
        }}>
          {/* Toolbar */}
          <div style={{
            padding: "0.9rem 1.2rem", borderBottom: "1px solid #f1f5f9",
            display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center",
          }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search equipment…"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>

            {/* Status filter */}
            <select className="eq-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Department filter */}
            <select className="eq-filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                    { label: "Equipment Name", field: "name"       as SortField },
                    { label: "Type",           field: "type"       as SortField },
                    { label: "Brand",          field: "brand"      as SortField },
                    { label: "Serial No.",     field: null },
                    { label: "Department",     field: null },
                    { label: "Status",         field: "status"     as SortField },
                    { label: "Created",        field: "created_at" as SortField },
                    { label: "Actions",        field: null },
                  ] as { label: string; field: SortField | null }[]).map(col => (
                    <th key={col.label}
                      onClick={() => col.field && toggleSort(col.field)}
                      style={{
                        padding: "0.7rem 1rem", textAlign: "left", fontWeight: 600,
                        color: "#475569", fontSize: 12, letterSpacing: "0.04em",
                        textTransform: "uppercase", whiteSpace: "nowrap",
                        cursor: col.field ? "pointer" : "default", userSelect: "none",
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
                  <tr><td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No equipment found.</td></tr>
                ) : paginated.map(r => (
                  <tr key={r.id} className="eq-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>{r.name}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.type || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{r.brand || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>
                      {r.serial_number || <span style={{ color: "#cbd5e1", fontFamily: "'Poppins', sans-serif" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {r.department_name
                        ? <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(10,76,134,0.07)", color: BRAND, fontSize: 12, fontWeight: 600 }}>{r.department_name}</span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title="Edit" className="icon-btn-eq" onClick={() => openEdit(r)} style={{
                          width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                          background: "#fff", cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center", color: BRAND,
                          transition: "background 0.15s",
                        }}><Pencil size={14} /></button>
                        <button title="Delete" className="icon-btn-eq" onClick={() => setDeleteTarget(r)} style={{
                          width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                          background: "#fff", cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center", color: "#dc2626",
                          transition: "background 0.15s",
                        }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.75rem 1.2rem", borderTop: "1px solid #f1f5f9",
          }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: page === 1 ? "#cbd5e1" : "#475569",
                }}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: n === page ? BRAND : "#fff",
                  color: n === page ? "#fff" : "#475569",
                  fontWeight: n === page ? 600 : 400,
                  cursor: "pointer", fontSize: 12, fontFamily: "'Poppins', sans-serif",
                }}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: page === totalPages ? "#cbd5e1" : "#475569",
                }}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* ── Add / Edit Modal ── */}
        {(modalMode === "add" || modalMode === "edit") && (
          <div className="modal-overlay-eq" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
            padding: 16,
          }}>
            <div className="modal-box-eq" style={{
              background: "#fff", borderRadius: 18, padding: "1.6rem",
              width: "100%", maxWidth: 520,
              maxHeight: "calc(100vh - 32px)", overflowY: "auto",
              boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
            }}>
              {/* Modal header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {modalMode === "add" ? "Add Equipment" : "Edit Equipment"}
                </h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <X size={18} />
                </button>
              </div>

              {/* 2-column grid form */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>

                {/* Equipment name — full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Equipment Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(""); }}
                    placeholder="e.g. HP LaserJet Printer"
                    style={{ ...inputStyle, borderColor: formError && !form.name.trim() ? "#fca5a5" : "#e2e8f0" }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={labelStyle}>Type <span style={{ color: "#dc2626" }}>*</span></label>
                  <select
                    value={form.type}
                    onChange={e => { setForm(f => ({ ...f, type: e.target.value })); setFormError(""); }}
                    style={{ ...selectStyle, borderColor: formError && !form.type ? "#fca5a5" : "#e2e8f0" }}
                  >
                    <option value="">Select type…</option>
                    {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label style={labelStyle}>Brand <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    value={form.brand}
                    onChange={e => { setForm(f => ({ ...f, brand: e.target.value })); setFormError(""); }}
                    placeholder="e.g. HP, Dell, Canon"
                    style={{ ...inputStyle, borderColor: formError && !form.brand.trim() ? "#fca5a5" : "#e2e8f0" }}
                  />
                </div>

                {/* Serial number */}
                <div>
                  <label style={labelStyle}>Serial Number <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    value={form.serial_number}
                    onChange={e => { setForm(f => ({ ...f, serial_number: e.target.value })); setFormError(""); }}
                    placeholder="e.g. SN-2024-00123"
                    style={{ ...inputStyle, borderColor: formError && !form.serial_number.trim() ? "#fca5a5" : "#e2e8f0" }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={labelStyle}>Status <span style={{ color: "#dc2626" }}>*</span></label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}
                    style={selectStyle}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Department — full width */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>
                    Department <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <select
                    value={form.department_id}
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">— Unassigned —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Validation error */}
              {formError && (
                <div style={{
                  marginTop: "0.85rem", padding: "0.55rem 0.8rem", borderRadius: 8,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  color: "#b91c1c", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <AlertTriangle size={13} /> {formError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                <button onClick={closeModal} style={{
                  padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                }}>Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} style={{
                  padding: "0.5rem 1.2rem", borderRadius: 8, border: "none",
                  background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'Poppins', sans-serif", opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? "Saving…" : modalMode === "add" ? "Add Equipment" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm Modal ── */}
        {deleteTarget && (
          <div className="modal-overlay-eq" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div className="modal-box-eq" style={{
              background: "#fff", borderRadius: 18, padding: "1.6rem",
              width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "#fee2e2",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1rem",
              }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Delete Equipment?</h2>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.4rem" }}>
                This will permanently delete <strong>{deleteTarget.name}</strong>
                {deleteTarget.serial_number && <> (S/N: <code style={{ fontSize: 12 }}>{deleteTarget.serial_number}</code>)</>}.
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setDeleteTarget(null)} style={{
                  padding: "0.5rem 1.1rem", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                }}>Cancel</button>
                <button onClick={confirmDelete} style={{
                  padding: "0.5rem 1.1rem", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Equipment;