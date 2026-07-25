// Path: frontend/src/app/ca/apply/page.tsx
"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaBuilding,
  FaMoneyBillWave, FaCheckCircle, FaUserTie,
  FaCalendarAlt, FaArrowLeft, FaUpload, FaFilePdf,
  FaFileImage, FaTrash, FaShieldAlt, FaCar,
} from "react-icons/fa";
import CALayout from "./../../../components/layout/ca/CALayout";

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

type DocKey =
  | "pan_card" | "aadhaar_card" | "bank_statement" | "passport_photo"
  | "co_applicant_kyc" | "salary_slip" | "itr_3years"
  | "electricity_bill" | "gst_registration" | "udyam_registration"
  | "property_paper" | "seller_buyer_agreement"
  | "vehicle_details_doc" | "audit_report";

interface DocConfig { key: DocKey; label: string; description: string; required: boolean; }

/* ── DOCUMENT MAP (PAN and Aadhaar now separate upload fields) ── */
const DOC_MAP: Record<string, DocConfig[]> = {
  "personal_loan__salaried": [
    { key: "pan_card",         label: "PAN Card",                         description: "Clear copy of PAN card",                        required: true },
    { key: "aadhaar_card",     label: "Aadhaar Card",                     description: "Clear copy of Aadhaar (front & back)",          required: true },
    { key: "bank_statement",   label: "1-Year Bank Statement",            description: "Complete 12 months bank statement",             required: true },
    { key: "passport_photo",   label: "Photo & ID Proof",                 description: "Passport size photo",                           required: true },
    { key: "co_applicant_kyc", label: "Co-Applicant KYC",                 description: "Co-applicant PAN & Aadhaar",                    required: true },
    { key: "salary_slip",      label: "Last 3 Months Salary Slips",       description: "Latest 3 months salary slips",                  required: true },
    { key: "itr_3years",       label: "Last 3 Years ITR",                 description: "ITR for last 3 financial years",                required: true },
  ],
  "personal_loan__business": [
    { key: "pan_card",         label: "PAN Card",                         description: "Clear copy of PAN card",                        required: true },
    { key: "aadhaar_card",     label: "Aadhaar Card",                     description: "Clear copy of Aadhaar (front & back)",          required: true },
    { key: "bank_statement",   label: "1-Year Bank Statement",            description: "Complete 12 months bank statement",             required: true },
    { key: "passport_photo",   label: "Photo & ID Proof",                 description: "Passport size photo",                           required: true },
    { key: "co_applicant_kyc", label: "Co-Applicant KYC",                 description: "Co-applicant PAN & Aadhaar",                    required: true },
    { key: "itr_3years",       label: "Last 3 Years ITR + Audit Reports", description: "ITR, GST returns, P&L, Balance Sheet",          required: true },
  ],
  "home_loan__salaried": [
    { key: "pan_card",               label: "PAN Card",                        description: "Clear copy of PAN card",                   required: true },
    { key: "aadhaar_card",           label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",     required: true },
    { key: "bank_statement",         label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",        required: true },
    { key: "passport_photo",         label: "Photo & ID Proof",               description: "Passport size photo",                      required: true },
    { key: "co_applicant_kyc",       label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",               required: true },
    { key: "seller_buyer_agreement", label: "Seller Buyer Agreement",          description: "Property sale/purchase agreement",         required: true },
    { key: "salary_slip",            label: "Last 3 Months Salary Slips",     description: "Latest 3 months salary slips",             required: true },
    { key: "itr_3years",             label: "Last 3 Years ITR",               description: "ITR for last 3 financial years",           required: true },
  ],
  "home_loan__business": [
    { key: "pan_card",               label: "PAN Card",                        description: "Clear copy of PAN card",                   required: true },
    { key: "aadhaar_card",           label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",     required: true },
    { key: "bank_statement",         label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",        required: true },
    { key: "passport_photo",         label: "Photo & ID Proof",               description: "Passport size photo",                      required: true },
    { key: "co_applicant_kyc",       label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",               required: true },
    { key: "seller_buyer_agreement", label: "Seller Buyer Agreement",          description: "Property sale/purchase agreement",         required: true },
    { key: "itr_3years",             label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",    required: true },
  ],
  "business_loan__salaried": [
    { key: "pan_card",          label: "PAN Card",                        description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",      label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",    label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",    label: "Photo & ID Proof",               description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc",  label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "electricity_bill",  label: "Electricity Bill",               description: "Latest electricity bill",                      required: true },
    { key: "gst_registration",  label: "GST Registration",               description: "GST registration certificate",                 required: true },
    { key: "udyam_registration",label: "Udyam Registration",             description: "Udyam/MSME registration certificate",          required: true },
    { key: "itr_3years",        label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",        required: true },
  ],
  "business_loan__business": [
    { key: "pan_card",          label: "PAN Card",                        description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",      label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",    label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",    label: "Photo & ID Proof",               description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc",  label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "electricity_bill",  label: "Electricity Bill",               description: "Latest electricity bill",                      required: true },
    { key: "gst_registration",  label: "GST Registration",               description: "GST registration certificate",                 required: true },
    { key: "udyam_registration",label: "Udyam Registration",             description: "Udyam/MSME registration certificate",          required: true },
    { key: "itr_3years",        label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",        required: true },
  ],
  "working_capital_loan__salaried": [
    { key: "pan_card",          label: "PAN Card",                        description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",      label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",    label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",    label: "Photo & ID Proof",               description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc",  label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "electricity_bill",  label: "Electricity Bill",               description: "Latest electricity bill",                      required: true },
    { key: "gst_registration",  label: "GST Registration",               description: "GST registration certificate",                 required: true },
    { key: "udyam_registration",label: "Udyam Registration",             description: "Udyam/MSME registration certificate",          required: true },
    { key: "itr_3years",        label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",        required: true },
  ],
  "working_capital_loan__business": [
    { key: "pan_card",          label: "PAN Card",                        description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",      label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",    label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",    label: "Photo & ID Proof",               description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc",  label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "electricity_bill",  label: "Electricity Bill",               description: "Latest electricity bill",                      required: true },
    { key: "gst_registration",  label: "GST Registration",               description: "GST registration certificate",                 required: true },
    { key: "udyam_registration",label: "Udyam Registration",             description: "Udyam/MSME registration certificate",          required: true },
    { key: "itr_3years",        label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",        required: true },
  ],
  "loan_against_property__salaried": [
    { key: "pan_card",         label: "PAN Card",                         description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",     label: "Aadhaar Card",                     description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",   label: "1-Year Bank Statement",            description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",   label: "Photo & ID Proof",                description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc", label: "Co-Applicant KYC",                description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "property_paper",   label: "Property Papers",                 description: "All property ownership documents",             required: true },
    { key: "salary_slip",      label: "Last 3 Months Salary Slips",      description: "Latest 3 months salary slips",                 required: true },
    { key: "itr_3years",       label: "Last 3 Years ITR",                description: "ITR for last 3 financial years",               required: true },
  ],
  "loan_against_property__business": [
    { key: "pan_card",         label: "PAN Card",                         description: "Clear copy of PAN card",                       required: true },
    { key: "aadhaar_card",     label: "Aadhaar Card",                     description: "Clear copy of Aadhaar (front & back)",         required: true },
    { key: "bank_statement",   label: "1-Year Bank Statement",            description: "Complete 12 months bank statement",            required: true },
    { key: "passport_photo",   label: "Photo & ID Proof",                description: "Passport size photo",                          required: true },
    { key: "co_applicant_kyc", label: "Co-Applicant KYC",                description: "Co-applicant PAN & Aadhaar",                   required: true },
    { key: "property_paper",   label: "Property Papers",                 description: "All property ownership documents",             required: true },
    { key: "itr_3years",       label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",         required: true },
  ],
  "vehicle_loan__salaried": [
    { key: "pan_card",           label: "PAN Card",                        description: "Clear copy of PAN card",                     required: true },
    { key: "aadhaar_card",       label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",       required: true },
    { key: "bank_statement",     label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",          required: true },
    { key: "passport_photo",     label: "Photo & ID Proof",               description: "Passport size photo",                        required: true },
    { key: "co_applicant_kyc",   label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                 required: true },
    { key: "itr_3years",         label: "Last 3 Years ITR",               description: "ITR for last 3 financial years",             required: true },
    { key: "vehicle_details_doc",label: "Vehicle Details / Quotation",    description: "Vehicle quotation or RC book details",       required: true },
  ],
  "vehicle_loan__business": [
    { key: "pan_card",           label: "PAN Card",                        description: "Clear copy of PAN card",                     required: true },
    { key: "aadhaar_card",       label: "Aadhaar Card",                    description: "Clear copy of Aadhaar (front & back)",       required: true },
    { key: "bank_statement",     label: "1-Year Bank Statement",           description: "Complete 12 months bank statement",          required: true },
    { key: "passport_photo",     label: "Photo & ID Proof",               description: "Passport size photo",                        required: true },
    { key: "co_applicant_kyc",   label: "Co-Applicant KYC",               description: "Co-applicant PAN & Aadhaar",                 required: true },
    { key: "itr_3years",         label: "Last 3 Years ITR + Audit Reports",description: "ITR, GST returns, P&L, Balance Sheet",      required: true },
    { key: "vehicle_details_doc",label: "Vehicle Details / Quotation",    description: "Vehicle quotation or RC book details",       required: true },
  ],
};

const LOAN_SERVICES = [
  { value: "personal_loan",         label: "Personal Loan",         icon: "👤" },
  { value: "home_loan",             label: "Home Loan",             icon: "🏠" },
  { value: "business_loan",         label: "Business Loan",         icon: "🏢" },
  { value: "working_capital_loan",  label: "Working Capital Loan",  icon: "💼" },
  { value: "loan_against_property", label: "Loan Against Property", icon: "🏗️" },
  { value: "vehicle_loan",          label: "Vehicle Loan",          icon: "🚗" },
];

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CAApplyPage() {
  const router = useRouter();

  const [step, setStep]           = useState(1);
  const totalSteps                = 5;
  const [error, setError]         = useState("");
  const [banks, setBanks]         = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [userName, setUserName]   = useState("CA");

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
  const [documents, setDocuments]     = useState<Partial<Record<DocKey, UploadedFile>>>({});
  const [docErrors, setDocErrors]     = useState<Partial<Record<DocKey, string>>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/banks`)
      .then(r => r.json())
      .then(d => { if (d.success) setBanks(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { setDocuments({}); setDocErrors({}); }, [formData.loan_service, formData.employment_type]);

  const docKey      = `${formData.loan_service}__${formData.employment_type}`;
  const visibleDocs = DOC_MAP[docKey] || [];

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
  const handleDocUpload = (key: DocKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setDocErrors(p => ({ ...p, [key]: "Max 5MB" })); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { setDocErrors(p => ({ ...p, [key]: "JPG, PNG or PDF only" })); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(p => ({
        ...p,
        [key]: { name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string,
          uploadedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
      }));
      setDocErrors(p => ({ ...p, [key]: "" }));
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (key: DocKey) => {
    setDocuments(p => { const n = { ...p }; delete n[key]; return n; });
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
      const newDocErrors: Partial<Record<DocKey, string>> = {};
      visibleDocs.filter(d => d.required).forEach(d => {
        if (!documents[d.key]) { newDocErrors[d.key] = "Required"; hasError = true; }
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
    Object.entries(documents).forEach(([key, file]) => {
      if (file) documentMeta[key] = { name: file.name, uploadedAt: file.uploadedAt, dataUrl: file.dataUrl };
    });

    try {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          pan_number: formData.pan.toUpperCase(),
          aadhaar_number: formData.aadhaar,
          loan_service: formData.loan_service,
          loan_type: formData.loan_service,
          documents: documentMeta,
        }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/"); return; }
      if (data.success) { setSubmitted(true); setTimeout(() => router.push("/ca/loans"), 2500); }
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
      <CALayout s={s} userName={userName} handleLogout={handleLogout}>
        <div className="ca-success-wrap">
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
          .ca-success-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 120px);
            padding: 20px;
          }
        `}</style>
      </CALayout>
    );
  }

  const stepLabels = ["Customer", "Employment", "KYC", "Loan", "Documents"];
  const stepIcons  = ["👤", "💼", "🛡️", "💰", "📄"];

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="ca-apply-wrap">

        {/* Header */}
        <div style={s.topBar}>
          <div>
            <button style={s.backBtn} onClick={() => router.push("/ca/loans")}>
              <FaArrowLeft size={12} /> Back to Applications
            </button>
            <h1 style={s.pageTitle}>New Loan Application</h1>
            <div style={s.pageSub}>Filing on behalf of customer · Step {step} of {totalSteps}</div>
          </div>
        </div>

        {/* CA Notice */}
        <div style={s.caNotice}>
          <FaUserTie size={16} color="#92400e" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#92400e" }}>
            <strong>CA Filing Mode</strong> — This application will be linked to your CA account. Your name, email and firm will be recorded with this application.
          </div>
        </div>

        {/* ── STEPPER ── */}
        <div className="ca-stepper" style={s.stepperCard}>
          {stepLabels.map((label, i) => {
            const n = i + 1, isActive = n === step, isDone = n < step;
            return (
              <div key={n} style={s.stepItem}>
                <div style={s.stepCol}>
                  <div className="ca-step-circle" style={{ ...s.stepCircle, background: isDone ? "#10b981" : isActive ? "#1e3a5f" : "#e2e8f0", color: isDone || isActive ? "#fff" : "#94a3b8", boxShadow: isActive ? "0 0 0 4px rgba(30,58,95,0.2)" : "none", transform: isActive ? "scale(1.1)" : "scale(1)" }}>
                    {isDone ? <FaCheckCircle size={13} /> : <span style={{ fontSize: 14 }}>{stepIcons[i]}</span>}
                  </div>
                  <span className="ca-step-label" style={{ ...s.stepLabel, color: isActive ? "#1e3a5f" : isDone ? "#10b981" : "#94a3b8", fontWeight: isActive ? 700 : 500 }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && <div style={{ ...s.stepLine, background: isDone ? "#10b981" : "#e2e8f0" }} />}
              </div>
            );
          })}
        </div>

        {/* ── FORM CARD ── */}
        <div className="ca-form-card" style={s.formCard}>
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
                      <option value="salaried">Salaried</option>
                      <option value="business">Business / Self Employed</option>
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
                      {indianStates.map(st => <option key={st} value={st}>{st}</option>)}
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
                <SelectEl name="loan_service" value={formData.loan_service} onChange={e => { setFormData(p => ({ ...p, loan_service: e.target.value })); setFieldErrors(p => ({ ...p, loan_service: "" })); }}>
                  <option value="">Select loan service</option>
                  {LOAN_SERVICES.map(ls => <option key={ls.value} value={ls.value}>{ls.icon} {ls.label}</option>)}
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
                  <SelectEl ref={setRef(17)} name="tenure" value={formData.tenure} onChange={handleChange}>
                    <option value="">Select tenure</option>
                    <option value="1">1 Year</option><option value="2">2 Years</option><option value="3">3 Years</option>
                    <option value="5">5 Years</option><option value="7">7 Years</option><option value="10">10 Years</option>
                    <option value="15">15 Years</option><option value="20">20 Years</option>
                  </SelectEl>
                </Field>
                {formData.loan_service === "vehicle_loan" && (
                  <Field label="Vehicle Details" required error={fieldErrors.vehicle_details}>
                    <InputEl ref={setRef(18)} onKeyDown={e => handleKeyDown(e, 18)} name="vehicle_details" placeholder="Make, Model, Year" value={formData.vehicle_details} onChange={handleChange} icon={<FaCar />} />
                  </Field>
                )}
              </TwoCol>
              {formData.loan_amount && formData.tenure && Number(formData.loan_amount) >= 10000 && (
                <div style={s.emiBox}>
                  <div style={s.emiTitle}>📊 Loan Summary Preview</div>
                  <div className="ca-emi-grid" style={s.emiGrid}>
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
            <FormSection title="Upload Documents" subtitle="Upload customer documents based on loan type and employment" icon="📄">
              {(!formData.loan_service || !formData.employment_type) && (
                <div style={s.docWarning}>⚠️ Please complete Step 2 (Employment) and Step 4 (Loan Service) first.</div>
              )}
              {visibleDocs.length > 0 && (
                <>
                  <div style={s.docBanner}>
                    <FaUpload size={14} color="#0369a1" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: "#0284c7" }}>
                      <strong>{LOAN_SERVICES.find(l => l.value === formData.loan_service)?.label}</strong> — {formData.employment_type === "salaried" ? "Salaried" : "Business / Self Employed"} · JPG, PNG, PDF · Max 5MB · * = required
                    </div>
                  </div>
                  <div className="ca-doc-grid" style={s.docGrid}>
                    {visibleDocs.map(doc => {
                      const uploaded = documents[doc.key];
                      const err      = docErrors[doc.key];
                      const isPdf    = uploaded?.type === "application/pdf";
                      return (
                        <div key={doc.key} style={{ ...s.docCard, borderColor: err ? "#fca5a5" : uploaded ? "#86efac" : "#d1d5db", background: uploaded ? "#f0fdf4" : "#fff" }}>
                          <div style={s.docCardTop}>
                            <div style={{ flex: 1 }}>
                              <div style={s.docLabel}>{doc.label}{doc.required && <span style={{ color: "#ef4444" }}> *</span>}</div>
                              <div style={s.docDesc}>{doc.description}</div>
                            </div>
                            {uploaded && <button style={s.docRemove} onClick={() => removeDoc(doc.key)}><FaTrash size={11} /></button>}
                          </div>
                          {uploaded ? (
                            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                              {isPdf ? (
                                <div style={s.pdfPreview}><FaFilePdf size={24} color="#ef4444" /><span style={s.docFileName}>{uploaded.name}</span></div>
                              ) : (
                                <img src={uploaded.dataUrl} alt={doc.label} style={s.docImg} />
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
                              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display: "none" }} onChange={e => handleDocUpload(doc.key, e)} />
                              <FaFileImage size={22} color="#94a3b8" />
                              <span style={s.docUploadText}>Click to upload</span>
                              <span style={s.docUploadSub}>JPG, PNG, PDF · Max 5MB</span>
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
          <div className="ca-nav-row" style={s.navRow}>
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
          .ca-form-card {
            padding: 20px 18px !important;
          }

          .ca-stepper {
            padding: 14px 12px !important;
            overflow-x: auto;
          }

          .ca-step-circle {
            width: 30px !important;
            height: 30px !important;
          }

          .ca-step-label {
            font-size: 9px !important;
          }

          .ca-emi-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .ca-doc-grid {
            grid-template-columns: 1fr !important;
          }

          .ca-nav-row {
            flex-direction: column-reverse;
            gap: 10px;
          }

          .ca-nav-row button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .ca-form-card {
            padding: 16px 14px !important;
          }

          .ca-step-label {
            display: none;
          }
        }
      `}</style>
    </CALayout>
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

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

