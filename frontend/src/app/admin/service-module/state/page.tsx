"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaBars,
  FaPlus,
  FaEdit,
  FaTrash,
  FaMapMarkedAlt,
  FaTimes,
} from "react-icons/fa";
import AdminSidebar from "../../../../components/layout/admin/AdminSidebar";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface StateItem {
  id: number;
  state_name: string;
  state_code: string | null;
  is_active: boolean;
}

interface FormState {
  id: number | null;
  state_name: string;
  state_code: string;
}

const emptyForm: FormState = { id: null, state_name: "", state_code: "" };

const API = process.env.NEXT_PUBLIC_API_URL;

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function StatePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const [states, setStates] = useState<StateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StateItem | null>(null);
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
  const fetchStates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/states`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setStates(data.data);
    } catch (err) {
      console.error("fetchStates error:", err);
      showMessage("error", "Failed to load states.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("adminName");
    if (stored) setAdminName(stored);
    fetchStates();
  }, []);

  /* ── MODAL HELPERS ── */
  const openAddModal = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: StateItem) => {
    setForm({
      id: item.id,
      state_name: item.state_name,
      state_code: item.state_code || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  /* ── SAVE (create or update) ── */
  const handleSave = async () => {
    if (!form.state_name.trim()) {
      showMessage("error", "State name is required.");
      return;
    }

    try {
      setSaving(true);
      const isEdit = form.id !== null;
      const url = isEdit
        ? `${API}/api/admin/states/${form.id}`
        : `${API}/api/admin/states`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          state_name: form.state_name.trim(),
          state_code: form.state_code.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to save state.");
        return;
      }

      showMessage("success", isEdit ? "State updated." : "State created.");
      setModalOpen(false);
      fetchStates();
    } catch (err) {
      console.error("handleSave error:", err);
      showMessage("error", "Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── TOGGLE ACTIVE ── */
  const toggleActive = async (item: StateItem) => {
    try {
      const res = await fetch(`${API}/api/admin/states/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setStates((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, is_active: !item.is_active } : s))
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
      const res = await fetch(`${API}/api/admin/states/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to delete state.");
        return;
      }

      showMessage("success", "State deleted.");
      setDeleteTarget(null);
      fetchStates();
    } catch (err) {
      console.error("handleDelete error:", err);
      showMessage("error", "Server error.");
    } finally {
      setDeleting(false);
    }
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">State</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Manage state options shown on application forms
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
            <FaPlus size={12} /> Add State
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
              <div className="text-slate-400 text-sm">Loading…</div>
            </div>
          ) : states.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <FaMapMarkedAlt size={26} />
              <div className="text-sm">No states added yet.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 text-[11px] uppercase tracking-wide font-bold">
                    <th className="px-4 py-3">State Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.state_name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.state_code || "—"}</td>
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
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-800">
                {form.id ? "Edit State" : "Add State"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">State Name</label>
                <input
                  type="text"
                  value={form.state_name}
                  onChange={(e) => setForm((p) => ({ ...p, state_name: e.target.value }))}
                  placeholder="e.g. Haryana"
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm bg-slate-50 outline-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">State Code (optional)</label>
                <input
                  type="text"
                  value={form.state_code}
                  onChange={(e) => setForm((p) => ({ ...p, state_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HR"
                  maxLength={10}
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
                {saving ? "Saving…" : form.id ? "Save Changes" : "Create State"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Delete State?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.state_name}</strong>? This cannot be undone.
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