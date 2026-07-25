// Path: frontend/src/app/loans/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import {
  FaFileAlt, FaCheckCircle, FaClock, FaTimesCircle,
  FaSearch, FaPlusCircle, FaRupeeSign, FaCalendarAlt,
  FaUniversity, FaEye, FaEdit,
} from "react-icons/fa";
import CustomerLayout from "./../../components/layout/customer/CustomerLayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface LoanApplication {
  id: string;
  loan_type: string;
  loan_amount: number;
  tenure: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  bank_name?: string;
  loan_purpose?: string;
  employment_type?: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type SortOption   = "date_desc" | "date_asc" | "amount_high" | "amount_low";

const statusConfig: Record<string, { classes: string; icon: React.ReactNode; label: string }> = {
  approved: { classes: "text-emerald-700 bg-emerald-50", icon: <FaCheckCircle size={10} />, label: "Approved" },
  pending:  { classes: "text-amber-700 bg-amber-50",     icon: <FaClock size={10} />,       label: "Pending"  },
  rejected: { classes: "text-red-700 bg-red-50",         icon: <FaTimesCircle size={10} />, label: "Rejected" },
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function MyLoansPage() {
  const router = useRouter();

  const [allLoans, setAllLoans]     = useState<LoanApplication[]>([]);
  const [filtered, setFiltered]     = useState<LoanApplication[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy]         = useState<SortOption>("date_desc");
  const [userName, setUserName]     = useState("User");
  const [userEmail, setUserEmail]   = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserName(parsed.full_name || "User");
        setUserEmail(parsed.email || "");
      }
    } catch {}
    fetchLoans();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allLoans, search, statusFilter, sortBy]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch<{ success: boolean; data: LoanApplication[] }>(
        "/loan/my-applications"
      );
      setAllLoans(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load loans.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allLoans];

    if (statusFilter !== "all") {
      result = result.filter(l => l.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.loan_type?.toLowerCase().includes(q)     ||
        l.bank_name?.toLowerCase().includes(q)     ||
        l.loan_purpose?.toLowerCase().includes(q)  ||
        l.employment_type?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "amount_high") return Number(b.loan_amount) - Number(a.loan_amount);
      if (sortBy === "amount_low")  return Number(a.loan_amount) - Number(b.loan_amount);
      if (sortBy === "date_asc")    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setCurrentPage(1);
    setFiltered(result);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

  const totalAmount   = allLoans.reduce((sum, l) => sum + Number(l.loan_amount), 0);
  const approvedCount = allLoans.filter(l => l.status === "approved").length;
  const pendingCount  = allLoans.filter(l => l.status === "pending").length;
  const rejectedCount = allLoans.filter(l => l.status === "rejected").length;

  const totalPages  = Math.ceil(filtered.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const endIndex    = startIndex + itemsPerPage;
  const paginatedLoans = filtered.slice(startIndex, endIndex);

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0 tracking-tight">My Loan Applications</h1>
          <p className="text-[13px] sm:text-sm text-slate-400 mt-1">Track and manage all your loan applications</p>
        </div>
        <button
          onClick={() => router.push("/apply")}
          className="inline-flex items-center gap-2 bg-linear-to-br from-[#14304F] to-[#1B3B61] text-white border-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <FaPlusCircle size={13} /> New Application
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
          {error}
        </div>
      )}

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5 mb-6">
        <SummaryPill label="Total" value={allLoans.length} accent="#14304F" icon={<FaFileAlt size={13} />} />
        <SummaryPill label="Approved" value={approvedCount} accent="#1F8A5C" icon={<FaCheckCircle size={13} />} />
        <SummaryPill label="Pending" value={pendingCount} accent="#B6781D" icon={<FaClock size={13} />} />
        <SummaryPill label="Rejected" value={rejectedCount} accent="#C23B3B" icon={<FaTimesCircle size={13} />} />
        <SummaryPill label="Total Amount" value={fmt(totalAmount)} accent="#C8932F" icon={<FaRupeeSign size={13} />} isText />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3.5 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]" />
          <input
            placeholder="Search by type, bank, purpose…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-2.5 pl-9.5 pl-[38px] pr-3.5 border-[1.5px] border-slate-200 rounded-lg text-sm bg-slate-50 outline-none box-border text-slate-800 focus:border-[#14304F] focus:ring-2 focus:ring-[#14304F]/10"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border-none cursor-pointer transition-colors
                ${statusFilter === f ? "bg-[#14304F] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
          className="py-2.5 px-3.5 border-[1.5px] border-slate-200 rounded-lg text-[13px] bg-slate-50 text-slate-800 outline-none cursor-pointer focus:border-[#14304F]"
        >
          <option value="date_desc">Latest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="amount_high">Highest Amount</option>
          <option value="amount_low">Lowest Amount</option>
        </select>
      </div>

      {/* ── Results Count ── */}
      {!loading && (
        <p className="text-[13px] text-slate-400 mb-4">
          Showing <strong>{filtered.length}</strong> of <strong>{allLoans.length}</strong> applications
        </p>
      )}

      {/* ── LOADING ── */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-[#14304F] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your applications…</p>
        </div>

      /* ── EMPTY ── */
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <FaFileAlt size={44} className="text-slate-200" />
          <p className="text-slate-400 text-[15px] text-center m-0">
            {allLoans.length === 0
              ? "You haven't applied for any loan yet."
              : "No applications match your search or filter."}
          </p>
          {allLoans.length === 0 && (
            <button
              onClick={() => router.push("/apply")}
              className="inline-flex items-center gap-2 bg-linear-to-br from-[#14304F] to-[#1B3B61] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
            >
              <FaPlusCircle size={13} /> Apply for a Loan
            </button>
          )}
        </div>

      ) : (
        <>
          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th><FaFileAlt size={11} className="inline mr-1.5 -mt-0.5" /> Loan Type</Th>
                  <Th><FaUniversity size={11} className="inline mr-1.5 -mt-0.5" /> Bank</Th>
                  <Th><FaRupeeSign size={11} className="inline mr-1.5 -mt-0.5" /> Amount</Th>
                  <Th>Purpose</Th>
                  <Th>Status</Th>
                  <Th><FaCalendarAlt size={11} className="inline mr-1.5 -mt-0.5" /> Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedLoans.map((loan, index) => {
                  const sc = statusConfig[loan.status] ?? statusConfig.pending;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                      <Td className="text-slate-400">{startIndex + index + 1}</Td>
                      <Td className="capitalize font-semibold text-slate-800">{loan.loan_type?.replace(/_/g, " ")}</Td>
                      <Td>{loan.bank_name || "—"}</Td>
                      <Td className="font-bold text-[#14304F] tabular-nums">{fmt(loan.loan_amount)}</Td>
                      <Td>{loan.loan_purpose || "—"}</Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${sc.classes}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </Td>
                      <Td className="text-slate-500">{new Date(loan.created_at).toLocaleDateString("en-IN")}</Td>
                      <Td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            title="View application"
                            onClick={() => router.push(`/loans/${loan.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#14304F] cursor-pointer hover:bg-[#14304F] hover:text-white transition-colors"
                          >
                            <FaEye size={13} />
                          </button>
                          {loan.status === "pending" ? (
                            <button
                              title="Edit application"
                              onClick={() => router.push(`/loans/${loan.id}/edit`)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#C8932F] cursor-pointer hover:bg-[#14304F] hover:text-white transition-colors"
                            >
                              <FaEdit size={13} />
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Locked — cannot edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50"
                            >
                              <FaEdit size={13} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="md:hidden flex flex-col gap-3">
            {paginatedLoans.map((loan, index) => {
              const sc = statusConfig[loan.status] ?? statusConfig.pending;
              return (
                <div key={loan.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <p className="text-sm font-bold text-slate-800 m-0 capitalize">
                        {loan.loan_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{loan.bank_name || "—"}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${sc.classes}`}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-bold text-[#14304F] tabular-nums">{fmt(loan.loan_amount)}</span>
                    <span className="text-xs text-slate-400">{new Date(loan.created_at).toLocaleDateString("en-IN")}</span>
                  </div>

                  {loan.loan_purpose && (
                    <p className="text-xs text-slate-500 mb-3">{loan.loan_purpose}</p>
                  )}

                  <div className="flex gap-2 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/loans/${loan.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[#14304F] text-xs font-semibold cursor-pointer"
                    >
                      <FaEye size={12} /> View
                    </button>
                    {loan.status === "pending" ? (
                      <button
                        onClick={() => router.push(`/loans/${loan.id}/edit`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[#C8932F] text-xs font-semibold cursor-pointer"
                      >
                        <FaEdit size={12} /> Edit
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-300 text-xs font-semibold cursor-not-allowed opacity-60"
                      >
                        <FaEdit size={12} /> Locked
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── PAGINATION ── */}
      {!loading && filtered.length > 0 && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="min-w-[38px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-slate-100"
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`min-w-[38px] px-3.5 py-2 rounded-lg border text-[13px] font-semibold cursor-pointer
                ${currentPage === index + 1
                  ? "bg-[#14304F] text-white border-[#14304F]"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"}`}
            >
              {index + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="min-w-[38px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-slate-100"
          >
            Next
          </button>
        </div>
      )}
    </CustomerLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function SummaryPill({
  label, value, accent, icon, isText = false,
}: {
  label: string;
  value: number | string;
  accent: string;
  icon?: React.ReactNode;
  isText?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl px-3.5 sm:px-4.5 py-3.5 sm:py-4 flex flex-col gap-2 shadow-sm" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        {icon && <span style={{ color: accent }} className="opacity-85">{icon}</span>}
      </div>
      <span
        className="text-lg sm:text-[22px] font-extrabold tracking-tight tabular-nums"
        style={{ color: isText ? "#14304F" : accent }}
      >
        {value}
      </span>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5 border-b border-slate-200 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`text-[13.5px] px-4 py-3.5 border-b border-slate-100 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}