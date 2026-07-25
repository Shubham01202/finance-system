// Path: frontend/src/app/ca/loans/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FaFileAlt, FaCheckCircle, FaClock,
  FaTimesCircle, FaSearch, FaFilter, FaTimes, FaEye, FaEdit,
} from "react-icons/fa";
import CALayout from "./../../../components/layout/ca/CALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface LoanApp {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  loan_type: string;
  loan_amount: number;
  tenure: string;
  status: "pending" | "approved" | "rejected";
  pincode: string;
  employment_type: string;
  loan_purpose: string;
  created_at: string;
  bank_name: string;
  ca_name: string;
  ca_firm: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const statusConfig = {
  approved: { color: "#10b981", bg: "#d1fae5", icon: <FaCheckCircle size={11} />, label: "Approved" },
  pending:  { color: "#f59e0b", bg: "#fef3c7", icon: <FaClock size={11} />,       label: "Pending"  },
  rejected: { color: "#ef4444", bg: "#fee2e2", icon: <FaTimesCircle size={11} />, label: "Rejected" },
};

const LOAN_TYPES = [
  { value: "",                    label: "All Loan Types" },
  { value: "personal_loan",       label: "Personal Loan" },
  { value: "home_loan",           label: "Home Loan" },
  { value: "business_loan",       label: "Business Loan" },
  { value: "working_capital_loan",label: "Working Capital" },
  { value: "loan_against_property",label: "Loan Against Property" },
  { value: "vehicle_loan",        label: "Vehicle Loan" },
];

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CALoansPage() {
  const router = useRouter();

  const [loans, setLoans]           = useState<LoanApp[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [userName, setUserName]     = useState("CA");

  // Filters
  const [search, setSearch]         = useState("");
  const [bank, setBank]             = useState("");
  const [loanType, setLoanType]     = useState("");
  const [pincode, setPincode]       = useState("");
  const [status, setStatus]         = useState<StatusFilter>("all");
  const [partner, setPartner]       = useState("");
  const [sortBy, setSortBy]         = useState<"date" | "amount">("date");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Summary counts from loaded data
  const total    = loans.length;
  const approved = loans.filter(l => l.status === "approved").length;
  const pending  = loans.filter(l => l.status === "pending").length;
  const rejected = loans.filter(l => l.status === "rejected").length;
  const totalAmt = loans.reduce((s, l) => s + Number(l.loan_amount), 0);

  const totalPages = Math.ceil(loans.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedLoans = loans.slice(startIndex, endIndex);

  /* ── ON MOUNT ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}
    fetchLoans(token);
  }, []);

  /* ── FETCH with filters ── */
  const fetchLoans = useCallback(async (token?: string, filters?: Record<string, string>) => {
    const t = token || localStorage.getItem("token") || "";
    setLoading(true); setError("");

    const params = new URLSearchParams();
    const f = filters || { search, bank, loan_type: loanType, pincode, status: status === "all" ? "" : status, partner };
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/loans?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();
      if (data.success) {
        let list: LoanApp[] = data.data || [];
        // Client-side sort
        list.sort((a, b) =>
          sortBy === "amount"
            ? Number(b.loan_amount) - Number(a.loan_amount)
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLoans(list);
      } else { setError("Failed to load applications."); }
    } catch { setError("Server error. Please try again."); }
    finally { setLoading(false); }
  }, [search, bank, loanType, pincode, status, partner, sortBy]);

  /* ── APPLY FILTERS ── */
  const applyFilters = () => {
    setCurrentPage(1);

    fetchLoans(undefined, {
      search,
      bank,
      loan_type: loanType,
      pincode,
      status: status === "all" ? "" : status,
      partner,
    });
  };

  /* ── CLEAR FILTERS ── */
  const clearFilters = () => {
     setCurrentPage(1);
    setSearch(""); setBank(""); setLoanType("");
    setPincode(""); setStatus("all"); setPartner("");
    fetchLoans(undefined, {});
  };

  const hasFilters = search || bank || loanType || pincode || status !== "all" || partner;

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/");
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="ca-loans-wrap">

        {/* Top Bar */}
        <div className="ca-topbar" style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>All Applications</h1>
            <div style={s.pageSub}>Search, filter and manage all loan applications you've filed</div>
          </div>
          <button className="ca-new-btn" style={s.newBtn} onClick={() => router.push("/ca/apply")}>
            + New Application
          </button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ── SUMMARY STRIP ── */}
        <div className="ca-summary-strip" style={s.summaryStrip}>
          <Pill label="Total"    value={total}       color="#1e3a5f" />
          <Pill label="Approved" value={approved}    color="#10b981" />
          <Pill label="Pending"  value={pending}     color="#f59e0b" />
          <Pill label="Rejected" value={rejected}    color="#ef4444" />
          <Pill label="Total Amount" value={fmt(totalAmt)} color="#6366f1" isText />
        </div>

        {/* ── FILTER BAR ── */}
        <div className="ca-filter-card" style={s.filterCard}>
          <div style={s.filterTitle}>
            <FaFilter size={13} color="#1e3a5f" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Search & Filter</span>
            {hasFilters && (
              <button onClick={clearFilters} style={s.clearBtn}>
                <FaTimes size={11} /> Clear All
              </button>
            )}
          </div>

          <div className="ca-filter-grid" style={s.filterGrid}>
            {/* Search by name */}
            <FilterField label="Customer Name">
              <div style={s.inputWrap}>
                <FaSearch style={s.inputIcon} />
                <input
                  placeholder="Search by name…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                  style={s.filterInput}
                />
              </div>
            </FilterField>

            {/* Filter by bank */}
            <FilterField label="Bank Name">
              <div style={s.inputWrap}>
                <FaSearch style={s.inputIcon} />
                <input
                  placeholder="Search by bank…"
                  value={bank} onChange={e => setBank(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                  style={s.filterInput}
                />
              </div>
            </FilterField>

            {/* Filter by loan type */}
            <FilterField label="Loan Type">
              <select value={loanType} onChange={e => setLoanType(e.target.value)} style={s.filterSelect}>
                {LOAN_TYPES.map(lt => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </FilterField>

            {/* Filter by pincode */}
            <FilterField label="Pincode">
              <div style={s.inputWrap}>
                <FaSearch style={s.inputIcon} />
                <input
                  placeholder="Search by pincode…"
                  value={pincode} onChange={e => setPincode(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                  style={s.filterInput} maxLength={6}
                />
              </div>
            </FilterField>

            {/* Filter by partner CA */}
            <FilterField label="Partner CA Name">
              <div style={s.inputWrap}>
                <FaSearch style={s.inputIcon} />
                <input
                  placeholder="Search by CA name…"
                  value={partner} onChange={e => setPartner(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                  style={s.filterInput}
                />
              </div>
            </FilterField>

            {/* Sort */}
            <FilterField label="Sort By">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as "date" | "amount")} style={s.filterSelect}>
                <option value="date">Latest First</option>
                <option value="amount">Highest Amount</option>
              </select>
            </FilterField>
          </div>

          {/* Status chips */}
          <div style={s.statusRow}>
            <span style={s.statusRowLabel}>Status:</span>
            {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                style={{
                  ...s.chip,
                  background: status === f ? "#1e3a5f" : "#f1f5f9",
                  color:      status === f ? "#fff"    : "#64748b",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="ca-filter-actions" style={s.filterActions}>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Showing <strong>{loans.length}</strong> application{loans.length !== 1 ? "s" : ""}
            </div>
            <button onClick={applyFilters} style={s.applyBtn}>
              Apply Filters
            </button>
          </div>
        </div>

        {/* ── LOANS TABLE ── */}
        <div className="ca-table-card" style={s.card}>
          {loading ? (
            <div style={s.center}>
              <div style={s.spinner} />
              <div style={s.mutedText}>Loading applications…</div>
            </div>
          ) : loans.length === 0 ? (
            <div style={s.center}>
              <FaFileAlt size={48} color="#cbd5e1" />
              <div style={s.mutedText}>
                {hasFilters ? "No applications match your filters." : "No applications filed yet."}
              </div>
              {!hasFilters && (
                <button style={s.newBtn} onClick={() => router.push("/ca/apply")}>
                  File First Application
                </button>
              )}
            </div>
          ) : (
            <div className="ca-table-scroll" style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Customer</Th>
                    <Th>Contact</Th>
                    <Th>Loan Type</Th>
                    <Th>Bank</Th>
                    <Th>Amount</Th>
                    <Th>Pincode</Th>
                    <Th>Filed By (CA)</Th>
                    <Th>Filed On</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                 {paginatedLoans.map((loan, i) => {
                    const sc = statusConfig[loan.status] ?? statusConfig.pending;
                    return (
                      <tr key={loan.id} style={s.trow}>
                        <Td style={{ color: "#94a3b8", fontSize: 12 }}>{startIndex + i + 1}</Td>
                        <td style={s.tdBase}>
                          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{loan.full_name || "—"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {loan.employment_type?.replace(/_/g, " ") || ""}
                          </div>
                        </td>
                        <td style={s.tdBase}>
                          <div style={{ fontSize: 13, color: "#475569" }}>{loan.mobile || "—"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{loan.email || ""}</div>
                        </td>
                        <Td style={{ textTransform: "capitalize" }}>
                          {loan.loan_type?.replace(/_/g, " ") || "—"}
                        </Td>
                        <Td>{loan.bank_name || "—"}</Td>
                        <Td><strong>{fmt(loan.loan_amount)}</strong></Td>
                        <Td style={{ fontFamily: "monospace", fontSize: 13 }}>{loan.pincode || "—"}</Td>
                        <td style={s.tdBase}>
                          <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{loan.ca_name || "—"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{loan.ca_firm || ""}</div>
                        </td>
                        <Td style={{ color: "#94a3b8", fontSize: 12 }}>
                          {new Date(loan.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </Td>
                        <td style={s.tdBase}>
                          <span style={{ ...s.badge, color: sc.color, background: sc.bg }}>
                            {sc.icon}&nbsp;{sc.label}
                          </span>
                        </td>
                        {/* ── ACTIONS ── */}
                        <td style={s.tdBase}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => router.push(`/ca/loans/${loan.id}`)}
                              style={s.viewBtn}
                              title="View application"
                            >
                              <FaEye size={11} /> View
                            </button>
                            {loan.status === "pending" ? (
                              <button
                                onClick={() => router.push(`/ca/loans/${loan.id}/edit`)}
                                style={s.editBtn}
                                title="Edit application"
                              >
                                <FaEdit size={11} /> Edit
                              </button>
                            ) : (
                              <button disabled style={s.editBtnDisabled} title="Only pending applications can be edited">
                                <FaEdit size={11} /> Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {loans.length > 0 && (
          <div className="ca-pagination-row" style={s.paginationRow}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={{
                ...s.pageBtn,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                style={{
                  ...s.pageBtn,
                  background: currentPage === index + 1 ? "#1e3a5f" : "#fff",
                  color:      currentPage === index + 1 ? "#fff"    : "#1e293b",
                  fontWeight: currentPage === index + 1 ? 700 : 500,
                }}
              >
                {index + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{
                ...s.pageBtn,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}

      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .ca-topbar {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .ca-new-btn {
            width: 100%;
            justify-content: center;
          }

          .ca-summary-strip {
            gap: 10px !important;
          }

          .ca-filter-card {
            padding: 16px 16px !important;
          }

          .ca-filter-grid {
            grid-template-columns: 1fr !important;
          }

          .ca-filter-actions {
            flex-direction: column;
            align-items: stretch !important;
            gap: 10px;
          }

          .ca-filter-actions button {
            width: 100%;
            justify-content: center;
          }

          .ca-table-card {
            padding: 16px !important;
          }

          .ca-table-scroll {
            -webkit-overflow-scrolling: touch;
          }

          .ca-table-scroll table {
            min-width: 920px;
          }

          .ca-pagination-row {
            gap: 6px;
          }
        }

        @media (max-width: 480px) {
          .ca-summary-strip {
            flex-direction: column;
          }

          .ca-table-card {
            padding: 12px !important;
          }
        }
      `}</style>
    </CALayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Pill({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <div style={{ ...s.pill, borderLeft: `4px solid ${color}` }}>
      <span style={s.pillLabel}>{label}</span>
      <span style={{ ...s.pillValue, color }}>{value}</span>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
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
   STYLES
   NOTE: page / sidebar / nav* / user* / logout* / main keys are consumed
   by CALayout + CASidebar. Everything else styles this page's own content.
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },

  /* consumed by CASidebar */
  sidebar: { width: 240, minHeight: "100vh", background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)", display: "flex", flexDirection: "column", padding: "24px 14px", top: 0, height: "100vh", flexShrink: 0 },
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

  /* consumed by CALayout */
  main:     { flex: 1, padding: "32px 36px", overflowY: "auto" as const, minWidth: 0 },

  /* this page's own content */
  topBar:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap" as const, gap: 14 },
  pageTitle:{ fontSize: 23, fontWeight: 800, color: "#1e293b", margin: 0 },
  pageSub:  { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  newBtn:   { background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 },
  summaryStrip: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" as const },
  pill:     { background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column" as const, gap: 3, flex: 1, minWidth: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  pillLabel:{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  pillValue:{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" },
  filterCard: { background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  filterTitle:{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px 18px", marginBottom: 16 },
  inputWrap:  { position: "relative" as const },
  inputIcon:  { position: "absolute" as const, left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12, pointerEvents: "none" },
  filterInput:{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "9px 12px 9px 32px", fontSize: 13, color: "#1e293b", background: "#f9fafb", outline: "none", boxSizing: "border-box" as const },
  filterSelect:{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: "#1e293b", background: "#f9fafb", outline: "none", appearance: "auto", boxSizing: "border-box" as const },
  statusRow:  { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 },
  statusRowLabel: { fontSize: 12, fontWeight: 600, color: "#64748b" },
  chip:       { padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s" },
  filterActions:{ display: "flex", justifyContent: "space-between", alignItems: "center" },
  applyBtn:   { background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  clearBtn:   { display: "flex", alignItems: "center", gap: 5, background: "#fef2f2", color: "#ef4444", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto" },
  card:     { background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  table:    { width: "100%", borderCollapse: "collapse" as const },
  th:       { padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.06em", textAlign: "left" as const, borderBottom: "2px solid #f1f5f9", whiteSpace: "nowrap" as const },
  trow:     { borderBottom: "1px solid #f8fafc" },
  tdBase:   { padding: "12px", fontSize: 14, color: "#1e293b" },
  badge:    { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },

  /* ── Action buttons ── */
  viewBtn: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
    padding: "6px 10px", borderRadius: 7, cursor: "pointer",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const,
  },
  editBtn: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
    padding: "6px 10px", borderRadius: 7, cursor: "pointer",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const,
  },
  editBtnDisabled: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#f8fafc", color: "#cbd5e1", border: "1px solid #e2e8f0",
    padding: "6px 10px", borderRadius: 7, cursor: "not-allowed",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const,
  },

  /* ── Pagination ── */
  paginationRow: {
    display: "flex", justifyContent: "center", alignItems: "center",
    gap: 8, marginTop: 20, flexWrap: "wrap" as const,
  },
  pageBtn: {
    padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
    background: "#fff", fontSize: 13, cursor: "pointer",
  },

  center:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "56px 0" },
  spinner:  { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  mutedText:{ color: "#94a3b8", fontSize: 14, margin: 0 },
};