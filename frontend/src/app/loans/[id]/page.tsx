// Path: frontend/src/app/loans/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaArrowLeft, FaEdit, FaCheckCircle, FaClock, FaTimesCircle,
  FaUser, FaIdCard, FaMoneyBillWave, FaUniversity,
  FaMapMarkerAlt, FaFilePdf, FaFileImage, FaEye,
} from "react-icons/fa";
import CustomerLayout from "../../../components/layout/customer/CustomerLayout";
/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface DocumentEntry {
  name: string;
  uploadedAt: string;
  filePath?: string;
  url?: string;
}

interface Application {
  id: string;
  loan_type: string;
  loan_amount: number;
  tenure: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at?: string;
  bank_name: string;
  bank_id: string;
  full_name: string;
  email: string;
  mobile: string;
  dob: string;
  employment_type: string;
  annual_income: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaar_number: string;
  pan_number: string;
  co_applicant_name: string;
  co_applicant_aadhaar: string;
  co_applicant_pan: string;
  loan_purpose: string;
  vehicle_details: string;
  documents: Record<string, DocumentEntry>;
  ca_name?: string;
  ca_email?: string;
  ca_firm?: string;
  applied_by?: string;
  remarks?: string;
}

const statusConfig = {
  approved: { classes: "text-emerald-600 bg-emerald-100", border: "border-emerald-500", bannerBg: "bg-emerald-50", icon: <FaCheckCircle size={14} />, label: "Approved", text: "Your application has been approved." },
  pending:  { classes: "text-amber-600 bg-amber-100",     border: "border-amber-500",   bannerBg: "bg-amber-50",   icon: <FaClock size={14} />,       label: "Pending",  text: "Your application is under review." },
  rejected: { classes: "text-red-600 bg-red-100",         border: "border-red-500",     bannerBg: "bg-red-50",     icon: <FaTimesCircle size={14} />, label: "Rejected", text: "Your application was not approved." },
};

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL!;

const isPdfName = (name?: string) => !!name && name.toLowerCase().endsWith(".pdf");

const resolveDocUrl = (doc: DocumentEntry): string | null => {
  const raw = doc.url || doc.filePath;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:") || raw.startsWith("data:")) {
    return raw;
  }
  return `${API_ORIGIN}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CustomerViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserName(user.full_name || "User");
      setUserEmail(user.email || "");
    } catch {}
    fetchApplication(token);
  }, [id]);

  const fetchApplication = async (token: string) => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loan/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      if (res.status === 404) { setError("Application not found."); return; }
      const data = await res.json();
      if (data.success) setApp(data.data);
      else setError(data.message || "Failed to load application.");
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleViewDoc = (doc: DocumentEntry) => {
    const url = resolveDocUrl(doc);
    if (!url) { alert("This document has no viewable file."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const mask = (v: string, show = 4) => v ? "X".repeat(v.length - show) + v.slice(-show) : "—";

  const sc = app ? (statusConfig[app.status] ?? statusConfig.pending) : statusConfig.pending;
  const canEdit = app?.status === "pending";

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CustomerLayout userName={userName} userEmail={userEmail} handleLogout={handleLogout}>

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-start gap-3.5 mb-5">
        <div>
          <button
            onClick={() => router.push("/loans")}
            className="flex items-center gap-1.5 bg-transparent text-slate-500 border-none pb-2 text-[13px] font-medium cursor-pointer"
          >
            <FaArrowLeft size={12} /> Back to My Loans
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 m-0">Application Details</h1>
          <div className="text-[13px] text-slate-400 mt-1">
            ID: <span className="font-mono text-[#1e3a5f]">#{id?.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
        {app && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold ${sc.classes}`}>
              {sc.icon} {sc.label}
            </span>
            {canEdit ? (
              <button
                onClick={() => router.push(`/loans/${id}/edit`)}
                className="flex items-center gap-2 bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
              >
                <FaEdit size={13} /> Edit Application
              </button>
            ) : (
              <button
                disabled
                title="Only pending applications can be edited"
                className="flex items-center gap-2 bg-slate-200 text-slate-400 border-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold cursor-not-allowed"
              >
                <FaEdit size={13} /> Edit Disabled
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3.5 py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
          <div className="text-slate-400 text-sm">Loading application…</div>
        </div>
      ) : !app ? null : (
        <>
          {/* ── STATUS BANNER ── */}
          <div className={`flex items-center gap-3.5 border-[1.5px] ${sc.border} ${sc.bannerBg} rounded-xl px-4 sm:px-5 py-4 mb-5 flex-wrap`}>
            <span className={`text-lg ${sc.classes.split(" ")[0]}`}>{sc.icon}</span>
            <div>
              <div className={`font-bold text-[15px] ${sc.classes.split(" ")[0]}`}>Status: {sc.label}</div>
              <div className="text-[13px] text-slate-500 mt-0.5">{sc.text}</div>
            </div>
            {!canEdit && (
              <div className="ml-auto text-xs text-slate-400 italic">
                🔒 Editing is disabled — application is {app.status}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── LOAN DETAILS ── */}
            <InfoCard title="Loan Details" icon={<FaMoneyBillWave />} accent="#1e3a5f">
              <Row label="Loan Service" value={app.loan_type?.replace(/_/g, " ")} capitalize />
              <Row label="Bank" value={app.bank_name} />
              <Row label="Loan Amount" value={fmt(app.loan_amount)} />
              <Row label="Tenure" value={`${app.tenure} Year${Number(app.tenure) > 1 ? "s" : ""}`} />
              <Row label="Purpose" value={app.loan_purpose?.replace(/_/g, " ")} capitalize />
              {app.vehicle_details && <Row label="Vehicle Details" value={app.vehicle_details} />}
              <Row label="Applied On" value={fmtDate(app.created_at)} />
              {app.updated_at && <Row label="Last Updated" value={fmtDate(app.updated_at)} />}
            </InfoCard>

            {/* ── PERSONAL DETAILS ── */}
            <InfoCard title="Personal Details" icon={<FaUser />} accent="#6366f1">
              <Row label="Full Name" value={app.full_name} />
              <Row label="Email" value={app.email} />
              <Row label="Mobile" value={app.mobile} />
              <Row label="Date of Birth" value={fmtDate(app.dob)} />
              <Row label="Employment" value={app.employment_type?.replace(/_/g, " ")} capitalize />
              <Row label="Annual Income" value={app.annual_income ? fmt(app.annual_income) : "—"} />
            </InfoCard>

            {/* ── ADDRESS ── */}
            <InfoCard title="Address Details" icon={<FaMapMarkerAlt />} accent="#db2777">
              <Row label="Address" value={app.address} />
              <Row label="City" value={app.city} />
              <Row label="State" value={app.state} />
              <Row label="Pincode" value={app.pincode} />
            </InfoCard>

            {/* ── KYC ── */}
            <InfoCard title="KYC Details" icon={<FaIdCard />} accent="#059669">
              <Row label="Aadhaar Number" value={mask(app.aadhaar_number, 4)} />
              <Row label="PAN Number" value={mask(app.pan_number, 3)} />
              {app.co_applicant_name && (
                <>
                  <div className="h-px bg-slate-100 my-2" />
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Co-Applicant</div>
                  <Row label="Name" value={app.co_applicant_name} />
                  <Row label="Aadhaar" value={app.co_applicant_aadhaar ? mask(app.co_applicant_aadhaar, 4) : "—"} />
                  <Row label="PAN" value={app.co_applicant_pan ? mask(app.co_applicant_pan, 3) : "—"} />
                </>
              )}
            </InfoCard>

            {/* ── CA INFO (if applied by CA) ── */}
            {app.applied_by === "ca" && app.ca_name && (
              <InfoCard title="Filed by CA" icon={<FaUniversity />} accent="#f59e0b">
                <Row label="CA Name" value={app.ca_name} />
                <Row label="CA Email" value={app.ca_email || "—"} />
                <Row label="CA Firm" value={app.ca_firm || "—"} />
              </InfoCard>
            )}

            {/* ── DOCUMENTS ── */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm md:col-span-2">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-9.5 h-9.5 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 bg-violet-100 text-violet-600">
                  <FaFileImage size={16} />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-slate-800">Uploaded Documents</div>
                  <div className="text-xs text-slate-400 mt-0.5">Documents submitted with this application</div>
                </div>
              </div>

              {app.documents && Object.keys(app.documents).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
                  {Object.entries(app.documents).map(([key, doc]) => {
                    const docUrl = resolveDocUrl(doc);
                    return (
                      <div key={key} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3.5 py-3 border border-slate-200">
                        <div className="shrink-0">
                          {isPdfName(doc.name)
                            ? <FaFilePdf size={20} className="text-red-500" />
                            : <FaFileImage size={20} className="text-indigo-500" />
                          }
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-[11px] font-bold text-slate-400 capitalize">{key.replace(/_/g, " ")}</div>
                          <div className="text-[13px] font-semibold text-slate-800 truncate mt-0.5">{doc.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Uploaded: {doc.uploadedAt}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDoc(doc)}
                            disabled={!docUrl}
                            title={docUrl ? "View document" : "No file available"}
                            className={`flex items-center gap-1.5 bg-blue-600 text-white border-none px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold
                              ${docUrl ? "opacity-100 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                          >
                            <FaEye size={11} /> View
                          </button>
                          <FaCheckCircle size={14} className="text-emerald-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-5">No documents uploaded.</div>
              )}
            </div>

          </div>

          {/* ── BOTTOM EDIT BUTTON ── */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            {canEdit ? (
              <button
                onClick={() => router.push(`/loans/${id}/edit`)}
                className="flex items-center gap-2 bg-linear-to-br from-[#1e3a5f] to-[#2d5986] text-white border-none px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
              >
                <FaEdit size={14} /> Edit This Application
              </button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 text-amber-800 rounded-lg px-4 sm:px-5 py-3.5 text-sm">
                🔒 This application cannot be edited because it is <strong>{app.status}</strong>.
                Only <strong>pending</strong> applications can be modified.
              </div>
            )}
          </div>
        </>
      )}
    </CustomerLayout>
  );
}

/* ─────────────────────────────────────────────
   SUB COMPONENTS
───────────────────────────────────────────── */
function InfoCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div
          className="w-9.5 h-9.5 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: accent + "18", color: accent }}
        >
          {icon}
        </div>
        <div className="text-[15px] font-bold text-slate-800">{title}</div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[13px] text-slate-500 font-medium shrink-0">{label}</span>
      <span className={`text-[13px] text-slate-800 font-semibold text-right break-all ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}