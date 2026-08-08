"use client";

import { useEffect, useState } from "react";
import {
  FaSave,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaPaperPlane,
} from "react-icons/fa";
import AdminLayout from "../../../../components/layout/admin/AdminLayout";

const API = process.env.NEXT_PUBLIC_API_URL;

interface SMTPForm {
  provider_name: string;
  host: string;
  port: number | "";
  username: string;
  password: string;
  encryption_type: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

export default function SMTPSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
const [testEmail, setTestEmail] = useState("");

  const [formData, setFormData] = useState<SMTPForm>({
    provider_name: "Brevo",
    host: "",
    port: 587,
    username: "",
    password: "",
    encryption_type: "tls",
    from_email: "",
    from_name: "",
    is_active: true,
  });

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : "";

  useEffect(() => {
    fetchSMTP();
  }, []);

  const fetchSMTP = async () => {
    try {
      const res = await fetch(`${API}/api/admin/settings/smtp`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          provider_name: data.data.provider_name,
          host: data.data.host,
          port: data.data.port,
          username: data.data.username,
          encryption_type: data.data.encryption_type,
          from_email: data.data.from_email,
          from_name: data.data.from_name,
          is_active: data.data.is_active,
          password: "",
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

 const saveSettings = async () => {
  if (!formData.host.trim()) {
    alert("SMTP Host is required.");
    return;
  }

  if (!formData.port) {
    alert("SMTP Port is required.");
    return;
  }

  if (!formData.username.trim()) {
    alert("SMTP Username is required.");
    return;
  }

  if (!formData.from_email.trim()) {
    alert("From Email is required.");
    return;
  }

  if (!formData.from_name.trim()) {
    alert("From Name is required.");
    return;
  }

  // Password is required only when creating for the first time
  if (!formData.password.trim()) {
    const proceed = window.confirm(
      "Password is empty.\n\nIf SMTP is already configured, the existing password will be kept.\n\nDo you want to continue?"
    );

    if (!proceed) return;
  }

  try {
    setSaving(true);

    const res = await fetch(`${API}/api/admin/settings/smtp`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to save SMTP settings.");
    }

    alert("SMTP Settings saved successfully.");

    // Clear password field after save
    setFormData((prev) => ({
      ...prev,
      password: "",
    }));

    fetchSMTP();
  } catch (error: any) {
    console.error(error);
    alert(error.message || "Something went wrong.");
  } finally {
    setSaving(false);
  }
};

const testConnection = async () => {
  if (!testEmail.trim()) {
    alert("Please enter a test email address.");
    return;
  }

  try {
    setTesting(true);

    const res = await fetch(`${API}/api/admin/settings/smtp/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: testEmail,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "SMTP Test Failed");
    }

    alert("✅ Test email sent successfully.");

    setShowTestModal(false);
    setTestEmail("");
  } catch (err: any) {
    console.error(err);
    alert(err.message || "SMTP Test Failed");
  } finally {
    setTesting(false);
  }
};

  return (
    <AdminLayout adminName="Admin" handleLogout={() => {}}>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="text-slate-500 text-lg">
            Loading SMTP Settings...
          </div>
        </div>
      ) : (
        <>
         <div className="max-w-6xl mx-auto p-4 md:p-6">
  {/* Header */}
  <div className="mb-6">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
        <FaEnvelope className="text-[#1e3a5f] text-xl" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          SMTP Settings
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Configure email server settings used for OTP,
          password reset and notification emails.
        </p>
      </div>
    </div>
  </div>

  {/* Card */}
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

    <h2 className="text-lg font-semibold text-slate-700 mb-6">
      SMTP Configuration
    </h2>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Provider */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          SMTP Provider
        </label>

        <select
          name="provider_name"
          value={formData.provider_name}
          onChange={handleChange}
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Brevo">Brevo</option>
          <option value="Gmail">Gmail</option>
          <option value="Outlook">Outlook</option>
          <option value="Custom">Custom SMTP</option>
        </select>
      </div>

      {/* Port */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          SMTP Port
        </label>

        <input
          type="number"
          name="port"
          value={formData.port}
          onChange={handleChange}
          placeholder="587"
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Host */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          SMTP Host
        </label>

        <input
          type="text"
          name="host"
          value={formData.host}
          onChange={handleChange}
          placeholder="smtp-relay.brevo.com"
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Encryption */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Encryption
        </label>

        <select
          name="encryption_type"
          value={formData.encryption_type}
          onChange={handleChange}
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="tls">TLS</option>
          <option value="ssl">SSL</option>
          <option value="none">None</option>
        </select>
      </div>

    </div>

    {/* Username */}
    <div className="mt-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        SMTP Username
      </label>

      <input
        type="text"
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="Enter SMTP Username"
        className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Password */}
    <div className="mt-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        SMTP Password
      </label>

      <div className="relative">

        <input
          type={showPassword ? "text" : "password"}
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter SMTP Password"
          className="w-full h-11 rounded-xl border border-slate-300 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>

      </div>
    </div>

    {/* Email + Name */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          From Email
        </label>

        <input
          type="email"
          name="from_email"
          value={formData.from_email}
          onChange={handleChange}
          placeholder="info@company.com"
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          From Name
        </label>

        <input
          type="text"
          name="from_name"
          value={formData.from_name}
          onChange={handleChange}
          placeholder="SN Finance"
          className="w-full h-11 rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

    </div>

    {/* Active */}
    <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

      <div>
        <h3 className="font-semibold text-slate-700">
          SMTP Active
        </h3>

        <p className="text-sm text-slate-500">
          Enable or disable this SMTP configuration.
        </p>
      </div>

      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={formData.is_active}
          onChange={(e) =>
            setFormData({
              ...formData,
              is_active: e.target.checked,
            })
          }
        />

        <div className={`w-12 h-6 rounded-full transition ${
          formData.is_active
            ? "bg-green-500"
            : "bg-gray-300"
        }`}>
          <div
            className={`w-5 h-5 bg-white rounded-full mt-0.5 transition ${
              formData.is_active
                ? "translate-x-6"
                : "translate-x-0.5"
            }`}
          />
        </div>
      </label>

    </div>

    {/* Buttons */}
    <div className="mt-8 flex flex-col md:flex-row justify-end gap-3">

    <button
onClick={() => setShowTestModal(true)}
  disabled={testing}
  className="h-11 px-5 rounded-xl border border-[#1e3a5f] text-[#1e3a5f] font-semibold hover:bg-[#1e3a5f] hover:text-white transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
>
  <FaPaperPlane />

  {testing ? "Testing..." : "Test Connection"}
</button>

      <button
        onClick={saveSettings}
        className="h-11 px-6 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:bg-[#274d7d] transition flex items-center justify-center gap-2"
      >
        <FaSave />
        Save Settings
      </button>

    </div>

  </div>
</div>

{showTestModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-bold text-slate-800">
          Test SMTP Connection
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter an email address to receive a test email.
        </p>
      </div>

      <div className="p-6">

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Test Email Address
        </label>

        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="example@gmail.com"
          className="h-11 w-full rounded-xl border border-slate-300 px-4 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />

      </div>

      <div className="flex justify-end gap-3 border-t px-6 py-4">

        <button
          onClick={() => {
            setShowTestModal(false);
            setTestEmail("");
          }}
          className="rounded-xl border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          onClick={testConnection}
          disabled={testing}
          className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#274d7d] disabled:opacity-60"
        >
          {testing ? "Sending..." : "Send Test Email"}
        </button>

      </div>

    </div>
  </div>
)}
        </>
      )}
    </AdminLayout>
  );
}