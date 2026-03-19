import React from "react";
import {
  Home,
  Building2,
  Wrench,
  ClipboardList,
  BarChart2,
  User,
  CircleArrowDown,
  CircleArrowUp,
  TicketIcon,
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
      { label: "Repairs", icon: Wrench },
      { label: "Repair History", icon: ClipboardList },
    ],
  },
  {
    heading: "Units",
    items: [
      { label: "Incoming Units", icon: CircleArrowDown },
      { label: "Outgoing Units", icon:CircleArrowUp },
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


type SidebarProps = {
  activeIndex: number;
  onNavigate: (index: number) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ activeIndex, onNavigate }) => {
  let globalIndex = -1;

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
      `}</style>
      <aside
        style={{
          width: 230,
          minHeight: "100vh",
          background: "#ffffff",
          color: "#1e293b",
          padding: "1.4rem 1.4rem 1.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          borderRight: "1px solid #e2e8f0",
          fontFamily: "'Poppins', sans-serif",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div>
          <img
            src="/masaya-sa-tarlac-city.png"
            alt="Masaya sa Tarlac City"
            style={{ width: "100%", height: "auto", display: "block", marginBottom: 10 }}
          />
        </div>

        {/* Sectioned Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {menuSections.map((section, sIdx) => (
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

              {/* Items */}
              {section.items.map(({ label, icon: Icon }) => {
                globalIndex++;
                const idx = globalIndex;
                const active = idx === activeIndex;
                return (
                  <button
                    key={label}
                    className="sidebar-btn"
                    data-active={String(active)}
                    onClick={() => onNavigate(idx)}
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
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;