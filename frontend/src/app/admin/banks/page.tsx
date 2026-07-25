"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUniversity, FaPlus, FaEdit, FaTrash,
  FaToggleOn, FaToggleOff, FaSearch, FaTimes,
} from "react-icons/fa";
import AdminLayout from "../../../components/layout/admin/AdminLayout";

/* ─── Types ─────────────────────────────────────────────── */
interface Bank {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

/* ─── Modal Component ───────────────────────────────────── */
function Modal({
  title, value, onChange, onConfirm, onClose, confirmLabel = "Save",
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-[420px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-slate-900 text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-slate-400 cursor-pointer p-1">
            <FaTimes size={16} />
          </button>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          placeholder="Enter bank name"
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none mb-5 box-border"
        />

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-[10px] border-none bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
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

/* ─── Main Page ─────────────────────────────────────────── */
export default function AdminBanksPage() {
  const router = useRouter();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [adminName, setAdminName] = useState("Admin");

  const [addModal, setAddModal] = useState(false);
  const [addValue, setAddValue] = useState("");

  const [editModal, setEditModal] = useState<Bank | null>(null);
  const [editValue, setEditValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Bank | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const API = process.env.NEXT_PUBLIC_API_URL;

  const token = () => localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/admin/banks`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to load banks");
        setBanks([]);
        return;
      }

      if (Array.isArray(data)) setBanks(data);
      else if (Array.isArray(data.banks)) setBanks(data.banks);
      else {
        setBanks([]);
        setError("Invalid response from server");
      }
    } catch {
      setBanks([]);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.full_name) setAdminName(user.full_name);
    } catch {}
  }, []);

  const handleAdd = async () => {
    if (!addValue.trim()) return;
    try {
      const res = await fetch(`${API}/api/admin/banks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: addValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to add bank"); return; }
      setAddModal(false);
      setAddValue("");
      fetchBanks();
    } catch { alert("Something went wrong"); }
  };

  const openEdit = (bank: Bank) => { setEditModal(bank); setEditValue(bank.name); };

  const handleEdit = async () => {
    if (!editModal || !editValue.trim()) return;
    try {
      const res = await fetch(`${API}/api/admin/banks/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: editValue.trim(), is_active: editModal.is_active }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to edit bank"); return; }
      setEditModal(null);
      fetchBanks();
    } catch { alert("Something went wrong"); }
  };

  const toggleBank = async (bank: Bank) => {
    try {
      const res = await fetch(`${API}/api/admin/banks/${bank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: bank.name, is_active: !bank.is_active }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to update bank"); return; }
      fetchBanks();
    } catch { alert("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API}/api/admin/banks/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to delete bank"); return; }
      setBanks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert("Something went wrong"); }
  };

 const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = banks.filter((b) => b.is_active).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Banks Management</h1>
          <p className="text-[13px] text-slate-400 mt-1">Manage partner banks on the platform</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Total Banks", value: banks.length, color: "#3b82f6" },
          { label: "Active", value: activeCount, color: "#22c55e" },
          { label: "Inactive", value: banks.length - activeCount, color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-3.5 sm:p-4.5 shadow-sm" style={{ borderTop: `3px solid ${color}` }}>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
            <p className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FaSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search banks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none box-border"
          />
        </div>
        <button
          onClick={() => { setAddValue(""); setAddModal(true); }}
          className="flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-[10px] border-none bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white text-sm font-bold cursor-pointer whitespace-nowrap"
        >
          <FaPlus size={12} /> Add Bank
        </button>
      </div>

      {/* Data */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3.5 py-14">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm m-0">Loading banks…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-4 text-center">
            <FaUniversity size={28} className="text-slate-200 mb-1" />
            <p className="text-slate-500 text-sm m-0">
              {search ? "No banks match your search." : "No banks found. Add one above."}
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
                    <Th>Bank Name</Th>
                    <Th>Created</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
               <tbody>
                  {paginated.map((bank, idx) => (
                    <tr key={bank.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <Td className="w-12">{startIndex + idx + 1}</Td>
                      <Td className="font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#1e3a5f] to-blue-700 flex items-center justify-center shrink-0">
                            <FaUniversity size={13} className="text-blue-300" />
                          </div>
                          {bank.name}
                        </div>
                      </Td>
                      <Td>
                        {bank.created_at
                          ? new Date(bank.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </Td>
                      <Td><StatusBadge active={bank.is_active} /></Td>
                      <Td>
                        <div className="flex gap-2 flex-wrap">
                          <ActionBtn
                            onClick={() => toggleBank(bank)}
                            className={bank.is_active ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}
                          >
                            {bank.is_active ? <FaToggleOff size={13} /> : <FaToggleOn size={13} />}
                            {bank.is_active ? "Disable" : "Enable"}
                          </ActionBtn>
                          <ActionBtn onClick={() => openEdit(bank)} className="bg-blue-500/10 text-blue-600">
                            <FaEdit size={12} /> Edit
                          </ActionBtn>
                          <ActionBtn onClick={() => setDeleteTarget(bank)} className="bg-red-500/10 text-red-500">
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
              {paginated.map((bank, idx) => (
                <div key={bank.id} className="p-4">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-[#1e3a5f] to-blue-700 flex items-center justify-center shrink-0">
                        <FaUniversity size={14} className="text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 m-0 truncate">{bank.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {bank.created_at
                            ? new Date(bank.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge active={bank.is_active} />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <ActionBtn
                      onClick={() => toggleBank(bank)}
                      className={bank.is_active ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}
                    >
                      {bank.is_active ? <FaToggleOff size={13} /> : <FaToggleOn size={13} />}
                      {bank.is_active ? "Disable" : "Enable"}
                    </ActionBtn>
                    <ActionBtn onClick={() => openEdit(bank)} className="bg-blue-500/10 text-blue-600">
                      <FaEdit size={12} /> Edit
                    </ActionBtn>
                    <ActionBtn onClick={() => setDeleteTarget(bank)} className="bg-red-500/10 text-red-500">
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
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} banks
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

      {/* ── Add Modal ── */}

      {/* ── Add Modal ── */}
      {addModal && (
        <Modal
          title="Add New Bank"
          value={addValue}
          onChange={setAddValue}
          onConfirm={handleAdd}
          onClose={() => setAddModal(false)}
          confirmLabel="Add Bank"
        />
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <Modal
          title={`Edit — ${editModal.name}`}
          value={editValue}
          onChange={setEditValue}
          onConfirm={handleEdit}
          onClose={() => setEditModal(null)}
          confirmLabel="Save Changes"
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
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