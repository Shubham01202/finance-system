// Path: frontend/src/app/ca/profile/setup/page.tsx
"use client";

import { useState, useEffect, forwardRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser, FaIdCard, FaBuilding, FaCalendarAlt,
  FaFileUpload, FaCheckCircle, FaShieldAlt,
  FaFilePdf, FaFileImage, FaTrash, FaUniversity, FaArrowLeft,
} from "react-icons/fa";
import CALayout from "../../../../components/layout/ca/CALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface CAProfileForm {
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

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CAProfileSetupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<CAProfileForm>({
    firm_name: "", membership_number: "", enrollment_date: "",
    pan_number: "", aadhaar_number: "", office_address: "",
    city: "", state: "", pincode: "",
  });

  const [certificate, setCertificate] = useState<UploadedFile | null>(null);
  const [existingCertPath, setExistingCertPath] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CAProfileForm, string>>>({});
  const [certError, setCertError]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [userName, setUserName]       = useState("CA");
  const [isEditMode, setIsEditMode]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }

    // Get user info
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}

    // Load existing profile (if any) and pre-fill the form.
    // NOTE: we intentionally do NOT redirect away when profile_completed is
    // true anymore — this page doubles as the "edit KYC / firm details" page,
    // so a completed profile should still be able to open and edit it here.
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const data = d.data || d; // support either {data: {...}} or flat shape
        const completed = d.profile_completed ?? data?.profile_completed;
        setIsEditMode(!!completed);

        if (data && (data.firm_name || data.membership_number)) {
          setFormData({
            firm_name:         data.firm_name         || "",
            membership_number: data.membership_number || "",
            enrollment_date:   data.enrollment_date    ? data.enrollment_date.split("T")[0] : "",
            pan_number:        data.pan_number         || "",
            aadhaar_number:    data.aadhaar_number     || "",
            office_address:    data.office_address     || "",
            city:              data.city               || "",
            state:             data.state              || "",
            pincode:           data.pincode            || "",
          });
          setExistingCertPath(data.certificate_path || "");
        }
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, []);

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

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    // Validate all fields
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
      // Backend's saveCaProfile handles both create AND update internally
      // (it checks for an existing row and does UPDATE vs INSERT accordingly),
      // and it's only wired up to POST — so we always POST here, whether this
      // is a first-time setup or an edit of an existing profile.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          pan_number: formData.pan_number.toUpperCase(),
          certificate: certificate ? { name: certificate.name, dataUrl: certificate.dataUrl } : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (isEditMode) {
          // Show a quick confirmation, then send them back to the profile
          // page so they can see the updated details.
          setSuccess("Profile updated successfully! Redirecting…");
          setTimeout(() => {
            router.push("/ca/profile");
          }, 1200);
        } else {
          router.push("/ca/dashboard");
        }
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
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      {pageLoading ? (
        <div style={s.card}>
          <div style={s.loadingCenter}>
            <div style={s.spinner} />
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading profile…</div>
          </div>
        </div>
      ) : (
        <div className="ca-setup-wrap">

          {/* ── HEADER ── */}
          <div className="ca-setup-header" style={s.header}>
            <div className="ca-setup-header-inner" style={s.headerInner}>
              <div style={s.headerBrand}>
                <div style={s.brandIcon}><FaUniversity size={18} color="#fff" /></div>
                <span style={s.brandName}>SN Finance Service</span>
              </div>
              <div className="ca-header-right" style={s.headerRight}>
                <div style={s.stepBadge}>{isEditMode ? "Edit Profile" : "Profile Setup Required"}</div>
                <div style={s.headerSub}>
                  {isEditMode
                    ? `Welcome back, ${userName.split(" ")[0]} — update your CA profile below`
                    : `Welcome, ${userName.split(" ")[0]} — complete your CA profile to continue`}
                </div>
              </div>
            </div>
          </div>

          <div className="ca-setup-container" style={s.container}>

            {/* ── BACK BUTTON (edit mode only) ── */}
            {isEditMode && (
              <button style={s.backBtn} onClick={() => router.push("/ca/profile")}>
                <FaArrowLeft size={12} /> Back to Profile
              </button>
            )}

            {/* ── NOTICE BANNER ── */}
            <div style={s.noticeBanner}>
              <FaShieldAlt size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1d4ed8" }}>
                  {isEditMode ? "Update CA Profile" : "One-time CA Profile Setup"}
                </div>
                <div style={{ fontSize: 13, color: "#3b82f6", marginTop: 3 }}>
                  Your ICAI membership details are required to apply loans on behalf of clients. This is verified and stored securely.
                </div>
              </div>
            </div>

            {/* ── FORM CARD ── */}
            <div className="ca-setup-card" style={s.card}>
              {error   && <div style={s.errorBox}>⚠️ {error}</div>}
              {success && <div style={s.successBox}>✅ {success}</div>}

              {/* ── FIRM DETAILS ── */}
              <Section title="Firm Details" icon="🏢" subtitle="Your CA firm information">
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
              <Section title="KYC Details" icon="🛡️" subtitle="Your personal identity verification">
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
              <Section title="Office Address" icon="📍" subtitle="Your registered CA office address">
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
              <Section title="CA Certificate / ICAI Proof" icon="📄" subtitle="Upload your ICAI membership certificate or practicing certificate">
                <div style={s.docBanner}>
                  <FaFileUpload size={15} color="#0369a1" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: "#0284c7" }}>
                    JPG, PNG, WEBP or PDF · Max 5MB · This document is stored securely and not shared publicly.
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
      src={`${process.env.NEXT_PUBLIC_API_URL}/${existingCertPath}`}
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

              {/* ── SUBMIT ── */}
              <div className="ca-submit-row" style={s.submitRow}>
                <div style={s.submitNote}>
                  🔒 Your information is encrypted and verified by our compliance team before activation.
                </div>
                <button
                  className="ca-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ ...s.btnSubmit, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Saving Profile…" : isEditMode ? "Save Changes" : "Save Profile & Continue →"}
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
    </CALayout>
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
   NOTE: page / sidebar / nav* / user* / logout* / main keys are consumed
   by CALayout + CASidebar. Everything else styles this page's own content.
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },

  /* consumed by CASidebar */
  sidebar: { width: 240, minHeight: "100vh", background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)", display: "flex", flexDirection: "column", padding: "24px 14px", top: 0, height: "100vh", flexShrink: 0 },
  logo:     { display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, paddingLeft: 6 },
  logoIcon: { width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" },
  caBadge:  { display: "flex", alignItems: "center", gap: 7, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "6px 12px", marginBottom: 16 },
  caBadgeText: { color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" },
  nav:      { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navLink:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", textAlign: "left" as const, width: "100%", transition: "background 0.15s", background: "transparent", color: "rgba(255,255,255,0.65)" },
  navLinkActive: { background: "rgba(255,255,255,0.15)", color: "#fff" },
  navLabel: {},
  sidebarUser: { display: "flex", alignItems: "center", gap: 10, padding: "14px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8 },
  avatarCircle: { width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userInfo: { overflow: "hidden" },
  userName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  logoutBtn:{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", color: "rgba(255,255,255,0.5)", background: "transparent", border: "none", borderRadius: 9, fontSize: 13, cursor: "pointer", marginTop: 4, width: "100%" },

  /* consumed by CALayout */
  main:     { flex: 1, padding: "32px 36px", overflowY: "auto" as const, minWidth: 0 },

  /* this page's own content */
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

/* ── STATES LIST ── */
const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];