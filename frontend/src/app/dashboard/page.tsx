"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaFileAlt, FaCheckCircle, FaClock, FaTimesCircle,
} from "react-icons/fa";
import CustomerLayout from "../../components/layout/customer/CustomerLayout";

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
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  totalAmount: number;
}

const statusConfig = {
  approved: { classes: "text-emerald-600 bg-emerald-50", icon: <FaCheckCircle size={11} />, label: "Approved" },
  pending:  { classes: "text-amber-600 bg-amber-50",     icon: <FaClock size={11} />,       label: "Pending"  },
  rejected: { classes: "text-red-600 bg-red-50",         icon: <FaTimesCircle size={11} />, label: "Rejected" },
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, rejected: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

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

    fetchDashboard(token);
  }, []);

  const fetchDashboard = async (token: string) => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/auth");
        return;
      }

      const data = await res.json();

      if (data.success) {
        const list: LoanApplication[] = data.data || [];
        setLoans(list.slice(0, 5));
        setStats({
          total: list.length,
          approved: list.filter(l => l.status === "approved").length,
          pending: list.filter(l => l.status === "pending").length,
          rejected: list.filter(l => l.status === "rejected").length,
          totalAmount: list.reduce((sum, l) => sum + Number(l.loan_amount), 0),
        });
      } else {
        setError("Failed to load dashboard data.");
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

  return (
    <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-7">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">
            Welcome back, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">
            Here's your financial overview today
          </p>
        </div>
        <button
          onClick={() => router.push("/apply")}
          className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap"
        >
          + New Application
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Applications" value={stats.total} icon={<FaFileAlt size={17} />} accent="#1e3a5f" />
        <StatCard label="Approved" value={stats.approved} icon={<FaCheckCircle size={17} />} accent="#10b981" />
        <StatCard label="Pending" value={stats.pending} icon={<FaClock size={17} />} accent="#f59e0b" />
        <StatCard label="Rejected" value={stats.rejected} icon={<FaTimesCircle size={17} />} accent="#ef4444" />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-bold text-slate-800 m-0">Recent Applications</h2>
          <button
            onClick={() => router.push("/loans")}
            className="bg-transparent text-[#2d5986] border border-[#2d5986] px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm m-0">Loading your applications…</p>
          </div>

        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <FaFileAlt size={44} className="text-slate-300" />
            <p className="text-slate-400 text-sm m-0">No applications yet.</p>
            <button
              onClick={() => router.push("/apply")}
              className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
            >
              Apply for a Loan
            </button>
          </div>

        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Loan Type</Th>
                    <Th>Bank</Th>
                    <Th>Amount</Th>
                    <Th>Tenure</Th>
                    <Th>Applied On</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const sc = statusConfig[loan.status] ?? statusConfig.pending;
                    return (
                      <tr key={loan.id} className="border-b border-slate-50">
                        <Td>{loan.loan_type ?? "Personal Loan"}</Td>
                        <Td>{loan.bank_name ?? "—"}</Td>
                        <Td><strong>{fmt(loan.loan_amount)}</strong></Td>
                        <Td>{loan.tenure} yr{Number(loan.tenure) > 1 ? "s" : ""}</Td>
                        <Td className="text-slate-400">
                          {new Date(loan.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </Td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.classes}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden flex flex-col gap-3">
              {loans.map((loan) => {
                const sc = statusConfig[loan.status] ?? statusConfig.pending;
                return (
                  <div key={loan.id} className="border border-slate-100 rounded-xl p-3.5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 m-0">
                          {loan.loan_type ?? "Personal Loan"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{loan.bank_name ?? "—"}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.classes}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <strong className="text-slate-800">{fmt(loan.loan_amount)}</strong>
                      <span className="text-slate-400 text-xs">
                        {loan.tenure} yr{Number(loan.tenure) > 1 ? "s" : ""} ·{" "}
                        {new Date(loan.created_at).toLocaleDateString("en-IN", {
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
    </CustomerLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function StatCard({
  label, value, icon, accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-4.5 flex items-center gap-3 sm:gap-3.5 shadow-sm">
      <div
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] flex items-center justify-center shrink-0"
        style={{ background: accent + "18", color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide m-0 mb-1">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold text-slate-800 m-0 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-left border-b-2 border-slate-100">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3.5 text-sm text-slate-800 ${className}`}>{children}</td>;
}