"use client";

import React, { useState } from "react";
import { FaBars, FaChartLine } from "react-icons/fa";
import DSASidebar from "./DSASidebar";

type Props = {
  children: React.ReactNode;
  s: any;
  userName: string;
  handleLogout: () => void;
};

export default function DSALayout({
  children,
  s,
  userName,
  handleLogout,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={s.page}>
      <DSASidebar
        s={s}
        userName={userName}
        handleLogout={handleLogout}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="dsa-content-col">
        {/* Mobile-only top bar */}
        <div className="dsa-mobile-topbar">
          <button
            className="dsa-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <FaBars size={17} />
          </button>
          <div className="dsa-mobile-brand">
            <FaChartLine size={14} color="#1e3a5f" />
            <span>SN Finance</span>
          </div>
          <div style={{ width: 34 }} />
        </div>

        <main style={s.main} className="dsa-main">
          {children}
        </main>
      </div>

      <style jsx>{`
        /* ── OFFSET CONTENT FOR THE NOW-FIXED SIDEBAR ──
           The sidebar is position:fixed with a 260px width (see
           DSASidebar.tsx). Content needs a matching left margin so it
           doesn't render underneath it. Adjust 260px if your actual
           s.sidebar width differs. */
        .dsa-content-col {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          margin-left: 260px;
          min-height: 100vh;
        }

        .dsa-mobile-topbar {
          display: none;
        }

        @media (max-width: 900px) {
          .dsa-content-col {
            /* sidebar is off-screen (translateX(-100%)) until opened,
               so content goes full-width on mobile */
            margin-left: 0;
          }

          .dsa-mobile-topbar {
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

          .dsa-hamburger {
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

          .dsa-mobile-brand {
            display: flex;
            align-items: center;
            gap: 7px;
            font-weight: 800;
            font-size: 15px;
            color: #1e293b;
          }

          .dsa-main {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}