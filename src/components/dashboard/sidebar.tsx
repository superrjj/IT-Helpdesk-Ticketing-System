import React from "react";
import {
  LayoutDashboard, Monitor, Building2,
  Wrench, ClipboardList, BarChart2, User, CircleArrowDown,
  TicketIcon, CircleArrowUp,
} from "lucide-react";

const baseBlue = "#0a4c86";
const hoverBlue = "#0d5fa3";

const menuItems = [
  { label: "Dashboard",         icon: LayoutDashboard },
  { label: "Submit Ticket", icon: TicketIcon },
  { label: "Repairs",           icon: Wrench },
  { label: "Incoming Units",         icon: CircleArrowUp },
  { label: "Outgoing Units",         icon: CircleArrowDown },
  { label: "Departments",       icon: Building2 },
  { label: "Equipment",         icon: Monitor },
  { label: "Repair History",    icon: ClipboardList },
  { label: "Reports & Analytics",           icon: BarChart2 },
  { label: "User Accounts",          icon: User },

];

type SidebarProps = {
  activeIndex: number;
  onNavigate: (index: number) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ activeIndex, onNavigate }) => {
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
          gap: "1.5rem",
          borderRight: "1px solid #e2e8f0",
          fontFamily: "'Poppins', sans-serif",
          flexShrink: 0,
        }}
      >
        <div>
          <img
            src="/masaya-sa-tarlac-city.png"
            alt="Masaya sa Tarlac City"
            style={{ width: "100%", height: "auto", display: "block", marginBottom: 10 }}
          />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          {menuItems.map(({ label, icon: Icon }, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={label}
                className="sidebar-btn"
                data-active={String(active)}
                onClick={() => onNavigate(index)}
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
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;