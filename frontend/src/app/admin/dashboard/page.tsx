"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaFileAlt, FaCheckCircle, FaClock, FaTimesCircle,
  FaRupeeSign, FaUsers, FaUniversity, FaListAlt,
} from "react-icons/fa";
import AdminLayout from "../../../components/layout/admin/AdminLayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Stats {
  total_applications: number;
  approved: number;
  pending: number;
  rejected: number;
  total_amount: number;
  total_users: number;
  total_banks: number;
  total_ca: number;
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
  applied_by?: string;
  agent_name?: string;
}

const statusConfig = {
  approved: { classes: "text-emerald-600 bg-emerald-50", icon: <FaCheckCircle size={11} />, label: "Approved" },
  pending:  { classes: "text-amber-600 bg-amber-50",     icon: <FaClock size={11} />,       label: "Pending"  },
  rejected: { classes: "text-red-600 bg-red-50",         icon: <FaTimesCircle size={11} />, label: "Rejected" },
};

const API = process.env.NEXT_PUBLIC_API_URL;

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    total_applications: 0, approved: 0, pending: 0, rejected: 0,
    total_amount: 0, total_users: 0, total_banks: 0, total_ca: 0,
  });
  const [recent, setRecent]       = useState<RecentApp[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "admin") { router.push("/"); return; }
      setAdminName(user.full_name || "Admin");
    } catch {}
    fetchDashboard(token);
  }, []);

  const fetchDashboard = async (token: string) => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      const data = await res.json();

      if (data.success) {
        setStats({
          total_applications: Number(data.stats?.total_applications || 0),
          approved: Number(data.stats?.approved || 0),
          pending: Number(data.stats?.pending || 0),
          rejected: Number(data.stats?.rejected || 0),
          total_amount: Number(data.stats?.total_amount || 0),
          total_users: Number(data.stats?.total_users || 0),
          total_ca: Number(data.stats?.total_ca || 0),
          total_banks: Number(data.stats?.total_banks || 0),
        });
        setRecent(Array.isArray(data.recent) ? data.recent : []);
      } else {
        setError(data.message || "Failed to load dashboard.");
      }
    } catch (err) {
      console.error(err);
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
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-7">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">
            Welcome back, {adminName.split(" ")[0]} 👋
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">
            Admin Dashboard Overview · SN Finance Service
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/applications")}
          className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap"
        >
          View All Applications →
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Applications stats */}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Applications</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-7">
        <StatCard label="Total Applications" value={stats.total_applications} icon={<FaFileAlt size={17} />} accent="#2563eb" />
        <StatCard label="Approved" value={stats.approved} icon={<FaCheckCircle size={17} />} accent="#16a34a" />
        <StatCard label="Pending" value={stats.pending} icon={<FaClock size={17} />} accent="#b45309" />
        <StatCard label="Rejected" value={stats.rejected} icon={<FaTimesCircle size={17} />} accent="#dc2626" />
        <StatCard label="Total Loan Amount" value={fmt(stats.total_amount)} icon={<FaRupeeSign size={17} />} accent="#6366f1" />
      </div>

      {/* Platform stats */}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Platform Overview</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-7">
        <StatCard label="Total Users" value={stats.total_users} icon={<FaUsers size={17} />} accent="#3b82f6" />
        <StatCard label="CA Users" value={stats.total_ca} icon={<FaListAlt size={17} />} accent="#7c3aed" />
        <StatCard label="Banks Listed" value={stats.total_banks} icon={<FaUniversity size={17} />} accent="#0891b2" />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h2 className="text-base font-bold text-slate-800 m-0">Recent Applications</h2>
          <button
            onClick={() => router.push("/admin/applications")}
            className="bg-transparent text-[#2563eb] border border-[#2563eb] px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#2563eb] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm m-0">Loading…</p>
          </div>

        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <FaFileAlt size={44} className="text-slate-300" />
            <p className="text-slate-400 text-sm m-0">No applications yet.</p>
          </div>

        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr>
                    <Th>Applicant</Th>
                    <Th>Loan Type</Th>
                    <Th>Bank</Th>
                    <Th>Amount</Th>
                    <Th>Filed By</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((app) => {
                    const sc = statusConfig[app.status] ?? statusConfig.pending;
                    return (
                      <tr key={app.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <Td><strong>{app.full_name || "—"}</strong></Td>
                        <Td className="capitalize">{app.loan_type?.replace(/_/g, " ") || "—"}</Td>
                        <Td>{app.bank_name || "—"}</Td>
                        <Td className="font-bold text-[#2563eb] tabular-nums">{fmt(app.loan_amount)}</Td>
                        <td className="px-3 py-3.5">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                            app.applied_by === "ca" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                          }`}>
                          {app.applied_by === "ca"
  ? `CA: ${app.agent_name || "CA"}`
  : app.applied_by === "dsa"
  ? `DSA: ${app.agent_name || "DSA"}`
  : "Customer"}
                          </span>
                        </td>
                        <Td className="text-slate-400 text-xs">
                          {app.created_at
                            ? new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </Td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.classes}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => router.push(`/admin/applications/${app.id}`)}
                            className="bg-slate-50 text-[#2563eb] border border-slate-200 px-3.5 py-1 rounded-md text-xs font-bold cursor-pointer hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden flex flex-col gap-3">
              {recent.map((app) => {
                const sc = statusConfig[app.status] ?? statusConfig.pending;
                return (
                  <div key={app.id} className="border border-slate-100 rounded-xl p-3.5">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 m-0 truncate">{app.full_name || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">
                          {app.loan_type?.replace(/_/g, " ") || "—"} · {app.bank_name || "—"}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${sc.classes}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm mb-2">
                      <strong className="text-[#2563eb] tabular-nums">{fmt(app.loan_amount)}</strong>
                      <span className="text-slate-400 text-xs">
                        {app.created_at
                          ? new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                        app.applied_by === "ca" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                      }`}>
                     {app.applied_by === "ca"
  ? `CA: ${app.agent_name || "CA"}`
  : app.applied_by === "dsa"
  ? `DSA: ${app.agent_name || "DSA"}`
  : "Customer"}
                      </span>
                      <button
                        onClick={() => router.push(`/admin/applications/${app.id}`)}
                        className="bg-slate-50 text-[#2563eb] border border-slate-200 px-3.5 py-1 rounded-md text-xs font-bold cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
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
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide m-0 mb-1">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold text-slate-800 m-0 tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-left border-b-2 border-slate-100 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3.5 text-sm text-slate-800 whitespace-nowrap ${className}`}>{children}</td>;
}