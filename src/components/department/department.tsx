import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Pencil, Trash2, Eye, Search, ChevronUp, ChevronDown, X, AlertTriangle, ChevronLeft, ChevronRight, Building2 } from "lucide-react";

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ── Types ──────────────────────────────────────────────────────────────────────
type Department = {
  id: string;
  name: string;
  description: string;
  location: string;
  created_at: string;
  equipment_count?: number;
};

type Equipment = {
  id: string;
  name: string;
  type: string;
  brand: string;
  status: string;
  serial_number: string;
};

type SortField = "name" | "created_at";
type SortDir = "asc" | "desc";
type ModalMode = "add" | "edit" | "view" | null;

const brandBlue = "#0a4c86";
const PAGE_SIZE = 8;

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
  if (msg.includes("departments_name_key") || msg.includes("unique constraint"))
    return "A department with that name already exists. Please use a different name.";
  if (msg.includes("foreign key"))
    return "Cannot complete this action because related records exist.";
  if (msg.includes("not-null") || msg.includes("null value"))
    return "A required field is missing. Please fill in all required fields.";
  return msg;
}

// ── Main component ─────────────────────────────────────────────────────────────
const Departments: React.FC = () => {
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [equipment, setEquipment]       = useState<Equipment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [eqLoading, setEqLoading]       = useState(false);
  const [search, setSearch]             = useState("");
  const [sortField, setSortField]       = useState<SortField>("name");
  const [sortDir, setSortDir]           = useState<SortDir>("asc");
  const [page, setPage]                 = useState(1);
  const [modalMode, setModalMode]       = useState<ModalMode>(null);
  const [selected, setSelected]         = useState<Department | null>(null);
  const [toast, setToast]               = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm]                 = useState({ name: "", description: "", location: "" });
  const [formError, setFormError]       = useState("");
  const [submitting, setSubmitting]     = useState(false);

  // ── Fetch departments ────────────────────────────────────────────────────────
  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("departments")
      .select(`id, name, description, location, created_at, equipment:equipment(count)`)
      .order(sortField, { ascending: sortDir === "asc" });

    if (error) { showToast(friendlyError(error.message), "error"); setLoading(false); return; }

    const mapped: Department[] = (data ?? []).map((d: any) => ({
      ...d,
      equipment_count: d.equipment?.[0]?.count ?? 0,
    }));
    setDepartments(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchDepartments(); }, [sortField, sortDir]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtered + paginated ─────────────────────────────────────────────────────
  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase()) ||
    d.location?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Sort toggle ──────────────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Open modals ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: "", description: "", location: "" });
    setFormError("");
    setModalMode("add");
  };

  const openEdit = (d: Department) => {
    setSelected(d);
    setForm({ name: d.name, description: d.description ?? "", location: d.location ?? "" });
    setFormError("");
    setModalMode("edit");
  };

  const openView = async (d: Department) => {
    setSelected(d);
    setModalMode("view");
    setEqLoading(true);
    const { data, error } = await supabase
      .from("equipment")
      .select("id, name, type, brand, status, serial_number")
      .eq("department_id", d.id);
    if (error) showToast(friendlyError(error.message), "error");
    setEquipment(data ?? []);
    setEqLoading(false);
  };

  const closeModal = () => { setModalMode(null); setSelected(null); setEquipment([]); };

  // ── Submit add/edit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError("Department name is required."); return; }

    // Client-side duplicate check (case-insensitive)
    const dupQuery = supabase
      .from("departments")
      .select("id")
      .ilike("name", form.name.trim());
    if (modalMode === "edit" && selected) dupQuery.neq("id", selected.id);
    const { data: dup } = await dupQuery;
    if (dup && dup.length > 0) {
      setFormError("A department with that name already exists. Please use a different name.");
      return;
    }

    setSubmitting(true);
    if (modalMode === "add") {
      const { error } = await supabase.from("departments").insert({
        name: form.name.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
      });
      if (error) {
        // Catch any race-condition duplicate that slipped past the client check
        setFormError(friendlyError(error.message));
        setSubmitting(false);
        return;
      }
      showToast(`Department "${form.name.trim()}" added successfully.`, "success");
    } else if (modalMode === "edit" && selected) {
      const { error } = await supabase.from("departments").update({
        name: form.name.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
      }).eq("id", selected.id);
      if (error) {
        setFormError(friendlyError(error.message));
        setSubmitting(false);
        return;
      }
      showToast(`Department "${form.name.trim()}" updated successfully.`, "success");
    }
    setSubmitting(false);
    closeModal();
    fetchDepartments();
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (d: Department) => {
    if ((d.equipment_count ?? 0) > 0) {
      showToast("Cannot delete this department because it has equipment assigned. Reassign or remove the equipment first.", "error");
      return;
    }
    setDeleteTarget(d);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("departments").delete().eq("id", deleteTarget.id);
    if (error) showToast(friendlyError(error.message), "error");
    else showToast(`Department "${deleteTarget.name}" deleted.`, "success");
    setDeleteTarget(null);
    fetchDepartments();
  };

  // ── Sort icon ────────────────────────────────────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => (
    <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 4, verticalAlign: "middle" }}>
      <ChevronUp   size={10} color={sortField === field && sortDir === "asc"  ? brandBlue : "#cbd5e1"} />
      <ChevronDown size={10} color={sortField === field && sortDir === "desc" ? brandBlue : "#cbd5e1"} />
    </span>
  );

  // ── Shared input style ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif",
    outline: "none", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .departments-root, .departments-root * { box-sizing: border-box; }
        .dept-row:hover { background: #f8fafc !important; }
        .icon-btn:hover { background: #f1f5f9 !important; }
        .modal-overlay { animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal-box { animation: slideUp 0.18s ease; }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div className="departments-root" style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 24, zIndex: 9999,
            padding: "0.65rem 1.1rem", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
            color:      toast.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            maxWidth: 380,
          }}>
            {toast.msg}
          </div>
        )}

        {/* ── Header row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <div>
           <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={20} color={brandBlue} /> Departments
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>Manage office departments and their equipment.</p>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", borderRadius: 10, border: "none",
              background: brandBlue, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Poppins', sans-serif",
            }}
          >
            <Plus size={15} /> Add Department
          </button>
        </div>

        {/* ── Table card ── */}
        <div style={{
          background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0",
          boxShadow: "0 4px 24px rgba(15,23,42,0.07)", overflow: "hidden",
        }}>
          {/* Search bar */}
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative", maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search departments…"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {[
                    { label: "Department Name", field: "name" as SortField },
                    { label: "Description",     field: null },
                    { label: "Location",        field: null },
                    { label: "Equipment",       field: null },
                    { label: "Created",         field: "created_at" as SortField },
                    { label: "Actions",         field: null },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.field && toggleSort(col.field)}
                      style={{
                        padding: "0.7rem 1rem", textAlign: "left", fontWeight: 600,
                        color: "#475569", fontSize: 12, letterSpacing: "0.04em",
                        textTransform: "uppercase", whiteSpace: "nowrap",
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
                  <tr><td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No departments found.</td></tr>
                ) : paginated.map(d => (
                  <tr key={d.id} className="dept-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>{d.name}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.description || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {d.location || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{
                        padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: "rgba(10,76,134,0.08)", color: brandBlue,
                      }}>
                        {d.equipment_count ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(d.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { icon: <Eye size={14} />,    title: "View equipment", fn: () => openView(d),     color: "#0a4c86" },
                          { icon: <Pencil size={14} />, title: "Edit",           fn: () => openEdit(d),     color: "#0a4c86" },
                          { icon: <Trash2 size={14} />, title: "Delete",         fn: () => handleDelete(d), color: "#dc2626" },
                        ].map((btn, i) => (
                          <button key={i} title={btn.title} className="icon-btn" onClick={btn.fn}
                            style={{
                              width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                              background: "#fff", cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center", color: btn.color,
                              transition: "background 0.15s",
                            }}>
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
                }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                    background: n === page ? brandBlue : "#fff",
                    color: n === page ? "#fff" : "#475569",
                    fontWeight: n === page ? 600 : 400,
                    cursor: "pointer", fontSize: 12, fontFamily: "'Poppins', sans-serif",
                  }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: page === totalPages ? "#cbd5e1" : "#475569",
                }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Add / Edit Modal ── */}
        {(modalMode === "add" || modalMode === "edit") && (
          <div className="modal-overlay" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div className="modal-box" style={{
              background: "#fff", borderRadius: 18, padding: "1.6rem",
              width: "100%", maxWidth: 440, boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {modalMode === "add" ? "Add Department" : "Edit Department"}
                </h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Department Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(""); }}
                    placeholder="e.g. CENRO"
                    style={{ ...inputStyle, borderColor: formError ? "#fca5a5" : "#e2e8f0" }}
                  />
                  {formError && (
                    <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={11} /> {formError}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of the department…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Location <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. 2nd Floor, Room 201"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.4rem" }}>
                <button onClick={closeModal}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0",
                    background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500,
                    cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                  }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{
                    padding: "0.5rem 1.2rem", borderRadius: 8, border: "none",
                    background: brandBlue, color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Poppins', sans-serif",
                    opacity: submitting ? 0.7 : 1,
                  }}>
                  {submitting ? "Saving…" : modalMode === "add" ? "Add Department" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── View Equipment Modal ── */}
        {modalMode === "view" && selected && (
          <div className="modal-overlay" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div className="modal-box" style={{
              background: "#fff", borderRadius: 18, padding: "1.6rem",
              width: "100%", maxWidth: 680, boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              maxHeight: "85vh", display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selected.name}</h2>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>Assigned Equipment</p>
                </div>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {eqLoading ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem", fontSize: 14 }}>Loading assigned equipment…</p>
                ) : equipment.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem", fontSize: 14 }}>No equipment assigned to this department.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        {["Equipment Name", "Type", "Brand", "Serial Number", "Status"].map(h => (
                          <th key={h} style={{
                            padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600,
                            color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map(eq => (
                        <tr key={eq.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.65rem 0.9rem", fontWeight: 600 }}>{eq.name}</td>
                          <td style={{ padding: "0.65rem 0.9rem", color: "#475569" }}>{eq.type}</td>
                          <td style={{ padding: "0.65rem 0.9rem", color: "#475569" }}>{eq.brand}</td>
                          <td style={{ padding: "0.65rem 0.9rem", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{eq.serial_number}</td>
                          <td style={{ padding: "0.65rem 0.9rem" }}><StatusBadge status={eq.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm Modal ── */}
        {deleteTarget && (
          <div className="modal-overlay" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div className="modal-box" style={{
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
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Delete Department?</h2>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.4rem" }}>
                This will permanently delete <strong>{deleteTarget.name}</strong>. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: "0.5rem 1.1rem", borderRadius: 8, border: "1px solid #e2e8f0",
                    background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500,
                    cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                  }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{
                    padding: "0.5rem 1.1rem", borderRadius: 8, border: "none",
                    background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                  }}>
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

export default Departments;