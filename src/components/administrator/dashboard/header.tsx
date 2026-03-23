import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { LogOut, Menu, Bell } from "lucide-react";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../../lib/audit-notifications";

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

  .hdr-menu-btn {
    display: none;
    align-items: center; justify-content: center;
    width: 40px; height: 40px;
    border-radius: 10px; border: none;
    background: #f1f5f9; color: #475569;
    cursor: pointer; flex-shrink: 0;
  }
  @media (max-width: 1024px) {
    .hdr-menu-btn { display: flex; }
    .hdr-user-name { display: none; }
    .hdr-datetime { font-size: 14px; }
    .hdr-date { font-size: 12px; }
  }
  @media (max-width: 640px) {
    .hdr-main { flex-wrap: wrap; gap: 0.5rem; }
    .hdr-datetime { font-size: 13px; }
    .hdr-date { font-size: 11px; }
    .hdr-user-block { gap: 0.5rem; }
    .hdr-avatar { width: 36px; height: 36px; font-size: 14px; }
    .hdr-logout-btn { padding: 0.35rem 0.6rem; font-size: 12px; }
  }
`;

type HeaderProps = {
  currentUserName: string;
  userRole: string;
  onMenuClick?: () => void;
  onNotificationNavigate?: (entityType: string, entityId: string | null) => void;
};

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

const Header: React.FC<HeaderProps> = ({ currentUserName, userRole, onMenuClick, onNotificationNavigate }) => {
  const navigate = useNavigate();
  const [now, setNow]               = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const notifPanelRef = useRef<HTMLDivElement | null>(null);
  const notifBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevUnreadRef = useRef<number>(0);

  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as
      | (new () => AudioContext)
      | undefined;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc.start(t);
      osc.stop(t + 0.2);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, 300);
    } catch {
      // ignore sound errors
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    const uid = localStorage.getItem("session_user_id");
    if (!uid) {
      setUnreadNotifications(0);
      return;
    }
    const { count, error } = await supabase
      .from("app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);
    if (error) setUnreadNotifications(0);
    else if (count !== null) setUnreadNotifications(count);
  }, []);

  // ── Realtime + polling + custom event ────────────────────────────────────
  useEffect(() => {
    refreshUnread();

    const onEvt = () => refreshUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onEvt);

    // Fallback poll every 30s (reduced from 60s for faster badge updates)
    const t = setInterval(refreshUnread, 30000);

    // Supabase Realtime — fires instantly when a new notification is inserted
    const uid = localStorage.getItem("session_user_id");
    const channel = supabase
      .channel("notif-badge-header")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onEvt);
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [refreshUnread]);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    const uid = localStorage.getItem("session_user_id");
    if (!uid) {
      setNotifs([]);
      return;
    }
    setNotifLoading(true);
    const { data } = await supabase
      .from("app_notifications")
      .select("id, type, title, body, entity_type, entity_id, read_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(40);
    setNotifs((data ?? []) as NotificationRow[]);
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    if (!showNotifPanel) return;
    fetchNotifications();
  }, [showNotifPanel, fetchNotifications]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifPanelRef.current?.contains(t)) return;
      if (notifBtnRef.current?.contains(t)) return;
      setShowNotifPanel(false);
    };
    if (showNotifPanel) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showNotifPanel]);

  useEffect(() => {
    const showBell = !!onNotificationNavigate;
    if (!showBell) {
      prevUnreadRef.current = unreadNotifications;
      return;
    }
    const prev = prevUnreadRef.current;
    if (prev === 0 && unreadNotifications > 0) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadNotifications;
  }, [onNotificationNavigate, unreadNotifications, playNotificationSound]);

  const markNotifRead = useCallback(async (id: string) => {
    await supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    refreshUnread();
  }, [refreshUnread]);

  const openNotification = useCallback(async (row: NotificationRow) => {
    if (!row.read_at) await markNotifRead(row.id);
    setShowNotifPanel(false);
    onNotificationNavigate?.(row.entity_type ?? "", row.entity_id ?? null);
  }, [markNotifRead, onNotificationNavigate]);

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
        className="hdr-main"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "'Poppins', sans-serif",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 auto" }}>
          {onMenuClick && (
            <button
              type="button"
              className="hdr-menu-btn"
              onClick={onMenuClick}
              aria-label="Open menu"
              style={{ width: 40, height: 40 }}
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          )}
          {/* Date & Time */}
          <div className="hdr-datetime">
            <div style={{ fontSize: 20, fontWeight: 700, color: brandBlue, letterSpacing: "0.02em" }}>
              {timeStr}
            </div>
            <div className="hdr-date" style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* User + Logout */}
        <div className="hdr-user-block" style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
          {onNotificationNavigate && (
            <button
              ref={notifBtnRef}
              type="button"
              onClick={() => setShowNotifPanel((v) => !v)}
              title="Notifications"
              style={{
                position: "relative",
                width: 56,
                height: 56,
                borderRadius: 16,
                border: "none",
                background: "transparent",
                color: brandBlue,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "none",
              }}
            >
              <Bell size={22} strokeWidth={2.2} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </button>
          )}
          {onNotificationNavigate && showNotifPanel && (
            <div
              ref={notifPanelRef}
              style={{
                position: "absolute",
                top: 60,
                right: 0,
                width: 360,
                maxHeight: 520,
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                boxShadow: "0 18px 36px rgba(15,23,42,0.18)",
                zIndex: 1200,
                padding: "0.75rem",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Notifications</div>
              {notifLoading ? (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "1rem 0.5rem" }}>Loading...</div>
              ) : notifs.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "1rem 0.5rem" }}>No notifications.</div>
              ) : (
                <>
                  {notifs.some((n) => !n.read_at) && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: "0.5rem 0.25rem" }}>New</div>
                  )}
                  {notifs.filter((n) => !n.read_at).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { void openNotification(n); }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "rgba(10,76,134,0.08)",
                        borderRadius: 10,
                        padding: "0.7rem",
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{n.type.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{n.body}</div>}
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                        {new Date(n.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                      </div>
                    </button>
                  ))}
                  {notifs.some((n) => !!n.read_at) && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: "0.5rem 0.25rem" }}>Earlier</div>
                  )}
                  {notifs.filter((n) => !!n.read_at).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { void openNotification(n); }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "#fff",
                        borderRadius: 10,
                        padding: "0.7rem",
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{n.type.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{n.body}</div>}
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                        {new Date(n.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          <div
            className="hdr-avatar"
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

          {/* Name + role — hidden on mobile */}
          <div className="hdr-user-name" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
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
            className="hdr-logout-btn"
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