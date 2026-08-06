"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaFileAlt,
  FaUsers,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaHistory,
  FaFileInvoiceDollar,
  FaRupeeSign,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaUser,
  FaIdCard,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaFileImage,
  FaFilePdf,
  FaEye,
  FaTimes,
  FaPaperPlane,
  FaArrowLeft,
} from "react-icons/fa";
import AdminLayout from "../../../../components/layout/admin/AdminLayout";

/* ───────────────── TYPES ───────────────── */
interface Remark {
  id: number;
  status: string;
  remark: string;
  created_at: string;
}

interface ApplicationDetail {
  id: string;
  status: string;
  full_name?: string;
  user_name?: string;
  loan_amount?: number;
  bank_name?: string;
  created_at?: string;

  // CA
  ca_name?: string;
  ca_email?: string;
  ca_firm?: string;

  // DSA
  dsa_name?: string;
  dsa_email?: string;
  agency_name?: string;

  applied_by?: string;

  [key: string]: any;
}

/* ───────────────── TOKENS ───────────────── */
const palette = {
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text900: "#0F172A",
  text500: "#64748B",
  text400: "#94A3B8",
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  success: "#16A34A",
  successBg: "rgba(34,197,94,0.12)",
  warning: "#B45309",
  warningBg: "rgba(234,179,8,0.16)",
  danger: "#DC2626",
  dangerBg: "rgba(239,68,68,0.12)",
};

const statusMap: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  approved: { bg: palette.successBg, color: palette.success, icon: <FaCheckCircle size={11} /> },
  rejected: { bg: palette.dangerBg, color: palette.danger, icon: <FaTimesCircle size={11} /> },
  pending: { bg: palette.warningBg, color: palette.warning, icon: <FaClock size={11} /> },
};

const API = process.env.NEXT_PUBLIC_API_URL;

/* ───────────────── STATUS BADGE ───────────────── */
function StatusBadge({ status, size = "md" }: { status?: string; size?: "sm" | "md" }) {
  const key = status?.toLowerCase() || "pending";
  const cfg = statusMap[key] || statusMap.pending;
  const big = size === "md";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: big ? "7px 14px" : "5px 11px",
        borderRadius: 20,
        fontSize: big ? 13 : 12,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        textTransform: "capitalize",
      }}
    >
      {cfg.icon}
      {status || "Pending"}
    </span>
  );
}

/* ───────────────── INLINE BANNER ───────────────── */
function Banner({ type, message }: { type: "success" | "error"; message: string }) {
  const isError = type === "error";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        marginBottom: 20,
        background: isError ? palette.dangerBg : palette.successBg,
        color: isError ? palette.danger : palette.success,
        border: `1px solid ${isError ? palette.danger : palette.success}33`,
      }}
    >
      {isError ? <FaExclamationTriangle /> : <FaCheckCircle />}
      {message}
    </div>
  );
}

/* ───────────────── STYLES ───────────────── */
const s: Record<string, React.CSSProperties> = {
  card: {
    background: palette.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    boxShadow: "0 1px 8px rgba(15,23,42,0.06)",
    border: `1px solid ${palette.border}`,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: palette.text900,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    letterSpacing: "-0.2px",
  },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  fieldLabel: {
    color: palette.text400,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  fieldValue: {
    fontWeight: 700,
    color: palette.text900,
    fontSize: 15,
  },

  subHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: palette.text400,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    gridColumn: "1 / -1",
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    background: palette.border,
    margin: "2px 0",
    gridColumn: "1 / -1",
  },

  docGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: palette.bg,
    borderRadius: 12,
    padding: "12px 14px",
    border: `1px solid ${palette.border}`,
  },
  docItemIcon: { flexShrink: 0 },
  docItemInfo: { flex: 1, minWidth: 0, overflow: "hidden" as const },
  docItemLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: palette.text400,
    textTransform: "capitalize" as const,
  },
  docItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: palette.text900,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
    marginTop: 2,
  },
  docItemDate: { fontSize: 11, color: palette.text400, marginTop: 2 },
  previewBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(37,99,235,0.1)",
    color: palette.primary,
    border: "none",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  noDocText: { color: palette.text400, fontSize: 14, padding: "16px 0" },

  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  modalBox: {
    background: palette.surface,
    borderRadius: 16,
    padding: 20,
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto" as const,
    position: "relative" as const,
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
  },
  modalCloseBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: palette.text500,
  },
  modalImg: {
    maxWidth: "100%",
    maxHeight: "75vh",
    borderRadius: 10,
    display: "block",
  },

  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    borderRadius: 12,
    border: `1.5px solid ${palette.border}`,
    outline: "none",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    color: palette.text900,
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  },

  approveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: `linear-gradient(135deg, #22c55e, ${palette.success})`,
    color: "#fff",
    border: "none",
    padding: "12px 22px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
  rejectBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: `linear-gradient(135deg, #ef4444, ${palette.danger})`,
    color: "#fff",
    border: "none",
    padding: "12px 22px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },

  sendBankerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: `linear-gradient(135deg, ${palette.primaryLight}, ${palette.primary})`,
    color: "#fff",
    border: "none",
    padding: "12px 22px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
  modalInput: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: `1.5px solid ${palette.border}`,
    outline: "none",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    color: palette.text900,
    boxSizing: "border-box" as const,
  },
  modalSecondaryBtn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    background: palette.surface,
    color: palette.text500,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  modalPrimaryBtn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: `linear-gradient(135deg, ${palette.primaryLight}, ${palette.primary})`,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  remarkItem: {
    padding: 16,
    borderRadius: 12,
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    marginBottom: 12,
  },
  remarkHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  remarkDate: { color: palette.text400, fontSize: 12.5 },
  remarkText: { color: "#334155", fontSize: 14, lineHeight: 1.55, margin: 0 },
};

/* ───────────────── PAGE ───────────────── */
export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"approved" | "rejected" | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  const [showBankerModal, setShowBankerModal] = useState(false);
  const [bankerEmail, setBankerEmail] = useState("");
  const [bankerSubject, setBankerSubject] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendingToBanker, setSendingToBanker] = useState(false);

  const token = () => localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminName");
    router.push("/");
  };

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    window.clearTimeout((window as any).__bannerTimeout);
    (window as any).__bannerTimeout = window.setTimeout(() => setBanner(null), 4500);
  };

  const fetchApplication = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/api/admin/applications/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      if (!res.ok) throw new Error(`Failed to load application (${res.status})`);

      const data = await res.json();

      if (!data?.application) {
        setApplication(null);
        return;
      }

      setApplication(data.application);
      setRemarks(Array.isArray(data.remarks) ? data.remarks : []);
    } catch (err: any) {
      console.error(err);
      showBanner("error", err.message || "Failed to load application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();

    const stored = localStorage.getItem("adminName");
    if (stored) setAdminName(stored);
  }, []);

  const updateStatus = async (status: "approved" | "rejected") => {
    try {
      setSaving(status);

      const res = await fetch(`${API}/api/admin/applications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status, remark }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBanner("error", data?.message || "Failed to update application.");
        return;
      }
      showBanner("success", `Application ${status} successfully.`);
      setRemark("");
      fetchApplication();
    } catch (err: any) {
      console.error(err);
      showBanner("error", "Something went wrong. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const openBankerModal = () => {
    setBankerEmail("");
    setBankerSubject(`Loan Application Details - ${application?.application_number || application?.id || ""}`);
    setConfirmSend(false);
    setShowBankerModal(true);
  };

  const closeBankerModal = () => {
    if (sendingToBanker) return;
    setShowBankerModal(false);
    setConfirmSend(false);
  };

  const handleSendToBanker = async () => {
    if (!bankerEmail.trim() || !bankerSubject.trim()) {
      showBanner("error", "Please enter both email and subject.");
      return;
    }

    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }

    try {
      setSendingToBanker(true);

      const res = await fetch(`${API}/api/admin/applications/${id}/send-to-banker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ email: bankerEmail, subject: bankerSubject }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBanner("error", data?.message || "Failed to send application to banker.");
        return;
      }

      showBanner("success", "Application details sent to banker successfully.");
      setShowBankerModal(false);
      setConfirmSend(false);
    } catch (err: any) {
      console.error(err);
      showBanner("error", "Something went wrong while sending the email.");
    } finally {
      setSendingToBanker(false);
    }
  };

  const fmt = (n?: number) => (n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—");

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const mask = (v?: string, show = 4) =>
    v ? "X".repeat(Math.max(v.length - show, 0)) + v.slice(-show) : "—";

  const isImageFile = (name?: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || "");
  const isPdfFile = (name?: string) => /\.pdf$/i.test(name || "");

  const buildDocUrl = (filePath?: string) => {
    if (!filePath) return "";
    const clean = filePath.replace(/^\/+/, "");
    return `${API}/${clean}`;
  };

  const handlePreview = (doc: { name: string; filePath?: string }) => {
    const url = buildDocUrl(doc.filePath);
    if (!url) return;

    if (isPdfFile(doc.name)) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setPreviewDoc({ url, name: doc.name });
    }
  };

  const globalStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

      @media (max-width: 900px) {
        .adm-field-grid { grid-template-columns: 1fr !important; }
      }

      .adm-back-btn:focus-visible,
      .adm-approve-btn:focus-visible,
      .adm-reject-btn:focus-visible,
      .adm-textarea:focus-visible {
        outline: 2px solid ${palette.primary};
        outline-offset: 2px;
      }

      .adm-back-btn { transition: background .15s ease, border-color .15s ease; }
      .adm-back-btn:hover { background: ${palette.bg}; border-color: ${palette.primary}; }

      .adm-approve-btn, .adm-reject-btn { transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
      .adm-approve-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(22,163,74,0.25); }
      .adm-reject-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(220,38,38,0.25); }
      .adm-approve-btn:disabled, .adm-reject-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      .adm-textarea:focus {
        border-color: ${palette.primary} !important;
        box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
      }

      .adm-preview-btn:hover { background: rgba(37,99,235,0.18) !important; }
    `}</style>
  );

  /* ── LOADING ── */
  if (loading) {
    return (
      <AdminLayout adminName={adminName} handleLogout={handleLogout}>
        {globalStyles}
        <div style={{ ...s.card, textAlign: "center", color: palette.text400, padding: "60px 24px" }}>
          Loading application…
        </div>
      </AdminLayout>
    );
  }

  /* ── NOT FOUND ── */
  if (!application) {
    return (
      <AdminLayout adminName={adminName} handleLogout={handleLogout}>
        {globalStyles}
        <button
          className="adm-back-btn"
          onClick={() => router.back()}
          style={{
            marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
            border: `1px solid ${palette.border}`, background: palette.surface,
            padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}
        >
          <FaArrowLeft size={12} /> Back
        </button>
        <div style={{ ...s.card, textAlign: "center", color: palette.text500, padding: "60px 24px" }}>
          <FaExclamationTriangle size={28} color={palette.text400} style={{ marginBottom: 12 }} />
          <div>Application not found.</div>
        </div>
      </AdminLayout>
    );
  }

  const applicantName = application.full_name || application.user_name || "—";

  return (
    <AdminLayout adminName={adminName} handleLogout={handleLogout}>
      {globalStyles}

      <button
        className="adm-back-btn"
        onClick={() => router.back()}
        style={{
          marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
          border: `1px solid ${palette.border}`, background: palette.surface,
          padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600,
        }}
      >
        <FaArrowLeft size={12} /> Back
      </button>

      {banner && <Banner type={banner.type} message={banner.message} />}

      {/* APPLICATION DETAILS */}
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <h2 style={{ ...s.cardTitle, marginBottom: 0 }}>
            <FaFileInvoiceDollar />
            Application Details
          </h2>
          <StatusBadge status={application.status} />
        </div>

        <div className="adm-field-grid" style={s.fieldGrid}>
          <div>
            <div style={s.fieldLabel}>Application ID</div>
            <div style={{ ...s.fieldValue, fontFamily: "monospace", fontSize: 13.5 }}>
              {application.application_number || application.id}
            </div>
          </div>

          <div>
            <div style={s.fieldLabel}>Applicant Name</div>
            <div style={s.fieldValue}>{applicantName}</div>
          </div>

          <div>
            <div style={s.fieldLabel}><FaUniversity size={10} /> Bank</div>
            <div style={s.fieldValue}>{application.bank_name || "—"}</div>
          </div>

          <div>
            <div style={s.fieldLabel}><FaRupeeSign size={10} /> Loan Amount</div>
            <div style={{ ...s.fieldValue, fontFamily: "'Outfit','Inter',sans-serif", color: palette.primary, fontVariantNumeric: "tabular-nums" }}>
              {application.loan_amount != null ? "₹" + Number(application.loan_amount).toLocaleString("en-IN") : "—"}
            </div>
          </div>

          <div>
            <div style={s.fieldLabel}><FaCalendarAlt size={10} /> Created At</div>
            <div style={s.fieldValue}>
              {application.created_at ? new Date(application.created_at).toLocaleString("en-IN") : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* LOAN DETAILS */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaMoneyBillWave />
          Loan Details
        </h2>
        <div className="adm-field-grid" style={s.fieldGrid}>
          <div>
            <div style={s.fieldLabel}>Loan Service</div>
            <div style={{ ...s.fieldValue, textTransform: "capitalize" }}>
              {application.loan_type ? String(application.loan_type).replace(/_/g, " ") : "—"}
            </div>
          </div>

          <div>
            <div style={s.fieldLabel}>Tenure</div>
            <div style={s.fieldValue}>
              {application.tenure ? `${application.tenure} Year${Number(application.tenure) > 1 ? "s" : ""}` : "—"}
            </div>
          </div>

          <div>
            <div style={s.fieldLabel}>Purpose</div>
            <div style={{ ...s.fieldValue, textTransform: "capitalize" }}>
              {application.loan_purpose ? String(application.loan_purpose).replace(/_/g, " ") : "—"}
            </div>
          </div>

          {application.vehicle_details && (
            <div>
              <div style={s.fieldLabel}>Vehicle Details</div>
              <div style={s.fieldValue}>{application.vehicle_details}</div>
            </div>
          )}

          {application.updated_at && (
            <div>
              <div style={s.fieldLabel}>Last Updated</div>
              <div style={s.fieldValue}>{fmtDate(application.updated_at)}</div>
            </div>
          )}
        </div>
      </div>

      {/* PERSONAL DETAILS */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaUser />
          Personal Details
        </h2>
        <div className="adm-field-grid" style={s.fieldGrid}>
          <div>
            <div style={s.fieldLabel}>Full Name</div>
            <div style={s.fieldValue}>{application.full_name || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Email</div>
            <div style={s.fieldValue}>{application.email || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Mobile</div>
            <div style={s.fieldValue}>{application.mobile || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Date of Birth</div>
            <div style={s.fieldValue}>{fmtDate(application.dob)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Employment</div>
            <div style={{ ...s.fieldValue, textTransform: "capitalize" }}>
              {application.employment_type ? String(application.employment_type).replace(/_/g, " ") : "—"}
            </div>
          </div>
          <div>
            <div style={s.fieldLabel}>Annual Income</div>
            <div style={s.fieldValue}>{application.annual_income ? fmt(application.annual_income) : "—"}</div>
          </div>
        </div>
      </div>

      {/* ADDRESS DETAILS */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaMapMarkerAlt />
          Address Details
        </h2>
        <div className="adm-field-grid" style={s.fieldGrid}>
          <div>
            <div style={s.fieldLabel}>Address</div>
            <div style={s.fieldValue}>{application.address || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>City</div>
            <div style={s.fieldValue}>{application.city || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>State</div>
            <div style={s.fieldValue}>{application.state || "—"}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Pincode</div>
            <div style={s.fieldValue}>{application.pincode || "—"}</div>
          </div>
        </div>
      </div>

      {/* KYC DETAILS */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaIdCard />
          KYC Details
        </h2>
        <div className="adm-field-grid" style={s.fieldGrid}>
          <div>
            <div style={s.fieldLabel}>Aadhaar Number</div>
            <div style={s.fieldValue}>{mask(application.aadhaar_number, 4)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>PAN Number</div>
            <div style={s.fieldValue}>{mask(application.pan_number, 3)}</div>
          </div>

          {application.co_applicant_name && (
            <>
              <div style={s.sectionDivider} />
              <div style={s.subHeading}>Co-Applicant</div>

              <div>
                <div style={s.fieldLabel}>Name</div>
                <div style={s.fieldValue}>{application.co_applicant_name}</div>
              </div>
              <div>
                <div style={s.fieldLabel}>Aadhaar</div>
                <div style={s.fieldValue}>
                  {application.co_applicant_aadhaar ? mask(application.co_applicant_aadhaar, 4) : "—"}
                </div>
              </div>
              <div>
                <div style={s.fieldLabel}>PAN</div>
                <div style={s.fieldValue}>
                  {application.co_applicant_pan ? mask(application.co_applicant_pan, 3) : "—"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FILED BY DSA */}
      {application.applied_by === "dsa" && application.dsa_name && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <FaUsers />
            Filed by DSA
          </h2>

          <div className="adm-field-grid" style={s.fieldGrid}>
            <div>
              <div style={s.fieldLabel}>DSA Name</div>
              <div style={s.fieldValue}>{application.dsa_name}</div>
            </div>

            <div>
              <div style={s.fieldLabel}>DSA Email</div>
              <div style={s.fieldValue}>{application.dsa_email || "—"}</div>
            </div>

            <div>
              <div style={s.fieldLabel}>Agency Name</div>
              <div style={s.fieldValue}>{application.agency_name || "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* FILED BY CA */}
      {application.applied_by === "ca" && application.ca_name && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <FaUniversity />
            Filed by CA
          </h2>
          <div className="adm-field-grid" style={s.fieldGrid}>
            <div>
              <div style={s.fieldLabel}>CA Name</div>
              <div style={s.fieldValue}>{application.ca_name}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>CA Email</div>
              <div style={s.fieldValue}>{application.ca_email || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>CA Firm</div>
              <div style={s.fieldValue}>{application.ca_firm || "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOADED DOCUMENTS */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaFileImage />
          Uploaded Documents
        </h2>

        {application.documents && Object.keys(application.documents).length > 0 ? (
          <div style={s.docGrid}>
            {Object.entries(
              application.documents as Record<string, { name: string; uploadedAt: string; filePath?: string }>
            ).map(([key, doc]) => (
              <div key={key} style={s.docItem}>
                <div style={s.docItemIcon}>
                  {isPdfFile(doc.name) ? (
                    <FaFilePdf size={20} color={palette.danger} />
                  ) : (
                    <FaFileImage size={20} color={palette.primary} />
                  )}
                </div>
                <div style={s.docItemInfo}>
                  <div style={s.docItemLabel}>{key.replace(/_/g, " ")}</div>
                  <div style={s.docItemName}>{doc.name}</div>
                  <div style={s.docItemDate}>Uploaded: {doc.uploadedAt}</div>
                </div>
                <button className="adm-preview-btn" style={s.previewBtn} onClick={() => handlePreview(doc)}>
                  <FaEye size={12} /> {isImageFile(doc.name) ? "Preview" : "Open"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.noDocText}>No documents uploaded.</div>
        )}
      </div>

      {/* REMARK */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Admin Remark</h2>

        <textarea
          className="adm-textarea"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Enter approval / rejection note…"
          style={s.textarea}
        />

        <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
          <button
            className="adm-approve-btn"
            disabled={saving !== null || application.status?.toLowerCase() === "approved" || application.status?.toLowerCase() === "rejected"}
            onClick={() => updateStatus("approved")}
            style={s.approveBtn}
          >
            <FaCheckCircle /> {saving === "approved" ? "Approving…" : "Approve"}
          </button>

          <button
            className="adm-reject-btn"
            disabled={saving !== null || application.status?.toLowerCase() === "approved" || application.status?.toLowerCase() === "rejected"}
            onClick={() => updateStatus("rejected")}
            style={s.rejectBtn}
          >
            <FaTimesCircle /> {saving === "rejected" ? "Rejecting…" : "Reject"}
          </button>

          {application.status?.toLowerCase() === "approved" && (
            <button className="adm-send-banker-btn" onClick={openBankerModal} style={s.sendBankerBtn}>
              <FaPaperPlane /> Send to Bankers
            </button>
          )}
        </div>
      </div>

      {/* HISTORY */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <FaHistory />
          Remarks History
        </h2>

        {remarks.length === 0 ? (
          <p style={{ color: palette.text400, fontSize: 14 }}>No remarks yet.</p>
        ) : (
          remarks.map((item) => (
            <div key={item.id} style={s.remarkItem}>
              <div style={s.remarkHead}>
                <StatusBadge status={item.status} size="sm" />
                <span style={s.remarkDate}>
                  {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "—"}
                </span>
              </div>
              <p style={s.remarkText}>{item.remark}</p>
            </div>
          ))
        )}
      </div>

      {/* document preview modal (images only) */}
      {previewDoc && (
        <div style={s.modalOverlay} onClick={() => setPreviewDoc(null)}>
          <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <button style={s.modalCloseBtn} onClick={() => setPreviewDoc(null)}>
              <FaTimes />
            </button>
            <div style={{ fontWeight: 700, marginBottom: 12, color: palette.text900 }}>{previewDoc.name}</div>
            <img src={previewDoc.url} alt={previewDoc.name} style={s.modalImg} />
          </div>
        </div>
      )}

      {/* send-to-banker modal */}
      {showBankerModal && (
        <div style={s.modalOverlay} onClick={closeBankerModal}>
          <div style={{ ...s.modalBox, maxWidth: 480, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <button style={s.modalCloseBtn} onClick={closeBankerModal}>
              <FaTimes />
            </button>

            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18, color: palette.text900 }}>
              Send Application to Banker
            </div>

            {!confirmSend ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={s.fieldLabel}>Banker Email</div>
                  <input
                    type="email"
                    value={bankerEmail}
                    onChange={(e) => setBankerEmail(e.target.value)}
                    placeholder="banker@example.com"
                    style={s.modalInput}
                  />
                </div>
                <div>
                  <div style={s.fieldLabel}>Subject</div>
                  <input
                    type="text"
                    value={bankerSubject}
                    onChange={(e) => setBankerSubject(e.target.value)}
                    placeholder="Email subject"
                    style={s.modalInput}
                  />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: palette.text500, lineHeight: 1.6 }}>
                Are you sure you want to send this application's full details and attached documents to:
                <div style={{ fontWeight: 700, color: palette.text900, marginTop: 8 }}>{bankerEmail}</div>
                <div style={{ marginTop: 6 }}>
                  Subject: <b>{bankerSubject}</b>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "flex-end" }}>
              <button style={s.modalSecondaryBtn} onClick={closeBankerModal} disabled={sendingToBanker}>
                Close
              </button>
              <button style={s.modalPrimaryBtn} onClick={handleSendToBanker} disabled={sendingToBanker}>
                {sendingToBanker ? "Sending…" : confirmSend ? "Yes, Send" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}