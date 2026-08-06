"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaBars,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaTimes,
} from "react-icons/fa";
import AdminSidebar from "../../../../components/layout/admin/AdminSidebar";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface LoanService {
  id: number;
  name: string;
}

interface LoanTenure {
  id: number;
  loan_service_ids: number[];
  loan_service_names?: string[];
  tenure_months: number;
  display_name: string | null;
  is_active: boolean;
}

interface FormState {
  id: number | null;
  loan_service_ids: string[];
  tenure_months: string;
  display_name: string;
}

const emptyForm: FormState = {
  id: null,
  loan_service_ids: [],
  tenure_months: "",
  display_name: "",
};

const API = process.env.NEXT_PUBLIC_API_URL;

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function LoanTenurePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const [tenures, setTenures] = useState<LoanTenure[]>([]);
  const [loanServices, setLoanServices] = useState<LoanService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LoanTenure | null>(null);
  const [deleting, setDeleting] = useState(false);

  const token = () => localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminName");
    router.push("/");
  };

  const showMessage = (type: "success" | "error", msg: string) => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else { setError(msg); setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  /* ── FETCH ── */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [tenuresRes, servicesRes] = await Promise.all([
        fetch(`${API}/api/admin/loan-tenures`, {
          headers: { Authorization: `Bearer ${token()}` },
        }),
        fetch(`${API}/api/admin/loan-services`, {
          headers: { Authorization: `Bearer ${token()}` },
        }),
      ]);
      const tenuresData = await tenuresRes.json();
      const servicesData = await servicesRes.json();

      if (tenuresData.success) setTenures(tenuresData.data);
      if (servicesData.success) setLoanServices(servicesData.data);
    } catch (err) {
      console.error("fetchAll error:", err);
      showMessage("error", "Failed to load loan tenures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("adminName");
    if (stored) setAdminName(stored);
    fetchAll();
  }, []);

  /* ── MODAL HELPERS ── */
  const openAddModal = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: LoanTenure) => {
    setForm({
      id: item.id,
      loan_service_ids: (item.loan_service_ids || []).map(String),
      tenure_months: String(item.tenure_months / 12),
      display_name: item.display_name || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const toggleLoanService = (id: number) => {
    setForm((prev) => ({
      ...prev,
      loan_service_ids: prev.loan_service_ids.includes(String(id))
        ? prev.loan_service_ids.filter((sid) => sid !== String(id))
        : [...prev.loan_service_ids, String(id)],
    }));
  };

  /* ── SAVE (create or update) ── */
  const handleSave = async () => {
    if (form.loan_service_ids.length === 0 || !form.tenure_months) {
      showMessage("error", "Select at least one loan service and enter tenure (years).");
      return;
    }

    try {
      setSaving(true);
      const isEdit = form.id !== null;
      const url = isEdit
        ? `${API}/api/admin/loan-tenures/${form.id}`
        : `${API}/api/admin/loan-tenures`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          loan_service_ids: form.loan_service_ids.map(Number),
          tenure_months: Math.round(Number(form.tenure_months) * 12),
          display_name: form.display_name.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to save loan tenure.");
        return;
      }

      showMessage("success", isEdit ? "Loan tenure updated." : "Loan tenure created.");
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      console.error("handleSave error:", err);
      showMessage("error", "Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── TOGGLE ACTIVE ── */
  const toggleActive = async (item: LoanTenure) => {
    try {
      const res = await fetch(`${API}/api/admin/loan-tenures/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setTenures((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, is_active: !item.is_active } : t))
        );
      } else {
        showMessage("error", "Failed to update status.");
      }
    } catch (err) {
      console.error("toggleActive error:", err);
      showMessage("error", "Server error.");
    }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API}/api/admin/loan-tenures/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to delete loan tenure.");
        return;
      }

      showMessage("success", "Loan tenure deleted.");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      console.error("handleDelete error:", err);
      showMessage("error", "Server error.");
    } finally {
      setDeleting(false);
    }
  };

  const formatMonths = (months: number) => {
    if (months < 12) return `${months} Month${months > 1 ? "s" : ""}`;
    const years = months / 12;
    return Number.isInteger(years) ? `${years} Year${years > 1 ? "s" : ""}` : `${months} Months`;
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar
        adminName={adminName}
        handleLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 p-6 lg:p-9 lg:ml-64">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 bg-white border border-slate-200 rounded-lg p-2"
            aria-label="Open menu"
          >
            <FaBars size={16} />
          </button>

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
          >
            <FaArrowLeft size={12} /> Back
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Loan Tenure</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Manage available tenure options per loan service
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
            ✅ {success}
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white px-4 py-2.5 rounded-lg text-sm font-bold"
          >
            <FaPlus size={12} /> Add Tenure
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
              <div className="text-slate-400 text-sm">Loading…</div>
            </div>
          ) : tenures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <FaCalendarAlt size={26} />
              <div className="text-sm">No tenures added yet.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 text-[11px] uppercase tracking-wide font-bold">
                    <th className="px-4 py-3">Loan Services</th>
                    <th className="px-4 py-3">Tenure</th>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenures.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {item.loan_service_names && item.loan_service_names.length > 0 ? (
                            item.loan_service_names.map((n) => (
                              <span key={n} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{formatMonths(item.tenure_months)}</td>
                      <td className="px-4 py-3 text-slate-500">{item.display_name || "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`relative w-10 h-5.5 rounded-full transition-colors ${item.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                          aria-label="Toggle active"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${item.is_active ? "translate-x-4.5" : "translate-x-0"}`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-md text-xs font-semibold"
                          >
                            <FaEdit size={11} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="flex items-center gap-1.5 bg-red-50 text-red-500 px-2.5 py-1.5 rounded-md text-xs font-semibold"
                          >
                            <FaTrash size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── ADD/EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-800">
                {form.id ? "Edit Loan Tenure" : "Add Loan Tenure"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Loan Services</label>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto flex flex-col gap-2">
                  {loanServices.map((ls) => {
                    const checked = form.loan_service_ids.includes(String(ls.id));
                    return (
                      <label key={ls.id} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLoanService(ls.id)}
                          className="w-4 h-4"
                        />
                        {ls.name}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Checked services will show this tenure option. Unchecked = hidden from that service.
                </p>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Tenure (in years)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.tenure_months}
                  onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))}
                  placeholder="e.g. 1, 2, 5"
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm bg-slate-50 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">e.g. 1 = 1 Year, 0.5 = 6 Months</p>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Display Name (optional)</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="e.g. 1 Year"
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm bg-slate-50 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-70"
              >
                {saving ? "Saving…" : form.id ? "Save Changes" : "Create Tenure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Delete Tenure?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this tenure ({formatMonths(deleteTarget.tenure_months)})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-70"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}