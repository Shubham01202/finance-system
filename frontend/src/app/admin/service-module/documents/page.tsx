"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaBars,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileAlt,
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

interface EmploymentType {
  id: number;
  name: string;
}

interface DocumentType {
  id: number;
  loan_service_ids: number[];
  loan_service_names?: string[];
  employment_type_ids: number[];        // NEW
  employment_type_names?: string[];     // NEW
  document_name: string;
  is_required: boolean;
  is_active: boolean;
  max_size_mb: number;
  allowed_file_types: string[];
}

interface FormState {
  id: number | null;
  loan_service_ids: string[];
  employment_type_ids: string[];        // NEW
  document_name: string;
  is_required: boolean;
  max_size_mb: string;
  allowed_file_types: string[];
}

const FILE_TYPE_OPTIONS = ["pdf", "jpg", "jpeg", "png", "webp"];

const emptyForm: FormState = {
  id: null,
  loan_service_ids: [],
  employment_type_ids: [],              // NEW
  document_name: "",
  is_required: true,
  max_size_mb: "5",
  allowed_file_types: ["pdf", "jpg", "jpeg", "png"],
};

const API = process.env.NEXT_PUBLIC_API_URL;

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function ManageDocumentsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loanServices, setLoanServices] = useState<LoanService[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]); // NEW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DocumentType | null>(null);
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
      const [docsRes, servicesRes, employmentRes] = await Promise.all([
        fetch(`${API}/api/admin/document-types`, {
          headers: { Authorization: `Bearer ${token()}` },
        }),
        fetch(`${API}/api/admin/loan-services`, {
          headers: { Authorization: `Bearer ${token()}` },
        }),
        fetch(`${API}/api/admin/employment-types`, {          // NEW
          headers: { Authorization: `Bearer ${token()}` },
        }),
      ]);
      const docsData = await docsRes.json();
      const servicesData = await servicesRes.json();
      const employmentData = await employmentRes.json();       // NEW

      if (docsData.success) setDocuments(docsData.data);
      if (servicesData.success) setLoanServices(servicesData.data);
      if (employmentData.success) setEmploymentTypes(employmentData.data); // NEW
    } catch (err) {
      console.error("fetchAll error:", err);
      showMessage("error", "Failed to load documents.");
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

  const openEditModal = (doc: DocumentType) => {
    setForm({
      id: doc.id,
      loan_service_ids: (doc.loan_service_ids || []).map(String),
      employment_type_ids: (doc.employment_type_ids || []).map(String), // NEW
      document_name: doc.document_name,
      is_required: doc.is_required,
      max_size_mb: String(doc.max_size_mb),
      allowed_file_types: doc.allowed_file_types || [],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const toggleFileType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      allowed_file_types: prev.allowed_file_types.includes(type)
        ? prev.allowed_file_types.filter((t) => t !== type)
        : [...prev.allowed_file_types, type],
    }));
  };

  const toggleLoanService = (id: number) => {
    setForm((prev) => ({
      ...prev,
      loan_service_ids: prev.loan_service_ids.includes(String(id))
        ? prev.loan_service_ids.filter((sid) => sid !== String(id))
        : [...prev.loan_service_ids, String(id)],
    }));
  };

  const toggleEmploymentType = (id: number) => {          // NEW
    setForm((prev) => ({
      ...prev,
      employment_type_ids: prev.employment_type_ids.includes(String(id))
        ? prev.employment_type_ids.filter((eid) => eid !== String(id))
        : [...prev.employment_type_ids, String(id)],
    }));
  };

  /* ── SAVE (create or update) ── */
  const handleSave = async () => {
    if (form.loan_service_ids.length === 0 || !form.document_name.trim()) {
      showMessage("error", "Select at least one loan service and enter a document name.");
      return;
    }
    if (form.allowed_file_types.length === 0) {
      showMessage("error", "Select at least one allowed file type.");
      return;
    }

    try {
      setSaving(true);
      const isEdit = form.id !== null;
      const url = isEdit
        ? `${API}/api/admin/document-types/${form.id}`
        : `${API}/api/admin/document-types`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          loan_service_ids: form.loan_service_ids.map(Number),
          employment_type_ids: form.employment_type_ids.map(Number), // NEW
          document_name: form.document_name.trim(),
          is_required: form.is_required,
          max_size_mb: Number(form.max_size_mb),
          allowed_file_types: form.allowed_file_types,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to save document.");
        return;
      }

      showMessage("success", isEdit ? "Document updated." : "Document created.");
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
  const toggleActive = async (doc: DocumentType) => {
    try {
      const res = await fetch(`${API}/api/admin/document-types/${doc.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ is_active: !doc.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, is_active: !doc.is_active } : d))
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
      const res = await fetch(`${API}/api/admin/document-types/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage("error", data.message || "Failed to delete document.");
        return;
      }

      showMessage("success", "Document deleted.");
      setDeleteTarget(null);
      fetchAll();
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

      {/* Mobile overlay */}
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Manage Documents</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Configure required documents per loan service &amp; employment type — used on customer &amp; CA application forms
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

        {/* Add button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white px-4 py-2.5 rounded-lg text-sm font-bold"
          >
            <FaPlus size={12} /> Add Document
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
              <div className="text-slate-400 text-sm">Loading…</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <FaFileAlt size={26} />
              <div className="text-sm">No documents configured yet.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 text-[11px] uppercase tracking-wide font-bold">
                    <th className="px-4 py-3">Loan Service</th>
                    <th className="px-4 py-3">Employment Type</th>
                    <th className="px-4 py-3">Document Name</th>
                    <th className="px-4 py-3">Required</th>
                    <th className="px-4 py-3">Max Size</th>
                    <th className="px-4 py-3">Allowed Types</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {doc.loan_service_names && doc.loan_service_names.length > 0 ? (
                            doc.loan_service_names.map((n) => (
                              <span key={n} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.employment_type_names && doc.employment_type_names.length > 0 ? (
                            doc.employment_type_names.map((n) => (
                              <span key={n} className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">All</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{doc.document_name}</td>
                      <td className="px-4 py-3">
                        {doc.is_required ? (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">Required</span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Optional</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{doc.max_size_mb} MB</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(doc.allowed_file_types || []).map((t) => (
                            <span key={t} className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(doc)}
                          className={`relative w-10 h-5.5 rounded-full transition-colors ${doc.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                          aria-label="Toggle active"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${doc.is_active ? "translate-x-4.5" : "translate-x-0"}`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(doc)}
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-md text-xs font-semibold"
                          >
                            <FaEdit size={11} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(doc)}
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
                {form.id ? "Edit Document" : "Add Document"}
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
                  Checked services will show this document on their application forms. Unchecked = hidden from that service.
                </p>
              </div>

              {/* NEW: Employment Types checklist (same pattern as Loan Services) */}
              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Employment Types</label>
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50 max-h-48 overflow-y-auto flex flex-col gap-2">
                  {employmentTypes.length === 0 ? (
                    <p className="text-[12px] text-slate-400">No employment types found.</p>
                  ) : (
                    employmentTypes.map((et) => {
                      const checked = form.employment_type_ids.includes(String(et.id));
                      return (
                        <label key={et.id} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEmploymentType(et.id)}
                            className="w-4 h-4"
                          />
                          {et.name}
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Leave unchecked to show this document to <strong>all</strong> employment types under the selected
                  loan service. Check specific types (e.g. Salaried, Self-Employed) to restrict this document to
                  only those applicants — it will show only when both the Loan Service and Employment Type match.
                </p>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Document Name</label>
                <input
                  type="text"
                  value={form.document_name}
                  onChange={(e) => setForm((p) => ({ ...p, document_name: e.target.value }))}
                  placeholder="e.g. Aadhaar Front"
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm bg-slate-50 outline-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Max File Size (MB)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_size_mb}
                  onChange={(e) => setForm((p) => ({ ...p, max_size_mb: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm bg-slate-50 outline-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">Allowed File Types</label>
                <div className="flex flex-wrap gap-2">
                  {FILE_TYPE_OPTIONS.map((type) => {
                    const active = form.allowed_file_types.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => toggleFileType(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm((p) => ({ ...p, is_required: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 font-medium">Mandatory document</span>
              </label>
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
                {saving ? "Saving…" : form.id ? "Save Changes" : "Create Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Delete Document?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.document_name}</strong>? This cannot be undone.
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