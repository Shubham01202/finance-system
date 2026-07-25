"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaFileAlt, FaCheckCircle, FaClock,
  FaTimesCircle, FaRupeeSign,
} from "react-icons/fa";
import CALayout from "../../../components/layout/ca/CALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Stats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  total_amount: number;
}

interface RecentApp {
  id: string;
  full_name: string;
  loan_type: string;
  loan_amount: number;
  tenure: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  bank_name?: string;
}

const statusConfig = {
  approved: { color: "#10b981", bg: "#d1fae5", icon: <FaCheckCircle size={11} />, label: "Approved" },
  pending:  { color: "#f59e0b", bg: "#fef3c7", icon: <FaClock size={11} />,       label: "Pending"  },
  rejected: { color: "#ef4444", bg: "#fee2e2", icon: <FaTimesCircle size={11} />, label: "Rejected" },
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CADashboardPage() {
  const router = useRouter();

  const [stats, setStats]       = useState<Stats>({ total: 0, approved: 0, pending: 0, rejected: 0, total_amount: 0 });
  const [recent, setRecent]     = useState<RecentApp[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [userName, setUserName] = useState("CA");
  const [firmName, setFirmName] = useState("");

  /* ── ON MOUNT ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}

    fetchDashboard(token);
  }, []);

  const fetchDashboard = async (token: string) => {
    try {
      setLoading(true); setError("");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      if (res.status === 400) { router.push("/ca/profile/setup"); return; }

      const data = await res.json();

      if (data.success) {
        setStats({
          total:        Number(data.stats.total)        || 0,
          approved:     Number(data.stats.approved)     || 0,
          pending:      Number(data.stats.pending)      || 0,
          rejected:     Number(data.stats.rejected)     || 0,
          total_amount: Number(data.stats.total_amount) || 0,
        });
        setRecent(data.recent || []);
        if (data.recent?.[0]?.ca_firm) setFirmName(data.recent[0].ca_firm);
      } else {
        setError("Failed to load dashboard.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div style={s.topBar} className="ca-topbar">
        <div>
          <h1 style={s.greeting}>Welcome back, {userName.split(" ")[0]} 👋</h1>
          <div style={s.greetingSub}>
            {firmName ? `${firmName} · ` : ""}CA Dashboard Overview
          </div>
        </div>
        <button style={s.newBtn} onClick={() => router.push("/ca/apply")}>
          + New Application
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* ── STATS GRID ── */}
      <div style={s.statsGrid} className="ca-stats-grid">
        <StatCard label="Total Filed"  value={stats.total}             icon={<FaFileAlt size={17} />}     accent="#1e3a5f" />
        <StatCard label="Approved"     value={stats.approved}          icon={<FaCheckCircle size={17} />} accent="#10b981" />
        <StatCard label="Pending"      value={stats.pending}           icon={<FaClock size={17} />}       accent="#f59e0b" />
        <StatCard label="Rejected"     value={stats.rejected}          icon={<FaTimesCircle size={17} />} accent="#ef4444" />
        <StatCard label="Total Amount" value={fmt(stats.total_amount)} icon={<FaRupeeSign size={17} />}   accent="#6366f1" isText />
      </div>

      {/* ── RECENT APPLICATIONS ── */}
      <div style={s.card} className="ca-card">
        <div style={s.cardHead}>
          <h2 style={s.cardTitle}>Recent Applications</h2>
          <button style={s.viewAllBtn} onClick={() => router.push("/ca/loans")}>
            View All →
          </button>
        </div>

        {loading ? (
          <div style={s.center}>
            <div style={s.spinner} />
            <div style={s.mutedText}>Loading applications…</div>
          </div>
        ) : recent.length === 0 ? (
          <div style={s.center}>
            <FaFileAlt size={44} color="#cbd5e1" />
            <div style={s.mutedText}>No applications filed yet.</div>
            <button style={s.newBtn} onClick={() => router.push("/ca/apply")}>
              File First Application
            </button>
          </div>
        ) : (
          <>
            {/* Table — desktop / tablet */}
            <div className="ca-table-wrap" style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <Th>Customer Name</Th>
                    <Th>Loan Type</Th>
                    <Th>Bank</Th>
                    <Th>Amount</Th>
                    <Th>Tenure</Th>
                    <Th>Filed On</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(app => {
                    const sc = statusConfig[app.status] ?? statusConfig.pending;
                    return (
                      <tr key={app.id} style={s.trow}>
                        <Td><strong>{app.full_name || "—"}</strong></Td>
                        <Td style={{ textTransform: "capitalize" }}>{app.loan_type?.replace(/_/g, " ") || "—"}</Td>
                        <Td>{app.bank_name || "—"}</Td>
                        <Td><strong>{fmt(app.loan_amount)}</strong></Td>
                        <Td>{app.tenure} yr{Number(app.tenure) > 1 ? "s" : ""}</Td>
                        <Td style={{ color: "#94a3b8" }}>
                          {new Date(app.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </Td>
                        <td style={s.tdBase}>
                          <span style={{ ...s.badge, color: sc.color, background: sc.bg }}>
                            {sc.icon}&nbsp;{sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile only */}
            <div className="ca-card-list">
              {recent.map(app => {
                const sc = statusConfig[app.status] ?? statusConfig.pending;
                return (
                  <div key={app.id} className="ca-app-card">
                    <div className="ca-app-card-top">
                      <strong>{app.full_name || "—"}</strong>
                      <span style={{ ...s.badge, color: sc.color, background: sc.bg }}>
                        {sc.icon}&nbsp;{sc.label}
                      </span>
                    </div>
                    <div className="ca-app-card-row">
                      <span className="ca-app-card-label">Loan Type</span>
                      <span style={{ textTransform: "capitalize" }}>{app.loan_type?.replace(/_/g, " ") || "—"}</span>
                    </div>
                    <div className="ca-app-card-row">
                      <span className="ca-app-card-label">Bank</span>
                      <span>{app.bank_name || "—"}</span>
                    </div>
                    <div className="ca-app-card-row">
                      <span className="ca-app-card-label">Amount</span>
                      <strong>{fmt(app.loan_amount)}</strong>
                    </div>
                    <div className="ca-app-card-row">
                      <span className="ca-app-card-label">Tenure</span>
                      <span>{app.tenure} yr{Number(app.tenure) > 1 ? "s" : ""}</span>
                    </div>
                    <div className="ca-app-card-row">
                      <span className="ca-app-card-label">Filed On</span>
                      <span style={{ color: "#94a3b8" }}>
                        {new Date(app.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .ca-card-list {
          display: none;
        }

        @media (max-width: 640px) {
          .ca-topbar {
            flex-direction: column;
            align-items: stretch !important;
          }
          .ca-table-wrap {
            display: none;
          }
          .ca-card-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .ca-app-card {
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .ca-app-card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14.5px;
            margin-bottom: 2px;
          }
          .ca-app-card-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #1e293b;
          }
          .ca-app-card-label {
            color: #94a3b8;
            font-weight: 600;
          }
          .ca-card {
            padding: 18px 16px !important;
          }
        }
      `}</style>
    </CALayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function StatCard({ label, value, icon, accent, isText = false }: { label: string; value: number | string; icon: React.ReactNode; accent: string; isText?: boolean }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIcon, background: accent + "18", color: accent }}>{icon}</div>
      <div>
        <div style={s.statLabel}>{label}</div>
        <div style={{ ...s.statValue, color: isText ? accent : "#1e293b" }}>{value}</div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={s.th}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ ...s.tdBase, ...style }}>{children}</td>;
}

/* ─────────────────────────────────────────────
   STYLES — content-only now; sidebar/page chrome lives in CALayout/CASidebar
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* ---- layout / sidebar (consumed by CALayout + CASidebar) ---- */
  page: { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  sidebar: {
    width: 240, minHeight: "100vh",
    background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)",
    display: "flex", flexDirection: "column", padding: "24px 14px",
    position: "sticky" as const, top: 0, height: "100vh", flexShrink: 0,
  },
  logo:     { display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, paddingLeft: 6 },
  logoIcon: { width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" },
  caBadge:  { display: "flex", alignItems: "center", gap: 7, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "6px 12px", marginBottom: 16 },
  caBadgeText: { color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" },
  nav:      { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navLink:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", textAlign: "left" as const, width: "100%", transition: "background 0.15s", background: "transparent", color: "rgba(255,255,255,0.65)" },
  navLinkActive: { background: "rgba(255,255,255,0.15)", color: "#fff" },
  navLabel: {},
  sidebarUser: { display: "flex", alignItems: "center", gap: 10, padding: "14px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8 },
  avatarCircle: { width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userInfo: { overflow: "hidden" },
  userName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  logoutBtn:{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", color: "rgba(255,255,255,0.5)", background: "transparent", border: "none", borderRadius: 9, fontSize: 13, cursor: "pointer", marginTop: 4, width: "100%" },

  /* ---- this page's own content styles ---- */
  main:     { flex: 1, overflowY: "auto" as const, minWidth: 0, padding: "32px 36px" },
  topBar:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap" as const, gap: 14 },
  greeting: { fontSize: 23, fontWeight: 800, color: "#1e293b", margin: 0 },
  greetingSub: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  newBtn:   { background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  statsGrid:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "#fff", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  statIcon: { width: 44, height: 44, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statLabel:{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 4px" },
  statValue:{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" },
  card:     { background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTitle:{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 },
  viewAllBtn:{ background: "transparent", color: "#2d5986", border: "1.5px solid #2d5986", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  table:    { width: "100%", borderCollapse: "collapse" as const },
  th:       { padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.06em", textAlign: "left" as const, borderBottom: "2px solid #f1f5f9" },
  trow:     { borderBottom: "1px solid #f8fafc" },
  tdBase:   { padding: "13px 12px", fontSize: 14, color: "#1e293b" },
  badge:    { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  center:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "56px 0" },
  spinner:  { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  mutedText:{ color: "#94a3b8", fontSize: 14, margin: 0 },
};