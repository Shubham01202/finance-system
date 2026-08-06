"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FaArrowLeft, FaSave, FaKey, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import AdminLayout from "../../../../../components/layout/admin/AdminLayout";

interface Role {
  id: number;
  role_name: string;
  is_active: boolean;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();

  const API = process.env.NEXT_PUBLIC_API_URL;

  const token = () => localStorage.getItem("token");

const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const [roles, setRoles] = useState<Role[]>([
    { id: -1, role_name: "customer", is_active: true },
    { id: -2, role_name: "ca", is_active: true },
    { id: -3, role_name: "admin", is_active: true },
  ]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "customer",
  });

  // Reset password panel state
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

 const DEFAULT_ROLES: Role[] = [
    { id: -1, role_name: "customer", is_active: true },
    { id: -2, role_name: "ca", is_active: true },
    { id: -3, role_name: "admin", is_active: true },
  ];

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API}/api/auth/roles`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        const fetched: Role[] = data.data.filter((r: Role) => r.is_active);
        const merged = [
          ...DEFAULT_ROLES,
          ...fetched.filter(
            (fr) => !DEFAULT_ROLES.some((dr) => dr.role_name.toLowerCase() === fr.role_name.toLowerCase())
          ),
        ];
        setRoles(merged);
      }
    } catch {
      // keep the defaults already in state if this fails
    }
  };

  useEffect(() => {
    const t = token();
    if (!t) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "admin") { router.push("/"); return; }
      setAdminName(user.full_name || "Admin");
    } catch {}
    fetchUser();
    fetchRoles();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users/${params.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to load user");
        return;
      }

      setForm({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      });
    } catch {
      alert("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch(`${API}/api/admin/users/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update user");
        return;
      }

      alert("User updated successfully");
      router.push("/admin/users");
    } catch {
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const toggleResetPanel = () => {
    setShowResetPanel((p) => !p);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
    setShowPw(false);
  };

  const handleResetPassword = async () => {
    setResetError("");
    setResetSuccess("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    try {
      setResetting(true);

      const res = await fetch(`${API}/api/admin/users/${params.id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || "Failed to reset password");
        return;
      }

      setResetSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setResetError("Something went wrong.");
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>

      {/* Back link */}
      <button
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-1.5 bg-transparent text-slate-500 border-none pb-2 text-[13px] font-medium cursor-pointer"
      >
        <FaArrowLeft size={12} /> Back to Users
      </button>

      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0 mb-1">Edit User</h1>
      <p className="text-[13px] text-slate-400 mb-6">Update this user's account details</p>

      {loading ? (
        <div className="flex flex-col items-center gap-3.5 py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm m-0">Loading user…</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm max-w-xl">
          <div className="flex flex-col gap-4.5">
            <Field label="Full Name">
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
              />
            </Field>

            <Field label="Email">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none box-border"
              />
            </Field>

           <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none cursor-pointer box-border capitalize"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.role_name} className="capitalize">
                    {r.role_name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center gap-2 px-5.5 py-3 rounded-[10px] border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
              >
                <FaArrowLeft size={13} /> Back
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5.5 py-3 rounded-[10px] border-none bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white font-semibold cursor-pointer disabled:opacity-70"
              >
                <FaSave size={13} /> {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={toggleResetPanel}
                className="flex items-center justify-center gap-2 px-5.5 py-3 rounded-[10px] border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
              >
                {showResetPanel ? <FaTimes size={13} /> : <FaKey size={13} />}
                {showResetPanel ? "Cancel Reset" : "Reset Password"}
              </button>
            </div>

            {/* ── RESET PASSWORD PANEL ── */}
            {showResetPanel && (
              <div className="mt-2 p-4 sm:p-5 rounded-[14px] border border-slate-200 bg-slate-50 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <FaKey size={13} className="text-[#1e3a5f]" />
                  <span className="text-sm font-bold text-slate-800">Set New Password</span>
                </div>

                {resetError && (
                  <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {resetError}
                  </div>
                )}
                {resetSuccess && (
                  <div className="text-[13px] text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {resetSuccess}
                  </div>
                )}

                <Field label="New Password">
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none box-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-400 cursor-pointer p-0"
                    >
                      {showPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password">
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm outline-none box-border"
                  />
                </Field>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="flex items-center justify-center gap-2 px-5.5 py-3 rounded-[10px] border-none bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white font-semibold cursor-pointer disabled:opacity-70"
                  >
                    <FaKey size={13} /> {resetting ? "Updating..." : "Confirm Reset"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}