"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaSearch, FaToggleOn, FaToggleOff, FaTrash,
  FaUserCircle, FaTimes, FaEdit,
} from "react-icons/fa";
import AdminLayout from "../../../components/layout/admin/AdminLayout";

/* ─── Types ─────────────────────────────────────────────── */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

/* ─── Confirm Dialog ─────────────────────────────────────── */
function ConfirmDialog({
  message, onConfirm, onClose,
}: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-[380px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <FaTrash size={18} className="text-red-500" />
        </div>
        <h2 className="text-slate-900 text-[17px] font-bold mb-2">Confirm Delete</h2>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-[10px] border-none bg-red-500 text-white text-sm font-semibold cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Role badge ─────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    user: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    ca: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    customer: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
  const classes = map[(role ?? "user").toLowerCase()] ?? map["user"];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${classes}`}>
      {role}
    </span>
  );
}

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ name }: { name?: string }) {
  const safeName = name?.trim() || "U";
  const colors = [
    "bg-blue-100 text-blue-600",
    "bg-emerald-100 text-emerald-600",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
    "bg-violet-100 text-violet-600",
  ];
  const idx = safeName.charCodeAt(0) % colors.length;

  return (
    <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 ${colors[idx]}`}>
      {safeName.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [adminName, setAdminName] = useState("Admin");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    mobile: "",
    role: "customer",
    setupMethod: "email",
    password: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = () => localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load users");
        setUsers([]);
        return;
      }
      if (Array.isArray(data)) setUsers(data);
      else if (Array.isArray(data.users)) setUsers(data.users);
      else {
        setUsers([]);
        setError("Invalid response from server");
      }
    } catch {
      setUsers([]);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.full_name) setAdminName(user.full_name);
    } catch {}
  }, []);

  const toggleUser = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { alert("Failed to update user"); return; }
      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API}/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { alert("Failed to delete user"); return; }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Something went wrong");
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to create user"); return; }
      alert(data.message);
      setShowCreateModal(false);
      setNewUser({ full_name: "", email: "", mobile: "", role: "customer", setupMethod: "email", password: "" });
      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  /* ── filtered / paginated ── */
  const filtered = users.filter((u) => {
    const matchSearch =
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || (u.role ?? "").toLowerCase() === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;
  const roles = ["all", ...Array.from(new Set(users.map((u) => (u.role ?? "user").toLowerCase())))];

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  /* Single source of truth for Edit routing — CA users go to the
     CA-specific admin edit page, everyone else to the generic one.
     Used by BOTH the desktop table and the mobile card below. */
  const handleEdit = (user: User) => {
    if (user.role === "ca") {
      router.push(`/admin/ca/${user.id}/edit`);
    } else {
      router.push(`/admin/users/${user.id}/edit`);
    }
  };

  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Users Management</h1>
          <p className="text-[13px] text-slate-400 mt-1">Manage customer, CA, and admin accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap"
        >
          + Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Total Users", value: users.length, color: "#3b82f6" },
          { label: "Active", value: activeCount, color: "#22c55e" },
          { label: "Inactive", value: inactiveCount, color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-3.5 sm:p-4.5 shadow-sm" style={{ borderTop: `3px solid ${color}` }}>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
            <p className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none box-border"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none cursor-pointer capitalize"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Data */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm m-0">Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-4 text-center">
            <FaUserCircle size={28} className="text-slate-200 mb-1" />
            <p className="text-slate-500 text-sm m-0">
              {search || roleFilter !== "all" ? "No users match your filters." : "No users found."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>#</Th>
                    <Th>User</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user, idx) => (
                    <tr key={user.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <Td className="w-12 text-slate-300">{startIndex + idx + 1}</Td>
                      <Td className="font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={user.name} />
                          {user.name}
                        </div>
                      </Td>
                      <Td className="break-all">{user.email}</Td>
                      <Td><RoleBadge role={user.role} /></Td>
                      <Td><StatusBadge active={user.is_active} /></Td>
                      <Td>
                        <div className="flex gap-2 flex-wrap">
                          <ActionBtn
                            onClick={() => toggleUser(user.id)}
                            className={user.is_active ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-600"}
                          >
                            {user.is_active ? <FaToggleOff size={13} /> : <FaToggleOn size={13} />}
                            {user.is_active ? "Deactivate" : "Activate"}
                          </ActionBtn>
                          <ActionBtn onClick={() => handleEdit(user)} className="bg-blue-500/10 text-blue-600">
                            <FaEdit size={12} /> Edit
                          </ActionBtn>
                          <ActionBtn onClick={() => setDeleteTarget(user)} className="bg-red-500/10 text-red-600">
                            <FaTrash size={12} /> Delete
                          </ActionBtn>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {paginated.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={user.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 m-0 truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                      </div>
                    </div>
                    <StatusBadge active={user.is_active} />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <RoleBadge role={user.role} />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <ActionBtn
                      onClick={() => toggleUser(user.id)}
                      className={user.is_active ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-600"}
                    >
                      {user.is_active ? <FaToggleOff size={13} /> : <FaToggleOn size={13} />}
                      {user.is_active ? "Deactivate" : "Activate"}
                    </ActionBtn>
                    <ActionBtn onClick={() => handleEdit(user)} className="bg-blue-500/10 text-blue-600">
                      <FaEdit size={12} /> Edit
                    </ActionBtn>
                    <ActionBtn onClick={() => setDeleteTarget(user)} className="bg-red-500/10 text-red-600">
                      <FaTrash size={12} /> Delete
                    </ActionBtn>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > itemsPerPage && (
        <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
          <p className="text-xs text-slate-400 m-0">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} users
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                  page === currentPage
                    ? "bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-transparent"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-[440px] bg-white rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900 m-0">Create User</h2>
              <FaTimes className="cursor-pointer text-slate-400" onClick={() => setShowCreateModal(false)} />
            </div>

            <div className="flex flex-col gap-3.5">
              <input
                placeholder="Full Name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
              />
              <input
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
              />
              <input
                placeholder="Mobile"
                value={newUser.mobile}
                onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none cursor-pointer"
              >
                <option value="customer">Customer</option>
                <option value="ca">CA</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={newUser.setupMethod}
                onChange={(e) => setNewUser({ ...newUser, setupMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none cursor-pointer"
              >
                <option value="email">Send Password Setup Link</option>
                <option value="manual">Set Password Manually</option>
              </select>

              {newUser.setupMethod === "manual" && (
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
                />
              )}

              <button
                onClick={handleCreateUser}
                className="w-full py-3 rounded-[10px] border-none bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white font-bold cursor-pointer mt-1"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Are you sure you want to permanently delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4.5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-left whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4.5 py-3.5 text-sm text-slate-600 ${className}`}>{children}</td>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-500 border border-red-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ActionBtn({
  children, onClick, className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-none text-xs font-bold cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}