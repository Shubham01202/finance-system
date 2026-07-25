// Path: frontend/src/app/ca/loans/[id]/edit/page.tsx
"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaUser, FaEnvelope, FaPhone, FaBuilding, FaMoneyBillWave,
  FaCalendarAlt, FaFilePdf, FaFileImage, FaTrash, FaUpload,
  FaLock, FaEye, FaArrowLeft, FaUserTie, FaIdCard, FaRegIdCard,
} from "react-icons/fa";
import CALayout from "../../../../../components/layout/ca/CALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface FormData {
  full_name: string;
  email: string;
  mobile: string;
  dob: string;
  employment_type: string;
  annual_income: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bank_id: string;
  loan_service: string;
  loan_amount: string;
  tenure: string;
  loan_purpose: string;
  vehicle_details: string;
  co_applicant_name: string;
  co_applicant_aadhaar: string;
  co_applicant_pan: string;
}

// A document already saved on the server (loaded on page open)
interface ExistingFile {
  name: string;
  url: string;       // could be a dataUrl OR a server path, we normalize below
  uploadedAt?: string;
}

// A file freshly picked in this session, not yet saved
interface PendingFile {
  name: string; size: number; type: string;
  dataUrl: string; uploadedAt: string;
}

type DocKey =
  | "aadhaar_card" | "pan_card" | "bank_statement" | "passport_photo"
  | "co_applicant_kyc" | "salary_slip" | "itr_3years";

const DOC_KEYS: DocKey[] = [
  "aadhaar_card", "pan_card", "bank_statement", "passport_photo",
  "co_applicant_kyc", "salary_slip", "itr_3years",
];

const DOC_LABELS: Record<DocKey, string> = {
  aadhaar_card: "Aadhaar Card",
  pan_card: "PAN Card",
  bank_statement: "Bank Statement",
  passport_photo: "Passport Photo",
  co_applicant_kyc: "Co-Applicant KYC",
  salary_slip: "Salary Slip",
  itr_3years: "ITR (3 Years)",
};

const LOAN_SERVICES = [
  { value: "personal_loan",         label: "Personal Loan"         },
  { value: "home_loan",             label: "Home Loan"             },
  { value: "business_loan",         label: "Business Loan"         },
  { value: "working_capital_loan",  label: "Working Capital Loan"  },
  { value: "loan_against_property", label: "Loan Against Property" },
  { value: "vehicle_loan",          label: "Vehicle Loan"          },
];

const isPdfByNameOrType = (name?: string, type?: string) =>
  (type ? type === "application/pdf" : false) || (name ? name.toLowerCase().endsWith(".pdf") : false);

/* ─────────────────────────────────────────────
   HELPER: normalize whatever shape the backend
   sends "documents" in, into Record<DocKey, ExistingFile>.
───────────────────────────────────────────── */
function normalizeDocuments(raw: any): Partial<Record<DocKey, ExistingFile>> {
  const result: Partial<Record<DocKey, ExistingFile>> = {};
  if (!raw) return result;

  const extract = (obj: any): ExistingFile | null => {
    if (!obj || typeof obj !== "object") return null;
    const url =
      obj.dataUrl || obj.url || obj.filePath || obj.file_path ||
      obj.path || obj.fileUrl || obj.file_url || "";
    const name =
      obj.name || obj.file_name || obj.filename || obj.fileName ||
      (typeof url === "string" && !url.startsWith("data:") ? url.split("/").pop() : "") ||
      "Document";
    if (!url) return null;
    return { name, url, uploadedAt: obj.uploadedAt || obj.uploaded_at || obj.createdAt };
  };

  if (Array.isArray(raw)) {
    raw.forEach((item: any) => {
      const key = (item.doc_type || item.key || item.type || item.docKey || "") as DocKey;
      if (!key) return;
      const doc = extract(item);
      if (doc) result[key] = doc;
    });
    return result;
  }

  if (typeof raw === "object") {
    Object.entries(raw).forEach(([key, value]) => {
      if (typeof value === "string") {
        if (value) result[key as DocKey] = { name: value.split("/").pop() || "Document", url: value };
        return;
      }
      const doc = extract(value);
      if (doc) result[key as DocKey] = doc;
    });
  }

  return result;
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CAEditPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params?.id as string;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [banks, setBanks]       = useState<any[]>([]);
  const [userName, setUserName] = useState("CA");
  const [caInfo, setCaInfo]     = useState({ name: "", firm: "" });

  const inputsRef = useRef<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)[]>([]);
  const setRef    = (i: number) =>
    (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null): void => {
      inputsRef.current[i] = el;
    };

  const [formData, setFormData] = useState<FormData>({
    full_name: "", email: "", mobile: "", dob: "",
    employment_type: "", annual_income: "",
    address: "", city: "", state: "", pincode: "",
    bank_id: "", loan_service: "", loan_amount: "",
    tenure: "", loan_purpose: "", vehicle_details: "",
    co_applicant_name: "", co_applicant_aadhaar: "", co_applicant_pan: "",
  });

  // Documents already on the server, loaded when the page opens
  const [existingDocuments, setExistingDocuments] = useState<Partial<Record<DocKey, ExistingFile>>>({});
  // Documents freshly picked in this session to replace an existing one (not yet saved)
  const [documents, setDocuments] = useState<Partial<Record<DocKey, PendingFile>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}
    fetchApplication(token);
    fetchBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchApplication = async (token: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/loans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();

      console.log("[CA EditPage] full application response:", data);

      if (data.success) {
        const app = data.data;

        const rawDocs =
          app.documents ?? app.documents_data ?? app.uploaded_documents ??
          app.docs ?? app.files ?? null;
        console.log("[CA EditPage] raw documents field:", rawDocs);

        const normalized = normalizeDocuments(rawDocs);
        console.log("[CA EditPage] normalized documents:", normalized);
        setExistingDocuments(normalized);

        if (app.status !== "pending") {
          router.push(`/ca/loans/${id}`);
          return;
        }

        setCaInfo({ name: app.ca_name || "", firm: app.ca_firm || "" });

        setFormData({
          full_name:            app.full_name            || "",
          email:                app.email                || "",
          mobile:               app.mobile               || "",
          dob:                  app.dob ? app.dob.split("T")[0] : "",
          employment_type:      app.employment_type      || "",
          annual_income:        app.annual_income        ? String(app.annual_income) : "",
          address:              app.address              || "",
          city:                 app.city                 || "",
          state:                app.state                || "",
          pincode:              app.pincode              || "",
          bank_id:              app.bank_id              || "",
          loan_service:         app.loan_type            || "",
          loan_amount:          app.loan_amount          ? String(app.loan_amount) : "",
          tenure:               app.tenure               || "",
          loan_purpose:         app.loan_purpose         || "",
          vehicle_details:      app.vehicle_details      || "",
          co_applicant_name:    app.co_applicant_name    || "",
          co_applicant_aadhaar: app.co_applicant_aadhaar || "",
          co_applicant_pan:     app.co_applicant_pan     || "",
        });
      } else {
        setError(data.message || "Failed to load application.");
      }
    } catch (err) {
      console.error("[CA EditPage] fetchApplication error:", err);
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/banks`);
      const data = await res.json();
      if (data.success) setBanks(data.data);
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setFieldErrors(p => ({ ...p, [name]: "" }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") { e.preventDefault(); inputsRef.current[index + 1]?.focus(); }
  };

  /* ── DOCUMENT UPLOAD (replace) ── */
  const handleDocUpload = (key: DocKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(p => ({
        ...p,
        [key]: {
          name: file.name, size: file.size, type: file.type,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        },
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeDoc = (key: DocKey) => {
    setDocuments(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const dataUrlToBlobUrl = (dataUrl: string): string => {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  };

  const openDoc = (url: string) => {
    if (!url) {
      alert("This document could not be opened — no file data found.");
      return;
    }

    try {
      if (url.startsWith("data:")) {
        const blobUrl = dataUrlToBlobUrl(url);
        const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          alert("Popup blocked. Please allow popups for this site to view documents.");
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }

      const fullUrl =
        url.startsWith("http") || url.startsWith("blob:")
          ? url
          : `${process.env.NEXT_PUBLIC_API_URL}${url.startsWith("/") ? url : `/${url}`}`;
      const win = window.open(fullUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        alert("Popup blocked. Please allow popups for this site to view documents.");
      }
    } catch (err) {
      console.error("[CA EditPage] openDoc error:", err);
      alert("Could not open this document.");
    }
  };

  /* ── VALIDATE ── */
  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.full_name)       errors.full_name       = "Required";
    if (!formData.email)           errors.email           = "Required";
    if (!formData.mobile)          errors.mobile          = "Required";
    if (!formData.employment_type) errors.employment_type = "Required";
    if (!formData.loan_amount)     errors.loan_amount     = "Required";
    if (!formData.tenure)          errors.tenure          = "Required";
    if (!formData.bank_id)         errors.bank_id         = "Required";
    if (Number(formData.loan_amount) < 10000) errors.loan_amount = "Minimum ₹10,000";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    if (!validate()) { setError("Please fix the errors below."); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setSaving(true); setError(""); setSuccess("");

    const mergedDocumentPayload: Record<string, { name: string; uploadedAt?: string; dataUrl?: string; url?: string }> = {};

    Object.entries(existingDocuments).forEach(([key, doc]) => {
      if (doc) mergedDocumentPayload[key] = { name: doc.name, uploadedAt: doc.uploadedAt, url: doc.url };
    });
    Object.entries(documents).forEach(([key, file]) => {
      if (file) mergedDocumentPayload[key] = { name: file.name, uploadedAt: file.uploadedAt, dataUrl: file.dataUrl };
    });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/loans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          loan_service: formData.loan_service,
          documents: Object.keys(mergedDocumentPayload).length > 0 ? mergedDocumentPayload : undefined,
        }),
      });
      const data = await res.json();
      console.log("[CA EditPage] save response:", data);

      if (res.status === 400 && data.message?.includes("pending")) {
        setError("This application can no longer be edited.");
        setTimeout(() => router.push(`/ca/loans/${id}`), 2000);
        return;
      }
      if (data.success) {
        setSuccess("Application updated successfully!");
        setExistingDocuments(normalizeDocuments(mergedDocumentPayload));
        setDocuments({});
        setTimeout(() => router.push(`/ca/loans/${id}`), 1500);
      } else {
        setError(data.message || "Update failed.");
      }
    } catch (err) {
      console.error("[CA EditPage] handleSubmit error:", err);
      setError("Server error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/");
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  const calcEMI = (p: number, r: number, y: number) => {
    const mr = r / 12 / 100, n = y * 12;
    const emi = (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    return isNaN(emi) ? "—" : Math.round(emi).toLocaleString("en-IN");
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="ca-edit-wrap">

        {/* Top Bar */}
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => router.push(`/ca/loans/${id}`)}>
            <FaArrowLeft size={12} /> Back to View
          </button>
          <h1 style={s.pageTitle}>Edit Application</h1>
          <div style={s.pageSub}>
            ID: <span style={{ fontFamily: "monospace", color: "#1e3a5f" }}>#{id?.slice(0, 8).toUpperCase()}</span>
            &nbsp;·&nbsp;
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>Pending — Editable</span>
          </div>
        </div>

        {/* CA Filing Info Banner */}
        <div style={s.caNotice}>
          <FaUserTie size={14} color="#92400e" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#92400e" }}>
            <strong>CA Filing Mode</strong> — Changes made by <strong>{caInfo.name || userName}</strong>
            {caInfo.firm ? ` · ${caInfo.firm}` : ""}. Your CA details remain linked to this application.
          </div>
        </div>

        {/* KYC Lock Notice */}
        <div style={s.lockNotice}>
          <FaLock size={13} color="#92400e" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#92400e" }}>
            <strong>Aadhaar and PAN numbers cannot be edited</strong> after submission for security and compliance reasons. You may still replace the uploaded document images below.
          </div>
        </div>

        {error   && <div style={s.errorBox}>⚠️ {error}</div>}
        {success && <div style={s.successBox}>✅ {success}</div>}

        {loading ? (
          <div style={s.center}><div style={s.spinner} /><div style={s.mutedText}>Loading…</div></div>
        ) : (
          <div style={s.formCard} className="ca-form-card">

            {/* ── SECTION 1: Customer Personal ── */}
            <Section title="Customer Personal Details" icon="👤" subtitle="Update basic applicant information">
              <TwoCol>
                <Field label="Full Name" required error={fieldErrors.full_name}>
                  <InputEl ref={setRef(0)} onKeyDown={e => handleKeyDown(e, 0)} name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Full name" icon={<FaUser />} />
                </Field>
                <Field label="Date of Birth" error={fieldErrors.dob}>
                  <InputEl ref={setRef(1)} onKeyDown={e => handleKeyDown(e, 1)} name="dob" type="date" value={formData.dob} onChange={handleChange} icon={<FaCalendarAlt />} />
                </Field>
                <Field label="Email Address" required error={fieldErrors.email}>
                  <InputEl ref={setRef(2)} onKeyDown={e => handleKeyDown(e, 2)} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" icon={<FaEnvelope />} />
                </Field>
                <Field label="Mobile Number" required error={fieldErrors.mobile}>
                  <InputEl ref={setRef(3)} onKeyDown={e => handleKeyDown(e, 3)} name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10-digit mobile" maxLength={10} icon={<FaPhone />} />
                </Field>
              </TwoCol>
            </Section>

            {/* ── SECTION 2: Employment & Address ── */}
            <Section title="Employment & Address" icon="💼" subtitle="Update employment and residential details">
              <TwoCol>
                <Field label="Employment Type" required error={fieldErrors.employment_type}>
                  <SelectEl ref={setRef(4)} name="employment_type" value={formData.employment_type} onChange={handleChange}>
                    <option value="">Select type</option>
                    <option value="salaried">Salaried</option>
                    <option value="business">Business / Self Employed</option>
                  </SelectEl>
                </Field>
                <Field label="Annual Income (₹)" error={fieldErrors.annual_income}>
                  <InputEl ref={setRef(5)} onKeyDown={e => handleKeyDown(e, 5)} name="annual_income" value={formData.annual_income} onChange={handleChange} placeholder="Annual income" icon={<FaMoneyBillWave />} />
                </Field>
              </TwoCol>
              <Field label="Full Address" error={fieldErrors.address}>
                <textarea ref={setRef(6)} name="address" value={formData.address} onChange={handleChange}
                  placeholder="House/Flat No, Street, Area" rows={3}
                  style={{ ...s.input, height: "auto", resize: "vertical", paddingLeft: 14 }}
                />
              </Field>
              <TwoCol>
                <Field label="City" error={fieldErrors.city}>
                  <InputEl ref={setRef(7)} onKeyDown={e => handleKeyDown(e, 7)} name="city" value={formData.city} onChange={handleChange} placeholder="City" icon={<FaBuilding />} />
                </Field>
                <Field label="State" error={fieldErrors.state}>
                  <SelectEl ref={setRef(8)} name="state" value={formData.state} onChange={handleChange}>
                    <option value="">Select State</option>
                    {indianStates.map(st => <option key={st} value={st}>{st}</option>)}
                  </SelectEl>
                </Field>
                <Field label="Pincode" error={fieldErrors.pincode}>
                  <InputEl ref={setRef(9)} onKeyDown={e => handleKeyDown(e, 9)} name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" maxLength={6} icon={<FaBuilding />} />
                </Field>
              </TwoCol>
            </Section>

            {/* ── SECTION 3: Co-Applicant ── */}
            <Section title="Co-Applicant Details" icon="👥" subtitle="Update co-applicant information if applicable">
              <TwoCol>
                <Field label="Co-Applicant Name" error={fieldErrors.co_applicant_name}>
                  <InputEl ref={setRef(10)} onKeyDown={e => handleKeyDown(e, 10)} name="co_applicant_name" value={formData.co_applicant_name} onChange={handleChange} placeholder="Co-applicant name" icon={<FaUser />} />
                </Field>
                <Field label="Co-Applicant Aadhaar" error={fieldErrors.co_applicant_aadhaar}>
                  <InputEl ref={setRef(11)} onKeyDown={e => handleKeyDown(e, 11)} name="co_applicant_aadhaar" value={formData.co_applicant_aadhaar} onChange={handleChange} placeholder="12-digit Aadhaar" maxLength={12} icon={<FaUser />} />
                </Field>
                <Field label="Co-Applicant PAN" error={fieldErrors.co_applicant_pan}>
                  <InputEl ref={setRef(12)} onKeyDown={e => handleKeyDown(e, 12)} name="co_applicant_pan" value={formData.co_applicant_pan} onChange={handleChange} placeholder="PAN number" maxLength={10} icon={<FaUser />} />
                </Field>
              </TwoCol>
            </Section>

            {/* ── SECTION 4: Loan Details ── */}
            <Section title="Loan Details" icon="💰" subtitle="Update loan service and amount">
              <Field label="Loan Service" required error={fieldErrors.loan_service}>
                <SelectEl name="loan_service" value={formData.loan_service} onChange={handleChange}>
                  <option value="">Select loan service</option>
                  {LOAN_SERVICES.map(ls => <option key={ls.value} value={ls.value}>{ls.label}</option>)}
                </SelectEl>
              </Field>
              <TwoCol>
                <Field label="Select Bank" required error={fieldErrors.bank_id}>
                  <SelectEl ref={setRef(13)} name="bank_id" value={formData.bank_id} onChange={handleChange}>
                    <option value="">Choose a bank</option>
                    {banks.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                  </SelectEl>
                </Field>
                <Field label="Loan Amount (₹)" required error={fieldErrors.loan_amount}>
                  <InputEl ref={setRef(14)} onKeyDown={e => handleKeyDown(e, 14)} name="loan_amount" value={formData.loan_amount} onChange={handleChange} placeholder="Min ₹10,000" icon={<FaMoneyBillWave />} />
                </Field>
                <Field label="Loan Tenure" required error={fieldErrors.tenure}>
                  <SelectEl ref={setRef(15)} name="tenure" value={formData.tenure} onChange={handleChange}>
                    <option value="">Select tenure</option>
                    <option value="1">1 Year</option><option value="2">2 Years</option>
                    <option value="3">3 Years</option><option value="5">5 Years</option>
                    <option value="7">7 Years</option><option value="10">10 Years</option>
                    <option value="15">15 Years</option><option value="20">20 Years</option>
                  </SelectEl>
                </Field>
                {formData.loan_service === "vehicle_loan" && (
                  <Field label="Vehicle Details" error={fieldErrors.vehicle_details}>
                    <InputEl ref={setRef(16)} onKeyDown={e => handleKeyDown(e, 16)} name="vehicle_details" value={formData.vehicle_details} onChange={handleChange} placeholder="Make, Model, Year" icon={<FaBuilding />} />
                  </Field>
                )}
              </TwoCol>

              {/* EMI Preview */}
              {formData.loan_amount && formData.tenure && Number(formData.loan_amount) >= 10000 && (
                <div style={s.emiBox}>
                  <div style={s.emiTitle}>📊 Updated Loan Summary</div>
                  <div className="ca-emi-grid" style={s.emiGrid}>
                    <EmiItem label="Amount"  value={fmt(Number(formData.loan_amount))} />
                    <EmiItem label="Tenure"  value={`${formData.tenure} Year${Number(formData.tenure) > 1 ? "s" : ""}`} />
                    <EmiItem label="Est. EMI @ 12% p.a." value={`₹${calcEMI(Number(formData.loan_amount), 12, Number(formData.tenure))}`} highlight />
                  </div>
                </div>
              )}
            </Section>

            {/* ── SECTION 5: Documents ── */}
            <Section title="Documents" icon="📄" subtitle="View uploaded documents, or replace any of them">
              <div style={s.docNotice}>
                ℹ️ Click <strong>View</strong> to open a document, or <strong>Replace</strong> to upload a new file for that slot. Anything you don't touch stays as-is.
              </div>
              <div className="ca-doc-grid" style={s.docGrid}>
                {DOC_KEYS.map(key => {
                  const pendingReplacement = documents[key];
                  const existing = existingDocuments[key];

                  const displayName = pendingReplacement?.name || existing?.name;
                  const displayUrl  = pendingReplacement?.dataUrl || existing?.url;
                  const displayType = pendingReplacement?.type;
                  const hasDoc      = Boolean(displayName && displayUrl);

                  const isKycKey = key === "aadhaar_card" || key === "pan_card";

                  return (
                    <div
                      key={key}
                      style={{
                        ...s.docCard,
                        borderColor: pendingReplacement ? "#fbbf24" : hasDoc ? "#86efac" : "#e2e8f0",
                        background: pendingReplacement ? "#fffbeb" : hasDoc ? "#f0fdf4" : "#fff",
                      }}
                    >
                      <div style={s.docLabel}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isKycKey && (key === "aadhaar_card"
                            ? <FaIdCard size={13} color="#059669" />
                            : <FaRegIdCard size={13} color="#0284c7" />)}
                          {DOC_LABELS[key]}
                        </span>
                        {pendingReplacement && <span style={s.replacePill}>New file selected</span>}
                      </div>

                      {hasDoc ? (
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isPdfByNameOrType(displayName, displayType)
                              ? <FaFilePdf size={16} color="#ef4444" />
                              : <FaFileImage size={16} color="#6366f1" />
                            }
                            <span style={{ fontSize: 12.5, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {displayName}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                            <button type="button" style={s.viewBtn} onClick={() => openDoc(displayUrl!)}>
                              <FaEye size={11} /> View
                            </button>

                            {!pendingReplacement && (
                              <label style={s.replaceBtn}>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                                  style={{ display: "none" }}
                                  onChange={e => handleDocUpload(key, e)}
                                />
                                Replace
                              </label>
                            )}

                            {pendingReplacement && (
                              <button type="button" style={s.removeBtn} onClick={() => removeDoc(key)}>
                                <FaTrash size={11} /> Undo
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <label style={s.uploadArea}>
                          <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display: "none" }} onChange={e => handleDocUpload(key, e)} />
                          <FaUpload size={15} color="#94a3b8" />
                          <span style={{ fontSize: 12, color: "#64748b" }}>Click to upload</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* ── SUBMIT ── */}
            <div className="ca-submit-row" style={s.submitRow}>
              <button style={s.cancelBtn} onClick={() => router.push(`/ca/loans/${id}`)}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Changes ✓"}
              </button>
            </div>

          </div>
        )}
      </div>

      <style jsx>{`
        .ca-edit-wrap {
          width: 100%;
        }

        @media (max-width: 640px) {
          .ca-form-card {
            padding: 22px 16px !important;
            border-radius: 14px !important;
          }

          .ca-emi-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .ca-doc-grid {
            grid-template-columns: 1fr !important;
          }

          .ca-submit-row {
            flex-direction: column-reverse;
            align-items: stretch !important;
          }

          .ca-submit-row button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
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
        <span style={{ fontSize: 22 }}>{icon}</span>
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
      <label style={s.fieldLabel}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
      {error && <span style={s.fieldError}>{error}</span>}
    </div>
  );
}

const InputEl = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }>(
  ({ icon, style, ...props }, ref) => (
    <div style={s.inputWrap}>
      {icon && <span style={s.inputIcon}>{icon}</span>}
      <input ref={ref as React.Ref<HTMLInputElement>} {...props} style={{ ...s.input, paddingLeft: icon ? "42px" : "14px", ...style }} />
    </div>
  )
);
InputEl.displayName = "InputEl";

const SelectEl = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...props }, ref) => (
    <select ref={ref as React.Ref<HTMLSelectElement>} {...props} style={s.select}>{children}</select>
  )
);
SelectEl.displayName = "SelectEl";

function EmiItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontWeight: 800, fontSize: highlight ? 20 : 17, color: highlight ? "#0369a1" : "#1e293b" }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  sidebar: { width: 240, minHeight: "100vh", background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)", display: "flex", flexDirection: "column", padding: "24px 14px" },
  logo:     { display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, paddingLeft: 6 },
  logoIcon: { width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" },
  caBadge:  { display: "flex", alignItems: "center", gap: 7, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "6px 12px", marginBottom: 16 },
  caBadgeText: { color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" },
  nav:      { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navLink:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", textAlign: "left" as const, width: "100%", background: "transparent", color: "rgba(255,255,255,0.65)" },
  navLinkActive: { background: "rgba(255,255,255,0.15)", color: "#fff" },
  navLabel: {},
  sidebarUser: { display: "flex", alignItems: "center", gap: 10, padding: "14px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8 },
  avatarCircle: { width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userInfo: { overflow: "hidden" },
  userName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  logoutBtn:{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", color: "rgba(255,255,255,0.5)", background: "transparent", border: "none", borderRadius: 9, fontSize: 13, cursor: "pointer", marginTop: 4, width: "100%" },
  main:     { flex: 1, padding: "28px 32px", overflowY: "auto" as const, minWidth: 0 },
  topBar:   { marginBottom: 16 },
  backBtn:  { display: "flex", alignItems: "center", gap: 7, background: "transparent", color: "#64748b", border: "none", padding: "0 0 8px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  pageTitle:{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 },
  pageSub:  { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  caNotice: { display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, flexWrap: "wrap" as const },
  lockNotice:{ display: "flex", alignItems: "center", gap: 10, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, flexWrap: "wrap" as const },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 16 },
  successBox:{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 16 },
  formCard: { background: "#fff", borderRadius: 18, padding: "32px 36px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" },
  section:  { marginBottom: 32 },
  sectionHead:  { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #f1f5f9" },
  sectionTitle: { fontSize: 16, fontWeight: 800, color: "#1e293b" },
  sectionSub:   { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  twoCol:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px 20px" },
  field:    { display: "flex", flexDirection: "column" as const, gap: 6 },
  fieldLabel:{ fontSize: 13, fontWeight: 600, color: "#374151" },
  fieldError:{ fontSize: 12, color: "#dc2626" },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13, pointerEvents: "none" },
  input:    { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb", outline: "none", boxSizing: "border-box" as const },
  select:   { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb", outline: "none", appearance: "auto", boxSizing: "border-box" as const },
  emiBox:   { background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", border: "1px solid #bae6fd", borderRadius: 12, padding: "16px 20px", marginTop: 18 },
  emiTitle: { fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 12 },
  emiGrid:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  docNotice:{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 16 },
  docGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
  docCard:  { border: "1.5px dashed", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: 8 },
  docLabel: { fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "capitalize" as const, display: "flex", flexDirection: "column" as const, gap: 4 },
  replacePill: { fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: 20, textTransform: "none" as const, width: "fit-content" },
  uploadArea:{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: "14px 8px", cursor: "pointer" },
  viewBtn: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#2563eb", color: "#fff", border: "none",
    padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
  },
  replaceBtn: {
    display: "flex", alignItems: "center", gap: 5, justifyContent: "center",
    background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1",
    padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
  },
  removeBtn: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#fef2f2", border: "none", color: "#ef4444",
    padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  submitRow:{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 28, paddingTop: 22, borderTop: "1px solid #f1f5f9" },
  cancelBtn:{ background: "#f1f5f9", color: "#475569", border: "none", padding: "11px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  saveBtn:  { background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  center:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "80px 0" },
  spinner:  { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  mutedText:{ color: "#94a3b8", fontSize: 14 },
};

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];