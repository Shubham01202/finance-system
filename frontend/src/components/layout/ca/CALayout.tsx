"use client";

import React, { useState } from "react";
import { FaBars, FaChartLine } from "react-icons/fa";
import CASidebar from "./CASidebar";

type Props = {
  children: React.ReactNode;
  s: any;
  userName: string;
  handleLogout: () => void;
};

export default function CALayout({
  children,
  s,
  userName,
  handleLogout,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={s.page}>
      <CASidebar
        s={s}
        userName={userName}
        handleLogout={handleLogout}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="ca-content-col">
        {/* Mobile-only top bar */}
        <div className="ca-mobile-topbar">
          <button
            className="ca-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <FaBars size={17} />
          </button>
          <div className="ca-mobile-brand">
            <FaChartLine size={14} color="#1e3a5f" />
            <span>SN Finance</span>
          </div>
          <div style={{ width: 34 }} />
        </div>

        <main style={s.main} className="ca-main">
          {children}
        </main>
      </div>

      <style jsx>{`
        .ca-content-col {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .ca-mobile-topbar {
          display: none;
        }

        @media (max-width: 900px) {
          .ca-mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            z-index: 40;
          }

          .ca-hamburger {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1e3a5f;
            cursor: pointer;
          }

          .ca-mobile-brand {
            display: flex;
            align-items: center;
            gap: 7px;
            font-weight: 800;
            font-size: 15px;
            color: #1e293b;
          }

          .ca-main {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}