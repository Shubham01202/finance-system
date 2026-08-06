// Path: frontend/src/app/dsa/apply/page.tsx
"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaBuilding,
  FaMoneyBillWave, FaCheckCircle, FaUserTie,
  FaCalendarAlt, FaArrowLeft, FaUpload, FaFilePdf,
  FaFileImage, FaTrash, FaShieldAlt, FaCar,
} from "react-icons/fa";
import DSALayout from "./../../../components/layout/dsa/DSALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface FormData {
  full_name: string;
  email: string;
  mobile: string;
  employment_type: string;
  aadhaar: string;
  pan: string;
  co_applicant_name: string;
  co_applicant_aadhaar: string;
  co_applicant_pan: string;
  loan_amount: string;
  tenure: string;
  bank_id: string;
  loan_service: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  annual_income: string;
  vehicle_details: string;
}

interface UploadedFile {
  name: string; size: number; type: string;
  dataUrl: string; uploadedAt: string;
}
interface LoanServiceOption { id: number; name: string; }
interface EmploymentTypeOption { id: number; name: string; }
interface StateOption { id: number; state_name: string; }
interface TenureOption { id: number; tenure_months: number; display_name: string | null; }
interface DocumentTypeOption {
  id: number;
  document_name: string;
  is_required: boolean;
  max_size_mb: number;
  allowed_file_types: string[];
}

const CATALOG_API = `${process.env.NEXT_PUBLIC_API_URL}/api/catalog`;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

const formatTenure = (t: TenureOption) => {
  if (t.display_name) return t.display_name;
  if (t.tenure_months < 12) return `${t.tenure_months} Month${t.tenure_months > 1 ? "s" : ""}`;
  const years = t.tenure_months / 12;
  return Number.isInteger(years) ? `${years} Year${years > 1 ? "s" : ""}` : `${t.tenure_months} Months`;
};
/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DSAApplyPage() {
  const router = useRouter();

  const [step, setStep]           = useState(1);
  const totalSteps                = 5;
  const [error, setError]         = useState("");
  const [banks, setBanks]         = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [userName, setUserName]   = useState("DSA");

  const inputsRef = useRef<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)[]>([]);
  const setRef = (i: number) =>
    (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null): void => {
      inputsRef.current[i] = el;
    };

  const [formData, setFormData] = useState<FormData>({
    full_name: "", email: "", mobile: "", employment_type: "",
    aadhaar: "", pan: "", co_applicant_name: "", co_applicant_aadhaar: "",
    co_applicant_pan: "", loan_amount: "", tenure: "", bank_id: "",
    loan_service: "", dob: "", address: "", city: "", state: "",
    pincode: "", annual_income: "", vehicle_details: "",
  });

 const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [documents, setDocuments]     = useState<Record<number, UploadedFile>>({});
  const [docErrors, setDocErrors]     = useState<Record<number, string>>({});

  const [loanServices, setLoanServices]       = useState<LoanServiceOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeOption[]>([]);
  const [stateOptions, setStateOptions]       = useState<StateOption[]>([]);
  const [tenureOptions, setTenureOptions]     = useState<TenureOption[]>([]);
  const [documentTypes, setDocumentTypes]     = useState<DocumentTypeOption[]>([]);
  const [tenuresLoading, setTenuresLoading]       = useState(false);
  const [documentsLoading, setDocumentsLoading]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "dsa") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "DSA");
    } catch {}

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/banks`)
      .then(r => r.json())
      .then(d => { if (d.success) setBanks(d.data); })
      .catch(() => {});

    fetch(`${CATALOG_API}/loan-services`)
      .then(r => r.json())
      .then(d => { if (d.success) setLoanServices(d.data); })
      .catch(() => {});

    fetch(`${CATALOG_API}/employment-types`)
      .then(r => r.json())
      .then(d => { if (d.success) setEmploymentTypes(d.data); })
      .catch(() => {});

    fetch(`${CATALOG_API}/states`)
      .then(r => r.json())
      .then(d => { if (d.success) setStateOptions(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setDocuments({});
    setDocErrors({});
    setTenureOptions([]);
    setDocumentTypes([]);

    if (!formData.loan_service) return;

    setTenuresLoading(true);
    fetch(`${CATALOG_API}/loan-tenures?loan_service_id=${formData.loan_service}`)
      .then(r => r.json())
      .then(d => { if (d.success) setTenureOptions(d.data); })
      .catch(() => {})
      .finally(() => setTenuresLoading(false));

    setDocumentsLoading(true);
    fetch(`${CATALOG_API}/document-types?loan_service_id=${formData.loan_service}`)
      .then(r => r.json())
      .then(d => { if (d.success) setDocumentTypes(d.data); })
      .catch(() => {})
      .finally(() => setDocumentsLoading(false));
  }, [formData.loan_service]);

  const selectedLoanServiceName =
    loanServices.find(ls => String(ls.id) === formData.loan_service)?.name || "";

  /* ── VALIDATORS ── */
  const validators: Partial<Record<keyof FormData, (v: string) => string>> = {
    full_name:     v => v.trim().length < 3 ? "Min 3 characters" : "",
    email:         v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email" : "",
    mobile:        v => !/^[6-9]\d{9}$/.test(v) ? "Enter valid 10-digit mobile" : "",
    aadhaar:       v => !/^\d{12}$/.test(v) ? "Must be 12 digits" : "",
    pan:           v => !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Invalid PAN format" : "",
    loan_amount:   v => isNaN(Number(v)) || Number(v) < 10000 ? "Minimum ₹10,000" : "",
    pincode:       v => !/^\d{6}$/.test(v) ? "Must be 6 digits" : "",
    annual_income: v => isNaN(Number(v)) || Number(v) <= 0 ? "Enter valid income" : "",
    dob: v => {
      if (!v) return "Required";
      const age = new Date().getFullYear() - new Date(v).getFullYear();
      return age < 18 || age > 80 ? "Age must be 18–80" : "";
    },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormData;
    let val = value;
    if (key === "pan") val = value.toUpperCase();
    setFormData(p => ({ ...p, [key]: val }));
    const v = validators[key];
    if (v && val) setFieldErrors(p => ({ ...p, [key]: v(val) }));
    else setFieldErrors(p => ({ ...p, [key]: "" }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") { e.preventDefault(); inputsRef.current[index + 1]?.focus(); }
  };

 /* ── DOCUMENT UPLOAD ── */
  const handleDocUpload = (doc: DocumentTypeOption, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = (doc.max_size_mb || 5) * 1024 * 1024;
    if (file.size > maxBytes) { setDocErrors(p => ({ ...p, [doc.id]: `Max ${doc.max_size_mb}MB` })); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];
    if (!allowedExts.includes(ext)) {
      setDocErrors(p => ({ ...p, [doc.id]: `${allowedExts.join(", ").toUpperCase()} only` }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(p => ({
        ...p,
        [doc.id]: { name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string,
          uploadedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
      }));
      setDocErrors(p => ({ ...p, [doc.id]: "" }));
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (docId: number) => {
    setDocuments(p => { const n = { ...p }; delete n[docId]; return n; });
  };

  /* ── STEP VALIDATION ── */
  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ["full_name", "email", "mobile", "dob"],
    2: ["employment_type", "annual_income", "address", "city", "state", "pincode"],
    3: ["aadhaar", "pan"],
    4: ["loan_service", "loan_amount", "tenure", "bank_id"],
    5: [],
  };

  const validateStep = (s: number): boolean => {
    let hasError = false;
    const newErrors: Partial<Record<keyof FormData, string>> = { ...fieldErrors };
    stepFields[s].forEach(field => {
      const val = formData[field];
      if (!val || val.trim() === "") { newErrors[field] = "Required"; hasError = true; }
      else { const v = validators[field]; if (v) { const msg = v(val); if (msg) { newErrors[field] = msg; hasError = true; } } }
    });
    if (s === 4 && !formData.loan_service) { newErrors.loan_service = "Please select a loan service"; hasError = true; }
   if (s === 5) {
      const newDocErrors: Record<number, string> = {};
      documentTypes.filter(d => d.is_required).forEach(d => {
        if (!documents[d.id]) { newDocErrors[d.id] = "Required"; hasError = true; }
      });
      setDocErrors(newDocErrors);
    }
    setFieldErrors(newErrors); return !hasError;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, totalSteps)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true); setError("");

const documentMeta: Record<string, { name: string; uploadedAt: string; dataUrl: string }> = {};
    Object.entries(documents).forEach(([docId, file]) => {
      if (!file) return;
      const docConfig = documentTypes.find(d => d.id === Number(docId));
      const key = docConfig ? slugify(docConfig.document_name) : `doc_${docId}`;
      documentMeta[key] = { name: file.name, uploadedAt: file.uploadedAt, dataUrl: file.dataUrl };
    });

    try {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dsa/loans/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          pan_number: formData.pan.toUpperCase(),
          aadhaar_number: formData.aadhaar,
          loan_service: selectedLoanServiceName,
          loan_type: selectedLoanServiceName,
          loan_service_id: formData.loan_service,
          documents: documentMeta,
        }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/"); return; }
      if (data.success) { setSubmitted(true); setTimeout(() => router.push("/dsa/loans"), 2500); }
      else setError(data.message || "Submission failed.");
    } catch { setError("Server error. Try again."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/"); };
  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  const calcEMI = (p: number, r: number, y: number): string => {
    const mr = r / 12 / 100, n = y * 12;
    const emi = (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    return isNaN(emi) ? "—" : Math.round(emi).toLocaleString("en-IN");
  };

  /* ── SUCCESS ── */
  if (submitted) {
    return (
      <DSALayout s={s} userName={userName} handleLogout={handleLogout}>
        <div className="dsa-success-wrap">
          <div style={s.successCard}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <FaCheckCircle size={60} color="#10b981" />
            </div>
            <h2 style={s.successTitle}>Application Submitted!</h2>
            <div style={s.successSub}>Loan application has been filed successfully on behalf of the customer. Redirecting to applications list…</div>
            <div style={s.successBar}><div style={s.successFill} /></div>
          </div>
        </div>
        <style jsx>{`
          .dsa-success-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 120px);
            padding: 20px;
          }
        `}</style>
      </DSALayout>
    );
  }

  const stepLabels = ["Customer", "Employment", "KYC", "Loan", "Documents"];
  const stepIcons  = ["👤", "💼", "🛡️", "💰", "📄"];

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <DSALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="dsa-apply-wrap">

        {/* Header */}
        <div style={s.topBar}>
          <div>
            <button style={s.backBtn} onClick={() => router.push("/dsa/loans")}>
              <FaArrowLeft size={12} /> Back to Applications
            </button>
            <h1 style={s.pageTitle}>New Loan Application</h1>
            <div style={s.pageSub}>Filing on behalf of customer · Step {step} of {totalSteps}</div>
          </div>
        </div>

        {/* DSA Notice */}
        <div style={s.caNotice}>
          <FaUserTie size={16} color="#92400e" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#92400e" }}>
            <strong>DSA Filing Mode</strong> — This application will be linked to your DSA account. Your name, email and agency will be recorded with this application.
          </div>
        </div>

        {/* ── STEPPER ── */}
        <div className="dsa-stepper" style={s.stepperCard}>
          {stepLabels.map((label, i) => {
            const n = i + 1, isActive = n === step, isDone = n < step;
            return (
              <div key={n} style={s.stepItem}>
                <div style={s.stepCol}>
                  <div className="dsa-step-circle" style={{ ...s.stepCircle, background: isDone ? "#10b981" : isActive ? "#1e3a5f" : "#e2e8f0", color: isDone || isActive ? "#fff" : "#94a3b8", boxShadow: isActive ? "0 0 0 4px rgba(30,58,95,0.2)" : "none", transform: isActive ? "scale(1.1)" : "scale(1)" }}>
                    {isDone ? <FaCheckCircle size={13} /> : <span style={{ fontSize: 14 }}>{stepIcons[i]}</span>}
                  </div>
                  <span className="dsa-step-label" style={{ ...s.stepLabel, color: isActive ? "#1e3a5f" : isDone ? "#10b981" : "#94a3b8", fontWeight: isActive ? 700 : 500 }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && <div style={{ ...s.stepLine, background: isDone ? "#10b981" : "#e2e8f0" }} />}
              </div>
            );
          })}
        </div>

        {/* ── FORM CARD ── */}
        <div className="dsa-form-card" style={s.formCard}>
          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          {/* ════ STEP 1 — Customer Details ════ */}
          {step === 1 && (
            <FormSection title="Customer Personal Details" subtitle="Basic information about the loan applicant" icon="👤">
              <TwoCol>
                <Field label="Full Name" required error={fieldErrors.full_name}>
                  <InputEl ref={setRef(0)} onKeyDown={e => handleKeyDown(e, 0)} name="full_name" placeholder="Customer full name" value={formData.full_name} onChange={handleChange} icon={<FaUser />} />
                </Field>
                <Field label="Date of Birth" required error={fieldErrors.dob}>
                  <InputEl ref={setRef(1)} onKeyDown={e => handleKeyDown(e, 1)} name="dob" type="date" value={formData.dob} onChange={handleChange} icon={<FaCalendarAlt />} />
                </Field>
                <Field label="Email Address" required error={fieldErrors.email}>
                  <InputEl ref={setRef(2)} onKeyDown={e => handleKeyDown(e, 2)} name="email" type="email" placeholder="Customer email" value={formData.email} onChange={handleChange} icon={<FaEnvelope />} />
                </Field>
                <Field label="Mobile Number" required error={fieldErrors.mobile}>
                  <InputEl ref={setRef(3)} onKeyDown={e => handleKeyDown(e, 3)} name="mobile" placeholder="10-digit mobile" maxLength={10} value={formData.mobile} onChange={handleChange} icon={<FaPhone />} />
                </Field>
              </TwoCol>
            </FormSection>
          )}

          {/* ════ STEP 2 — Employment & Address ════ */}
          {step === 2 && (
            <>
              <FormSection title="Employment Details" subtitle="Customer employment and income information" icon="💼">
                <TwoCol>
                 <Field label="Employment Type" required error={fieldErrors.employment_type}>
                    <SelectEl ref={setRef(4)} name="employment_type" value={formData.employment_type} onChange={handleChange}>
                      <option value="">Select type</option>
                      {employmentTypes.map(et => (
                        <option key={et.id} value={et.name}>{et.name}</option>
                      ))}
                    </SelectEl>
                  </Field>
                  <Field label="Annual Income (₹)" required error={fieldErrors.annual_income}>
                    <InputEl ref={setRef(5)} onKeyDown={e => handleKeyDown(e, 5)} name="annual_income" placeholder="e.g. 600000" value={formData.annual_income} onChange={handleChange} icon={<FaMoneyBillWave />} />
                  </Field>
                </TwoCol>
              </FormSection>
              <FormSection title="Customer Address" subtitle="Current residential address" icon="🏠">
                <Field label="Full Address" required error={fieldErrors.address}>
                  <textarea ref={setRef(6)} name="address" placeholder="House/Flat No, Street, Area, Landmark" value={formData.address} onChange={handleChange} rows={3} style={{ ...s.input, height: "auto", resize: "vertical", paddingLeft: 14 }} />
                </Field>
                <TwoCol>
                  <Field label="City" required error={fieldErrors.city}>
                    <InputEl ref={setRef(7)} onKeyDown={e => handleKeyDown(e, 7)} name="city" placeholder="City" value={formData.city} onChange={handleChange} icon={<FaBuilding />} />
                  </Field>
                 <Field label="State" required error={fieldErrors.state}>
                    <SelectEl ref={setRef(8)} name="state" value={formData.state} onChange={handleChange}>
                      <option value="">Select State</option>
                      {stateOptions.map(st => (
                        <option key={st.id} value={st.state_name}>{st.state_name}</option>
                      ))}
                    </SelectEl>
                  </Field>
                  <Field label="Pincode" required error={fieldErrors.pincode}>
                    <InputEl ref={setRef(9)} onKeyDown={e => handleKeyDown(e, 9)} name="pincode" placeholder="6-digit pincode" maxLength={6} value={formData.pincode} onChange={handleChange} icon={<FaBuilding />} />
                  </Field>
                </TwoCol>
              </FormSection>
            </>
          )}

          {/* ════ STEP 3 — KYC ════ */}
          {step === 3 && (
            <FormSection title="KYC Verification" subtitle="Customer identity verification" icon="🛡️">
              <div style={s.kycBanner}>
                <FaShieldAlt size={16} color="#1d4ed8" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "#3b82f6" }}>256-bit SSL encryption. Stored as per RBI data security norms.</div>
              </div>
              <div style={s.kycSection}>
                <div style={s.kycGroupTitle}>Primary Applicant KYC</div>
                <TwoCol>
                  <Field label="Aadhaar Number" required error={fieldErrors.aadhaar}>
                    <InputEl ref={setRef(10)} onKeyDown={e => handleKeyDown(e, 10)} name="aadhaar" placeholder="12-digit Aadhaar" maxLength={12} value={formData.aadhaar} onChange={handleChange} icon={<FaIdCard />} />
                  </Field>
                  <Field label="PAN Number" required error={fieldErrors.pan}>
                    <InputEl ref={setRef(11)} onKeyDown={e => handleKeyDown(e, 11)} name="pan" placeholder="ABCDE1234F" maxLength={10} value={formData.pan} onChange={handleChange} icon={<FaIdCard />} />
                  </Field>
                </TwoCol>
              </div>
              <div style={{ ...s.kycSection, marginTop: 18 }}>
                <div style={s.kycGroupTitle}>Co-Applicant KYC <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>(if applicable)</span></div>
                <TwoCol>
                  <Field label="Co-Applicant Name" error={fieldErrors.co_applicant_name}>
                    <InputEl ref={setRef(12)} onKeyDown={e => handleKeyDown(e, 12)} name="co_applicant_name" placeholder="Co-applicant full name" value={formData.co_applicant_name} onChange={handleChange} icon={<FaUser />} />
                  </Field>
                  <Field label="Co-Applicant Aadhaar" error={fieldErrors.co_applicant_aadhaar}>
                    <InputEl ref={setRef(13)} onKeyDown={e => handleKeyDown(e, 13)} name="co_applicant_aadhaar" placeholder="12-digit Aadhaar" maxLength={12} value={formData.co_applicant_aadhaar} onChange={handleChange} icon={<FaIdCard />} />
                  </Field>
                  <Field label="Co-Applicant PAN" error={fieldErrors.co_applicant_pan}>
                    <InputEl ref={setRef(14)} onKeyDown={e => handleKeyDown(e, 14)} name="co_applicant_pan" placeholder="ABCDE1234F" maxLength={10} value={formData.co_applicant_pan} onChange={handleChange} icon={<FaIdCard />} />
                  </Field>
                </TwoCol>
              </div>
            </FormSection>
          )}

          {/* ════ STEP 4 — Loan Details ════ */}
          {step === 4 && (
            <FormSection title="Loan Details" subtitle="Select loan service and enter amount details" icon="💰">
           <Field label="Loan Service" required error={fieldErrors.loan_service}>
                <SelectEl name="loan_service" value={formData.loan_service} onChange={e => { setFormData(p => ({ ...p, loan_service: e.target.value, tenure: "", vehicle_details: "" })); setFieldErrors(p => ({ ...p, loan_service: "" })); }}>
                  <option value="">Select loan service</option>
                  {loanServices.map(ls => (
                    <option key={ls.id} value={ls.id}>{ls.name}</option>
                  ))}
                </SelectEl>
              </Field>
              <TwoCol>
                <Field label="Select Bank" required error={fieldErrors.bank_id}>
                  <SelectEl ref={setRef(15)} name="bank_id" value={formData.bank_id} onChange={handleChange}>
                    <option value="">Choose a bank</option>
                    {banks.length > 0
                      ? banks.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name}</option>)
                      : <><option value="1">State Bank of India</option><option value="2">HDFC Bank</option><option value="3">ICICI Bank</option><option value="4">Axis Bank</option></>
                    }
                  </SelectEl>
                </Field>
                <Field label="Loan Amount (₹)" required error={fieldErrors.loan_amount}>
                  <InputEl ref={setRef(16)} onKeyDown={e => handleKeyDown(e, 16)} name="loan_amount" placeholder="Min ₹10,000" value={formData.loan_amount} onChange={handleChange} icon={<FaMoneyBillWave />} />
                </Field>
              <Field label="Loan Tenure" required error={fieldErrors.tenure}>
                  <SelectEl ref={setRef(17)} name="tenure" value={formData.tenure} onChange={handleChange} disabled={!formData.loan_service || tenuresLoading}>
                    <option value="">
                      {!formData.loan_service ? "Select loan service first" : tenuresLoading ? "Loading…" : "Select tenure"}
                    </option>
                    {tenureOptions.map(t => (
                      <option key={t.id} value={t.tenure_months / 12}>{formatTenure(t)}</option>
                    ))}
                  </SelectEl>
                </Field>
                {selectedLoanServiceName.toLowerCase().includes("vehicle") && (
                  <Field label="Vehicle Details" required error={fieldErrors.vehicle_details}>
                    <InputEl ref={setRef(18)} onKeyDown={e => handleKeyDown(e, 18)} name="vehicle_details" placeholder="Make, Model, Year" value={formData.vehicle_details} onChange={handleChange} icon={<FaCar />} />
                  </Field>
                )}
              </TwoCol>
              {formData.loan_amount && formData.tenure && Number(formData.loan_amount) >= 10000 && (
                <div style={s.emiBox}>
                  <div style={s.emiTitle}>📊 Loan Summary Preview</div>
                  <div className="dsa-emi-grid" style={s.emiGrid}>
                    <EmiItem label="Loan Amount" value={fmt(Number(formData.loan_amount))} />
                    <EmiItem label="Tenure" value={`${formData.tenure} Year${Number(formData.tenure) > 1 ? "s" : ""}`} />
                    <EmiItem label="Est. EMI @ 12% p.a." value={`₹${calcEMI(Number(formData.loan_amount), 12, Number(formData.tenure))}`} highlight />
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>* Indicative EMI. Actual rate may vary.</div>
                </div>
              )}
            </FormSection>
          )}

{/* ════ STEP 5 — Documents ════ */}
          {step === 5 && (
            <FormSection title="Upload Documents" subtitle="Upload customer documents based on selected loan service" icon="📄">
              {!formData.loan_service && (
                <div style={s.docWarning}>⚠️ Please complete Step 4 (Loan Service) first.</div>
              )}
              {formData.loan_service && documentsLoading && (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "20px 0", textAlign: "center" as const }}>Loading required documents…</div>
              )}
              {formData.loan_service && !documentsLoading && documentTypes.length > 0 && (
                <>
                  <div style={s.docBanner}>
                    <FaUpload size={14} color="#0369a1" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: "#0284c7" }}>
                      <strong>{selectedLoanServiceName}</strong> · Allowed types and max size vary per document · * = required
                    </div>
                  </div>
                  <div className="dsa-doc-grid" style={s.docGrid}>
                    {documentTypes.map(doc => {
                      const uploaded = documents[doc.id];
                      const err      = docErrors[doc.id];
                      const isPdf    = uploaded?.type === "application/pdf";
                      const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];
                      return (
                        <div key={doc.id} style={{ ...s.docCard, borderColor: err ? "#fca5a5" : uploaded ? "#86efac" : "#d1d5db", background: uploaded ? "#f0fdf4" : "#fff" }}>
                          <div style={s.docCardTop}>
                            <div style={{ flex: 1 }}>
                              <div style={s.docLabel}>{doc.document_name}{doc.is_required && <span style={{ color: "#ef4444" }}> *</span>}</div>
                              <div style={s.docDesc}>{allowedExts.join(", ").toUpperCase()} · Max {doc.max_size_mb}MB</div>
                            </div>
                            {uploaded && <button style={s.docRemove} onClick={() => removeDoc(doc.id)}><FaTrash size={11} /></button>}
                          </div>
                          {uploaded ? (
                            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                              {isPdf ? (
                                <div style={s.pdfPreview}><FaFilePdf size={24} color="#ef4444" /><span style={s.docFileName}>{uploaded.name}</span></div>
                              ) : (
                                <img src={uploaded.dataUrl} alt={doc.document_name} style={s.docImg} />
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <FaCheckCircle size={11} color="#10b981" />
                                <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                                  {uploaded.name} · {(uploaded.size / 1024).toFixed(0)} KB · {uploaded.uploadedAt}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <label style={s.docUploadArea}>
                              <input type="file" accept={allowedExts.map(t => `.${t}`).join(",")} style={{ display: "none" }} onChange={e => handleDocUpload(doc, e)} />
                              <FaFileImage size={22} color="#94a3b8" />
                              <span style={s.docUploadText}>Click to upload</span>
                              <span style={s.docUploadSub}>{allowedExts.join(", ").toUpperCase()} · Max {doc.max_size_mb}MB</span>
                            </label>
                          )}
                          {err && <div style={{ fontSize: 11, color: "#dc2626" }}>{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </FormSection>
          )}

          {/* ── NAV BUTTONS ── */}
          <div className="dsa-nav-row" style={s.navRow}>
            <button onClick={prevStep} disabled={step === 1} style={{ ...s.btnBack, opacity: step === 1 ? 0.4 : 1, cursor: step === 1 ? "not-allowed" : "pointer" }}>
              <FaArrowLeft size={12} /> Back
            </button>
            {step < totalSteps ? (
              <button onClick={nextStep} style={s.btnNext}>Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} style={{ ...s.btnSubmit, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Submitting…" : "Submit Application ✓"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .dsa-form-card {
            padding: 20px 18px !important;
          }

          .dsa-stepper {
            padding: 14px 12px !important;
            overflow-x: auto;
          }

          .dsa-step-circle {
            width: 30px !important;
            height: 30px !important;
          }

          .dsa-step-label {
            font-size: 9px !important;
          }

          .dsa-emi-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .dsa-doc-grid {
            grid-template-columns: 1fr !important;
          }

          .dsa-nav-row {
            flex-direction: column-reverse;
            gap: 10px;
          }

          .dsa-nav-row button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .dsa-form-card {
            padding: 16px 14px !important;
          }

          .dsa-step-label {
            display: none;
          }
        }
      `}</style>
    </DSALayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function FormSection({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
        <div><div style={s.sectionTitle}>{title}</div><div style={s.sectionSub}>{subtitle}</div></div>
      </div>
      {children}
    </div>
  );
}
function TwoCol({ children }: { children: React.ReactNode }) { return <div style={s.twoCol}>{children}</div>; }
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
   NOTE: page / sidebar / nav* / user* / logout* / main keys are consumed
   by DSALayout + DSASidebar. Everything else styles this page's own content.
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },

  /* consumed by DSASidebar */
  sidebar: { width: 260, minHeight: "100vh", background: "linear-gradient(180deg,#1e3a5f 0%,#0f2340 100%)", display: "flex", flexDirection: "column", padding: "24px 14px", flexShrink: 0 },
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

  /* consumed by DSALayout */
  main:     { flex: 1, padding: "28px 32px", overflowY: "auto" as const, minWidth: 0 },

  /* this page's own content */
  topBar:   { marginBottom: 16 },
  backBtn:  { display: "flex", alignItems: "center", gap: 7, background: "transparent", color: "#64748b", border: "none", padding: "0 0 8px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  pageTitle:{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 },
  pageSub:  { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  caNotice: { display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 },
  stepperCard: { display: "flex", alignItems: "center", background: "#fff", borderRadius: 14, padding: "16px 22px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  stepItem: { display: "flex", alignItems: "center", flex: 1 },
  stepCol:  { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5, flexShrink: 0 },
  stepCircle:{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, transition: "all 0.3s ease" },
  stepLabel: { fontSize: 10, whiteSpace: "nowrap" as const, letterSpacing: "0.02em", transition: "all 0.3s" },
  stepLine:  { flex: 1, height: 2, margin: "0 6px", marginBottom: 16, minWidth: 6, transition: "background 0.3s" },
  formCard:  { background: "#fff", borderRadius: 18, padding: "30px 36px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" },
  errorBox:  { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 },
  section:   { marginBottom: 30 },
  sectionHead:  { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #f1f5f9" },
  sectionTitle: { fontSize: 16, fontWeight: 800, color: "#1e293b" },
  sectionSub:   { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  twoCol:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px 20px" },
  field:     { display: "flex", flexDirection: "column" as const, gap: 6 },
  fieldLabel:{ fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.01em" },
  fieldError:{ fontSize: 12, color: "#dc2626" },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13, pointerEvents: "none" },
  input:     { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb", outline: "none", boxSizing: "border-box" as const },
  select:    { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1e293b", background: "#f9fafb", outline: "none", appearance: "auto", boxSizing: "border-box" as const },
  kycBanner: { display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "11px 14px", marginBottom: 16 },
  kycSection:{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px" },
  kycGroupTitle: { fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "0 0 12px" },
  emiBox:    { background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", border: "1px solid #bae6fd", borderRadius: 12, padding: "16px 20px", marginTop: 20 },
  emiTitle:  { fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 12, letterSpacing: "0.03em" },
  emiGrid:   { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  docWarning:{ background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 16 },
  docBanner: { display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "11px 14px", marginBottom: 16 },
  docGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  docCard:   { border: "1.5px dashed", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column" as const, gap: 10 },
  docCardTop:{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  docLabel:  { fontSize: 13, fontWeight: 700, color: "#1e293b" },
  docDesc:   { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  docRemove: { background: "#fef2f2", border: "none", color: "#ef4444", padding: "6px", borderRadius: 6, cursor: "pointer", flexShrink: 0 },
  docUploadArea: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "18px 10px", cursor: "pointer" },
  docUploadText: { fontSize: 13, fontWeight: 600, color: "#475569" },
  docUploadSub:  { fontSize: 11, color: "#94a3b8" },
  docImg:    { width: "100%", height: 85, objectFit: "cover" as const, borderRadius: 8, border: "1px solid #e2e8f0" },
  pdfPreview:{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fef2f2", borderRadius: 8 },
  docFileName:{ fontSize: 12, color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  navRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f1f5f9" },
  btnBack:   { display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", color: "#475569", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  btnNext:   { background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "10px 26px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnSubmit: { background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", padding: "10px 30px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  successCard: { background: "#fff", borderRadius: 22, padding: "52px 44px", textAlign: "center" as const, maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" },
  successTitle:{ fontSize: 24, fontWeight: 800, color: "#1e293b", margin: "0 0 10px" },
  successSub:  { color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 24 },
  successBar:  { width: 160, height: 4, background: "#e2e8f0", borderRadius: 99, margin: "0 auto", overflow: "hidden" },
  successFill: { width: "100%", height: "100%", background: "#10b981", borderRadius: 99, animation: "fill 2.5s linear forwards" },
};