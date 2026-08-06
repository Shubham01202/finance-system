// Path: frontend/src/app/dsa/loans/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FaArrowLeft, FaEdit, FaCheckCircle, FaClock,
  FaTimesCircle, FaUser, FaIdCard, FaMoneyBillWave,
  FaUserTie, FaMapMarkerAlt, FaFilePdf, FaFileImage, FaEye,
  FaRegIdCard,
} from "react-icons/fa";
import DSALayout from "../../../../components/layout/dsa/DSALayout";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface DocEntry {
  name: string;
  uploadedAt: string;
  filePath?: string;
  dataUrl?: string;
  url?: string;
  fileUrl?: string;
  path?: string;
  file_path?: string;
  document_url?: string;
  documentUrl?: string;
}

interface Application {
  id: string;
  application_number?: string;
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
  documents: Record<string, DocEntry>;
  dsa_name?: string;
  dsa_email?: string;
 dsa_agency?: string;
  applied_by?: string;
}

const statusConfig = {
  approved: { color: "#10b981", bg: "#d1fae5", icon: <FaCheckCircle size={14} />, label: "Approved", text: "Application has been approved." },
  pending:  { color: "#f59e0b", bg: "#fef3c7", icon: <FaClock size={14} />,       label: "Pending",  text: "Application is under review."  },
  rejected: { color: "#ef4444", bg: "#fee2e2", icon: <FaTimesCircle size={14} />, label: "Rejected", text: "Application was not approved."  },
};

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DSAViewPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params?.id as string;

  const [app, setApp]           = useState<Application | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [userName, setUserName] = useState("DSA");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "dsa") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "DSA");
    } catch {}
    fetchApplication(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchApplication = async (token: string) => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dsa/loans/${id}`, {
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
    localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/");
  };

  const fmt     = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const mask    = (v: string, show = 4) => v ? "X".repeat(Math.max(0, v.length - show)) + v.slice(-show) : "—";

  const sc      = app ? (statusConfig[app.status] ?? statusConfig.pending) : statusConfig.pending;
  const canEdit = app?.status === "pending";

  const resolveDocUrl = (doc: any) => {
    if (!doc) return "";
    const raw =
      doc.dataUrl || doc.url || doc.fileUrl || doc.filePath ||
      doc.path || doc.file_path || doc.document_url || doc.documentUrl || "";

    if (!raw) return "";
    if (raw.startsWith("http") || raw.startsWith("data:")) return raw;

    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return `${base}/${raw.replace(/^\/+/, "")}`;
  };

  const openDataUrl = (dataUrl: string) => {
    const [header, data] = dataUrl.split(",");
    if (!header || !data) { alert("Invalid document."); return; }

    const mimeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const handleViewDoc = (doc: any) => {
    const url = resolveDocUrl(doc);
    if (!url) { alert("Document not found."); return; }
    if (url.startsWith("data:")) { openDataUrl(url); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ── Split documents into Aadhaar / PAN / Other ── */
  const allDocs = app?.documents ? Object.entries(app.documents) : [];
  const aadhaarDocs = allDocs.filter(([key]) => key.toLowerCase().includes("aadhaar"));
  const panDocs     = allDocs.filter(([key]) => key.toLowerCase().includes("pan"));
  const otherDocs   = allDocs.filter(
    ([key]) => !key.toLowerCase().includes("aadhaar") && !key.toLowerCase().includes("pan")
  );

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <DSALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="dsa-view-wrap">
        {/* Top Bar */}
        <div className="dsa-top-bar">
          <div>
            <button style={s.backBtn} onClick={() => router.push("/dsa/loans")}>
              <FaArrowLeft size={12} /> Back to Applications
            </button>
            <h1 style={s.pageTitle}>Application Details</h1>
           <div className="text-[13px] text-slate-400 mt-1">
            ID: <span className="font-mono text-[#1e3a5f]">{app?.application_number || `#${id?.slice(0, 8).toUpperCase()}`}</span>
          </div>
          </div>
          {app && (
            <div className="dsa-top-actions">
              <span style={{ ...s.statusBadge, color: sc.color, background: sc.bg }}>
                {sc.icon}&nbsp;{sc.label}
              </span>
              {canEdit ? (
                <button style={s.editBtn} onClick={() => router.push(`/dsa/loans/${id}/edit`)}>
                  <FaEdit size={13} /> Edit Application
                </button>
              ) : (
                <button style={s.editBtnDisabled} disabled title="Only pending applications can be edited">
                  <FaEdit size={13} /> Edit Disabled
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div style={s.errorBox}>⚠️ {error}</div>}

        {loading ? (
          <div style={s.center}><div style={s.spinner} /><div style={s.mutedText}>Loading application…</div></div>
        ) : !app ? null : (
          <>
            {/* Status Banner */}
            <div className="dsa-status-banner" style={{ borderColor: sc.color, background: sc.bg + "80" }}>
              <span style={{ color: sc.color, fontSize: 18 }}>{sc.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: sc.color, fontSize: 15 }}>Status: {sc.label}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sc.text}</div>
              </div>
              {!canEdit && (
                <div style={s.editLockNote}>🔒 Editing disabled — application is {app.status}</div>
              )}
            </div>

            <div className="dsa-grid">

              {/* Loan Details */}
              <InfoCard title="Loan Details" icon={<FaMoneyBillWave />} color="#1e3a5f">
                <Row label="Loan Service"  value={app.loan_type?.replace(/_/g, " ")} capitalize />
                <Row label="Bank"          value={app.bank_name} />
                <Row label="Loan Amount"   value={fmt(app.loan_amount)} />
                <Row label="Tenure"        value={`${app.tenure} Year${Number(app.tenure) > 1 ? "s" : ""}`} />
                <Row label="Purpose"       value={app.loan_purpose?.replace(/_/g, " ")} capitalize />
                {app.vehicle_details && <Row label="Vehicle Details" value={app.vehicle_details} />}
                <Row label="Applied On"    value={fmtDate(app.created_at)} />
                {app.updated_at && <Row label="Last Updated" value={fmtDate(app.updated_at)} />}
              </InfoCard>

              {/* Customer Personal Details */}
              <InfoCard title="Customer Details" icon={<FaUser />} color="#6366f1">
                <Row label="Full Name"     value={app.full_name} />
                <Row label="Email"         value={app.email} />
                <Row label="Mobile"        value={app.mobile} />
                <Row label="Date of Birth" value={fmtDate(app.dob)} />
                <Row label="Employment"    value={app.employment_type?.replace(/_/g, " ")} capitalize />
                <Row label="Annual Income" value={app.annual_income ? fmt(app.annual_income) : "—"} />
              </InfoCard>

              {/* Address */}
              <InfoCard title="Address Details" icon={<FaMapMarkerAlt />} color="#db2777">
                <Row label="Address" value={app.address} />
                <Row label="City"    value={app.city} />
                <Row label="State"   value={app.state} />
                <Row label="Pincode" value={app.pincode} />
              </InfoCard>

              {/* KYC */}
              <InfoCard title="KYC Details" icon={<FaIdCard />} color="#059669">
                <Row label="Aadhaar Number" value={mask(app.aadhaar_number, 4)} />
                <Row label="PAN Number"     value={mask(app.pan_number, 3)} />
                {app.co_applicant_name && (
                  <>
                    <div style={s.divider} />
                    <div style={s.subHeading}>Co-Applicant</div>
                    <Row label="Name"    value={app.co_applicant_name} />
                    <Row label="Aadhaar" value={app.co_applicant_aadhaar ? mask(app.co_applicant_aadhaar, 4) : "—"} />
                    <Row label="PAN"     value={app.co_applicant_pan    ? mask(app.co_applicant_pan, 3)    : "—"} />
                  </>
                )}
              </InfoCard>

              {/* DSA Info */}
              <InfoCard title="Filed By (DSA)" icon={<FaUserTie />} color="#f59e0b">
                <Row label="DSA Name"  value={app.dsa_name  || "—"} />
                <Row label="DSA Email" value={app.dsa_email || "—"} />
                <Row label="Agency Name"  value={app.dsa_agency  || "—"} />
                <Row label="Filed By"  value={app.applied_by === "dsa" ? "DSA Agent" : "Customer"} />
              </InfoCard>



              {/* Other Documents */}
              {otherDocs.length > 0 && (
                <div className="dsa-full-span" style={s.card}>
                  <div style={s.cardHead}>
                    <div style={{ ...s.cardIconWrap, background: "#ede9fe", color: "#7c3aed" }}>
                      <FaFileImage size={16} />
                    </div>
                    <div>
                      <div style={s.cardTitle}>Other Documents</div>
                      <div style={s.cardSub}>Additional documents submitted with this application</div>
                    </div>
                  </div>
                  <div className="dsa-doc-grid">
                    {otherDocs.map(([key, doc]) => (
                      <DocItem
                        key={key}
                        docKey={key}
                        doc={doc}
                        resolveDocUrl={resolveDocUrl}
                        handleViewDoc={handleViewDoc}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Edit Button */}
            <div style={s.bottomBar}>
              {canEdit ? (
                <button style={s.editBtn} onClick={() => router.push(`/dsa/loans/${id}/edit`)}>
                  <FaEdit size={14} /> Edit This Application
                </button>
              ) : (
                <div style={s.editLockFull}>
                  🔒 This application cannot be edited because it is <strong>{app.status}</strong>. Only <strong>pending</strong> applications can be modified.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .dsa-view-wrap {
          width: 100%;
        }

        .dsa-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 14px;
        }

        .dsa-top-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dsa-status-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1.5px solid;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .dsa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .dsa-full-span {
          grid-column: 1 / -1;
        }

        .dsa-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 4px;
        }

        @media (max-width: 640px) {
          .dsa-top-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .dsa-top-actions {
            justify-content: space-between;
          }

          .dsa-grid {
            grid-template-columns: 1fr;
          }

          .dsa-doc-grid {
            grid-template-columns: 1fr;
          }

          .dsa-status-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DSALayout>
  );
}

/* ─────────────────────────────────────────────
   SUB COMPONENTS
───────────────────────────────────────────── */
function InfoCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <div style={{ ...s.cardIconWrap, background: color + "18", color }}>{icon}</div>
        <div style={s.cardTitle}>{title}</div>
      </div>
      <div style={s.rowList}>{children}</div>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="dsa-row" style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowValue, textTransform: capitalize ? "capitalize" : "none" }}>{value || "—"}</span>
    </div>
  );
}

function DocItem({
  docKey, doc, resolveDocUrl, handleViewDoc,
}: {
  docKey: string;
  doc: DocEntry;
  resolveDocUrl: (doc: any) => string;
  handleViewDoc: (doc: any) => void;
}) {
  const url = resolveDocUrl(doc);
  return (
    <div style={s.docItem}>
      <div style={s.docItemIcon}>
        {doc.name?.endsWith(".pdf")
          ? <FaFilePdf size={20} color="#ef4444" />
          : <FaFileImage size={20} color="#6366f1" />
        }
      </div>
      <div style={s.docItemInfo}>
        <div style={s.docItemLabel}>{docKey.replace(/_/g, " ")}</div>
        <div style={s.docItemName}>{doc.name}</div>
        <div style={s.docItemDate}>Uploaded: {doc.uploadedAt}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          style={{ ...s.viewBtn, opacity: url ? 1 : 0.5, cursor: url ? "pointer" : "not-allowed" }}
          onClick={() => handleViewDoc(doc)}
          disabled={!url}
          title={url ? "View document" : "No file available"}
        >
          <FaEye size={11} />
        </button>
        <FaCheckCircle size={14} color="#10b981" />
      </div>
    </div>
  );
}

function DocCard({
  title, icon, color, docs, resolveDocUrl, handleViewDoc,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  docs: [string, DocEntry][];
  resolveDocUrl: (doc: any) => string;
  handleViewDoc: (doc: any) => void;
}) {
  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <div style={{ ...s.cardIconWrap, background: color + "18", color }}>{icon}</div>
        <div>
          <div style={s.cardTitle}>{title}</div>
          <div style={s.cardSub}>{docs.length > 0 ? `${docs.length} file(s) uploaded` : "Not uploaded"}</div>
        </div>
      </div>
      {docs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map(([key, doc]) => (
            <DocItem
              key={key}
              docKey={key}
              doc={doc}
              resolveDocUrl={resolveDocUrl}
              handleViewDoc={handleViewDoc}
            />
          ))}
        </div>
      ) : (
        <div style={s.noDocText}>No {title.toLowerCase()} uploaded.</div>
      )}
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
  backBtn:  { display: "flex", alignItems: "center", gap: 7, background: "transparent", color: "#64748b", border: "none", padding: "0 0 8px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  pageTitle:{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 },
  pageSub:  { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  editBtn:  { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  editBtnDisabled: { display: "flex", alignItems: "center", gap: 8, background: "#e2e8f0", color: "#94a3b8", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "not-allowed" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 },
  editLockNote: { marginLeft: "auto", fontSize: 12, color: "#94a3b8", fontStyle: "italic" },
  card:     { background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" },
  cardIconWrap: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle:{ fontSize: 15, fontWeight: 700, color: "#1e293b" },
  cardSub:  { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  rowList:  { display: "flex", flexDirection: "column" as const, gap: 12 },
  row:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const },
  rowLabel: { fontSize: 13, color: "#64748b", fontWeight: 500, flexShrink: 0 },
  rowValue: { fontSize: 13, color: "#1e293b", fontWeight: 600, textAlign: "right" as const, wordBreak: "break-all" as const },
  divider:  { height: 1, background: "#f1f5f9", margin: "8px 0" },
  subHeading:{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  docItem:  { display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0" },
  docItemIcon: { flexShrink: 0 },
  docItemInfo: { flex: 1, overflow: "hidden" },
  docItemLabel: { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "capitalize" as const },
  docItemName:  { fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 },
  docItemDate:  { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  viewBtn:  { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#1e3a5f" },
  noDocText:{ color: "#94a3b8", fontSize: 14, padding: "20px 0" },
  bottomBar:{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e2e8f0" },
  editLockFull: { background: "#fff7ed", border: "1px solid #fed7aa", color: "#92400e", borderRadius: 10, padding: "14px 18px", fontSize: 14 },
  center:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "80px 0" },
  spinner:  { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  mutedText:{ color: "#94a3b8", fontSize: 14 },
};