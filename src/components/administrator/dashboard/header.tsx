import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const brandBlue = "#0a4c86";

const headerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  .hdr-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: hdrFadeIn 0.2s ease both;
  }
  @keyframes hdrFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .hdr-dialog {
    background: #ffffff;
    border-radius: 18px;
    padding: 2rem 2.25rem 1.75rem;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28), 0 2px 8px rgba(15,23,42,0.12);
    animation: hdrSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) both;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    font-family: 'Poppins', sans-serif;
  }
  @keyframes hdrSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .hdr-dialog-icon {
    width: 54px;
    height: 54px;
    border-radius: 14px;
    background: #fff1f2;
    border: 1.5px solid #fecdd3;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.1rem;
    color: #e11d48;
  }

  .hdr-dialog-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 0.4rem;
  }

  .hdr-dialog-desc {
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 1.6rem;
  }

  .hdr-dialog-actions {
    display: flex;
    gap: 0.7rem;
    width: 100%;
  }

  .hdr-btn-cancel {
    flex: 1;
    padding: 0.65rem;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    color: #475569;
    font-family: 'Poppins', sans-serif;
    font-size: 0.83rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s, border-color 0.18s;
  }
  .hdr-btn-cancel:hover { background: #f1f5f9; border-color: #cbd5e1; }

  .hdr-btn-confirm {
    flex: 1;
    padding: 0.65rem;
    border-radius: 9px;
    border: none;
    background: linear-gradient(120deg, #e11d48, #be123c);
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    font-size: 0.83rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    box-shadow: 0 6px 18px rgba(225,29,72,0.3);
    transition: filter 0.18s, transform 0.12s;
  }
  .hdr-btn-confirm:hover  { filter: brightness(1.06); transform: translateY(-1px); }
  .hdr-btn-confirm:active { transform: translateY(0); filter: brightness(1); }

  .hdr-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(10, 76, 134, 0.93);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    animation: hdrFadeIn 0.3s ease both;
    font-family: 'Poppins', sans-serif;
  }

  .hdr-loading-spinner {
    width: 52px;
    height: 52px;
    border: 4px solid rgba(255,255,255,0.25);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: hdrSpin 0.85s linear infinite;
  }
  @keyframes hdrSpin {
    to { transform: rotate(360deg); }
  }

  .hdr-loading-text {
    color: #ffffff;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    opacity: 0.92;
  }

  .hdr-loading-sub {
    color: rgba(255,255,255,0.55);
    font-size: 0.8rem;
    margin-top: -0.65rem;
  }
`;

type HeaderProps = {
  currentUserName: string;
  userRole: string;
};

const Header: React.FC<HeaderProps> = ({ currentUserName, userRole }) => {
  const navigate = useNavigate();
  const [now, setNow]               = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initials = currentUserName
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const confirmLogout = () => {
    setShowConfirm(false);
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem("session_token");
      localStorage.removeItem("session_user_id");
      localStorage.removeItem("session_user_full_name");
      localStorage.removeItem("session_user_role");
      localStorage.removeItem("session_expires_at");
      navigate("/", { replace: true });
    }, 3000);
  };

  return (
    <>
      <style>{headerStyles}</style>

      {/* ── Confirm dialog ── */}
      {showConfirm && !loggingOut && (
        <div
          className="hdr-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="hdr-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <div className="hdr-dialog-icon">
              <LogOut size={24} strokeWidth={2} />
            </div>
            <p className="hdr-dialog-title" id="logout-title">Sign out?</p>
            <p className="hdr-dialog-desc">
              You're about to sign out of the IT Equipment Monitoring system.
              Any unsaved changes will be lost.
            </p>
            <div className="hdr-dialog-actions">
              <button className="hdr-btn-cancel" onClick={() => setShowConfirm(false)}>
                Stay
              </button>
              <button className="hdr-btn-confirm" onClick={confirmLogout}>
                <LogOut size={13} strokeWidth={2.2} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3-second logging-out overlay ── */}
      {loggingOut && (
        <div className="hdr-loading-overlay">
          <div className="hdr-loading-spinner" />
          <p className="hdr-loading-text">Signing out…</p>
          <p className="hdr-loading-sub">Please wait a moment</p>
        </div>
      )}

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Date & Time */}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: brandBlue, letterSpacing: "0.02em" }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>
            {dateStr}
          </div>
        </div>

        {/* User + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "999px",
              background: brandBlue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {initials}
          </div>

          {/* Name + role — centered, role same blue, uppercase */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
              {currentUserName}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              color: brandBlue,
              lineHeight: 1.2,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              {userRole}
            </span>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.8rem",
              borderRadius: 8,
              border: `1.5px solid ${brandBlue}`,
              background: "transparent",
              color: brandBlue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              transition: "background 0.18s, color 0.18s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = brandBlue;
              (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = brandBlue;
            }}
          >
            <LogOut size={13} strokeWidth={2.2} />
            Logout
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;