import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { KeyRound, Plus, Pencil, Trash2, Search, X, User, Mail, Shield, Lock, AlertTriangle, ChevronDown } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Role = "Administrator" | "IT Technician";
type ModalMode = "add" | "edit" | null;

type UserAccount = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SignupRequest = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  password_hash: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const BRAND = "#0a4c86";
const PAGE_SIZE = 8;
const BCRYPT_ROUNDS = 10;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username: string) {
  const u = username.trim();
  if (u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 32) return "Username must be at most 32 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(u)) return "Username can only contain letters, numbers, and underscore.";
  return "";
}

function validatePassword(pw: string) {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 72) return "Password is too long (max 72 characters for bcrypt).";
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /\d/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);
  if ([hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length < 2) {
    return "Password should include at least 2 of: uppercase, lowercase, number, symbol.";
  }
  return "";
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem 0.6rem 2.25rem",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 13,
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  marginBottom: 5,
  display: "block",
};

function InputField({
  label, icon, required, children,
}: { label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={fieldLabel}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#94a3b8", pointerEvents: "none", display: "flex", zIndex: 1,
          }}>{icon}</span>
        )}
        {children}
      </div>
    </div>
  );
}

export default function UserAccounts() {
  const [rows, setRows] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [pending, setPending] = useState<SignupRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [resetPw, setResetPw] = useState(false);

  const [form, setForm] = useState({
    username: "", full_name: "", email: "",
    role: "IT Technician" as Role,
    is_active: true, password: "", confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_accounts")
      .select("id, username, full_name, email, role, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) { showToast(error.message, "error"); setRows([]); setUsersError(error.message); }
    else { setRows((data ?? []) as UserAccount[]); setUsersError(null); }
    setLoading(false);
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    const { data, error } = await supabase
      .from("signup_requests")
      .select("id, full_name, username, email, password_hash, status, created_at")
      .eq("status", "pending").order("created_at", { ascending: true });
    if (error) { showToast(error.message, "error"); setPending([]); setPendingError(error.message); }
    else { setPending((data ?? []) as SignupRequest[]); setPendingError(null); }
    setPendingLoading(false);
  };

  useEffect(() => { fetchUsers(); fetchPending(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.username, r.full_name, r.email, r.role].some(v => v.toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const closeModal = () => {
    setModalMode(null); setSelected(null); setDeleteTarget(null);
    setResetPw(false); setFormError(""); setSubmitting(false);
    setForm({ username: "", full_name: "", email: "", role: "IT Technician", is_active: true, password: "", confirmPassword: "" });
  };

  const openAdd = () => { closeModal(); setModalMode("add"); };
  const openEdit = (u: UserAccount) => {
    closeModal(); setSelected(u);
    setForm({ username: u.username, full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active, password: "", confirmPassword: "" });
    setModalMode("edit");
  };

  const checkUniqueness = async (username: string, email: string, excludeId?: string) => {
    const uq = supabase.from("user_accounts").select("id").ilike("username", username.trim());
    if (excludeId) uq.neq("id", excludeId);
    const { data: uData, error: uErr } = await uq.limit(1);
    if (uErr) return uErr.message;
    if (uData && uData.length > 0) return "Username already exists.";
    const eq = supabase.from("user_accounts").select("id").ilike("email", email.trim());
    if (excludeId) eq.neq("id", excludeId);
    const { data: eData, error: eErr } = await eq.limit(1);
    if (eErr) return eErr.message;
    if (eData && eData.length > 0) return "Email already exists.";
    return "";
  };

  const validateForm = async () => {
    const uErr = validateUsername(form.username);
    if (uErr) return uErr;
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!isValidEmail(form.email.trim())) return "Email is invalid.";
    if (modalMode === "add" || (modalMode === "edit" && resetPw)) {
      const pErr = validatePassword(form.password);
      if (pErr) return pErr;
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    return await checkUniqueness(form.username, form.email, modalMode === "edit" && selected ? selected.id : undefined);
  };

  const submit = async () => {
    if (!modalMode) return;
    setFormError(""); setSubmitting(true);
    try {
      const err = await validateForm();
      if (err) { setFormError(err); setSubmitting(false); return; }
      if (modalMode === "add") {
        const password_hash = await bcrypt.hash(form.password, BCRYPT_ROUNDS);
        const { error } = await supabase.from("user_accounts").insert({
          username: form.username.trim(), full_name: form.full_name.trim(),
          email: form.email.trim(), role: form.role, is_active: form.is_active, password_hash,
        });
        if (error) throw new Error(error.message);
        showToast("User created.", "success");
      } else if (modalMode === "edit" && selected) {
        const payload: Record<string, any> = {
          username: form.username.trim(), full_name: form.full_name.trim(),
          email: form.email.trim(), role: form.role, is_active: form.is_active,
        };
        if (resetPw) payload.password_hash = await bcrypt.hash(form.password, BCRYPT_ROUNDS);
        const { error } = await supabase.from("user_accounts").update(payload).eq("id", selected.id);
        if (error) throw new Error(error.message);
        showToast("User updated.", "success");
      }
      closeModal(); fetchUsers();
    } catch (e: any) {
      setFormError(e?.message ?? "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (u: UserAccount) => {
    const { error } = await supabase.from("user_accounts").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) showToast(error.message, "error");
    else { showToast(u.is_active ? "Deactivated." : "Activated.", "success"); fetchUsers(); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("user_accounts").delete().eq("id", deleteTarget.id);
    if (error) showToast(error.message, "error");
    else showToast("Deleted.", "success");
    closeModal(); fetchUsers();
  };

  const approveRequest = async (r: SignupRequest) => {
    const uniqErr = await checkUniqueness(r.username, r.email);
    if (uniqErr) { showToast(uniqErr, "error"); return; }
    const { error: insertErr } = await supabase.from("user_accounts").insert({
      username: r.username.trim(), full_name: r.full_name.trim(), email: r.email.trim(),
      role: "IT Technician", is_active: true, password_hash: r.password_hash,
    });
    if (insertErr) { showToast(insertErr.message, "error"); return; }
    const { error: updErr } = await supabase.from("signup_requests").update({ status: "approved" }).eq("id", r.id);
    if (updErr) { showToast(updErr.message, "error"); return; }
    showToast("Request approved.", "success"); fetchUsers(); fetchPending();
  };

  const rejectRequest = async (r: SignupRequest) => {
    const { error } = await supabase.from("signup_requests").update({ status: "rejected" }).eq("id", r.id);
    if (error) showToast(error.message, "error");
    else { showToast("Request rejected.", "success"); fetchPending(); }
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", color: "#0f172a" }}>
      <style>{`
        .ua-modal-overlay {
          position: fixed; inset: 0;
          /* ✅ Default dim overlay — no blur */
          background: rgba(15, 23, 42, 0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
          animation: fadeIn 0.15s ease;
        }
        .ua-modal-box {
          width: min(540px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          overflow-y: auto; overflow-x: hidden;
          background: #fff; border-radius: 20px;
          box-shadow: 0 32px 80px rgba(10,20,60,0.22), 0 0 0 1px rgba(10,76,134,0.07);
          animation: slideUp 0.2s ease;
        }
        .ua-modal-box--sm { width: min(420px, calc(100vw - 32px)); }
        .ua-modal-header {
          padding: 1.3rem 1.4rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8faff 0%, #eef4ff 100%);
          border-radius: 20px 20px 0 0;
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .ua-modal-body { padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 14px; }
        .ua-modal-footer {
          padding: 1rem 1.4rem;
          border-top: 1px solid #f1f5f9;
          background: #fafbfc;
          border-radius: 0 0 20px 20px;
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .ua-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ua-span2 { grid-column: span 2; }
        .ua-input { transition: border-color 0.15s, box-shadow 0.15s; }
        .ua-input:focus { border-color: #0a4c86 !important; box-shadow: 0 0 0 3px rgba(10,76,134,0.10) !important; outline: none; }
        /* ✅ Remove native dropdown arrow, add padding for custom chevron */
        .ua-select {
          appearance: none;
          -webkit-appearance: none;
          padding-right: 2.2rem !important;
        }
        .ua-btn-close:hover { background: #f1f5f9 !important; }
        .ua-btn-cancel:hover { background: #f8fafc !important; }
        .ua-btn-save:hover { opacity: 0.92; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @media (max-width: 560px) {
          .ua-grid { grid-template-columns: 1fr; }
          .ua-span2 { grid-column: span 1; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          padding: "0.65rem 1rem", borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
          color: toast.type === "success" ? "#166534" : "#b91c1c",
          border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        }}>{toast.msg}</div>
      )}

      {(pendingError || usersError) && (
        <div style={{ marginBottom: 14, padding: "0.75rem 0.9rem", borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
          {pendingError && <div>Pending approvals error: <span style={{ fontFamily: "monospace" }}>{pendingError}</span></div>}
          {!pendingError && usersError && <div>User accounts error: <span style={{ fontFamily: "monospace" }}>{usersError}</span></div>}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>User Accounts</h2>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>Passwords are stored as bcrypt hashes.</div>
        </div>
        <button onClick={openAdd} style={{ display: "inline-flex", gap: 8, alignItems: "center", border: "none", background: BRAND, color: "#fff", padding: "0.55rem 0.9rem", borderRadius: 10, cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 12px rgba(10,76,134,0.25)" }}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Pending approvals */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, letterSpacing: 1 }}>Pending approvals</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{pendingLoading ? "Loading…" : `${pending.length} pending`}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.04em", color: "#475569" }}>
                {["Full name", "Username", "Email", "Requested", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingLoading ? (
                <tr><td colSpan={5} style={{ padding: "1.4rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "1.4rem", textAlign: "center", color: "#94a3b8" }}>No pending requests.</td></tr>
              ) : pending.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>{r.full_name}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{r.username}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{r.email}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => approveRequest(r)} style={{ border: "none", background: "#16a34a", color: "#fff", padding: "0.45rem 0.75rem", borderRadius: 10, cursor: "pointer", fontWeight: 900 }}>Approve</button>
                      <button onClick={() => rejectRequest(r)} style={{ border: "none", background: "#dc2626", color: "#fff", padding: "0.45rem 0.75rem", borderRadius: 10, cursor: "pointer", fontWeight: 900 }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ position: "relative", maxWidth: 380, width: "100%" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width: "100%", padding: "0.55rem 0.7rem 0.55rem 32px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none", fontSize: 13 }} />
          </div>
          <div style={{ alignSelf: "center", fontSize: 12, color: "#64748b" }}>Page {page}/{totalPages}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.04em", color: "#475569" }}>
                {["Username", "Full name", "Email", "Role", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No users.</td></tr>
              ) : paginated.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>{u.username}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{u.full_name}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                      background: u.role === "Administrator" ? "rgba(10,76,134,0.10)" : "rgba(124,58,237,0.09)",
                      color: u.role === "Administrator" ? "#0a4c86" : "#6d28d9",
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <button onClick={() => toggleActive(u)} style={{
                      border: "1px solid " + (u.is_active ? "#bbf7d0" : "#fecaca"),
                      background: u.is_active ? "#dcfce7" : "#fee2e2",
                      color: u.is_active ? "#166534" : "#b91c1c",
                      padding: "0.2rem 0.55rem", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 11,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>{u.is_active ? "Active" : "Inactive"}</button>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(u)} title="Edit" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Pencil size={16} color={BRAND} />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} title="Delete" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={16} color="#dc2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0.9rem 1rem" }}>
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "0.45rem 0.8rem", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#cbd5e1" : "#475569", fontWeight: 700 }}>Prev</button>
          <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "0.45rem 0.8rem", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#cbd5e1" : "#475569", fontWeight: 700 }}>Next</button>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="ua-modal-overlay">
          <div className="ua-modal-box">
            <div className="ua-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                    {modalMode === "add" ? "Add New User" : "Edit User"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                    {modalMode === "add" ? "Create a new user account" : `Editing account: ${selected?.username}`}
                  </div>
                </div>
              </div>
              <button className="ua-btn-close" onClick={closeModal}
                style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0, transition: "background 0.15s" }}>
                <X size={15} />
              </button>
            </div>

            <div className="ua-modal-body">
              <div className="ua-grid">

                <InputField label="Username" icon={<User size={13} />} required>
                  <input className="ua-input" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. jdela_cruz" style={{ ...fieldInput }} />
                </InputField>

                {/* ✅ Role with custom chevron dropdown */}
                <InputField label="Role" icon={<Shield size={13} />} required>
                  <select className="ua-input ua-select" value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    style={{ ...fieldInput }}>
                    <option value="IT Technician">IT Technician</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", display: "flex" }}>
                    <ChevronDown size={14} />
                  </span>
                </InputField>

                <div className="ua-span2">
                  <InputField label="Full Name" icon={<User size={13} />} required>
                    <input className="ua-input" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="e.g. Juan Dela Cruz" style={{ ...fieldInput }} />
                  </InputField>
                </div>

                <div className="ua-span2">
                  <InputField label="Email Address" icon={<Mail size={13} />} required>
                    <input className="ua-input" type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. juan@example.com" style={{ ...fieldInput }} />
                  </InputField>
                </div>

                {modalMode === "edit" && (
                  <div className="ua-span2">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0.9rem", borderRadius: 12, border: `1.5px solid ${resetPw ? "rgba(10,76,134,0.25)" : "#e2e8f0"}`, background: resetPw ? "rgba(10,76,134,0.04)" : "#f8fafc", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <KeyRound size={14} color={resetPw ? BRAND : "#94a3b8"} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: resetPw ? BRAND : "#475569" }}>Reset Password</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>Set a new password for this user</div>
                        </div>
                      </div>
                      <button onClick={() => { setResetPw(v => !v); setForm(f => ({ ...f, password: "", confirmPassword: "" })); }}
                        style={{ border: `1.5px solid ${resetPw ? BRAND : "#e2e8f0"}`, background: resetPw ? BRAND : "#fff", color: resetPw ? "#fff" : "#64748b", borderRadius: 8, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit", transition: "all 0.15s" }}>
                        {resetPw ? "On" : "Off"}
                      </button>
                    </div>
                  </div>
                )}

                {(modalMode === "add" || resetPw) && (
                  <>
                    <InputField label="Password" icon={<Lock size={13} />} required>
                      <input className="ua-input" type="password" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min. 8 characters" style={{ ...fieldInput }} />
                    </InputField>
                    <InputField label="Confirm Password" icon={<Lock size={13} />} required>
                      <input className="ua-input" type="password" value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="Repeat password" style={{ ...fieldInput }} />
                    </InputField>
                  </>
                )}

                <div className="ua-span2">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0.9rem", borderRadius: 12, border: `1.5px solid ${form.is_active ? "#bbf7d0" : "#fecaca"}`, background: form.is_active ? "#f0fdf4" : "#fff5f5", transition: "all 0.15s" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.is_active ? "#166534" : "#b91c1c" }}>Account Status</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{form.is_active ? "User can log in" : "User is blocked from logging in"}</div>
                    </div>
                    <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      style={{ border: `1.5px solid ${form.is_active ? "#16a34a" : "#dc2626"}`, background: form.is_active ? "#16a34a" : "#dc2626", color: "#fff", padding: "0.3rem 0.85rem", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.15s" }}>
                      {form.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "0.7rem 0.9rem", borderRadius: 12, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {formError}
                </div>
              )}
            </div>

            <div className="ua-modal-footer">
              <button className="ua-btn-cancel" onClick={closeModal}
                style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#475569", fontFamily: "inherit", transition: "background 0.15s" }}>
                Cancel
              </button>
              <button className="ua-btn-save" disabled={submitting} onClick={submit}
                style={{ border: "none", background: submitting ? "#94a3b8" : BRAND, color: "#fff", borderRadius: 10, padding: "0.55rem 1.2rem", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit", boxShadow: submitting ? "none" : "0 4px 14px rgba(10,76,134,0.28)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                {submitting ? "Saving…" : (modalMode === "add" ? "Create User" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="ua-modal-overlay">
          <div className="ua-modal-box ua-modal-box--sm">
            <div className="ua-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={17} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>Delete User</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>This action cannot be undone</div>
                </div>
              </div>
              <button className="ua-btn-close" onClick={closeModal}
                style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", transition: "background 0.15s" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: "1.2rem 1.4rem" }}>
              <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: "#fef2f2", border: "1.5px solid #fecaca", fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
                You are about to permanently delete the account for{" "}
                <strong style={{ color: "#b91c1c" }}>{deleteTarget.username}</strong>.
                All associated data will be removed and cannot be recovered.
              </div>
            </div>
            <div className="ua-modal-footer">
              <button className="ua-btn-cancel" onClick={closeModal}
                style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#475569", fontFamily: "inherit", transition: "background 0.15s" }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                style={{ border: "none", background: "#dc2626", color: "#fff", borderRadius: 10, padding: "0.55rem 1.1rem", cursor: "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(220,38,38,0.28)", display: "flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}