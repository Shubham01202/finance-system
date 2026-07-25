"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import CALayout from "../../../components/layout/ca/CALayout";
import {
  FaUserTie,
  FaPlus,
  FaTimes,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCircle,
  FaPhoneAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

/* ─── Types ─────────────────────────────────────────────── */
interface CAUser {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  is_verified: boolean;
  is_active: boolean;
  password_created: boolean;
  created_at: string;
}

const PAGE_SIZE = 10;

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ name }: { name?: string }) {
  const safeName = name?.trim() || "U";
  const colors = [
    ["#dbeafe", "#2563eb"],
    ["#dcfce7", "#16a34a"],
    ["#fef3c7", "#b45309"],
    ["#fce7f3", "#be185d"],
    ["#ede9fe", "#7c3aed"],
  ];
  const idx = safeName.charCodeAt(0) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "13px",
        flexShrink: 0,
      }}
    >
      {safeName.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── Status badges ─────────────────────────────────────── */
function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
      <FaCheckCircle size={11} /> Verified
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
      <FaTimesCircle size={11} /> Unverified
    </span>
  );
}

function PasswordBadge({ created }: { created: boolean }) {
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: created ? "rgba(59,130,246,0.1)" : "rgba(234,179,8,0.1)", color: created ? "#2563eb" : "#b45309", border: `1px solid ${created ? "rgba(59,130,246,0.3)" : "rgba(234,179,8,0.3)"}` }}>
      {created ? "Created" : "Pending"}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: active ? "#22c55e" : "#f87171", border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? "#22c55e" : "#f87171" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function ManageCaPage() {
  const router = useRouter();
  const [cas, setCas] = useState<CAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [userName, setUserName] = useState("CA");

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    mobile: "",
    setupMethod: "email", // "email" | "manual"
    password: "",
  });

  const [saving, setSaving] = useState(false);

  /* ── auth / user info for the sidebar ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserName(user.full_name || "CA");
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const fetchCas = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/ca/my-cas");
      if (res.success) setCas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewUser({
      fullName: "",
      email: "",
      mobile: "",
      setupMethod: "email",
      password: "",
    });
  };

  const createCa = async () => {
    const { fullName, email, mobile, setupMethod, password } = newUser;

    if (!fullName.trim() || !email.trim()) {
      alert("Please fill in name and email");
      return;
    }

    if (mobile && !/^\d{10}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    if (setupMethod === "manual" && (!password || password.length < 6)) {
      alert("Please set a password with at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch("/ca/create-ca", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          mobile,
          setup_method: setupMethod,
          ...(setupMethod === "manual" ? { password } : {}),
        }),
      });
      if (res.success) {
        alert(res.message);
        setShowModal(false);
        resetForm();
        fetchCas();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchCas();
  }, []);

  /* ── filtered + paginated ── */
  const filtered = cas.filter(
    (c) =>
      (c.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.mobile ?? "").includes(search)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const verifiedCount = cas.filter((c) => c.is_verified).length;
  const activeCount = cas.filter((c) => c.is_active).length;

  /* ══════════════════════ STYLES ════════════════════════
     Includes BOTH the keys CALayout/CASidebar need (page, sidebar,
     logo*, caBadge*, nav*, sidebarUser, avatarCircle, userInfo,
     userName, userRole, logoutBtn, main) AND this page's own
     content styles — CALayout/CASidebar are used unmodified.
  ═══════════════════════════════════════════════════════════ */
  const s: Record<string, React.CSSProperties> = {
    /* ---- layout / sidebar (consumed by CALayout + CASidebar) ---- */
    page: {
      display: "flex",
      minHeight: "100vh",
      background: "#f1f5f9",
      fontFamily: "'Outfit', sans-serif",
    },
    sidebar: {
      width: 240,
      minHeight: "100vh",
      background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 14px",
      position: "sticky" as const,
      top: 0,
      height: "100vh",
      flexShrink: 0,
    },
    logo: { display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, paddingLeft: 6 },
    logoIcon: { width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
    logoText: { color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" },
    caBadge: { display: "flex", alignItems: "center", gap: 7, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "6px 12px", marginBottom: 16 },
    caBadgeText: { color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" },
    nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
    navLink: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", textAlign: "left" as const, width: "100%", transition: "background 0.15s", background: "transparent", color: "rgba(255,255,255,0.65)" },
    navLinkActive: { background: "rgba(255,255,255,0.15)", color: "#fff" },
    navLabel: {},
    sidebarUser: { display: "flex", alignItems: "center", gap: 10, padding: "14px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8 },
    avatarCircle: { width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    userInfo: { overflow: "hidden" },
    userName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
    userRole: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
    logoutBtn: { display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", color: "rgba(255,255,255,0.5)", background: "transparent", border: "none", borderRadius: 9, fontSize: 13, cursor: "pointer", marginTop: 4, width: "100%" },
    main: { flex: 1, padding: "28px 32px", overflowY: "auto" as const, minWidth: 0, background: "#f1f5f9" },

    /* ---- this page's own content styles ---- */
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "28px",
      flexWrap: "wrap" as const,
      gap: "14px",
    },
    pageTitle: {
      color: "#0f172a",
      fontSize: "22px",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: 0,
    },
    pageSubtitle: { color: "#64748b", fontSize: "14px", marginTop: "4px" },
    addBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 16px",
      borderRadius: "10px",
      border: "none",
      background: "#2563eb",
      color: "#fff",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
    },
    statsRow: { display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" as const },
    statCard: {
      flex: 1,
      minWidth: "160px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    statLabel: {
      color: "#64748b",
      fontSize: "12px",
      fontWeight: 600,
      marginBottom: "6px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    },
    statValue: { color: "#0f172a", fontSize: "28px", fontWeight: 700 },
    toolbar: { display: "flex", gap: "12px", marginBottom: "20px" },
    searchWrap: {
      flex: 1,
      minWidth: "200px",
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
    },
    searchIcon: { position: "absolute" as const, left: "13px", color: "#94a3b8" },
    searchInput: {
      width: "100%",
      padding: "10px 14px 10px 38px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      color: "#0f172a",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
    },
    tableWrap: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    table: { width: "100%", borderCollapse: "collapse" as const },
    thead: { background: "#f8fafc" },
    th: {
      padding: "14px 18px",
      color: "#64748b",
      fontWeight: 600,
      fontSize: "12px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      textAlign: "left" as const,
    },
    td: {
      padding: "14px 18px",
      color: "#475569",
      fontSize: "14px",
      borderTop: "1px solid #f1f5f9",
    },
    loadingWrap: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "#94a3b8",
      fontSize: "15px",
    },
    paginationBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      borderTop: "1px solid #f1f5f9",
      flexWrap: "wrap" as const,
      gap: "10px",
    },
    pageInfo: { color: "#64748b", fontSize: "13px" },
    pageControls: { display: "flex", alignItems: "center", gap: "6px" },
    pageBtn: {
      width: "32px",
      height: "32px",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#475569",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    pageBtnActive: {
      background: "#2563eb",
      borderColor: "#2563eb",
      color: "#fff",
    },
    pageBtnDisabled: {
      opacity: 0.4,
      cursor: "not-allowed" as const,
    },
    modalOverlay: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "16px",
    },
    modal: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      padding: "28px",
      width: "100%",
      maxWidth: "440px",
      maxHeight: "90vh",
      overflowY: "auto" as const,
      boxShadow: "0 25px 60px rgba(0,0,0,0.15)",
      boxSizing: "border-box" as const,
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    modalTitle: { color: "#0f172a", fontSize: "18px", fontWeight: 700 },
    fieldLabel: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "#64748b",
      marginBottom: "6px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.04em",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#0f172a",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
      marginBottom: "14px",
    },
    mobileInputWrap: {
      position: "relative" as const,
      marginBottom: "14px",
    },
    mobileIcon: {
      position: "absolute" as const,
      left: "13px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#94a3b8",
      fontSize: "12px",
    },
    mobileInput: {
      width: "100%",
      padding: "10px 14px 10px 36px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#0f172a",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
    },
    filterSelect: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#0f172a",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
      marginBottom: "14px",
      cursor: "pointer",
    },
    cancelBtn: {
      padding: "10px 20px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#f8fafc",
      color: "#64748b",
      fontSize: "14px",
      cursor: "pointer",
    },
    submitBtn: {
      padding: "10px 20px",
      border: "none",
      borderRadius: "10px",
      background: "#2563eb",
      color: "#fff",
      fontWeight: 600,
      fontSize: "14px",
      cursor: "pointer",
    },
  };

  /* ══════════════════════ RENDER ════════════════════════ */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      {/* Top bar */}
      <div style={s.topBar} className="mca-topbar">
        <div>
          <h1 style={s.pageTitle}>
            <FaUserTie /> Manage CAs
          </h1>
          <div style={s.pageSubtitle}>Manage Chartered Accountants</div>
        </div>

        <button style={s.addBtn} onClick={() => setShowModal(true)}>
          <FaPlus size={12} /> Add CA
        </button>
      </div>

      {/* Stat cards */}
      <div style={s.statsRow}>
        {[
          { label: "Total CAs", value: cas.length, color: "#3b82f6" },
          { label: "Verified", value: verifiedCount, color: "#22c55e" },
          { label: "Active", value: activeCount, color: "#8b5cf6" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...s.statCard, borderTop: `3px solid ${color}` }}>
            <div style={s.statLabel}>{label}</div>
            <div style={{ ...s.statValue, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <FaSearch size={13} style={s.searchIcon} />
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search by name, email or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table (desktop/tablet) + Cards (mobile) */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.loadingWrap}>Loading CAs…</div>
        ) : (
          <>
            <div className="mca-table-wrap" style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead style={s.thead}>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Name</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Mobile</th>
                    <th style={s.th}>Verified</th>
                    <th style={s.th}>Password</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((ca, idx) => (
                      <tr key={ca.id}>
                        <td style={{ ...s.td, color: "#cbd5e1", width: "48px" }}>
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>

                        <td style={{ ...s.td, fontWeight: 600, color: "#0f172a" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Avatar name={ca.full_name} />
                            {ca.full_name}
                          </div>
                        </td>

                        <td style={s.td}>{ca.email}</td>

                        <td style={s.td}>
                          {ca.mobile ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <FaPhoneAlt size={10} style={{ color: "#94a3b8" }} />
                              {ca.mobile}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>

                        <td style={s.td}><VerifiedBadge verified={ca.is_verified} /></td>
                        <td style={s.td}><PasswordBadge created={ca.password_created} /></td>
                        <td style={s.td}><ActiveBadge active={ca.is_active} /></td>
                        <td style={s.td}>{new Date(ca.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ ...s.td, textAlign: "center" as const, padding: "48px", color: "#94a3b8" }}>
                        <FaUserCircle size={28} style={{ marginBottom: "10px", opacity: 0.3 }} />
                        <div>{search ? "No CAs match your search." : "No CAs found."}</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="mca-card-list">
              {paginated.length > 0 ? (
                paginated.map((ca) => (
                  <div key={ca.id} className="mca-ca-card">
                    <div className="mca-ca-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Avatar name={ca.full_name} />
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{ca.full_name}</div>
                          <div style={{ color: "#64748b", fontSize: "12.5px" }}>{ca.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mca-ca-card-badges">
                      <VerifiedBadge verified={ca.is_verified} />
                      <ActiveBadge active={ca.is_active} />
                      <PasswordBadge created={ca.password_created} />
                    </div>

                    <div className="mca-ca-card-row">
                      <span className="mca-ca-card-label">Mobile</span>
                      <span>
                        {ca.mobile ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <FaPhoneAlt size={10} style={{ color: "#94a3b8" }} />
                            {ca.mobile}
                          </span>
                        ) : "—"}
                      </span>
                    </div>
                    <div className="mca-ca-card-row">
                      <span className="mca-ca-card-label">Created</span>
                      <span>{new Date(ca.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <FaUserCircle size={28} style={{ marginBottom: "10px", opacity: 0.3 }} />
                  <div>{search ? "No CAs match your search." : "No CAs found."}</div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div style={s.paginationBar}>
                <div style={s.pageInfo}>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
                <div style={s.pageControls}>
                  <button
                    style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <FaChevronLeft size={11} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                    .reduce<(number | "ellipsis")[]>((acc, n, i, arr) => {
                      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === "ellipsis" ? (
                        <span key={`e${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: "13px" }}>…</span>
                      ) : (
                        <button
                          key={n}
                          style={{ ...s.pageBtn, ...(n === currentPage ? s.pageBtnActive : {}) }}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      )
                    )}

                  <button
                    style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <FaChevronRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add CA Modal ── */}
      {showModal && (
        <div
          style={s.modalOverlay}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Add New CA</h2>
              <FaTimes
                style={{ cursor: "pointer", color: "#94a3b8" }}
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              />
            </div>

            <label style={s.fieldLabel}>Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              style={s.input}
            />

            <label style={s.fieldLabel}>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              style={s.input}
            />

            <label style={s.fieldLabel}>Mobile Number</label>
            <div style={s.mobileInputWrap}>
              <FaPhoneAlt style={s.mobileIcon} />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={newUser.mobile}
                maxLength={10}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                style={s.mobileInput}
              />
            </div>
            <div style={{ height: "14px" }} />

            <label style={s.fieldLabel}>Setup Method</label>
            <select
              value={newUser.setupMethod}
              onChange={(e) => setNewUser({ ...newUser, setupMethod: e.target.value })}
              style={s.filterSelect}
            >
              <option value="email">Send Password Setup Link</option>
              <option value="manual">Set Password Manually</option>
            </select>

            {newUser.setupMethod === "manual" && (
              <>
                <label style={s.fieldLabel}>Password</label>
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={s.input}
                />
              </>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                style={s.cancelBtn}
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button style={s.submitBtn} disabled={saving} onClick={createCa}>
                {saving ? "Creating..." : "Create CA"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mca-card-list {
          display: none;
        }

        @media (max-width: 640px) {
          .mca-topbar {
            flex-direction: column;
            align-items: stretch !important;
          }
          .mca-table-wrap {
            display: none;
          }
          .mca-card-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }
          .mca-ca-card {
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .mca-ca-card-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .mca-ca-card-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #1e293b;
          }
          .mca-ca-card-label {
            color: #94a3b8;
            font-weight: 600;
          }
        }
      `}</style>
    </CALayout>
  );
}