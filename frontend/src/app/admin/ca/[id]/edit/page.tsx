// Path: frontend/src/app/admin/ca/[id]/edit/page.tsx
"use client";

import { useState, useEffect, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaIdCard, FaBuilding, FaCalendarAlt,
  FaFileUpload, FaCheckCircle, FaShieldAlt,
  FaFilePdf, FaFileImage, FaTrash, FaUniversity, FaArrowLeft,FaUser,
FaEnvelope,
FaPhone,
FaKey,
FaEye,
FaEyeSlash,
FaTimes,
} from "react-icons/fa";
import AdminLayout from "./../../../../../components/layout/admin/AdminLayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface CAProfileForm {
      full_name: string;
  email: string;
  mobile: string;
  firm_name: string;
  membership_number: string;
  enrollment_date: string;
  pan_number: string;
  aadhaar_number: string;
  office_address: string;
  city: string;
  state: string;
  pincode: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const EMPTY_FORM: CAProfileForm = {
  full_name: "", email: "", mobile: "",
  firm_name: "", membership_number: "", enrollment_date: "",
  pan_number: "", aadhaar_number: "", office_address: "",
  city: "", state: "", pincode: "",
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function AdminEditCAProfilePage() {
  const router = useRouter();
  const params = useParams();
  const caId = params.id as string;

  const [caUserName, setCaUserName] = useState("");
  const [caEmail, setCaEmail] = useState("");
  const [formData, setFormData] = useState<CAProfileForm>(EMPTY_FORM);

  const [certificate, setCertificate] = useState<UploadedFile | null>(null);
  const [existingCertPath, setExistingCertPath] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CAProfileForm, string>>>({});
  const [certError, setCertError]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [adminName, setAdminName]     = useState("Admin");
  const [notFound, setNotFound]       = useState(false);

  // Reset password panel state
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw]                 = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [resetError, setResetError]         = useState("");
  const [resetSuccess, setResetSuccess]     = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const loadCA = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") {
          router.push("/");
          return;
        }
        setAdminName(user.full_name || "Admin");

        const res = await fetch(`${API}/api/admin/ca/${caId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          setNotFound(true);
          setError(result.message || "Unable to load this CA's profile.");
          return;
        }

        const data = result.data;

        setCaUserName(data.full_name || data.name || "");
        setCaEmail(data.email || "");

      setFormData({
  full_name: data.full_name || "",
  email: data.email || "",
  mobile: data.mobile || "",

  firm_name: data.firm_name || "",
  membership_number: data.membership_number || "",
  enrollment_date: data.enrollment_date
    ? data.enrollment_date.split("T")[0]
    : "",
  pan_number: data.pan_number || "",
  aadhaar_number: data.aadhaar_number || "",
  office_address: data.office_address || "",
  city: data.city || "",
  state: data.state || "",
  pincode: data.pincode || "",
});

        setExistingCertPath(data.certificate_path || "");
      } catch (err) {
        console.error(err);
        setError("Server error while loading CA profile.");
        setNotFound(true);
      } finally {
        setPageLoading(false);
      }
    };

    if (caId) loadCA();
  }, [caId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  /* ── VALIDATORS ── */
  const validators: Partial<Record<keyof CAProfileForm, (v: string) => string>> = {
    firm_name:         v => v.trim().length < 3 ? "Min 3 characters" : "",
    membership_number: v => v.trim().length < 3 ? "Enter valid membership number" : "",
    pan_number:        v => !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Invalid PAN format" : "",
    aadhaar_number:    v => !/^\d{12}$/.test(v) ? "Must be 12 digits" : "",
    pincode:           v => !/^\d{6}$/.test(v) ? "Must be 6 digits" : "",
    enrollment_date:   v => !v ? "Required" : "",
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof CAProfileForm;
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

     const res = await fetch(`${API}/api/admin/users/${caId}/reset-password`, {
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

  /* ── SUBMIT (admin saving another CA's profile) ── */
  const handleSubmit = async () => {
    const newErrors: Partial<Record<keyof CAProfileForm, string>> = {};
    let hasError = false;

    (Object.keys(formData) as (keyof CAProfileForm)[]).forEach(key => {
      const value = formData[key];
      if (!value || value.trim() === "") {
        newErrors[key] = "This field is required"; hasError = true;
      } else {
        const v = validators[key];
        if (v) { const msg = v(value); if (msg) { newErrors[key] = msg; hasError = true; } }
      }
    });

    setFieldErrors(newErrors);
    if (hasError) { setError("Please fix all errors before submitting."); setSuccess(""); return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }

    setLoading(true); setError(""); setSuccess("");

    try {
      // Admin-scoped update — targets the CA by :id, unlike the CA's own
      // self-service POST /api/ca/profile which infers the CA from the token.
      const res = await fetch(`${API}/api/admin/ca/${caId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          pan_number: formData.pan_number.toUpperCase(),
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
            <div style={s.spinner} />
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading CA profile…</div>
          </div>
        </div>
      ) : notFound ? (
        <div style={s.card}>
          <div style={s.errorBox}>⚠️ {error || "CA profile not found."}</div>
          <button style={s.backBtn} onClick={() => router.push("/admin/users")}>
            <FaArrowLeft size={12} /> Back to Users
          </button>
        </div>
      ) : (
        <div className="ca-setup-wrap">

          {/* ── HEADER ── */}
          <div className="ca-setup-header" style={s.header}>
            <div className="ca-setup-header-inner" style={s.headerInner}>
              <div style={s.headerBrand}>
                <div style={s.brandIcon}><FaUniversity size={18} color="#fff" /></div>
                <span style={s.brandName}>SN Finance Service · Admin</span>
              </div>
              <div className="ca-header-right" style={s.headerRight}>
                <div style={s.stepBadge}>Editing CA Profile</div>
                <div style={s.headerSub}>
                  {caUserName || caEmail
                    ? `Editing ${caUserName || caEmail}'s CA profile`
                    : "Editing CA profile"}
                </div>
              </div>
            </div>
          </div>

          <div className="ca-setup-container" style={s.container}>

            <button style={s.backBtn} onClick={() => router.push("/admin/users")}>
              <FaArrowLeft size={12} /> Back to Users
            </button>

            {/* ── NOTICE BANNER ── */}
            <div style={s.noticeBanner}>
              <FaShieldAlt size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1d4ed8" }}>
                  Admin Edit — CA Profile
                </div>
                <div style={{ fontSize: 13, color: "#3b82f6", marginTop: 3 }}>
                  You are editing this CA&apos;s ICAI membership and KYC details on their behalf.
                </div>
              </div>
            </div>

            {/* ── FORM CARD ── */}
            <div className="ca-setup-card" style={s.card}>
              {error   && <div style={s.errorBox}>⚠️ {error}</div>}
              {success && <div style={s.successBox}>✅ {success}</div>}

              {/* ── USER DETAILS ── */}
<Section
  title="User Details"
  icon="👤"
  subtitle="Basic account information"
>
  <TwoCol>
    <Field label="Full Name" required>
      <InputEl
        name="full_name"
        placeholder="Full Name"
        value={formData.full_name}
        onChange={handleChange}
        icon={<FaUser />}
      />
    </Field>

    <Field label="Email" required>
      <InputEl
        name="email"
        type="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
        icon={<FaEnvelope />}
      />
    </Field>

    <Field label="Mobile" required>
      <InputEl
        name="mobile"
        placeholder="10-digit Mobile Number"
        value={formData.mobile}
        onChange={handleChange}
        icon={<FaPhone />}
      />
    </Field>
  </TwoCol>
</Section>

              {/* ── FIRM DETAILS ── */}
              <Section title="Firm Details" icon="🏢" subtitle="CA firm information">
                <TwoCol>
                  <Field label="CA Firm Name" required error={fieldErrors.firm_name}>
                    <InputEl
                      name="firm_name" placeholder="e.g. Sharma & Associates"
                      value={formData.firm_name} onChange={handleChange}
                      icon={<FaBuilding />}
                    />
                  </Field>
                  <Field label="ICAI Membership Number" required error={fieldErrors.membership_number}>
                    <InputEl
                      name="membership_number" placeholder="e.g. 123456"
                      value={formData.membership_number} onChange={handleChange}
                      icon={<FaIdCard />}
                    />
                  </Field>
                  <Field label="Date of Enrollment" required error={fieldErrors.enrollment_date}>
                    <InputEl
                      name="enrollment_date" type="date"
                      value={formData.enrollment_date} onChange={handleChange}
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
                    PAN and Aadhaar are required for RBI compliance verification.
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
              <Section title="Office Address" icon="📍" subtitle="Registered CA office address">
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
                    <SelectEl name="state" value={formData.state} onChange={handleChange}>
                      <option value="">Select State</option>
                      {indianStates.map(st => <option key={st} value={st}>{st}</option>)}
                    </SelectEl>
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
              <Section title="CA Certificate / ICAI Proof" icon="📄" subtitle="ICAI membership or practicing certificate">
                <div style={s.docBanner}>
                  <FaFileUpload size={15} color="#0369a1" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: "#0284c7" }}>
                    JPG, PNG, WEBP or PDF · Max 5MB · Stored securely and not shared publicly.
                  </div>
                </div>

                <div style={{
                  ...s.docCard,
                  borderColor: certError ? "#fca5a5" : certificate ? "#86efac" : "#d1d5db",
                  background:  certificate ? "#f0fdf4" : "#fff",
                }}>
                  <div style={s.docCardTop}>
                    <div>
                      <div style={s.docLabel}>CA Certificate / ICAI Membership Proof</div>
                      <div style={s.docDesc}>Practicing certificate or ICAI membership document</div>
                    </div>
                    {certificate && (
                      <button style={s.docRemove} onClick={() => setCertificate(null)}>
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
                          Current certificate on file
                        </span>
                      </div>
                      <label style={s.replaceLabel}>
                        <input
                          type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                          style={{ display: "none" }} onChange={handleCertUpload}
                        />
                        Click to replace certificate
                      </label>
                    </div>
                  ) : (
                    <label style={s.docUploadArea}>
                      <input
                        type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                        style={{ display: "none" }} onChange={handleCertUpload}
                      />
                      <FaFileImage size={28} color="#94a3b8" />
                      <span style={s.docUploadText}>Click to upload certificate</span>
                      <span style={s.docUploadSub}>JPG, PNG, PDF · Max 5MB</span>
                    </label>
                  )}
                  {certError && <div style={{ fontSize: 11, color: "#dc2626" }}>{certError}</div>}
                </div>
              </Section>

              {/* ── RESET PASSWORD ── */}
              <Section title="Account Security" icon="🔑" subtitle="Reset this CA's login password">
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
              <div className="ca-submit-row" style={s.submitRow}>
                <div style={s.submitNote}>
                  🔒 Changes are saved directly to this CA&apos;s profile record.
                </div>
                <button
                  className="ca-submit-btn"
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
        .ca-setup-wrap {
          margin: -32px -36px 0;
        }

        @media (max-width: 900px) {
          .ca-setup-wrap {
            margin: -20px -16px 0;
          }
          .ca-setup-header {
            padding: 18px 16px 44px !important;
          }
          .ca-setup-header-inner {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .ca-header-right {
            text-align: left !important;
          }
          .ca-setup-container {
            padding: 0 14px !important;
          }
          .ca-setup-card {
            padding: 22px 18px !important;
          }
          .ca-submit-row {
            flex-direction: column;
            align-items: stretch !important;
          }
          .ca-submit-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .ca-setup-card {
            padding: 18px 14px !important;
          }
          .ca-setup-header {
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
    <select ref={ref as React.Ref<HTMLSelectElement>} {...props} style={s.select}>
      {children}
    </select>
  )
);
SelectEl.displayName = "SelectEl";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header:    { background: "linear-gradient(135deg,#1e3a5f 0%,#1a4b7a 100%)", padding: "20px 24px 52px", borderRadius: "0 0 20px 20px" },
  headerInner: { maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12 },
  headerBrand: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon:   { width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  brandName:   { color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" },
  headerRight: { textAlign: "right" as const },
  stepBadge:   { background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 6 },
  headerSub:   { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  container:   { maxWidth: 860, margin: "-28px auto 48px", padding: "0 20px" },
  backBtn:     { display: "flex", alignItems: "center", gap: 7, background: "#fff", color: "#475569", border: "1px solid #e2e8f0", padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer", fontWeight: 600, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },

  noticeBanner: {
    display: "flex", alignItems: "flex-start", gap: 12,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 12, padding: "16px 20px", marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  card:      { background: "#fff", borderRadius: 20, padding: "36px 40px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  errorBox:  { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  successBox:{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  section:   { marginBottom: 36 },
  sectionHead:  { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #f1f5f9" },
  sectionTitle: { fontSize: 17, fontWeight: 800, color: "#1e293b" },
  sectionSub:   { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  twoCol:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px 22px" },
  field:     { display: "flex", flexDirection: "column" as const, gap: 6 },
  fieldLabel:{ fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.01em" },
  fieldError:{ fontSize: 12, color: "#dc2626" },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13, pointerEvents: "none" },
  inputEyeBtn: { position: "absolute" as const, right: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" },
  input: {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb",
    outline: "none", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb",
    outline: "none", appearance: "auto", boxSizing: "border-box" as const,
  },
  kycBanner: { display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 18 },
  docBanner: { display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 16 },
  docCard:   { border: "1.5px dashed", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column" as const, gap: 12 },
  docCardTop:{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  docLabel:  { fontSize: 13, fontWeight: 700, color: "#1e293b" },
  docDesc:   { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  docRemove: { background: "#fef2f2", border: "none", color: "#ef4444", padding: "6px", borderRadius: 6, cursor: "pointer" },
  docUploadArea: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "28px 12px", cursor: "pointer" },
  docUploadText: { fontSize: 14, fontWeight: 600, color: "#475569" },
  docUploadSub:  { fontSize: 12, color: "#94a3b8" },
  docImg:    { width: "100%", height: 110, objectFit: "cover" as const, borderRadius: 8, border: "1px solid #e2e8f0" },
  pdfPreview:{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fef2f2", borderRadius: 8 },
  docFileName:{ fontSize: 12, color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  replaceLabel: { fontSize: 12, fontWeight: 700, color: "#1e3a5f", cursor: "pointer", textDecoration: "underline", width: "fit-content" },
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
  submitNote:{ fontSize: 13, color: "#94a3b8", maxWidth: 380 },
  btnSubmit: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "linear-gradient(135deg,#1e3a5f,#2d5986)",
    color: "#fff", border: "none", padding: "13px 32px",
    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
  loadingCenter: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "60px 0" },
  spinner: { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];