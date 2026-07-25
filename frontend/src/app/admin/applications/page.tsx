"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaFileAlt, FaUniversity, FaEye, FaUserCircle,
  FaCheckCircle, FaClock, FaTimesCircle, FaRupeeSign, FaCalendarAlt,
} from "react-icons/fa";
import AdminLayout from "../../../components/layout/admin/AdminLayout";

/* ───────────────── TYPES ───────────────── */
interface Application {
  id: string;
  full_name?: string;
  loan_amount?: number;
  status: string;
  user_name?: string;
  bank_name?: string;
  created_at?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const statusMap: Record<string, { classes: string; icon: React.ReactNode }> = {
  approved: { classes: "bg-emerald-50 text-emerald-600", icon: <FaCheckCircle size={10} /> },
  rejected: { classes: "bg-red-50 text-red-600", icon: <FaTimesCircle size={10} /> },
  pending:  { classes: "bg-amber-50 text-amber-700", icon: <FaClock size={10} /> },
};

/* ───────────────── STATUS BADGE ───────────────── */
function StatusBadge({ status }: { status?: string }) {
  const key = status?.toLowerCase() || "pending";
  const cfg = statusMap[key] || statusMap.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${cfg.classes}`}>
      {cfg.icon}
      {status || "Pending"}
    </span>
  );
}

/* ───────────────── PAGE ───────────────── */
export default function AdminApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminName, setAdminName] = useState("Admin");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  /* ── FETCH (once) ── */
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.full_name) setAdminName(user.full_name);
    } catch {}

    const fetchApplications = async () => {
      try {
        setError("");
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/admin/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed to load applications (${res.status})`);

        const data = await res.json();
        const list: Application[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];

        setApplications(list);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load applications.");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  /* ── Derived data ── */
  const filteredApps = useMemo(() => {
    let temp = applications;

    if (search.trim()) {
      const q = search.toLowerCase();
      temp = temp.filter(
        (app) =>
          (app.user_name || app.full_name || "").toLowerCase().includes(q) ||
          (app.bank_name || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      temp = temp.filter((app) => (app.status || "").toLowerCase() === statusFilter);
    }

    return temp;
  }, [applications, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const { approved, pending, rejected } = useMemo(() => {
    return applications.reduce(
      (acc, a) => {
        const st = a.status?.toLowerCase();
        if (st === "approved") acc.approved++;
        else if (st === "pending") acc.pending++;
        else if (st === "rejected") acc.rejected++;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );
  }, [applications]);

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApps = filteredApps.slice(startIndex, endIndex);

  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Applications Management</h1>
          <p className="text-[13px] text-slate-400 mt-1">Review and manage all loan applications</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Total", value: applications.length, color: "#2563eb", icon: <FaFileAlt size={13} /> },
          { label: "Approved", value: approved, color: "#16a34a", icon: <FaCheckCircle size={13} /> },
          { label: "Pending", value: pending, color: "#b45309", icon: <FaClock size={13} /> },
          { label: "Rejected", value: rejected, color: "#dc2626", icon: <FaTimesCircle size={13} /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-3.5 sm:p-4.5 shadow-sm" style={{ borderTop: `3px solid ${stat.color}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</span>
              <span style={{ color: stat.color }} className="flex">{stat.icon}</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-3 mb-4">
        <input
          placeholder="Search applicant or bank…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-slate-200 bg-slate-50 text-slate-900 text-[13px] outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {!loading && (
        <p className="text-[13px] text-slate-400 mb-3.5">
          Showing <strong>{filteredApps.length}</strong> of <strong>{applications.length}</strong> applications
        </p>
      )}

      {/* Data */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm m-0">Loading applications…</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-4 text-center">
            <FaUserCircle size={30} className="text-slate-300 mb-1" />
            <p className="text-slate-400 text-sm m-0">
              {applications.length === 0
                ? "No applications yet."
                : "No applications match your search or filter."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[720px]">
                <thead>
                  <tr>
                    <Th>Applicant</Th>
                    <Th><FaUniversity size={11} className="inline mr-1.5" />Bank</Th>
                    <Th><FaRupeeSign size={11} className="inline mr-1.5" />Amount</Th>
                    <Th>Status</Th>
                    <Th><FaCalendarAlt size={11} className="inline mr-1.5" />Created</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApps.map((app) => (
                    <tr key={app.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <Td className="font-semibold">{app.user_name || app.full_name || "—"}</Td>
                      <Td>{app.bank_name || "—"}</Td>
                      <Td className="font-bold text-[#2563eb] tabular-nums">
                        {app.loan_amount != null ? "₹" + app.loan_amount.toLocaleString("en-IN") : "—"}
                      </Td>
                      <Td><StatusBadge status={app.status} /></Td>
                      <Td className="text-slate-500">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "—"}
                      </Td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => router.push(`/admin/applications/${app.id}`)}
                          title="View application"
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-[#2563eb] cursor-pointer inline-flex items-center justify-center hover:bg-[#2563eb] hover:text-white"
                        >
                          <FaEye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {paginatedApps.map((app) => (
                <div key={app.id} className="p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 m-0 truncate">
                        {app.user_name || app.full_name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{app.bank_name || "—"}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="flex justify-between items-center text-sm mb-3">
                    <strong className="text-[#2563eb] tabular-nums">
                      {app.loan_amount != null ? "₹" + app.loan_amount.toLocaleString("en-IN") : "—"}
                    </strong>
                    <span className="text-slate-400 text-xs">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "—"}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/admin/applications/${app.id}`)}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-slate-200 bg-slate-50 text-[#2563eb] text-xs font-bold cursor-pointer"
                  >
                    <FaEye size={12} /> View Application
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredApps.length > 0 && totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13px] font-semibold cursor-pointer min-w-[38px] disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer min-w-[38px] border ${
                currentPage === index + 1
                  ? "bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-transparent"
                  : "bg-white text-slate-800 border-slate-200"
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13px] font-semibold cursor-pointer min-w-[38px] disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3.5 bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm text-slate-800 whitespace-nowrap ${className}`}>{children}</td>;
}