import React from "react";
import {
  Home,
  Building2,
  ClipboardList,
  BarChart2,
  User,
  CircleArrowDown,
  CircleArrowUp,
  TicketIcon,
  X,
} from "lucide-react";

const baseBlue = "#0a4c86";
const hoverBlue = "#0d5fa3";

type MenuItem = {
  label: string;
  icon: React.ElementType;
};

type MenuSection = {
  heading?: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    items: [
      { label: "Home", icon: Home },
    ],
  },
  {
    heading: "Tickets & Repairs",
    items: [
      { label: "Submit Ticket", icon: TicketIcon },
      { label: "Repair History", icon: ClipboardList },
    ],
  },
  {
    heading: "Units",
    items: [
      { label: "Incoming Units", icon: CircleArrowDown },
      { label: "Outgoing Units", icon: CircleArrowUp },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Departments", icon: Building2 },
      { label: "User Accounts", icon: User },
    ],
  },
  {
    heading: "Reports",
    items: [
      { label: "Reports & Analytics", icon: BarChart2 },
    ],
  },
];

const adminOnly = ["User Accounts", "Reports & Analytics"];

type SidebarProps = {
  activeLabel: string;
  onNavigate: (label: string) => void;
  userRole: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ activeLabel, onNavigate, userRole, isMobileOpen, onMobileClose }) => {
  const isAdmin = userRole === "Administrator";

  const handleNav = (label: string) => {
    onNavigate(label);
    onMobileClose?.();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
        .sidebar-btn { transition: background 0.18s, color 0.18s; }
        .sidebar-btn[data-active="false"]:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .sidebar-btn[data-active="true"]:hover {
          background: ${hoverBlue} !important;
        }
        @media (max-width: 1024px) {
          .sidebar-aside { position: fixed; top: 0; left: 0; z-index: 1000;
            transform: translateX(-100%); transition: transform 0.25s ease;
            box-shadow: 4px 0 24px rgba(0,0,0,0.12); }
          .sidebar-aside.sidebar-open { transform: translateX(0); }
          .sidebar-overlay { display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 999;
            opacity: 0; transition: opacity 0.25s; pointer-events: none; }
          .sidebar-overlay.sidebar-open { display: block; opacity: 1; pointer-events: auto; }
        }
        @media (min-width: 1025px) {
          .sidebar-overlay { display: none !important; }
          .sidebar-close-btn { display: none !important; }
        }
      `}</style>
      <div
        className={`sidebar-overlay${isMobileOpen ? " sidebar-open" : ""}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar-aside${isMobileOpen ? " sidebar-open" : ""}`}
        style={{
          width: 230,
          height: "100vh",
          minHeight: 0,
          background: "#ffffff",
          color: "#1e293b",
          padding: "1.4rem 1.4rem 1.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          borderRight: "1px solid #e2e8f0",
          fontFamily: "'Poppins', sans-serif",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <img
            src="/masaya-sa-tarlac-city.png"
            alt="Masaya sa Tarlac City"
            style={{ width: "100%", height: "auto", display: "block", flex: 1, minWidth: 0 }}
          />
          {onMobileClose !== undefined && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: "#f1f5f9", color: "#475569", cursor: "pointer",
                flexShrink: 0,
              }}
              className="sidebar-close-btn"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Sectioned Nav - scrollable when menu overflows */}
        <nav className="adm-scroll-area" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {menuSections.map((section, sIdx) => {
            // Pre-filter: only keep items the current role can see
            const visibleItems = section.items.filter(({ label }) =>
              !adminOnly.includes(label) || isAdmin
            );

            // Skip entire section (heading + divider) if nothing to show
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} style={{ marginBottom: section.heading ? 6 : 0 }}>
                {/* Section Heading */}
                {section.heading && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                      padding: "0.5rem 0.7rem 0.3rem",
                    }}
                  >
                    {section.heading}
                  </div>
                )}

                {/* Visible Items */}
                {visibleItems.map(({ label, icon: Icon }) => {
                  const active = label === activeLabel;
                  return (
                    <button
                      key={label}
                      className="sidebar-btn"
                      data-active={String(active)}
                      onClick={() => handleNav(label)}
                      style={{
                        textAlign: "left",
                        padding: "0.55rem 0.7rem",
                        borderRadius: 14,
                        border: "none",
                        background: active ? baseBlue : "transparent",
                        color: active ? "#ffffff" : "#475569",
                        fontWeight: active ? 600 : 500,
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        width: "100%",
                      }}
                    >
                      <Icon size={16} strokeWidth={2} />
                      {label}
                    </button>
                  );
                })}

                {/* Divider between sections (not after last) */}
                {sIdx < menuSections.length - 1 && (
                  <div
                    style={{
                      height: 1,
                      background: "#e2e8f0",
                      margin: "0.5rem 0.4rem",
                    }}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
