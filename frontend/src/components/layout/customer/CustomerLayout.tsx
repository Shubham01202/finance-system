"use client";

import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import CustomerSidebar from "./CustomerSidebar";

type Props = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  handleLogout: () => void;
};

export default function CustomerLayout({
  children,
  userName,
  userEmail,
  handleLogout,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <CustomerSidebar
        userName={userName}
        userEmail={userEmail}
        handleLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar with hamburger - hidden on desktop */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-700 p-1"
          >
            <FaBars size={20} />
          </button>
          <img
            src="/images/SN-Finance-Service-Logo-1.png"
            alt="SN Finance Service"
            className="h-8 w-auto object-contain"
          />
        </div>

        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}