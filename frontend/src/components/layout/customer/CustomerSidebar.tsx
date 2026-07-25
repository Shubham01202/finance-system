"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  FaChartLine,
  FaFileAlt,
  FaPlusCircle,
  FaUserCog,
  FaUserCircle,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";

type Props = {
  userName: string;
  userEmail: string;
  handleLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
};

export default function CustomerSidebar({
  userName,
  userEmail,
  handleLogout,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

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
        onClick={() => {
          router.push(href);
          onClose();
        }}
        className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${active
            ? "bg-white/15 text-white"
            : "text-white/65 hover:bg-white/10 hover:text-white"
          }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Overlay - mobile only, shown when drawer is open */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 shrink-0 flex flex-col
          bg-linear-to-b from-[#1e3a5f] to-[#0f2340]
          px-3.5 pt-6 pb-5 z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo + mobile close button */}
        <div className="flex items-center justify-between gap-2.5 px-1.5 pb-6 mb-4.5 border-b border-white/10">
          <img
            src="/images/SN-Finance-Service-Logo-1.png"
            alt="SN Finance Service"
            className="h-11 w-auto object-contain"
          />
          <button
            onClick={onClose}
            className="md:hidden text-white/70 hover:text-white p-1"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink icon={<FaChartLine size={15} />} label="Dashboard" href="/dashboard" />
          <NavLink icon={<FaFileAlt size={15} />} label="My Loans" href="/loans" />
          <NavLink icon={<FaPlusCircle size={15} />} label="Apply Loan" href="/apply" />
          <NavLink icon={<FaUserCog size={15} />} label="My Profile" href="/profile" />
        </nav>

        {/* User Info */}
        <div className="flex items-center gap-2.5 px-2 py-3.5 border-t border-white/10 mt-2">
          <FaUserCircle size={32} className="text-white/70 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-white text-[13px] font-semibold m-0 truncate">{userName}</p>
            <p className="text-white/45 text-[11px] mt-0.5 truncate">{userEmail}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-white/50 hover:bg-white/10 hover:text-white/80 mt-1 w-full transition-colors"
        >
          <FaSignOutAlt size={13} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}