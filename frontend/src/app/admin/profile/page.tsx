// Path: frontend/src/app/admin/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaEdit, FaSave, FaTimes, FaEnvelope, FaUser, FaPhone,
  FaArrowLeft, FaPaperPlane, FaShieldAlt,
} from "react-icons/fa";
import AdminLayout from "../../../components/layout/admin/AdminLayout";

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function AdminProfilePage() {
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [adminName, setAdminName] = useState("Admin");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    role: "admin",
  });

  const [editForm, setEditForm] = useState({ ...form });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "admin") { router.push("/"); return; }
      setAdminName(user.full_name || "Admin");
    } catch {}
    fetchProfile(token);
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();
      if (data.success) {
        const p = {
          full_name: data.data.full_name || "",
          email:     data.data.email     || "",
          mobile:    data.data.mobile    || "",
          role:      data.data.role      || "admin",
        };
        setForm(p);
        setEditForm(p);
        setAdminName(data.data.full_name || "Admin");
      } else {
        setError("Failed to load profile.");
      }
    } catch {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.full_name || !editForm.email) {
      setError("Name and email are required."); return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: editForm.full_name, email: editForm.email, mobile: editForm.mobile }),
      });
      const data = await res.json();
      if (data.success) {
        setForm(editForm);
        setAdminName(editForm.full_name);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...user, full_name: editForm.full_name, email: editForm.email }));
        setSuccess("Profile updated successfully!");
        setEditing(false);
      } else {
        setError(data.message || "Update failed.");
      }
    } catch {
      setError("Server error.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleChangePassword = () => {
    if (!form.email) {
      setError("Email address not found.");
      return;
    }
    setError("");
    setSuccess("");
    setShowResetModal(true);
  };

  const confirmSendReset = async () => {
    setShowResetModal(false);
    try {
      setSendingReset(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setSuccess("Password reset email has been sent successfully. Please check your inbox.");
      } else {
        setError(data.message || "Unable to send reset email.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setSendingReset(false);
    }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-start gap-3.5 mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-1.5 bg-transparent text-slate-500 border-none pb-2 text-[13px] font-medium cursor-pointer"
          >
            <FaArrowLeft size={12} /> Back to Dashboard
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Admin Profile</h1>
          <p className="text-[13px] text-slate-400 mt-1">Manage your account details</p>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setEditForm(form); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap"
          >
            <FaEdit size={13} /> Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-lg text-sm mb-5">
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3.5 py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm m-0">Loading profile…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

          {/* ── Profile Card ── */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white text-3xl font-extrabold flex items-center justify-center">
              {form.full_name.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="text-lg font-extrabold text-slate-800 text-center">{form.full_name}</div>
            <div className="text-[13px] text-slate-400 text-center break-all">{form.email}</div>
            <div className="flex items-center gap-1.5 bg-red-400/10 text-red-600 border border-red-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold mt-1">
              <FaShieldAlt size={11} />
              <span>Administrator</span>
            </div>
          </div>

          {/* ── Details / Edit Card ── */}
          <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex justify-between items-center mb-5 pb-3.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="text-base font-bold text-slate-800">
                {editing ? "Edit Profile" : "Profile Details"}
              </div>
              {editing && (
                <button
                  onClick={() => { setEditing(false); setEditForm(form); setError(""); }}
                  className="flex items-center gap-1.5 bg-slate-100 text-slate-500 border-none px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer"
                >
                  <FaTimes size={12} /> Cancel
                </button>
              )}
            </div>

            {editing ? (
              /* ── EDIT MODE ── */
              <div className="flex flex-col gap-4.5">
                <Field label="Full Name" required>
                  <div className="relative">
                    <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none" />
                    <input
                      type="text" value={editForm.full_name}
                      onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Full name"
                      className="w-full border-[1.5px] border-slate-200 rounded-[10px] py-2.5 pl-10 pr-3.5 text-sm text-slate-800 bg-slate-50 outline-none box-border"
                    />
                  </div>
                </Field>
                <Field label="Email Address" required>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none" />
                    <input
                      type="email" value={editForm.email}
                      onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="Email address"
                      className="w-full border-[1.5px] border-slate-200 rounded-[10px] py-2.5 pl-10 pr-3.5 text-sm text-slate-800 bg-slate-50 outline-none box-border"
                    />
                  </div>
                </Field>
                <Field label="Mobile Number">
                  <div className="relative">
                    <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none" />
                    <input
                      type="text" value={editForm.mobile}
                      onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))}
                      placeholder="Mobile number" maxLength={10}
                      className="w-full border-[1.5px] border-slate-200 rounded-[10px] py-2.5 pl-10 pr-3.5 text-sm text-slate-800 bg-slate-50 outline-none box-border"
                    />
                  </div>
                </Field>
                <Field label="Role">
                  <div className="relative">
                    <FaShieldAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none" />
                    <input
                      type="text" value="Administrator" disabled
                      className="w-full border-[1.5px] border-slate-200 rounded-[10px] py-2.5 pl-10 pr-3.5 text-sm bg-slate-100 text-slate-400 outline-none box-border cursor-not-allowed"
                    />
                  </div>
                </Field>

                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none py-3 px-6 rounded-[10px] text-sm font-bold cursor-pointer mt-2 disabled:opacity-70"
                >
                  <FaSave size={13} /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <div className="flex flex-col gap-4">
                <InfoRow icon={<FaUser />}      label="Full Name"     value={form.full_name || "—"} />
                <InfoRow icon={<FaEnvelope />}  label="Email Address" value={form.email     || "—"} />
                <InfoRow icon={<FaPhone />}     label="Mobile Number" value={form.mobile    || "—"} />
                <InfoRow icon={<FaShieldAlt />} label="Role"          value="Administrator" />
              </div>
            )}
          </div>

          {/* ── Security Card ── */}
          <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-5 pb-3.5 border-b border-slate-100">
              <div className="text-base font-bold text-slate-800">Security</div>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="font-semibold text-sm text-slate-800">Password</div>
                <div className="text-[13px] text-slate-400 mt-0.5 max-w-md">
                  We'll send a secure password reset link to your registered email address.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={sendingReset}
                  onClick={handleChangePassword}
                  className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none py-2.5 px-4.5 rounded-lg text-[13px] font-bold cursor-pointer whitespace-nowrap disabled:opacity-70"
                >
                  {sendingReset ? "Sending..." : "Change Password"}
                </button>
                <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 py-1.5 px-4 rounded-full text-[13px] font-bold whitespace-nowrap">
                  🔒 Secured
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ════ RESET PASSWORD CONFIRMATION MODAL ════ */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-slate-900/55 flex items-center justify-center z-[1000] p-5"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="bg-white rounded-2xl px-7 pt-7 pb-6 w-full max-w-[380px] shadow-2xl flex flex-col items-center text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-[52px] h-[52px] rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mb-4">
              <FaEnvelope size={22} className="text-[#1e3a5f]" />
            </div>
            <div className="text-[17px] font-extrabold text-slate-800 mb-2">Send Password Reset Link?</div>
            <div className="text-[13.5px] text-slate-500 leading-relaxed">
              We'll send a secure password reset link to:
            </div>
            <div className="text-sm font-bold text-[#1e3a5f] mt-1.5 mb-5.5 break-all">{form.email}</div>

            <div className="flex gap-2.5 w-full">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-slate-100 text-slate-500 border-none py-2.5 rounded-[10px] text-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmSendReset}
                className="flex-1 flex items-center justify-center gap-2 bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none py-2.5 rounded-[10px] text-sm font-bold cursor-pointer"
              >
                <FaPaperPlane size={12} /> Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 gap-3">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-slate-400 text-sm">{icon}</span>
        <span className="text-sm text-slate-500 font-medium">{label}</span>
      </div>
      <span className="text-sm text-slate-800 font-semibold text-right break-all">{value}</span>
    </div>
  );
}