"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { FaBars, FaShieldAlt } from "react-icons/fa";

type Props = {
  children: React.ReactNode;
  adminName: string;
  handleLogout: () => void;
};

export default function AdminLayout({ children, adminName, handleLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        adminName={adminName}
        handleLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:ml-64 min-h-screen flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 p-1"
            aria-label="Open sidebar"
          >
            <FaBars size={18} />
          </button>
          <FaShieldAlt size={14} className="text-[#1e3a5f]" />
          <span className="font-bold text-slate-800 text-sm">SN Finance Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}