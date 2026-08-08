// Path: frontend/src/app/loans/[id]/edit/page.tsx
"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaArrowLeft, FaUser, FaEnvelope, FaPhone,
  FaBuilding, FaMoneyBillWave, FaCalendarAlt, FaFilePdf,
  FaFileImage, FaTrash, FaUpload, FaLock, FaEye,
} from "react-icons/fa";
import CustomerLayout from "../../../../components/layout/customer/CustomerLayout";

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

interface UploadedFile {
  name: string;
  url: string;
  uploadedAt?: string;
}

interface PendingFile {
  name: string;
  file: File;
  previewUrl: string;
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

const isPdfFile = (name: string) => name.toLowerCase().endsWith(".pdf");

/* Normalizes whatever the backend has saved for `documents` into a
   { [slugifiedDocName]: UploadedFile } map. */
function normalizeDocuments(raw: any): Record<string, UploadedFile> {
  const result: Record<string, UploadedFile> = {};
  if (!raw) return result;

  const extract = (obj: any): UploadedFile | null => {
    if (!obj || typeof obj !== "object") return null;
    const url =
      obj.url || obj.file_path || obj.path || obj.filePath || obj.fileUrl || obj.file_url || obj.dataUrl || "";
    const name =
      obj.name || obj.file_name || obj.filename || obj.fileName ||
      (typeof url === "string" && !url.startsWith("data:") ? url.split("/").pop() : "") || "Document";
    if (!url) return null;
    return { name, url, uploadedAt: obj.uploadedAt || obj.uploaded_at || obj.createdAt };
  };

  if (Array.isArray(raw)) {
    raw.forEach((item: any) => {
      const key = item.doc_type || item.key || item.type || item.docKey || "";
      if (!key) return;
      const doc = extract(item);
      if (doc) result[slugify(key)] = doc;
    });
    return result;
  }

  if (typeof raw === "object") {
    Object.entries(raw).forEach(([key, value]) => {
      if (typeof value === "string") {
        if (value) result[slugify(key)] = { name: value.split("/").pop() || "Document", url: value };
        return;
      }
      const doc = extract(value);
      if (doc) result[slugify(key)] = doc;
    });
  }

  return result;
}

/* Loose fallback matcher: if the exact slug of a document type name
   doesn't match any saved key (e.g. this application was submitted
   before this document type existed, or names differ slightly),
   try to find a saved key that shares meaningful words with it. */
function findExistingDoc(
  doc: DocumentTypeOption,
  existingDocuments: Record<string, UploadedFile>
): UploadedFile | undefined {
  const exactKey = slugify(doc.document_name);
  if (existingDocuments[exactKey]) return existingDocuments[exactKey];

  const docWords = exactKey.split("_").filter(w => w.length > 2);
  let bestMatch: UploadedFile | undefined;

  for (const [savedKey, savedDoc] of Object.entries(existingDocuments)) {
    const savedWords = savedKey.split("_").filter(w => w.length > 2);
    const overlap = docWords.filter(w => savedWords.includes(w));
    if (overlap.length > 0) {
      bestMatch = savedDoc;
      break;
    }
  }
  return bestMatch;
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params?.id as string;

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [banks, setBanks]         = useState<any[]>([]);
  const [userName, setUserName]   = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [appStatus, setAppStatus] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  const [existingDocuments, setExistingDocuments] = useState<Record<string, UploadedFile>>({});
  const [replacedDocuments, setReplacedDocuments] = useState<Record<number, PendingFile>>({});

  const [loanServices, setLoanServices]       = useState<LoanServiceOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeOption[]>([]);
  const [stateOptions, setStateOptions]       = useState<StateOption[]>([]);
  const [tenureOptions, setTenureOptions]     = useState<TenureOption[]>([]);
  const [documentTypes, setDocumentTypes]     = useState<DocumentTypeOption[]>([]);
  const [tenuresLoading, setTenuresLoading]       = useState(false);
  const [documentsLoading, setDocumentsLoading]   = useState(false);

  const isPending = appStatus === "pending";

  const inputsRef = useRef<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)[]>([]);
  const setRef = (i: number) =>
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

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserName(user.full_name || "User");
      setUserEmail(user.email || "");
    } catch {}
    fetchApplication(token);
    fetchBanks();

    fetch(`${CATALOG_API}/loan-services`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          console.log("[EditPage] loanServices loaded:", d.data);
          setLoanServices(d.data);
        }
      })
      .catch(() => {});

    fetch(`${CATALOG_API}/employment-types`)
      .then(r => r.json())
      .then(d => { if (d.success) setEmploymentTypes(d.data); })
      .catch(() => {});

    fetch(`${CATALOG_API}/states`)
      .then(r => r.json())
      .then(d => { if (d.success) setStateOptions(d.data); })
      .catch(() => {});
  }, [id]);



 const selectedLoanService = loanServices.find(ls => {
    if (String(ls.id) === formData.loan_service) return true;
    if (ls.name === formData.loan_service) return true;
    if (slugify(ls.name) === slugify(formData.loan_service)) return true;
    return false;
  });

  const selectedEmploymentType = employmentTypes.find(et => {
    if (String(et.id) === formData.employment_type) return true;
    if (et.name === formData.employment_type) return true;
    if (slugify(et.name) === slugify(formData.employment_type)) return true;
    return false;
  });

  useEffect(() => {
    console.log("[EditPage] formData.loan_service:", formData.loan_service);
    console.log("[EditPage] selectedLoanService match:", selectedLoanService);
  }, [formData.loan_service, selectedLoanService]);

  useEffect(() => {
    setTenureOptions([]);
    setDocumentTypes([]);
    if (!selectedLoanService) return;

    setTenuresLoading(true);
    fetch(`${CATALOG_API}/loan-tenures?loan_service_id=${selectedLoanService.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          console.log("[EditPage] tenureOptions loaded:", d.data);
          setTenureOptions(d.data);
        }
      })
      .catch(() => {})
      .finally(() => setTenuresLoading(false));

    setDocumentsLoading(true);
    const empParam = selectedEmploymentType
      ? `&employment_type_id=${selectedEmploymentType.id}`
      : "";
    fetch(`${CATALOG_API}/document-types?loan_service_id=${selectedLoanService.id}${empParam}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          console.log("[EditPage] documentTypes loaded:", d.data);
          setDocumentTypes(d.data);
        }
      })
      .catch(() => {})
      .finally(() => setDocumentsLoading(false));
  }, [selectedLoanService?.id, selectedEmploymentType?.id]);

  useEffect(() => {
    return () => {
      Object.values(replacedDocuments).forEach(doc => {
        if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      });
    };
  }, [replacedDocuments]);

  const fetchApplication = async (token: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/applications/${id}`,{
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();

      if (data.success) {
        const app = data.data;
        setAppStatus(app.status);
        setApplicationNumber(app.application_number || "");

        const rawDocs =
          app.documents ?? app.documents_data ?? app.uploaded_documents ??
          app.docs ?? app.files ?? null;

        console.log("[EditPage] raw documents from API:", rawDocs);

        const normalized = normalizeDocuments(rawDocs);
        console.log("[EditPage] normalized existingDocuments (keys):", Object.keys(normalized));
        setExistingDocuments(normalized);

        if (app.status !== "pending") {
          router.push(`/loans/${id}`);
          return;
        }

        setFormData({
          full_name:           app.full_name          || "",
          email:               app.email              || "",
          mobile:              app.mobile             || "",
          dob:                 app.dob ? app.dob.split("T")[0] : "",
          employment_type:     app.employment_type    || "",
          annual_income:       app.annual_income      ? String(app.annual_income) : "",
          address:             app.address            || "",
          city:                app.city               || "",
          state:               app.state              || "",
          pincode:             app.pincode            || "",
          bank_id:             app.bank_id            || "",
          loan_service:        app.loan_type          || "",
          loan_amount:         app.loan_amount        ? String(app.loan_amount) : "",
          tenure:              app.tenure             || "",
          loan_purpose:        app.loan_purpose       || "",
          vehicle_details:     app.vehicle_details    || "",
          co_applicant_name:   app.co_applicant_name  || "",
          co_applicant_aadhaar:app.co_applicant_aadhaar || "",
          co_applicant_pan:    app.co_applicant_pan   || "",
        });
      } else {
        setError(data.message || "Failed to load application.");
      }
    } catch (err) {
      console.error("[EditPage] fetchApplication error:", err);
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

  const handleDocUpload = (doc: DocumentTypeOption, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPending) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = (doc.max_size_mb || 5) * 1024 * 1024;
    if (file.size > maxBytes) { alert(`File must be under ${doc.max_size_mb}MB`); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];
    if (!allowedExts.includes(ext)) {
      alert(`Only ${allowedExts.join(", ").toUpperCase()} allowed`);
      return;
    }

    const prev = replacedDocuments[doc.id];
    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    setReplacedDocuments(p => ({
      ...p,
      [doc.id]: { name: file.name, file, previewUrl },
    }));

    e.target.value = "";
  };

  const cancelReplace = (docId: number) => {
    setReplacedDocuments(p => {
      const n = { ...p };
      const doc = n[docId];
      if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      delete n[docId];
      return n;
    });
  };

  const openDoc = (url: string) => {
    if (!url) return;
    const fullUrl =
      url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")
        ? url
        : `${process.env.NEXT_PUBLIC_API_URL}${url.startsWith("/") ? url : `/${url}`}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

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

  const handleSubmit = async () => {
    if (!validate()) { setError("Please fix the errors below."); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setSaving(true); setError(""); setSuccess("");

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v ?? ""));

      Object.entries(replacedDocuments).forEach(([docId, doc]) => {
        if (!doc?.file) return;
        const docConfig = documentTypes.find(d => d.id === Number(docId));
        const key = docConfig ? slugify(docConfig.document_name) : `doc_${docId}`;
        fd.append(key, doc.file, doc.file.name);
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/applications/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (res.status === 400 && data.message?.includes("pending")) {
        setError("This application can no longer be edited.");
        setTimeout(() => router.push(`/loans/${id}`), 2000);
        return;
      }

      if (data.success) {
        setSuccess("Application updated successfully!");

        const rawDocs =
          data.data?.documents ?? data.data?.documents_data ??
          data.data?.uploaded_documents ?? data.data?.docs ?? data.data?.files ?? null;

        if (rawDocs) {
          setExistingDocuments(normalizeDocuments(rawDocs));
        }

        Object.values(replacedDocuments).forEach(doc => {
          if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
        });
        setReplacedDocuments({});

        setTimeout(() => router.push(`/loans/${id}`), 1500);
      } else {
        setError(data.message || "Update failed.");
      }
    } catch (err) {
      console.error("[EditPage] handleSubmit error:", err);
      setError("Server error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
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
    <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="mb-4">
        <button
          onClick={() => router.push(`/loans/${id}`)}
          className="flex items-center gap-1.5 bg-transparent text-slate-500 border-none pb-2 text-[13px] font-medium cursor-pointer"
        >
          <FaArrowLeft size={12} /> Back to View
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Edit Application</h1>
        <div className="text-[13px] text-slate-400 mt-1">
          ID: <span className="font-mono text-[#1e3a5f]">{applicationNumber || `SN-${id?.slice(0, 4).toUpperCase()}`}</span>
          &nbsp;·&nbsp;
          <span className="text-amber-500 font-semibold">Pending — Editable</span>
        </div>
      </div>

      {/* KYC lock notice */}
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-[13px]">
        <FaLock size={13} className="text-amber-800 shrink-0" />
        <div className="text-amber-800">
          <strong>Aadhaar and PAN cannot be edited</strong> after submission for security reasons. Contact support if you need to update KYC details.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3.5 py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
          <div className="text-slate-400 text-sm">Loading…</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-9 shadow-sm">

          {/* ── SECTION 1: Personal ── */}
          <Section title="Personal Details" icon="👤" subtitle="Update basic applicant information">
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
                  {employmentTypes.map(et => (
                    <option key={et.id} value={et.name}>{et.name}</option>
                  ))}
                </SelectEl>
              </Field>
              <Field label="Annual Income (₹)" error={fieldErrors.annual_income}>
                <InputEl ref={setRef(5)} onKeyDown={e => handleKeyDown(e, 5)} name="annual_income" value={formData.annual_income} onChange={handleChange} placeholder="Annual income" icon={<FaMoneyBillWave />} />
              </Field>
            </TwoCol>
            <Field label="Full Address" error={fieldErrors.address}>
              <textarea
                ref={setRef(6) as any} name="address" value={formData.address} onChange={handleChange}
                placeholder="House/Flat No, Street, Area" rows={3}
                className="w-full border border-gray-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-800 bg-gray-50 outline-none box-border resize-y focus:border-[#2d5986]"
              />
            </Field>
            <TwoCol>
              <Field label="City" error={fieldErrors.city}>
                <InputEl ref={setRef(7)} onKeyDown={e => handleKeyDown(e, 7)} name="city" value={formData.city} onChange={handleChange} placeholder="City" icon={<FaBuilding />} />
              </Field>
              <Field label="State" error={fieldErrors.state}>
                <SelectEl ref={setRef(8)} name="state" value={formData.state} onChange={handleChange}>
                  <option value="">Select State</option>
                  {stateOptions.map(st => (
                    <option key={st.id} value={st.state_name}>{st.state_name}</option>
                  ))}
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
            <div className="mb-4">
              <Field label="Loan Service" required error={fieldErrors.loan_service}>
                <SelectEl name="loan_service" value={formData.loan_service} onChange={handleChange}>
                  <option value="">Select loan service</option>
                  {loanServices.map(ls => (
                    <option key={ls.id} value={ls.name}>{ls.name}</option>
                  ))}
                </SelectEl>
              </Field>
            </div>
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
                <SelectEl ref={setRef(15)} name="tenure" value={formData.tenure} onChange={handleChange} disabled={!selectedLoanService || tenuresLoading}>
                  <option value="">
                    {!selectedLoanService ? "Select loan service first" : tenuresLoading ? "Loading…" : "Select tenure"}
                  </option>
                  {tenureOptions.map(t => (
                    <option key={t.id} value={t.tenure_months / 12}>{formatTenure(t)}</option>
                  ))}
                </SelectEl>
              </Field>
              {formData.loan_service.toLowerCase().includes("vehicle") && (
                <Field label="Vehicle Details" error={fieldErrors.vehicle_details}>
                  <InputEl ref={setRef(16)} onKeyDown={e => handleKeyDown(e, 16)} name="vehicle_details" value={formData.vehicle_details} onChange={handleChange} placeholder="Make, Model, Year" icon={<FaBuilding />} />
                </Field>
              )}
            </TwoCol>

            {formData.loan_amount && formData.tenure && Number(formData.loan_amount) >= 10000 && (
              <div className="bg-linear-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl px-4 sm:px-5 py-4 mt-4.5">
                <div className="text-xs font-bold text-sky-700 mb-3">📊 Updated Loan Summary</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <EmiItem label="Amount" value={fmt(Number(formData.loan_amount))} />
                  <EmiItem label="Tenure" value={`${formData.tenure} Year${Number(formData.tenure) > 1 ? "s" : ""}`} />
                  <EmiItem label="Est. EMI @ 12% p.a." value={`₹${calcEMI(Number(formData.loan_amount), 12, Number(formData.tenure))}`} highlight />
                </div>
              </div>
            )}
          </Section>

          {/* ── SECTION 5: Documents ── */}
          <Section
            title="Documents"
            icon="📄"
            subtitle={isPending ? "View uploaded documents, or replace any of them" : "Documents are locked and cannot be changed"}
          >
            {isPending && (
              <div className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-4 py-3 text-[13px] mb-4">
                ℹ️ Click <strong>View</strong> to open a document, or <strong>Replace</strong> to upload a new file for that slot. Anything you don't touch stays as-is.
              </div>
            )}

            {documentsLoading && (
              <div className="text-sm text-slate-400 py-6 text-center">Loading documents…</div>
            )}

            {!documentsLoading && documentTypes.length === 0 && selectedLoanService && (
              <div className="text-sm text-slate-400 py-6 text-center">
                No documents configured for this loan service yet.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documentTypes.map(doc => {
                const pendingReplacement = replacedDocuments[doc.id];
                const existing = findExistingDoc(doc, existingDocuments);

                const displayName = pendingReplacement?.name || existing?.name;
                const displayUrl  = pendingReplacement?.previewUrl || existing?.url;
                const hasDoc      = Boolean(displayName && displayUrl);
                const allowedExts = doc.allowed_file_types || ["pdf", "jpg", "jpeg", "png"];

                return (
                  <div
                    key={doc.id}
                    className={`border-[1.5px] border-dashed rounded-xl px-3.5 py-3 flex flex-col gap-2
                      ${pendingReplacement ? "border-amber-400 bg-amber-50" : hasDoc ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="text-xs font-semibold text-slate-700 flex flex-col gap-1">
                      {doc.document_name}{doc.is_required && <span className="text-red-500"> *</span>}
                      {pendingReplacement && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full normal-case w-fit">
                          New file selected
                        </span>
                      )}
                    </div>

                    {hasDoc ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {isPdfFile(displayName!)
                            ? <FaFilePdf className="text-red-500" />
                            : <FaFileImage className="text-blue-500" />
                          }
                          <span className="text-[12.5px] text-slate-800 truncate max-w-[150px]">{displayName}</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openDoc(displayUrl!)}
                            className="flex items-center gap-1.5 bg-blue-600 text-white border-none px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-semibold"
                          >
                            <FaEye size={11} /> View
                          </button>

                          {isPending && !pendingReplacement && (
                            <label className="flex items-center gap-1.5 justify-center bg-slate-100 text-slate-600 border border-slate-300 px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-semibold">
                              <input
                                type="file"
                                accept={allowedExts.map(t => `.${t}`).join(",")}
                                className="hidden"
                                onChange={e => handleDocUpload(doc, e)}
                              />
                              Replace
                            </label>
                          )}

                          {isPending && pendingReplacement && (
                            <button
                              type="button"
                              onClick={() => cancelReplace(doc.id)}
                              className="flex items-center gap-1.5 bg-red-50 border-none text-red-500 px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-semibold shrink-0"
                            >
                              <FaTrash size={11} /> Undo
                            </button>
                          )}
                        </div>
                      </div>
                    ) : isPending ? (
                      <label className="flex flex-col items-center gap-1.5 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-lg py-3.5 px-2 cursor-pointer">
                        <input
                          type="file"
                          accept={allowedExts.map(t => `.${t}`).join(",")}
                          className="hidden"
                          onChange={e => handleDocUpload(doc, e)}
                        />
                        <FaUpload size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-500">Click to upload</span>
                      </label>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Not uploaded</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── SUBMIT ── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 mt-7 pt-5 border-t border-slate-100">
            <button
              onClick={() => router.push(`/loans/${id}`)}
              className="bg-slate-100 text-slate-600 border-none px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-7 py-2.5 rounded-lg text-sm font-bold cursor-pointer disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save Changes ✓"}
            </button>
          </div>

        </div>
      )}
    </CustomerLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function Section({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="flex items-start gap-3 mb-4.5 pb-3 border-b-2 border-slate-100">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="text-[15px] font-extrabold text-slate-800">{title}</div>
          <div className="text-[13px] text-slate-400 mt-0.5">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">{children}</div>;
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
      <span className={`font-extrabold ${highlight ? "text-lg text-sky-700" : "text-[17px] text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}