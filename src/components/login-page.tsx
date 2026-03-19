import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import {
  Key,
  ShieldAlert,
  UserPlus,
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600&family=Poppins:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }

  .lp-bg {
    position: fixed; inset: 0;
    background: url('./Tarlac_City_Hall.jpg') center/cover no-repeat;
    z-index: 0;
  }
  .lp-bg-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.38); z-index: 1;
  }

  .lp-card {
    position: relative; z-index: 10;
    width: 100%; max-width: 460px; margin: 3rem;
    background: #ffffff; border-radius: 16px;
    padding: 2.5rem 2.75rem 2.25rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15);
    animation: cardIn 0.65s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-brand { text-align: center; margin-bottom: 1.75rem; }
  .lp-city-logo { width: 220px; height: auto; display: block; margin: 0 auto 1rem; object-fit: contain; }
  .lp-subtitle {
    font-family: 'Poppins', sans-serif;
    font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
    color: #8a95a3; margin-top: 0.3rem; font-weight: 500;
  }

  .lp-form { display: flex; flex-direction: column; gap: 1rem; }
  .lp-field { display: flex; flex-direction: column; gap: 0.35rem; }

  .lp-label {
    font-family: 'Poppins', sans-serif;
    font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: #4a5568; font-weight: 600; text-align: left;
  }

  .lp-input {
    background: #f7f8fa; border: 1.5px solid #e2e6ed; border-radius: 8px;
    color: #1a2e4a; font-family: 'Poppins', sans-serif;
    font-size: 0.82rem; font-weight: 400; padding: 0.65rem 0.9rem;
    outline: none; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; width: 100%;
  }
  .lp-input::placeholder {
    color: #b0b8c4;
    font-family: 'Poppins', sans-serif;
    font-size: 0.78rem;
  }
  .lp-input:hover  { border-color: #b8c2ce; background: #f2f4f7; }
  .lp-input:focus  { border-color: #1a2e4a; background: #fff; box-shadow: 0 0 0 3px rgba(26,46,74,0.08); }

  .lp-pw-row { display: flex; justify-content: space-between; align-items: center; }
  .lp-forgot {
    font-family: 'Poppins', sans-serif;
    font-size: 0.7rem; color: #0a4c86; background: none; border: none;
    cursor: pointer; font-weight: 500; padding: 0; transition: color 0.2s;
  }
  .lp-forgot:hover { color: #1a2e4a; }

  .lp-toggle {
    position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #94a3b8;
    display: flex; align-items: center; padding: 0; transition: color 0.2s;
  }
  .lp-toggle:hover { color: #1a2e4a; }

  .lp-btn {
    margin-top: 0.25rem; padding: 0.78rem;
    border: none; border-radius: 8px;
    background: linear-gradient(120deg, #0b5fa5, #0a4c86); color: #fff;
    font-family: 'Poppins', sans-serif; font-size: 0.78rem; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
    transition: filter 0.18s, transform 0.12s, box-shadow 0.18s;
    box-shadow: 0 12px 28px rgba(15,23,42,0.3);
  }
  .lp-btn:hover  { filter: brightness(1.05); transform: translateY(-1px); }
  .lp-btn:active { transform: translateY(0); filter: brightness(1); }
  .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; filter: none; }

  /* Loading overlay */
  .lp-loading-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(10,76,134,0.92);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1.25rem;
    animation: fadeInOverlay 0.3s ease both;
  }
  @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
  .lp-loading-spinner {
    width: 46px; height: 46px;
    border: 3px solid rgba(255,255,255,0.25);
    border-top-color: #ffffff; border-radius: 50%;
    animation: spin 0.85s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lp-loading-text {
    color: #ffffff; font-family: 'Poppins', sans-serif;
    font-size: 0.9rem; font-weight: 500; letter-spacing: 0.08em; opacity: 0.9;
  }
  .lp-loading-sub {
    color: rgba(255,255,255,0.55); font-family: 'Poppins', sans-serif;
    font-size: 0.74rem; margin-top: -0.65rem;
  }

  /* ══ MODAL ══ */
  .lp-modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
    animation: modalOverlayIn 0.2s ease both;
  }
  @keyframes modalOverlayIn { from { opacity: 0; } to { opacity: 1; } }

  .lp-modal {
    background: #ffffff; border-radius: 14px;
    width: 100%; max-width: 420px;
    max-height: 90vh; overflow-y: auto;
    box-shadow: 0 24px 60px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
    animation: modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both;
    font-family: 'Poppins', sans-serif;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-modal-header {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 1.1rem 1.3rem 1rem;
    border-bottom: 1px solid #f0f2f5;
  }
  .lp-modal-header-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: #eef3fa;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #0a4c86;
  }
  .lp-modal-header-text { display: flex; flex-direction: column; gap: 1px; }
  .lp-modal-title {
    font-size: 0.88rem; font-weight: 700; color: #1a2e4a; line-height: 1.2;
  }
  .lp-modal-subtitle { font-size: 0.7rem; color: #94a3b8; font-weight: 400; }

  .lp-modal-close {
    position: absolute; top: 0.9rem; right: 0.9rem;
    background: #f2f4f7; border: none; border-radius: 50%;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #6b7685;
    transition: background 0.2s, color 0.2s;
  }
  .lp-modal-close:hover { background: #e2e6ed; color: #1a2e4a; }

  .lp-modal-body { padding: 1.15rem 1.3rem; }

  .lp-icon-input { position: relative; }
  .lp-icon-input .lp-input { padding-left: 2.25rem; }
  .lp-icon-input .lp-input-icon {
    position: absolute; left: 0.7rem; top: 50%;
    transform: translateY(-50%);
    color: #b0b8c4; pointer-events: none;
    display: flex; align-items: center;
  }

  .lp-modal-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.8rem; }
  .lp-modal-field:last-child { margin-bottom: 0; }

  .lp-modal-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 0.55rem; padding: 0.85rem 1.3rem 1.1rem;
    border-top: 1px solid #f0f2f5;
  }

  .lp-modal-btn-cancel {
    padding: 0.48rem 1rem; border-radius: 7px;
    border: 1.5px solid #e2e6ed; background: transparent;
    color: #64748b; font-family: 'Poppins', sans-serif;
    font-size: 0.76rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .lp-modal-btn-cancel:hover { background: #f7f8fa; border-color: #c8d0db; }

  .lp-modal-btn-submit {
    padding: 0.48rem 1.2rem; border-radius: 7px; border: none;
    background: #0a4c86; color: #fff;
    font-family: 'Poppins', sans-serif; font-size: 0.76rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.12s;
    box-shadow: 0 3px 10px rgba(10,76,134,0.25);
  }
  .lp-modal-btn-submit:hover    { background: #083d6e; transform: translateY(-1px); }
  .lp-modal-btn-submit:active   { transform: translateY(0); }
  .lp-modal-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Admin notice */
  .lp-admin-notice {
    display: flex; gap: 0.7rem; align-items: flex-start;
    background: #f0f6ff; border: 1px solid #bfdbfe;
    border-radius: 9px; padding: 0.9rem 1rem;
  }
  .lp-admin-notice-icon { flex-shrink: 0; margin-top: 1px; color: #0a4c86; }
  .lp-admin-notice-text { display: flex; flex-direction: column; gap: 0.2rem; }
  .lp-admin-notice-title { font-size: 0.78rem; font-weight: 700; color: #1a2e4a; }
  .lp-admin-notice-desc  { font-size: 0.72rem; color: #4a5568; line-height: 1.55; }

  .lp-success-msg {
    text-align: center; padding: 0.8rem;
    background: #f0faf5; border: 1px solid #86efac;
    border-radius: 8px; color: #166534;
    font-size: 0.74rem; line-height: 1.6;
  }

  /* ── Create form grid ─────────────────────────────
     Row 1: Full Name        (full width)
     Row 2: Username | Email (half | half)
     Row 3: Password | Confirm Password (half | half)
  ──────────────────────────────────────────────── */
  .lp-create-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 0.65rem;
  }
  .lp-span2 { grid-column: span 2; }

  /* Login extras */
  .lp-keep-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.2rem; }
  .lp-keep-checkbox {
    display: flex; align-items: center; gap: 0.4rem;
    font-family: 'Poppins', sans-serif; font-size: 0.72rem; color: #4a5568;
  }
  .lp-keep-checkbox input { width: 13px; height: 13px; }
  .lp-create-link {
    font-family: 'Poppins', sans-serif;
    font-size: 0.72rem; color: #0b5fa5; background: none; border: none;
    cursor: pointer; font-weight: 600; text-decoration: underline;
    text-underline-offset: 3px;
  }
  .lp-create-link:hover { color: #083766; }
  .lp-bottom-row {
    margin-top: 1rem; display: flex; justify-content: center;
    gap: 0.3rem; font-family: 'Poppins', sans-serif;
    font-size: 0.72rem; color: #6b7280;
  }

  @media (max-width: 600px) {
    .lp-create-grid { grid-template-columns: 1fr; }
    .lp-span2 { grid-column: span 1; }
    .lp-card { margin: 1rem; padding: 2rem 1.5rem 1.75rem; }
    .lp-city-logo { width: 180px; }
    .lp-modal { max-width: 100%; }
    .lp-modal-header, .lp-modal-body, .lp-modal-footer { padding-left: 1rem; padding-right: 1rem; }
  }
`;

export default function LoginPage() {
  const [identifier, setIdentifier]     = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showCreate, setShowCreate]     = useState(false);
  const [creating, setCreating]         = useState(false);
  const [createSent, setCreateSent]     = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);
  const [create, setCreate] = useState({
    full_name: "", username: "", email: "", password: "", confirmPassword: "",
  });
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const navigate = useNavigate();

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
  );

  const performLogin = async () => {
    setError(null);
    const ident = identifier.trim();
    if (!ident || !password) { setError("Please enter your username/email and password."); return; }
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("user_accounts")
        .select("id, username, full_name, email, role, is_active, password_hash")
        .or(`username.ilike.${ident},email.ilike.${ident}`)
        .limit(1);
      if (qErr) throw new Error(qErr.message);
      const user = (data ?? [])[0] as any | undefined;
      if (!user) { setError("Invalid credentials."); setLoading(false); return; }
      if (!user.is_active) { setError("Account is inactive. Please contact the admin."); setLoading(false); return; }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) { setError("Invalid credentials."); setLoading(false); return; }
      const ttlMs = keepSignedIn ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      localStorage.setItem("session_token", crypto.randomUUID());
      localStorage.setItem("session_user_id", user.id);
      localStorage.setItem("session_user_full_name", user.full_name);
      localStorage.setItem("session_user_role", user.role);
      localStorage.setItem("session_expires_at", expiresAt);
      setTimeout(() => { navigate("/dashboard", { replace: true }); }, 3000);
    } catch (ex: any) {
      setError(ex?.message ?? "Login failed.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); await performLogin(); };
  const closeForgot = () => setShowForgot(false);
  const closeCreate = () => {
    setShowCreate(false);
    setTimeout(() => {
      setCreating(false); setCreateSent(false); setCreateError(null);
      setCreate({ full_name: "", username: "", email: "", password: "", confirmPassword: "" });
    }, 300);
  };

  const validateCreate = () => {
    if (!create.full_name.trim()) return "Full name is required.";
    const u = create.username.trim();
    if (u.length < 3) return "Username must be at least 3 characters.";
    if (u.length > 32) return "Username must be at most 32 characters.";
    if (!/^[A-Za-z0-9_]+$/.test(u)) return "Username can only contain letters, numbers, and underscore.";
    const email = create.email.trim();
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email is invalid.";
    if (create.password.length < 8) return "Password must be at least 8 characters.";
    if (create.password.length > 72) return "Password is too long (max 72 characters for bcrypt).";
    if (create.password !== create.confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const err = validateCreate();
    if (err) { setCreateError(err); return; }
    setCreating(true);
    try {
      const password_hash = await bcrypt.hash(create.password, 10);
      const { error: insertError } = await supabase.from("signup_requests").insert({
        full_name: create.full_name.trim(),
        username: create.username.trim(),
        email: create.email.trim(),
        password_hash,
      });
      if (insertError) throw new Error(insertError.message);
      setCreateSent(true);
    } catch (ex: any) {
      setCreateError(ex?.message ?? "Unable to submit request.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {loading && (
        <div className="lp-loading-overlay">
          <div className="lp-loading-spinner" />
          <p className="lp-loading-text">Signing in…</p>
          <p className="lp-loading-sub">Please wait a moment</p>
        </div>
      )}

      <div className="lp-root">
        <div className="lp-bg" />
        <div className="lp-bg-overlay" />

        {/* Login Card */}
        <div className="lp-card">
          <div className="lp-brand">
            <img src="./tarlac-city-logo-masaya.png" alt="Masaya sa Tarlac City" className="lp-city-logo" />
            <p className="lp-subtitle">IT Helpdesk Ticketing System</p>
          </div>

          <form className="lp-form" onSubmit={handleLogin}>
            <div className="lp-field">
              <label className="lp-label" htmlFor="identifier">Email or Username</label>
              <div className="lp-icon-input">
                <span className="lp-input-icon"><Mail size={13} strokeWidth={2} /></span>
                <input id="identifier" className="lp-input" type="text" placeholder="you@example.com"
                  autoComplete="username" value={identifier}
                  onChange={e => setIdentifier(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="lp-field">
              <div className="lp-pw-row">
                <label className="lp-label" htmlFor="password">Password</label>
                <button type="button" className="lp-forgot" onClick={() => setShowForgot(true)}>
                  Forgot password?
                </button>
              </div>
              <div className="lp-icon-input" style={{ position: "relative" }}>
                <span className="lp-input-icon"><Lock size={13} strokeWidth={2} /></span>
                <input id="password" className="lp-input"
                  type={showPassword ? "text" : "password"} placeholder="••••••••"
                  autoComplete="current-password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: "2.5rem" }} disabled={loading} />
                <button type="button" className="lp-toggle" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "0.5rem 0.75rem", borderRadius: 7,
                backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                color: "#b91c1c", fontFamily: "'Poppins', sans-serif", fontSize: "0.71rem" }}>
                {error}
              </div>
            )}

            <div className="lp-keep-row">
              <label className="lp-keep-checkbox">
                <input type="checkbox" checked={keepSignedIn} onChange={e => setKeepSignedIn(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button className="lp-btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="lp-bottom-row">
            <span>Don&apos;t have an account?</span>
            <button type="button" className="lp-create-link" onClick={() => setShowCreate(true)}>
              Create one
            </button>
          </div>
        </div>

        {/* ══ Forgot Password Modal ══ */}
        {showForgot && (
          <div className="lp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeForgot(); }}>
            <div className="lp-modal" role="dialog" aria-modal="true">
              <button className="lp-modal-close" onClick={closeForgot} aria-label="Close">
                <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>✕</span>
              </button>
              <div className="lp-modal-header">
                <div className="lp-modal-header-icon">
                  <Key size={16} strokeWidth={2} />
                </div>
                <div className="lp-modal-header-text">
                  <span className="lp-modal-title">Forgot Password</span>
                  <span className="lp-modal-subtitle">Account recovery assistance</span>
                </div>
              </div>
              <div className="lp-modal-body">
                <div className="lp-admin-notice">
                  <span className="lp-admin-notice-icon">
                    <ShieldAlert size={16} strokeWidth={2} />
                  </span>
                  <div className="lp-admin-notice-text">
                    <span className="lp-admin-notice-title">Contact your Administrator</span>
                    <span className="lp-admin-notice-desc">
                      Password resets are managed by your system administrator.
                      Please approach or message your IT Administrator directly
                      to have your password reset.
                    </span>
                  </div>
                </div>
              </div>
              <div className="lp-modal-footer">
                <button className="lp-modal-btn-submit" type="button" onClick={closeForgot}>
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Create Account Modal ══ */}
        {showCreate && (
          <div className="lp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeCreate(); }}>
            <div className="lp-modal" role="dialog" aria-modal="true">
              <button className="lp-modal-close" onClick={closeCreate} aria-label="Close">
                <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>✕</span>
              </button>
              <div className="lp-modal-header">
                <div className="lp-modal-header-icon">
                  <UserPlus size={16} strokeWidth={2} />
                </div>
                <div className="lp-modal-header-text">
                  <span className="lp-modal-title">Request an Account</span>
                  <span className="lp-modal-subtitle">Requires admin approval</span>
                </div>
              </div>

              {!createSent ? (
                <>
                  <div className="lp-modal-body">
                    <form id="create-form" onSubmit={handleCreateAccount}>
                      <div className="lp-create-grid">

                        {/* Row 1 — Full Name (full width) */}
                        <div className="lp-modal-field lp-span2">
                          <label className="lp-label" htmlFor="ca-fullname">Full Name</label>
                          <div className="lp-icon-input">
                            <span className="lp-input-icon"><User size={13} strokeWidth={2} /></span>
                            <input id="ca-fullname" className="lp-input" type="text"
                              placeholder="Juan Dela Cruz" value={create.full_name}
                              onChange={e => setCreate(c => ({ ...c, full_name: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Row 2 — Username | Email */}
                        <div className="lp-modal-field">
                          <label className="lp-label" htmlFor="ca-username">Username</label>
                          <div className="lp-icon-input">
                            <span className="lp-input-icon"><AtSign size={13} strokeWidth={2} /></span>
                            <input id="ca-username" className="lp-input" type="text"
                              placeholder="juan_dc" value={create.username}
                              onChange={e => setCreate(c => ({ ...c, username: e.target.value }))} required />
                          </div>
                        </div>

                        <div className="lp-modal-field">
                          <label className="lp-label" htmlFor="ca-email">Email</label>
                          <div className="lp-icon-input">
                            <span className="lp-input-icon"><Mail size={13} strokeWidth={2} /></span>
                            <input id="ca-email" className="lp-input" type="email"
                              placeholder="you@example.com" value={create.email}
                              onChange={e => setCreate(c => ({ ...c, email: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Row 3 — Password | Confirm Password */}
                        <div className="lp-modal-field">
                          <label className="lp-label" htmlFor="ca-password">Password</label>
                          <div className="lp-icon-input">
                            <span className="lp-input-icon"><Lock size={13} strokeWidth={2} /></span>
                            <input id="ca-password" className="lp-input" type="password"
                              placeholder="Min. 8 characters" value={create.password}
                              onChange={e => setCreate(c => ({ ...c, password: e.target.value }))} required />
                          </div>
                        </div>

                        <div className="lp-modal-field">
                          <label className="lp-label" htmlFor="ca-confirm">Confirm Password</label>
                          <div className="lp-icon-input">
                            <span className="lp-input-icon"><Lock size={13} strokeWidth={2} /></span>
                            <input id="ca-confirm" className="lp-input" type="password"
                              placeholder="Repeat password" value={create.confirmPassword}
                              onChange={e => setCreate(c => ({ ...c, confirmPassword: e.target.value }))} required />
                          </div>
                        </div>

                      </div>

                      {createError && (
                        <div style={{ padding: "0.45rem 0.7rem", borderRadius: 7,
                          backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                          color: "#b91c1c", fontFamily: "'Poppins', sans-serif",
                          fontSize: "0.71rem", marginTop: "0.5rem" }}>
                          {createError}
                        </div>
                      )}
                    </form>
                  </div>
                  <div className="lp-modal-footer">
                    <button className="lp-modal-btn-cancel" type="button" onClick={closeCreate}>Cancel</button>
                    <button className="lp-modal-btn-submit" type="submit" form="create-form" disabled={creating}>
                      {creating ? "Submitting…" : "Submit Request"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="lp-modal-body">
                    <div className="lp-success-msg">
                      Your request has been submitted successfully.<br />
                      You can sign in once an admin approves your account.
                    </div>
                  </div>
                  <div className="lp-modal-footer">
                    <button className="lp-modal-btn-submit" type="button" onClick={closeCreate}>
                      Back to sign in
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}