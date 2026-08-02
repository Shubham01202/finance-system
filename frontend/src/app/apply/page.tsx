// Path: frontend/src/app/apply/page.tsx
"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import {
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaBuilding,
  FaMoneyBillWave, FaCheckCircle, FaBriefcase,
  FaCalendarAlt, FaArrowLeft, FaUpload,
  FaFilePdf, FaFileImage, FaTrash, FaShieldAlt,
  FaCar,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import CustomerLayout from "../../components/layout/customer/CustomerLayout";

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
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

interface LoanServiceOption {
  id: number;
  name: string;
}

interface EmploymentTypeOption {
  id: number;
  name: string;
}

interface StateOption {
  id: number;
  state_name: string;
  state_code: string | null;
}

interface TenureOption {
  id: number;
  tenure_months: number;
  display_name: string | null;
}

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
export default function LoanApplicationPage() {
  const router = useRouter();

  const [error, setError]         = useState("");
  const [banks, setBanks]         = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState(1);
  const [userName, setUserName]   = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const totalSteps = 5;

  const inputsRef = useRef<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)[]>([]);
  const setRef = (i: number) =>
    (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null): void => {
      inputsRef.current[i] = el;
    };

  const [formData, setFormData] = useState<FormData>({
    full_name: "", email: "", mobile: "", employment_type: "",
    aadhaar: "", pan: "",
    co_applicant_name: "", co_applicant_aadhaar: "", co_applicant_pan: "",
    loan_amount: "", tenure: "", bank_id: "", loan_service: "",
    dob: "", address: "", city: "", state: "", pincode: "",
    annual_income: "", vehicle_details: "",
  });

const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [documents, setDocuments]     = useState<Record<number, UploadedFile>>({});
  const [docErrors, setDocErrors]     = useState<Record<number, string>>({});

  const [loanServices, setLoanServices]     = useState<LoanServiceOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeOption[]>([]);
  const [stateOptions, setStateOptions]     = useState<StateOption[]>([]);
  const [tenureOptions, setTenureOptions]   = useState<TenureOption[]>([]);
  const [documentTypes, setDocumentTypes]   = useState<DocumentTypeOption[]>([]);
  const [tenuresLoading, setTenuresLoading]     = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserName(parsed.full_name || "User");
        setUserEmail(parsed.email || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/banks`)
      .then(r => r.json())
      .then(d => { if (d.success) setBanks(d.data); })
      .catch(() => {});
  }, []);

  /* ── Load loan services, employment types, states once ── */
  useEffect(() => {
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

  /* ── Load tenures + documents whenever the loan service changes ── */
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

  const validators: Partial<Record<keyof FormData, (v: string) => string>> = {
    full_name:     v => v.trim().length < 3 ? "Min 3 characters required" : "",
    email:         v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email address" : "",
    mobile:        v => !/^[6-9]\d{9}$/.test(v) ? "Enter valid 10-digit mobile" : "",
    aadhaar:       v => !/^\d{12}$/.test(v) ? "Aadhaar must be 12 digits" : "",
    pan:           v => !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Invalid PAN format" : "",
    loan_amount:   v => isNaN(Number(v)) || Number(v) < 10000 ? "Minimum ₹10,000" : "",
    pincode:       v => !/^\d{6}$/.test(v) ? "Must be 6 digits" : "",
    annual_income: v => isNaN(Number(v)) || Number(v) <= 0 ? "Enter valid income" : "",
    dob: v => {
      if (!v) return "Required";
      const age = new Date().getFullYear() - new Date(v).getFullYear();
      return age < 21 || age > 65 ? "Age must be 21–65" : "";
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

 const handleDocUpload = (doc: DocumentTypeOption, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = (doc.max_size_mb || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      setDocErrors(p => ({ ...p, [doc.id]: `File must be under ${doc.max_size_mb}MB` })); return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];
    if (!allowedExts.includes(ext)) {
      setDocErrors(p => ({ ...p, [doc.id]: `Only ${allowedExts.join(", ").toUpperCase()} allowed` })); return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(p => ({
        ...p,
        [doc.id]: {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        },
      }));
      setDocErrors(p => ({ ...p, [doc.id]: "" }));
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (docId: number) => {
    setDocuments(p => { const n = { ...p }; delete n[docId]; return n; });
  };

  const stepRequiredFields: Record<number, (keyof FormData)[]> = {
    1: ["full_name", "email", "mobile", "dob"],
    2: ["employment_type", "annual_income", "address", "city", "state", "pincode"],
    3: ["aadhaar", "pan"],
    4: ["loan_service", "loan_amount", "tenure", "bank_id"],
    5: [],
  };

  const validateStep = (s: number): boolean => {
    const fields = stepRequiredFields[s];
    let hasError = false;
    const newErrors: Partial<Record<keyof FormData, string>> = { ...fieldErrors };

    fields.forEach(field => {
      const value = formData[field];
      if (!value || value.trim() === "") {
        newErrors[field] = "This field is required"; hasError = true;
      } else {
        const v = validators[field];
        if (v) { const msg = v(value); if (msg) { newErrors[field] = msg; hasError = true; } }
      }
    });

   if (s === 5) {
      const newDocErrors: Record<number, string> = {};
      documentTypes.filter(d => d.is_required).forEach(d => {
        if (!documents[d.id]) { newDocErrors[d.id] = "This document is required"; hasError = true; }
      });
      setDocErrors(newDocErrors);
    }

    setFieldErrors(newErrors);
    return !hasError;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, totalSteps)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    const token = localStorage.getItem("token");
    if (!token) { setError("Please log in first."); setTimeout(() => router.push("/"), 1500); return; }
    setLoading(true); setError("");

    const documentMeta: Record<string, { name: string; uploadedAt: string; dataUrl: string }> = {};
    Object.entries(documents).forEach(([docId, file]) => {
      if (!file) return;
      const docConfig = documentTypes.find(d => d.id === Number(docId));
      const key = docConfig ? slugify(docConfig.document_name) : `doc_${docId}`;
      documentMeta[key] = { name: file.name, uploadedAt: file.uploadedAt, dataUrl: file.dataUrl };
    });

    try {
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/apply`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    ...formData,
    loan_service: selectedLoanServiceName,   // ✅ send the readable name, not the raw id
    loan_service_id: formData.loan_service,  // keep the id separately for relational lookups
    pan_number: formData.pan.toUpperCase(),
    aadhaar_number: formData.aadhaar,
    loan_type: selectedLoanServiceName,
    loan_purpose: selectedLoanServiceName,
    documents: documentMeta,
  }),
});
      const data = await res.json();
      if (res.status === 401) { setError("Session expired."); setTimeout(() => router.push("/"), 1500); return; }
      if (data.success) { setSubmitted(true); setTimeout(() => router.push("/dashboard"), 2500); }
      else setError(data.message || "Submission failed.");
    } catch { setError("Server error. Try again."); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  const calcEMI = (p: number, r: number, y: number): string => {
    const mr = r / 12 / 100, n = y * 12;
    const emi = (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    return isNaN(emi) ? "—" : Math.round(emi).toLocaleString("en-IN");
  };

  const stepLabels = ["Personal", "Employment", "KYC", "Loan", "Documents"];
  const stepIcons  = ["👤", "💼", "🛡️", "💰", "📄"];

  /* ── SUCCESS ── */
  if (submitted) {
    return (
      <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-[70vh] p-6">
          <div className="bg-white rounded-3xl px-8 sm:px-11 py-12 text-center max-w-md shadow-xl">
            <div className="flex justify-center mb-5">
              <FaCheckCircle size={60} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2.5">Application Submitted!</h2>
            <p className="text-slate-500 text-[15px] leading-relaxed mb-6">
              Your loan application has been received. Our team will review it shortly.
            </p>
            <div className="w-40 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-emerald-500 rounded-full animate-[fill_2.5s_linear_forwards]" />
            </div>
            <p className="text-[13px] text-slate-400 mt-3.5">Redirecting to dashboard…</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 bg-transparent text-slate-500 border-none pb-2 text-[13px] font-medium cursor-pointer"
          >
            <FaArrowLeft size={12} /> Back to Dashboard
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Loan Application</h1>
          <p className="text-[13px] text-slate-400 mt-1">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* ── STEPPER ── */}
      <div className="flex items-center bg-white rounded-2xl px-3 sm:px-6 py-4 sm:py-5 mb-4 shadow-sm overflow-x-auto">
        {stepLabels.map((label, i) => {
          const n = i + 1, isActive = n === step, isDone = n < step;
          return (
            <div key={n} className="flex items-center flex-1 min-w-[56px]">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shrink-0 transition-all duration-300
                    ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#1e3a5f] text-white scale-110 ring-4 ring-[#1e3a5f]/20" : "bg-slate-200 text-slate-400"}`}
                >
                  {isDone ? <FaCheckCircle size={13} /> : <span className="text-sm sm:text-[15px]">{stepIcons[i]}</span>}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] whitespace-nowrap tracking-wide transition-all
                    ${isActive ? "text-[#1e3a5f] font-bold" : isDone ? "text-emerald-500 font-medium" : "text-slate-400 font-medium"}`}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 sm:mx-2 -mb-4 min-w-[6px] transition-colors ${isDone ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── FORM CARD ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* ════ STEP 1 — Personal ════ */}
        {step === 1 && (
          <FormSection title="Personal Details" subtitle="Basic information about the applicant" icon="👤">
            <TwoCol>
              <Field label="Full Name" required error={fieldErrors.full_name}>
                <InputEl ref={setRef(0)} onKeyDown={e => handleKeyDown(e, 0)} name="full_name" placeholder="e.g. Rahul Sharma" value={formData.full_name} onChange={handleChange} icon={<FaUser />} />
              </Field>
              <Field label="Date of Birth" required error={fieldErrors.dob}>
                <InputEl ref={setRef(1)} onKeyDown={e => handleKeyDown(e, 1)} name="dob" type="date" value={formData.dob} onChange={handleChange} icon={<FaCalendarAlt />} />
              </Field>
              <Field label="Email Address" required error={fieldErrors.email}>
                <InputEl ref={setRef(2)} onKeyDown={e => handleKeyDown(e, 2)} name="email" type="email" placeholder="rahul@example.com" value={formData.email} onChange={handleChange} icon={<FaEnvelope />} />
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
            <FormSection title="Employment Details" subtitle="Your employment type and income" icon="💼">
              <TwoCol>
               <Field label="Employment Type" required error={fieldErrors.employment_type}>
                  <SelectEl ref={setRef(4)} name="employment_type" value={formData.employment_type} onChange={handleChange}>
                    <option value="">Select employment type</option>
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

            <FormSection title="Address Details" subtitle="Current residential address" icon="🏠">
              <Field label="Full Address" required error={fieldErrors.address}>
                <textarea
                  ref={setRef(6) as any} name="address"
                  placeholder="House/Flat No, Street, Area, Landmark"
                  value={formData.address} onChange={handleChange} rows={3}
                  className="w-full border border-gray-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-800 bg-gray-50 outline-none box-border resize-y focus:border-[#2d5986]"
                />
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
          <FormSection title="KYC Verification" subtitle="Identity verification as per RBI guidelines" icon="🛡️">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3.5 mb-5">
              <FaShieldAlt size={18} className="text-blue-700 shrink-0" />
              <div>
                <p className="m-0 font-bold text-[13px] text-blue-700">Secure & Encrypted</p>
                <p className="mt-0.5 text-xs text-blue-500">256-bit SSL encryption. Stored as per RBI data security norms.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl px-4 sm:px-5 py-4.5">
              <p className="text-sm font-bold text-slate-800 mb-3.5">Primary Applicant KYC</p>
              <TwoCol>
                <Field label="Aadhaar Number" required error={fieldErrors.aadhaar}>
                  <InputEl ref={setRef(10)} onKeyDown={e => handleKeyDown(e, 10)} name="aadhaar" placeholder="12-digit Aadhaar" maxLength={12} value={formData.aadhaar} onChange={handleChange} icon={<FaIdCard />} />
                </Field>
                <Field label="PAN Number" required error={fieldErrors.pan}>
                  <InputEl ref={setRef(11)} onKeyDown={e => handleKeyDown(e, 11)} name="pan" placeholder="ABCDE1234F" maxLength={10} value={formData.pan} onChange={handleChange} icon={<FaIdCard />} />
                </Field>
              </TwoCol>
            </div>

            <div className="bg-slate-50 rounded-xl px-4 sm:px-5 py-4.5 mt-6">
              <p className="text-sm font-bold text-slate-800 mb-3.5">
                Co-Applicant KYC <span className="font-normal text-slate-400 text-xs">(if applicable)</span>
              </p>
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

            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-[13px] mt-4">
              <strong>📌 Format:</strong> PAN — 5 letters + 4 digits + 1 letter (ABCDE1234F). Aadhaar — 12 digits, no spaces.
            </div>
          </FormSection>
        )}

        {/* ════ STEP 4 — Loan Details ════ */}
        {step === 4 && (
          <FormSection title="Loan Details" subtitle="Select the loan service and amount required" icon="💰">
          <div className="mb-6">
              <Field label="Loan Service" required error={fieldErrors.loan_service}>
                <SelectEl
                  name="loan_service"
                  value={formData.loan_service}
                  onChange={e => {
                    setFormData(p => ({ ...p, loan_service: e.target.value, tenure: "", vehicle_details: "" }));
                    setFieldErrors(p => ({ ...p, loan_service: "" }));
                  }}
                >
                  <option value="">Select loan service</option>
                  {loanServices.map(ls => (
                    <option key={ls.id} value={ls.id}>{ls.name}</option>
                  ))}
                </SelectEl>
              </Field>
            </div>

            <TwoCol>
              <Field label="Select Bank" required error={fieldErrors.bank_id}>
                <SelectEl ref={setRef(15)} name="bank_id" value={formData.bank_id} onChange={handleChange}>
                  <option value="">Choose a bank</option>
                  {banks.length > 0
                    ? banks.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name}</option>)
                    : <>
                        <option value="1">State Bank of India</option>
                        <option value="2">HDFC Bank</option>
                        <option value="3">ICICI Bank</option>
                        <option value="4">Axis Bank</option>
                        <option value="5">Bank of Baroda</option>
                      </>
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
                  <InputEl ref={setRef(18)} onKeyDown={e => handleKeyDown(e, 18)} name="vehicle_details" placeholder="Make, Model, Year e.g. Maruti Swift 2024" value={formData.vehicle_details} onChange={handleChange} icon={<FaCar />} />
                </Field>
              )}
            </TwoCol>

            {formData.loan_amount && formData.tenure && Number(formData.loan_amount) >= 10000 && (
              <div className="bg-linear-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-2xl px-4 sm:px-6 py-4.5 mt-6">
                <p className="text-[13px] font-bold text-sky-700 mb-3.5 tracking-wide">📊 Loan Summary Preview</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <EmiItem label="Loan Amount" value={fmt(Number(formData.loan_amount))} />
                  <EmiItem label="Tenure" value={`${formData.tenure} Year${Number(formData.tenure) > 1 ? "s" : ""}`} />
                  <EmiItem label="Est. EMI @ 12% p.a." value={`₹${calcEMI(Number(formData.loan_amount), 12, Number(formData.tenure))}`} highlight />
                </div>
                <p className="text-[11px] text-slate-400 mt-3">* Indicative EMI at 12% p.a. Actual rate may vary.</p>
              </div>
            )}
          </FormSection>
        )}
{/* ════ STEP 5 — Documents ════ */}
        {step === 5 && (
          <FormSection title="Upload Documents" subtitle="Upload documents based on your selected loan service" icon="📄">
            {!formData.loan_service && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3.5 text-sm mb-5">
                ⚠️ Please complete Step 4 (Loan Service) first to see the required documents.
              </div>
            )}

            {formData.loan_service && documentsLoading && (
              <div className="text-sm text-slate-400 py-6 text-center">Loading required documents…</div>
            )}

            {formData.loan_service && !documentsLoading && documentTypes.length > 0 && (
              <>
                <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3.5 mb-5">
                  <FaUpload size={15} className="text-sky-700 shrink-0" />
                  <div>
                    <p className="m-0 font-bold text-[13px] text-sky-700">
                      Documents for: {selectedLoanServiceName}
                    </p>
                    <p className="mt-0.5 text-xs text-sky-600">
                      Allowed types and max size vary per document · * = mandatory
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {documentTypes.map(doc => {
                    const uploaded = documents[doc.id];
                    const err      = docErrors[doc.id];
                    const isPdf    = uploaded?.type === "application/pdf";
                    const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];
                    return (
                      <div
                        key={doc.id}
                        className={`border-[1.5px] border-dashed rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all
                          ${err ? "border-red-300" : uploaded ? "border-emerald-300 bg-emerald-50" : "border-gray-300 bg-white"}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-[13px] font-bold text-slate-800 m-0">
                              {doc.document_name}{doc.is_required && <span className="text-red-500"> *</span>}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {allowedExts.join(", ").toUpperCase()} · Max {doc.max_size_mb}MB
                            </p>
                          </div>
                          {uploaded && (
                            <button
                              onClick={() => removeDoc(doc.id)}
                              className="bg-red-50 border-none text-red-500 p-1.5 rounded-md cursor-pointer shrink-0"
                            >
                              <FaTrash size={11} />
                            </button>
                          )}
                        </div>

                        {uploaded ? (
                          <div className="flex flex-col gap-2">
                            {isPdf ? (
                              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-red-50 rounded-lg">
                                <FaFilePdf size={26} className="text-red-500" />
                                <span className="text-xs text-slate-700 font-medium truncate">{uploaded.name}</span>
                              </div>
                            ) : (
                              <img src={uploaded.dataUrl} alt={doc.document_name} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                            )}
                            <div className="flex items-center gap-1.5">
                              <FaCheckCircle size={11} className="text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 font-semibold truncate">
                                {uploaded.name} · {(uploaded.size / 1024).toFixed(0)} KB · {uploaded.uploadedAt}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-lg py-5 px-2.5 cursor-pointer">
                            <input
                              type="file"
                              accept={allowedExts.map(t => `.${t}`).join(",")}
                              className="hidden"
                              onChange={e => handleDocUpload(doc, e)}
                            />
                            <FaFileImage size={22} className="text-slate-400" />
                            <span className="text-[13px] font-semibold text-slate-600">Click to upload</span>
                            <span className="text-[11px] text-slate-400">{allowedExts.join(", ").toUpperCase()} · Max {doc.max_size_mb}MB</span>
                          </label>
                        )}
                        {err && <p className="text-[11px] text-red-600 m-0">{err}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </FormSection>
        )}

        {/* ── NAV BUTTONS ── */}
        <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-100">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`flex items-center gap-2 bg-slate-100 text-slate-600 border-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold
              ${step === 1 ? "opacity-40 cursor-not-allowed" : "opacity-100 cursor-pointer"}`}
          >
            <FaArrowLeft size={12} /> Back
          </button>
          {step < totalSteps ? (
            <button
              onClick={nextStep}
              className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-6 sm:px-7 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-linear-to-br from-emerald-600 to-emerald-500 text-white border-none px-6 sm:px-8 py-2.5 rounded-lg text-sm font-bold cursor-pointer disabled:opacity-70"
            >
              {loading ? "Submitting…" : "Submit Application ✓"}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4.5 leading-relaxed">
          By submitting, you agree to our <span className="text-[#2d5986] cursor-pointer underline">Terms of Service</span> and{" "}
          <span className="text-[#2d5986] cursor-pointer underline">Privacy Policy</span>. Data protected under RBI regulations.
        </p>
      </div>
    </CustomerLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function FormSection({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3.5 mb-5 pb-3.5 border-b-2 border-slate-100">
        <span className="text-2xl leading-none">{icon}</span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 m-0">{title}</h2>
          <p className="text-[13px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">{children}</div>;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

const InputEl = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }>(
  ({ icon, className, ...props }, ref) => (
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] pointer-events-none">{icon}</span>}
      <input
        ref={ref}
        {...props}
        className={`w-full border border-gray-200 rounded-lg py-2.5 ${icon ? "pl-10" : "pl-3.5"} pr-3.5 text-sm text-slate-800 bg-gray-50 outline-none box-border focus:border-[#2d5986] ${className ?? ""}`}
      />
    </div>
  )
);
InputEl.displayName = "InputEl";

const SelectEl = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...props }, ref) => (
    <select
      ref={ref}
      {...props}
      className="w-full border border-gray-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-800 bg-gray-50 outline-none box-border focus:border-[#2d5986]"
    >
      {children}
    </select>
  )
);
SelectEl.displayName = "SelectEl";

function EmiItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{label}</span>
      <span className={`font-extrabold tracking-tight ${highlight ? "text-[22px] text-sky-700" : "text-lg text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}