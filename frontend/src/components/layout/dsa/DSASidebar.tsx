"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  FaChartLine,
  FaListAlt,
  FaPlusCircle,
  FaUsers,
  FaUserTie,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";

type Props = {
  s: any;
  userName: string;
  handleLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
};

export default function DSASidebar({
  s,
  userName,
  handleLogout,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (href: string) => {
    router.push(href);
    onClose(); // close drawer on mobile after navigating
  };

  const NavLink = ({
    icon,
    label,
    href,
  }: {
    icon: React.ReactNode;
    label: string;
    href: string;
  }) => {
    const active = pathname === href;

    return (
      <button
        onClick={() => go(href)}
        style={{
          ...s.navLink,
          ...(active ? s.navLinkActive : {}),
        }}
      >
        {icon}
        <span style={s.navLabel}>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Backdrop — only visible on mobile when drawer is open */}
      <div
        className={`dsa-backdrop ${isOpen ? "dsa-backdrop--visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`dsa-sidebar ${isOpen ? "dsa-sidebar--open" : ""}`} style={s.sidebar}>
        {/* Close button — mobile only */}
        <button className="dsa-close-btn" onClick={onClose} aria-label="Close menu">
          <FaTimes size={16} />
        </button>

        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoIcon}>
            <FaChartLine size={15} color="#fff" />
          </div>
          <span style={s.logoText}>SN Finance</span>
        </div>

        {/* DSA Badge */}
        <div style={s.caBadge}>
          <FaUserTie size={14} color="#fbbf24" />
          <span style={s.caBadgeText}>DSA Portal</span>
        </div>

        {/* Navigation */}
        <nav style={s.nav}>
          <NavLink icon={<FaChartLine />} label="Dashboard" href="/dsa/dashboard" />
          <NavLink icon={<FaListAlt />} label="All Applications" href="/dsa/loans" />
          <NavLink icon={<FaPlusCircle />} label="New Application" href="/dsa/apply" />
          <NavLink icon={<FaUsers />} label="Manage DSAs" href="/dsa/manage-dsas" />
          <NavLink icon={<FaUserTie />} label="My Profile" href="/dsa/profile" />
        </nav>

        {/* User */}
        <div style={{ ...s.sidebarUser, cursor: "pointer" }} onClick={() => go("/dsa/profile")}>
          <div style={s.avatarCircle}>{userName.charAt(0).toUpperCase()}</div>
          <div style={s.userInfo}>
            <div style={s.userName}>{userName}</div>
            <div style={s.userRole}>Direct Selling Agent</div>
          </div>
        </div>

        {/* Logout */}
        <button style={s.logoutBtn} onClick={handleLogout}>
          <FaSignOutAlt size={13} />
          <span>Logout</span>
        </button>
      </aside>

      <style jsx>{`
        /* ── FIXED ON ALL SCREEN SIZES ──
           Previously this only applied inside the mobile media query,
           so on desktop the sidebar was a normal flex child and scrolled
           away with the page once content grew taller than the viewport.
           Now it's pinned to the viewport at every breakpoint. */
        .dsa-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 60;
          transition: transform 0.25s ease;
        }

        .dsa-close-btn {
          display: none;
        }

        .dsa-backdrop {
          display: none;
        }

        @media (max-width: 900px) {
          .dsa-sidebar {
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25);
          }

          .dsa-sidebar--open {
            transform: translateX(0);
          }

          .dsa-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 14px;
            right: 14px;
            width: 30px;
            height: 30px;
            border-radius: 8px;
            border: none;
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            cursor: pointer;
          }

          .dsa-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.5);
            z-index: 50;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
          }

          .dsa-backdrop--visible {
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
    </>
  );
}