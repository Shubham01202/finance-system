// Path: frontend/src/app/admin/dsa/[id]/edit/page.tsx
"use client";

import { useState, useEffect, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaIdCard, FaBuilding, FaCalendarAlt,
  FaFileUpload, FaCheckCircle, FaShieldAlt,
  FaFilePdf, FaFileImage, FaTrash, FaUniversity, FaArrowLeft, FaUser,
  FaEnvelope,
  FaPhone,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaUserTag,
  FaChevronDown,
} from "react-icons/fa";
import AdminLayout from "./../../../../../components/layout/admin/AdminLayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface DSAProfileForm {
  full_name: string;
  email: string;
  mobile: string;

  agency_name: string;
  dsa_code: string;
  empanelment_date: string;

  pan_number: string;
  aadhaar_number: string;
  office_address: string;
  city: string;
  state: string;
  pincode: string;

  role: string;

  certificate: any;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const EMPTY_FORM: DSAProfileForm = {
  full_name: "",
  email: "",
  mobile: "",
  role: "",

  agency_name: "",
  dsa_code: "",
  empanelment_date: "",

  pan_number: "",
  aadhaar_number: "",
  office_address: "",
  city: "",
  state: "",
  pincode: "",

  certificate: null,
};

// Fallback list used only if the dynamic /api/states fetch fails
const FALLBACK_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// Fallback used only if the dynamic /api/catalog/roles fetch fails or returns empty
const FALLBACK_ROLES = [
  "Individual DSA",
  "Corporate DSA",
  "Sub-DSA",
  "Channel Partner",
];

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function AdminEditDSAProfilePage() {
  const router = useRouter();
  const params = useParams();
  const dsaId = params.id as string;

  const [dsaUserName, setDsaUserName] = useState("");
  const [dsaEmail, setDsaEmail] = useState("");
  const [formData, setFormData] = useState<DSAProfileForm>(EMPTY_FORM);

  const [certificate, setCertificate] = useState<UploadedFile | null>(null);
  const [existingCertPath, setExistingCertPath] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DSAProfileForm, string>>>({});
  const [certError, setCertError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [notFound, setNotFound] = useState(false);

  // Dynamic states list
  const [stateOptions, setStateOptions] = useState<string[]>(FALLBACK_STATES);
  const [statesLoading, setStatesLoading] = useState(true);

  // Dynamic role list
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Reset password panel state
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ── LOAD DYNAMIC STATES ── */
  useEffect(() => {
    const loadStates = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API}/api/catalog/states`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error("Failed to fetch states");

        const result = await res.json();

        const list: string[] = Array.isArray(result.data)
          ? result.data
              .map((item: any) => (typeof item === "string" ? item : item.state_name))
              .filter(Boolean)
          : [];

        setStateOptions(list.length ? list : FALLBACK_STATES);
      } catch (err) {
        console.error("Could not load states:", err);
        setStateOptions(FALLBACK_STATES);
      } finally {
        setStatesLoading(false);
      }
    };

    loadStates();
  }, [API]);

  /* ── LOAD DYNAMIC ROLES ── */
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API}/api/catalog/roles`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error("Failed to fetch roles");

        const result = await res.json();

        const list: string[] = Array.isArray(result.data)
          ? result.data
              .map((item: any) => (typeof item === "string" ? item : item.role_name ?? item.name))
              .filter(Boolean)
          : [];

        setRoleOptions(list.length ? list : FALLBACK_ROLES);
      } catch (err) {
        console.error("Could not load roles:", err);
        setRoleOptions(FALLBACK_ROLES);
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [API]);

  /* ── LOAD DSA PROFILE ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const loadDSA = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") {
          router.push("/");
          return;
        }
        setAdminName(user.full_name || "Admin");

        const res = await fetch(`${API}/api/admin/dsa/${dsaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          setNotFound(true);
          setError(result.message || "Unable to load this DSA's profile.");
          return;
        }

        const data = result.data;

        setDsaUserName(data.full_name || data.name || "");
        setDsaEmail(data.email || "");

        // Backend responses have been observed under two different naming
        // conventions (agency_name/dsa_code/empanelment_date vs
        // firm_name/membership_number/enrollment_date). Accept either so
        // Firm Details always prefetch correctly regardless of which the
        // API returns.
        const agencyName = data.agency_name ?? data.firm_name ?? "";
        const dsaCode = data.dsa_code ?? data.membership_number ?? "";
        const empanelmentDateRaw = data.empanelment_date ?? data.enrollment_date ?? "";

        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          mobile: data.mobile || "",
          role: data.role || "",
          agency_name: agencyName,
          dsa_code: dsaCode,
          empanelment_date: empanelmentDateRaw ? String(empanelmentDateRaw).split("T")[0] : "",
          pan_number: data.pan_number || "",
          aadhaar_number: data.aadhaar_number || "",
          office_address: data.office_address || "",
          city: data.city || "",
          state: data.state || "",
          pincode: data.pincode || "",
          certificate: data.certificate_path || null,
        });

        setExistingCertPath(data.certificate_path || "");
      } catch (err) {
        console.error(err);
        setError("Server error while loading DSA profile.");
        setNotFound(true);
      } finally {
        setPageLoading(false);
      }
    };

    if (dsaId) loadDSA();
  }, [dsaId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  /* ── VALIDATORS ── */
  const validators: Partial<Record<keyof DSAProfileForm, (v: string) => string>> = {
    role: v => (!v.trim() ? "Please select a role" : ""),

    agency_name: v => (v.trim().length < 3 ? "Min 3 characters" : ""),

    dsa_code: v => (v.trim().length < 3 ? "Enter valid DSA Code" : ""),

    pan_number: v =>
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Invalid PAN format" : "",

    aadhaar_number: v => (!/^\d{12}$/.test(v) ? "Must be 12 digits" : ""),

    pincode: v => (!/^\d{6}$/.test(v) ? "Must be 6 digits" : ""),

    empanelment_date: v => (!v ? "Required" : ""),
  };

  // Fields validated as plain required strings. `certificate` is
  // intentionally excluded — it's satisfied by either a freshly uploaded
  // file OR an existing document already on file (checked separately).
  const REQUIRED_STRING_FIELDS: (keyof DSAProfileForm)[] = [
    "full_name", "email", "mobile", "role",
    "agency_name", "dsa_code", "empanelment_date",
    "pan_number", "aadhaar_number", "office_address",
    "city", "state", "pincode",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof DSAProfileForm;
    let val = value;
    if (key === "pan_number") val = value.toUpperCase();
    setFormData(p => ({ ...p, [key]: val }));
    const v = validators[key];
    if (v && val) setFieldErrors(p => ({ ...p, [key]: v(val) }));
    else setFieldErrors(p => ({ ...p, [key]: "" }));
  };

  /* ── CERTIFICATE UPLOAD ── */
  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setCertError("File must be under 5MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { setCertError("Only JPG, PNG, WEBP or PDF allowed"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCertificate({ name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string });
      setCertError("");
    };
    reader.readAsDataURL(file);
  };

  /* ── RESET PASSWORD ── */
  const toggleResetPanel = () => {
    setShowResetPanel(p => !p);
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

    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }

    try {
      setResetting(true);

      const res = await fetch(`${API}/api/admin/users/${dsaId}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
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

  /* ── SUBMIT (admin saving another DSA's profile) ── */
  const handleSubmit = async () => {
    const newErrors: Partial<Record<keyof DSAProfileForm, string>> = {};
    let hasError = false;

    REQUIRED_STRING_FIELDS.forEach(key => {
      const value = formData[key] as string;
      if (!value || value.trim() === "") {
        newErrors[key] = "This field is required";
        hasError = true;
      } else {
        const v = validators[key];
        if (v) {
          const msg = v(value);
          if (msg) { newErrors[key] = msg; hasError = true; }
        }
      }
    });

    if (!certificate && !existingCertPath) {
      setCertError("Please upload the DSA agreement / proof document");
      hasError = true;
    } else {
      setCertError("");
    }

    setFieldErrors(newErrors);
    if (hasError) { setError("Please fix all errors before submitting."); setSuccess(""); return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }

    setLoading(true); setError(""); setSuccess("");

    try {
      // Admin-scoped update — targets the DSA by :id, unlike the DSA's own
      // self-service POST /api/dsa/profile which infers the DSA from the token.
      // Both naming conventions are sent so this works regardless of which
      // one the backend controller currently reads from.
      const res = await fetch(`${API}/api/admin/dsa/${dsaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          pan_number: formData.pan_number.toUpperCase(),
          firm_name: formData.agency_name,
          membership_number: formData.dsa_code,
          enrollment_date: formData.empanelment_date,
          certificate: certificate ? { name: certificate.name, dataUrl: certificate.dataUrl } : null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess("Profile updated successfully! Redirecting…");
        setTimeout(() => {
          router.push("/admin/users");
        }, 1200);
      } else {
        setError(data.message || "Failed to save profile.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>
      {pageLoading ? (
        <div style={s.card}>
          <div style={s.loadingCenter}>
            <div className="dsa-spinner" style={s.spinner} />
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading DSA profile…</div>
          </div>
        </div>
      ) : notFound ? (
        <div style={s.card}>
          <div style={s.errorBox}>⚠️ {error || "DSA profile not found."}</div>
          <button style={s.backBtn} onClick={() => router.push("/admin/users")}>
            <FaArrowLeft size={12} /> Back to Users
          </button>
        </div>
      ) : (
        <div className="dsa-setup-wrap">

          {/* ── HEADER ── */}
          <div className="dsa-setup-header" style={s.header}>
            <div className="dsa-setup-header-inner" style={s.headerInner}>
              <div style={s.headerBrand}>
                <div style={s.brandIcon}><FaUniversity size={18} color="#fff" /></div>
                <span style={s.brandName}>SN Finance Service · Admin</span>
              </div>
              <div className="dsa-header-right" style={s.headerRight}>
                <div style={s.stepBadge}>Editing DSA Profile</div>
                <div style={s.headerSub}>
                  {dsaUserName || dsaEmail
                    ? `Editing ${dsaUserName || dsaEmail}'s DSA profile`
                    : "Editing DSA profile"}
                </div>
              </div>
            </div>
          </div>

          <div className="dsa-setup-container" style={s.container}>

            <button className="dsa-back-btn" style={s.backBtn} onClick={() => router.push("/admin/users")}>
              <FaArrowLeft size={12} /> Back to Users
            </button>

            {/* ── NOTICE BANNER ── */}
            <div style={s.noticeBanner}>
              <FaShieldAlt size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1d4ed8" }}>
                  Admin Edit — DSA Profile
                </div>
                <div style={{ fontSize: 13, color: "#3b82f6", marginTop: 3 }}>
                  You are editing this DSA&apos;s empanelment and KYC details on their behalf.
                </div>
              </div>
            </div>

            {/* ── FORM CARD ── */}
            <div className="dsa-setup-card" style={s.card}>
              {error && <div style={s.errorBox}>⚠️ {error}</div>}
              {success && <div style={s.successBox}>✅ {success}</div>}

              {/* ── USER DETAILS ── */}
              <Section
                title="User Details"
                icon="👤"
                subtitle="Basic account information"
              >
                <TwoCol>
                  <Field label="Full Name" required error={fieldErrors.full_name}>
                    <InputEl
                      name="full_name"
                      placeholder="Full Name"
                      value={formData.full_name}
                      onChange={handleChange}
                      icon={<FaUser />}
                    />
                  </Field>

                  <Field label="Email" required error={fieldErrors.email}>
                    <InputEl
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      icon={<FaEnvelope />}
                    />
                  </Field>

                  <Field label="Mobile" required error={fieldErrors.mobile}>
                    <InputEl
                      name="mobile"
                      placeholder="10-digit Mobile Number"
                      value={formData.mobile}
                      onChange={handleChange}
                      icon={<FaPhone />}
                    />
                  </Field>

                  <Field label="Role" required error={fieldErrors.role}>
                    <div style={s.inputWrap}>
                      <span style={s.inputIcon}><FaUserTag /></span>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        style={{ ...s.select, paddingLeft: 42 }}
                        disabled={rolesLoading}
                      >
                        <option value="">
                          {rolesLoading ? "Loading roles…" : "Select Role"}
                        </option>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <span style={s.selectChevron}><FaChevronDown size={11} /></span>
                    </div>
                  </Field>
                </TwoCol>
              </Section>

              {/* ── FIRM DETAILS ── */}
              <Section title="Firm Details" icon="🏢" subtitle="DSA firm / agency information">
                <TwoCol>
                  <Field label="DSA Agency / Firm Name" required error={fieldErrors.agency_name}>
                    <InputEl
                      name="agency_name"
                      placeholder="e.g. Sharma Loan Consultants"
                      value={formData.agency_name}
                      onChange={handleChange}
                      icon={<FaBuilding />}
                    />
                  </Field>

                  <Field label="DSA Empanelment / Code Number" required error={fieldErrors.dsa_code}>
                    <InputEl
                      name="dsa_code"
                      placeholder="e.g. DSA-123456"
                      value={formData.dsa_code}
                      onChange={handleChange}
                      icon={<FaIdCard />}
                    />
                  </Field>

                  <Field label="Date of Empanelment" required error={fieldErrors.empanelment_date}>
                    <InputEl
                      name="empanelment_date"
                      type="date"
                      value={formData.empanelment_date}
                      onChange={handleChange}
                      icon={<FaCalendarAlt />}
                    />
                  </Field>
                </TwoCol>
              </Section>

              {/* ── KYC DETAILS ── */}
              <Section title="KYC Details" icon="🛡️" subtitle="Identity verification">
                <div style={s.kycBanner}>
                  <FaShieldAlt size={15} color="#1d4ed8" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: "#3b82f6" }}>
                    PAN and Aadhaar are required for compliance verification.
                  </div>
                </div>
                <TwoCol>
                  <Field label="PAN Number" required error={fieldErrors.pan_number}>
                    <InputEl
                      name="pan_number" placeholder="ABCDE1234F" maxLength={10}
                      value={formData.pan_number} onChange={handleChange}
                      icon={<FaIdCard />}
                    />
                  </Field>
                  <Field label="Aadhaar Number" required error={fieldErrors.aadhaar_number}>
                    <InputEl
                      name="aadhaar_number" placeholder="12-digit Aadhaar" maxLength={12}
                      value={formData.aadhaar_number} onChange={handleChange}
                      icon={<FaIdCard />}
                    />
                  </Field>
                </TwoCol>
              </Section>

              {/* ── OFFICE ADDRESS ── */}
              <Section title="Office Address" icon="📍" subtitle="Registered DSA office address">
                <Field label="Full Office Address" required error={fieldErrors.office_address}>
                  <textarea
                    name="office_address"
                    placeholder="Office No, Street, Area, Landmark"
                    value={formData.office_address}
                    onChange={handleChange}
                    rows={3}
                    style={{ ...s.input, height: "auto", resize: "vertical", paddingLeft: 14 }}
                  />
                </Field>
                <TwoCol>
                  <Field label="City" required error={fieldErrors.city}>
                    <InputEl
                      name="city" placeholder="City"
                      value={formData.city} onChange={handleChange}
                      icon={<FaBuilding />}
                    />
                  </Field>
                  <Field label="State" required error={fieldErrors.state}>
                    <div style={s.inputWrap}>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        style={s.select}
                        disabled={statesLoading}
                      >
                        <option value="">
                          {statesLoading ? "Loading states…" : "Select State"}
                        </option>
                        {stateOptions.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <span style={s.selectChevron}><FaChevronDown size={11} /></span>
                    </div>
                  </Field>
                  <Field label="Pincode" required error={fieldErrors.pincode}>
                    <InputEl
                      name="pincode" placeholder="6-digit pincode" maxLength={6}
                      value={formData.pincode} onChange={handleChange}
                      icon={<FaBuilding />}
                    />
                  </Field>
                </TwoCol>
              </Section>

              {/* ── CERTIFICATE UPLOAD ── */}
              <Section title="DSA Agreement / Proof" icon="📄" subtitle="DSA empanelment agreement or proof document">
                <div style={s.docBanner}>
                  <FaFileUpload size={15} color="#0369a1" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: "#0284c7" }}>
                    JPG, PNG, WEBP or PDF · Max 5MB · Stored securely and not shared publicly.
                  </div>
                </div>

                <div style={{
                  ...s.docCard,
                  borderColor: certError ? "#fca5a5" : certificate ? "#86efac" : "#d1d5db",
                  background: certificate ? "#f0fdf4" : "#fff",
                }}>
                  <div style={s.docCardTop}>
                    <div>
                      <div style={s.docLabel}>DSA Agreement / Empanelment Proof</div>
                      <div style={s.docDesc}>Signed DSA agreement or empanelment confirmation document</div>
                    </div>
                    {certificate && (
                      <button className="dsa-icon-btn" style={s.docRemove} onClick={() => setCertificate(null)}>
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>

                  {certificate ? (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      {certificate.type === "application/pdf" ? (
                        <div style={s.pdfPreview}>
                          <FaFilePdf size={26} color="#ef4444" />
                          <span style={s.docFileName}>{certificate.name}</span>
                        </div>
                      ) : (
                        <img src={certificate.dataUrl} alt="Certificate" style={s.docImg} />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FaCheckCircle size={11} color="#10b981" />
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                          {certificate.name} · {(certificate.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                  ) : existingCertPath ? (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                      {existingCertPath.endsWith(".pdf") ? (
                        <div style={s.pdfPreview}>
                          <FaFilePdf size={26} color="#ef4444" />
                          <span style={s.docFileName}>{existingCertPath.split("/").pop()}</span>
                        </div>
                      ) : (
                        <img
                          src={existingCertPath}
                          alt="Current certificate"
                          style={s.docImg}
                        />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FaCheckCircle size={11} color="#10b981" />
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                          Current document on file
                        </span>
                      </div>
                      <label className="dsa-replace-label" style={s.replaceLabel}>
                        <input
                          type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                          style={{ display: "none" }} onChange={handleCertUpload}
                        />
                        Click to replace document
                      </label>
                    </div>
                  ) : (
                    <label className="dsa-upload-area" style={s.docUploadArea}>
                      <input
                        type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                        style={{ display: "none" }} onChange={handleCertUpload}
                      />
                      <FaFileImage size={28} color="#94a3b8" />
                      <span style={s.docUploadText}>Click to upload document</span>
                      <span style={s.docUploadSub}>JPG, PNG, PDF · Max 5MB</span>
                    </label>
                  )}
                  {certError && <div style={{ fontSize: 11, color: "#dc2626" }}>{certError}</div>}
                </div>
              </Section>

              {/* ── RESET PASSWORD ── */}
              <Section title="Account Security" icon="🔑" subtitle="Reset this DSA's login password">
                {!showResetPanel ? (
                  <button style={s.backBtn} onClick={toggleResetPanel}>
                    <FaKey size={12} /> Reset Password
                  </button>
                ) : (
                  <div style={s.resetPanel}>
                    <div style={s.resetPanelHead}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FaKey size={13} color="#1e3a5f" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Set New Password</span>
                      </div>
                      <button style={s.resetPanelClose} onClick={toggleResetPanel}>
                        <FaTimes size={12} />
                      </button>
                    </div>

                    {resetError && <div style={{ ...s.errorBox, marginBottom: 0 }}>⚠️ {resetError}</div>}
                    {resetSuccess && <div style={{ ...s.successBox, marginBottom: 0 }}>✅ {resetSuccess}</div>}

                    <TwoCol>
                      <Field label="New Password">
                        <div style={s.inputWrap}>
                          <span style={s.inputIcon}><FaKey /></span>
                          <input
                            type={showPw ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{ ...s.input, paddingLeft: 42, paddingRight: 42 }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(p => !p)}
                            style={s.inputEyeBtn}
                          >
                            {showPw ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                          </button>
                        </div>
                      </Field>

                      <Field label="Confirm Password">
                        <InputEl
                          type={showPw ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          icon={<FaKey />}
                        />
                      </Field>
                    </TwoCol>

                    <button
                      onClick={handleResetPassword}
                      disabled={resetting}
                      style={{ ...s.btnSubmit, opacity: resetting ? 0.7 : 1, alignSelf: "flex-start" }}
                    >
                      <FaKey size={13} /> {resetting ? "Updating…" : "Confirm Reset"}
                    </button>
                  </div>
                )}
              </Section>

              {/* ── SUBMIT ── */}
              <div className="dsa-submit-row" style={s.submitRow}>
                <div style={s.submitNote}>
                  🔒 Changes are saved directly to this DSA&apos;s profile record.
                </div>
                <button
                  className="dsa-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ ...s.btnSubmit, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Saving…" : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dsa-setup-wrap {
          margin: -32px -36px 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dsa-spinner {
          animation: spin 0.8s linear infinite;
        }

        .dsa-back-btn:hover {
          border-color: #cbd5e1 !important;
          background: #f8fafc !important;
        }

        .dsa-submit-btn:not(:disabled):hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .dsa-submit-btn {
          transition: filter 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
        }

        .dsa-icon-btn:hover {
          background: #fee2e2 !important;
        }

        .dsa-upload-area:hover {
          border-color: #1e3a5f !important;
          background: #f1f5f9 !important;
        }

        .dsa-replace-label:hover {
          opacity: 0.75;
        }

        input:focus, select:focus, textarea:focus {
          border-color: #1e3a5f !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }

        @media (max-width: 900px) {
          .dsa-setup-wrap {
            margin: -20px -16px 0;
          }
          .dsa-setup-header {
            padding: 18px 16px 44px !important;
          }
          .dsa-setup-header-inner {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .dsa-header-right {
            text-align: left !important;
          }
          .dsa-setup-container {
            padding: 0 14px !important;
          }
          .dsa-setup-card {
            padding: 22px 18px !important;
          }
          .dsa-submit-row {
            flex-direction: column;
            align-items: stretch !important;
          }
          .dsa-submit-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .dsa-setup-card {
            padding: 18px 14px !important;
          }
          .dsa-setup-header {
            padding: 16px 14px 40px !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Section({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
        <div>
          <div style={s.sectionTitle}>{title}</div>
          <div style={s.sectionSub}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={s.twoCol}>{children}</div>;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
      {error && <span style={s.fieldError}>{error}</span>}
    </div>
  );
}

const InputEl = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }>(
  ({ icon, style, ...props }, ref) => (
    <div style={s.inputWrap}>
      {icon && <span style={s.inputIcon}>{icon}</span>}
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        {...props}
        style={{ ...s.input, paddingLeft: icon ? "42px" : "14px", ...style }}
      />
    </div>
  )
);
InputEl.displayName = "InputEl";

const SelectEl = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...props }, ref) => (
    <div style={s.inputWrap}>
      <select ref={ref as React.Ref<HTMLSelectElement>} {...props} style={s.select}>
        {children}
      </select>
      <span style={s.selectChevron}><FaChevronDown size={11} /></span>
    </div>
  )
);
SelectEl.displayName = "SelectEl";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: { background: "linear-gradient(135deg,#1e3a5f 0%,#1a4b7a 100%)", padding: "20px 24px 52px", borderRadius: "0 0 20px 20px" },
  headerInner: { maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12 },
  headerBrand: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon: { width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" },
  headerRight: { textAlign: "right" as const },
  stepBadge: { background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 6 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  container: { maxWidth: 860, margin: "-28px auto 48px", padding: "0 20px" },
  backBtn: { display: "flex", alignItems: "center", gap: 7, background: "#fff", color: "#475569", border: "1px solid #e2e8f0", padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer", fontWeight: 600, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "border-color 0.15s ease, background 0.15s ease" },

  noticeBanner: {
    display: "flex", alignItems: "flex-start", gap: 12,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 12, padding: "16px 20px", marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  card: { background: "#fff", borderRadius: 20, padding: "36px 40px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  successBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  section: { marginBottom: 36 },
  sectionHead: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #f1f5f9" },
  sectionTitle: { fontSize: 17, fontWeight: 800, color: "#1e293b" },
  sectionSub: { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px 22px" },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.01em" },
  fieldError: { fontSize: 12, color: "#dc2626" },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13, pointerEvents: "none" },
  inputEyeBtn: { position: "absolute" as const, right: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" },
  input: {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb",
    outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  select: {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "11px 36px 11px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb",
    outline: "none", appearance: "none" as const, WebkitAppearance: "none" as const,
    boxSizing: "border-box" as const, cursor: "pointer",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  selectChevron: { position: "absolute" as const, right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" as const },
  kycBanner: { display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 18 },
  docBanner: { display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 16 },
  docCard: { border: "1.5px dashed", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column" as const, gap: 12, transition: "border-color 0.15s ease, background 0.15s ease" },
  docCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  docLabel: { fontSize: 13, fontWeight: 700, color: "#1e293b" },
  docDesc: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  docRemove: { background: "#fef2f2", border: "none", color: "#ef4444", padding: "6px", borderRadius: 6, cursor: "pointer", transition: "background 0.15s ease" },
  docUploadArea: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "28px 12px", cursor: "pointer", transition: "border-color 0.15s ease, background 0.15s ease" },
  docUploadText: { fontSize: 14, fontWeight: 600, color: "#475569" },
  docUploadSub: { fontSize: 12, color: "#94a3b8" },
  docImg: { width: "100%", height: 110, objectFit: "cover" as const, borderRadius: 8, border: "1px solid #e2e8f0" },
  pdfPreview: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fef2f2", borderRadius: 8 },
  docFileName: { fontSize: 12, color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  replaceLabel: { fontSize: 12, fontWeight: 700, color: "#1e3a5f", cursor: "pointer", textDecoration: "underline", width: "fit-content", transition: "opacity 0.15s ease" },
  resetPanel: {
    display: "flex", flexDirection: "column" as const, gap: 16,
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14,
    padding: "18px 20px",
  },
  resetPanelHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  resetPanelClose: {
    background: "#fff", border: "1px solid #e2e8f0", color: "#64748b",
    width: 26, height: 26, borderRadius: 8, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  submitRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" as const, gap: 16 },
  submitNote: { fontSize: 13, color: "#94a3b8", maxWidth: 380 },
  btnSubmit: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "linear-gradient(135deg,#1e3a5f,#2d5986)",
    color: "#fff", border: "none", padding: "13px 32px",
    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
  loadingCenter: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "60px 0" },
  spinner: { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%" },
};