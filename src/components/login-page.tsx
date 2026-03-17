import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .lp-bg {
    position: fixed;
    inset: 0;
    background: url('./Tarlac_City_Hall.jpg') center/cover no-repeat;
    z-index: 0;
  }
  .lp-bg-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.38);
    z-index: 1;
  }

  .lp-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 500px;
    margin: 3rem;
    background: #ffffff;
    border-radius: 16px;
    padding: 2.75rem 3rem 2.5rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15);
    animation: cardIn 0.65s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-brand {
    text-align: center;
    margin-bottom: 2rem;
  }
  .lp-city-logo {
    width: 150px;
    height: auto;
    display: block;
    margin: 0 auto 1.25rem;
    object-fit: contain;
  }
  .lp-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 500;
    color: #1a2e4a;
    line-height: 1.25;
  }
  .lp-subtitle {
    font-size: 0.90rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #8a95a3;
    margin-top: 0.35rem;
    font-weight: 400;
  }

  .lp-form { display: flex; flex-direction: column; gap: 1.15rem; }

  .lp-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .lp-label {
    font-size: 0.73rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #4a5568;
    font-weight: 500;
    text-align: left;
  }

  .lp-input {
    background: #f7f8fa;
    border: 1.5px solid #e2e6ed;
    border-radius: 9px;
    color: #1a2e4a;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 400;
    padding: 0.75rem 1rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  .lp-input::placeholder { color: #b0b8c4; }
  .lp-input:hover  { border-color: #b8c2ce; background: #f2f4f7; }
  .lp-input:focus  { border-color: #1a2e4a; background: #fff; box-shadow: 0 0 0 3px rgba(26,46,74,0.09); }

  .lp-pw-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lp-forgot {
    font-size: 0.76rem;
    color: #0a4c86;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    padding: 0;
    transition: color 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .lp-forgot:hover { color: #1a2e4a; }

  .lp-toggle {
    position: absolute; right: 0.8rem; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #8a95a3; font-size: 0.75rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    padding: 0; transition: color 0.2s;
  }
  .lp-toggle:hover { color: #1a2e4a; }

  .lp-btn {
    margin-top: 0.35rem;
    padding: 0.88rem;
    border: none;
    border-radius: 9px;
    background: linear-gradient(120deg, #0b5fa5, #0a4c86);
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: filter 0.18s, transform 0.12s, box-shadow 0.18s;
    box-shadow: 0 16px 35px rgba(15, 23, 42, 0.35);
  }
  .lp-btn:hover  { filter: brightness(1.04); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.45); transform: translateY(-1px); }
  .lp-btn:active { transform: translateY(0); filter: brightness(1); box-shadow: 0 10px 25px rgba(15, 23, 42, 0.35); }
  .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; filter: none; }

  /* ── Loading overlay ── */
  .lp-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(10, 76, 134, 0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    animation: fadeInOverlay 0.3s ease both;
  }
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .lp-loading-spinner {
    width: 52px;
    height: 52px;
    border: 4px solid rgba(255,255,255,0.25);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.85s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .lp-loading-text {
    color: #ffffff;
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    opacity: 0.9;
  }
  .lp-loading-sub {
    color: rgba(255,255,255,0.55);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem;
    margin-top: -0.65rem;
  }

  /* ══════════════════════════════════════════
     Forgot / Create — responsive panel/sheet
  ══════════════════════════════════════════ */

  /* Overlay backdrop */
  .lp-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    animation: overlayIn 0.25s ease both;
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Desktop / Tablet landscape: right-side panel ── */
  .lp-dialog {
    width: 100%;
    max-width: 440px;
    height: 100vh;
    background: #ffffff;
    padding: 5rem 2.75rem 2.5rem;
    box-shadow: -16px 0 56px rgba(0,0,0,0.22);
    animation: slideIn 0.38s cubic-bezier(0.16,1,0.3,1) both;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(80px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Gold left accent bar */
  .lp-dialog::before {
    content: '';
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #c9a84c, #e8c97a, #c9a84c);
  }

  /* ── Mobile portrait (≤ 600px): bottom sheet ── */
  @media (max-width: 600px) {
    .lp-overlay {
      align-items: flex-end;
      justify-content: stretch;
    }
    .lp-dialog {
      max-width: 100%;
      width: 100%;
      height: auto;
      max-height: 92vh;
      border-radius: 22px 22px 0 0;
      padding: 1.5rem 1.25rem 2rem;
      box-shadow: 0 -12px 48px rgba(0,0,0,0.22);
      animation: slideUp 0.38s cubic-bezier(0.16,1,0.3,1) both;
      justify-content: flex-start;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(60px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    /* Hide side accent bar on mobile bottom sheet */
    .lp-dialog::before { display: none; }
    /* Drag handle pill */
    .lp-dialog::after {
      content: '';
      position: absolute;
      top: 0.55rem; left: 50%;
      transform: translateX(-50%);
      width: 36px; height: 4px;
      border-radius: 2px;
      background: #d1d5db;
    }
  }

  /* ── Small tablet portrait (601–768px): wider panel ── */
  @media (min-width: 601px) and (max-width: 768px) {
    .lp-dialog {
      max-width: 360px;
      padding: 4.5rem 2rem 2rem;
    }
  }

  /* Close button */
  .lp-dialog-close {
    position: absolute; top: 1.25rem; right: 1.25rem;
    background: #f2f4f7;
    border: none;
    border-radius: 50%;
    width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #6b7685;
    font-size: 0.9rem; line-height: 1;
    transition: background 0.2s, color 0.2s;
    z-index: 2;
  }
  .lp-dialog-close:hover { background: #e2e6ed; color: #1a2e4a; }

  .lp-dialog-icon {
    width: 48px; height: 48px;
    border-radius: 13px;
    background: #f0f3f7;
    border: 1.5px solid #dde3ec;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .lp-dialog-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    font-weight: 500;
    color: #1a2e4a;
    margin-bottom: 0.45rem;
  }
  @media (max-width: 600px) {
    .lp-dialog-title { font-size: 1.25rem; }
  }

  .lp-dialog-desc {
    font-size: 0.83rem;
    color: #6b7685;
    line-height: 1.65;
    margin-bottom: 1.5rem;
  }

  .lp-dialog-field { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1.15rem; }

  .lp-dialog-btn {
    width: 100%; padding: 0.88rem;
    border: none; border-radius: 9px;
    background: #0a4c86;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem; font-weight: 500;
    letter-spacing: 0.1em; text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    box-shadow: 0 5px 16px rgba(26,46,74,0.25);
    margin-top: 2rem;
  }
  .lp-dialog-btn:hover { background: #243d61; transform: translateY(-1px); }
  .lp-dialog-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .lp-success-msg {
    text-align: center; padding: 0.9rem;
    background: #f0faf5;
    border: 1.5px solid #86efac;
    border-radius: 9px;
    color: #166534;
    font-size: 0.82rem;
    line-height: 1.6;
    margin-top: 0.5rem;
  }

  .lp-back {
    display: block; text-align: center; margin-top: 1.1rem;
    font-size: 0.79rem; color: #8a95a3;
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.2s;
  }
  .lp-back:hover { color: #1a2e4a; }

  /* ── Login card responsive ── */
  .lp-keep-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.25rem;
  }
  .lp-keep-checkbox {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    color: #4a5568;
  }
  .lp-keep-checkbox input { width: 15px; height: 15px; }

  .lp-create-link {
    font-size: 0.8rem;
    color: #0b5fa5;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-family: 'DM Sans', sans-serif;
  }
  .lp-create-link:hover { color: #083766; }

  /* ── Create account panel specifics ── */
  .lp-create-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.45rem;
    font-weight: 500;
    color: #1a2e4a;
    margin-bottom: 0.4rem;
  }
  .lp-create-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: #eef2ff;
    color: #3730a3;
    border: 1px solid #e0e7ff;
    margin-bottom: 0.75rem;
  }

  /* 2-col on tablet+, 1-col on mobile */
  .lp-create-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem 0.75rem;
    margin-bottom: 0.5rem;
  }
  .lp-create-span2 { grid-column: span 2; }

  @media (max-width: 600px) {
    .lp-create-grid {
      grid-template-columns: 1fr;
      gap: 0.7rem;
    }
    .lp-create-span2 { grid-column: span 1; }
    /* Tighten login card on small phones */
    .lp-card {
      margin: 1rem;
      padding: 2rem 1.5rem 1.75rem;
    }
    .lp-city-logo { width: 120px; }
  }

  @media (min-width: 601px) and (max-width: 768px) {
    .lp-create-grid {
      grid-template-columns: 1fr 1fr;
    }
    .lp-card {
      margin: 2rem;
      padding: 2.25rem 2rem 2rem;
    }
  }
`;

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent]   = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);   // ← loading screen
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createSent, setCreateSent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [create, setCreate] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const navigate = useNavigate();

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
  );

  const base64Url = (bytes: Uint8Array) => {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const sha256Hex = async (text: string) => {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Shared login logic — called by both form submit and Enter key
  const performLogin = async () => {
    setError(null);
    const ident = identifier.trim();
    if (!ident || !password) { setError("Please enter your username/email and password."); return; }

    try {
      const { data, error: qErr } = await supabase
        .from("user_accounts")
        .select("id, username, full_name, email, role, is_active, password_hash")
        .or(`username.ilike.${ident},email.ilike.${ident}`)
        .limit(1);

      if (qErr) throw new Error(qErr.message);
      const user = (data ?? [])[0] as any | undefined;
      if (!user) { setError("Invalid credentials."); return; }
      if (!user.is_active) { setError("Account is inactive. Please contact the admin."); return; }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) { setError("Invalid credentials."); return; }

      const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const token_hash = await sha256Hex(token);
      const ttlMs = keepSignedIn ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();

      const { error: sErr } = await supabase.from("user_sessions").insert({
        user_id: user.id,
        token_hash,
        expires_at: expiresAt,
      });
      if (sErr) throw new Error(sErr.message);

      localStorage.setItem("session_token", token);
      localStorage.setItem("session_user_id", user.id);
      localStorage.setItem("session_user_full_name", user.full_name);
      localStorage.setItem("session_user_role", user.role);
      localStorage.setItem("session_expires_at", expiresAt);

      // Show loading screen for 3 seconds, then navigate
      setLoading(true);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);

    } catch (ex: any) {
      setError(ex?.message ?? "Login failed.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetting(true);
    await new Promise(r => setTimeout(r, 1400));
    setResetting(false);
    setResetSent(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setTimeout(() => { setResetEmail(""); setResetSent(false); }, 300);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setTimeout(() => {
      setCreating(false);
      setCreateSent(false);
      setCreateError(null);
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

      {/* ── 3-second loading overlay ── */}
      {loading && (
        <div className="lp-loading-overlay">
          <div className="lp-loading-spinner" />
          <p className="lp-loading-text">Signing you in…</p>
          <p className="lp-loading-sub">Please wait a moment</p>
        </div>
      )}

      <div className="lp-root">
        <div className="lp-bg" />
        <div className="lp-bg-overlay" />

        {/* ── Login Card ── */}
        <div className="lp-card">
          <div className="lp-brand">
            <img
              src="./tarlac-city-logo-masaya.png"
              alt="Masaya sa Tarlac City"
              className="lp-city-logo"
            />
            <p className="lp-subtitle">IT Equipment Monitoring</p>
          </div>

          <form className="lp-form" onSubmit={handleLogin}>
            <div className="lp-field">
              <label className="lp-label" htmlFor="identifier">Email or Username</label>
              <input
                id="identifier"
                className="lp-input"
                type="text"
                placeholder="you@example.com"
                autoComplete="username"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="lp-field">
              <div className="lp-pw-row">
                <label className="lp-label" htmlFor="password">Password</label>
                <button
                  type="button"
                  className="lp-forgot"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="lp-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: "3.2rem" }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="lp-toggle"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: "0.25rem",
                padding: "0.55rem 0.8rem",
                borderRadius: 8,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "0.78rem",
              }}>
                {error}
              </div>
            )}

            <div className="lp-keep-row">
              <label className="lp-keep-checkbox">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={e => setKeepSignedIn(e.target.checked)}
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button className="lp-btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: "1.1rem", display: "flex", justifyContent: "center", gap: "0.35rem", fontSize: "0.8rem", color: "#6b7280" }}>
            <span>Don&apos;t have an account?</span>
            <button type="button" className="lp-create-link" onClick={() => setShowCreate(true)}>
              Create one
            </button>
          </div>
        </div>

        {/* ══ Forgot Password ══ */}
        {showForgot && (
          <div className="lp-overlay" onClick={e => { if (e.target === e.currentTarget) closeForgot(); }}>
            <div className="lp-dialog" role="dialog" aria-modal="true">
              <button className="lp-dialog-close" onClick={closeForgot} aria-label="Close">✕</button>
              <div className="lp-dialog-icon">🔑</div>
              {!resetSent ? (
                <>
                  <h2 className="lp-dialog-title">Reset password</h2>
                  <p className="lp-dialog-desc">
                    Enter the email linked to your account and we'll send you a secure reset link.
                  </p>
                  <form onSubmit={handleReset}>
                    <div className="lp-dialog-field">
                      <label className="lp-label" htmlFor="reset-email">Email address</label>
                      <input
                        id="reset-email"
                        className="lp-input"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button className="lp-dialog-btn" type="submit" disabled={resetting || !resetEmail}>
                      {resetting ? "Sending…" : "Send Reset Link"}
                    </button>
                  </form>
                  <button className="lp-back" onClick={closeForgot}>← Back to sign in</button>
                </>
              ) : (
                <>
                  <h2 className="lp-dialog-title">Check your email</h2>
                  <p className="lp-dialog-desc">We've sent a reset link to your inbox. It expires in 15 minutes.</p>
                  <div className="lp-success-msg">
                    📬 A reset link was sent to <strong>{resetEmail}</strong>.<br />
                    Didn't receive it? Check your spam folder.
                  </div>
                  <button className="lp-back" onClick={closeForgot}>← Back to sign in</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ Create Account ══ */}
        {showCreate && (
          <div className="lp-overlay" onClick={e => { if (e.target === e.currentTarget) closeCreate(); }}>
            <div className="lp-dialog" role="dialog" aria-modal="true">
              <button className="lp-dialog-close" onClick={closeCreate} aria-label="Close">✕</button>
              {!createSent ? (
                <>
                  <span className="lp-create-pill">Admin approval required</span>
                  <h2 className="lp-create-title">Request an account</h2>
                  <p className="lp-dialog-desc">
                    Fill in your details below. Once an administrator approves your request,
                    you'll be able to sign in using your username and password.
                  </p>
                  <form onSubmit={handleCreateAccount}>
                    <div className="lp-create-grid">
                      <div className="lp-create-span2">
                        <label className="lp-label" htmlFor="ca-fullname">Full name</label>
                        <input id="ca-fullname" className="lp-input" type="text" placeholder="Juan Dela Cruz"
                          value={create.full_name} onChange={e => setCreate(c => ({ ...c, full_name: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="lp-label" htmlFor="ca-username">Username</label>
                        <input id="ca-username" className="lp-input" type="text" placeholder="juan_dc"
                          value={create.username} onChange={e => setCreate(c => ({ ...c, username: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="lp-label" htmlFor="ca-email">Email</label>
                        <input id="ca-email" className="lp-input" type="email" placeholder="you@example.com"
                          value={create.email} onChange={e => setCreate(c => ({ ...c, email: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="lp-label" htmlFor="ca-password">Password</label>
                        <input id="ca-password" className="lp-input" type="password" placeholder="••••••••"
                          value={create.password} onChange={e => setCreate(c => ({ ...c, password: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="lp-label" htmlFor="ca-confirm">Confirm password</label>
                        <input id="ca-confirm" className="lp-input" type="password" placeholder="••••••••"
                          value={create.confirmPassword} onChange={e => setCreate(c => ({ ...c, confirmPassword: e.target.value }))} required />
                      </div>
                    </div>
                    {createError && (
                      <div style={{ marginTop: "0.25rem", padding: "0.55rem 0.8rem", borderRadius: 8, backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "0.78rem" }}>
                        {createError}
                      </div>
                    )}
                    <button className="lp-dialog-btn" type="submit" disabled={creating}>
                      {creating ? "Submitting…" : "Submit for approval"}
                    </button>
                  </form>
                  <button className="lp-back" onClick={closeCreate}>← Back to sign in</button>
                </>
              ) : (
                <>
                  <h2 className="lp-dialog-title">Request submitted</h2>
                  <p className="lp-dialog-desc">Your account request is pending admin approval.</p>
                  <div className="lp-success-msg">You can sign in once an admin approves your request.</div>
                  <button className="lp-back" onClick={closeCreate}>← Back to sign in</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}