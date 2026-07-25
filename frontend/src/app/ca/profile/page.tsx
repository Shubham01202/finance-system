// Path: frontend/src/app/ca/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaUserTie, FaIdCard, FaBuilding,
  FaMapMarkerAlt, FaCheckCircle, FaEdit, FaFilePdf,
  FaFileImage, FaSave, FaTimes, FaEnvelope, FaUser,
  FaPhone, FaPaperPlane,
} from "react-icons/fa";
import CALayout from "./../../../components/layout/ca/CALayout";

interface CAProfile {
  firm_name: string;
  membership_number: string;
  enrollment_date: string;
  pan_number: string;
  aadhaar_number: string;
  office_address: string;
  city: string;
  state: string;
  pincode: string;
  certificate_path: string;
  profile_completed: boolean;
  full_name: string;
  email: string;
  mobile: string;
}

export default function CAProfilePage() {
  const router  = useRouter();

  const [profile, setProfile]   = useState<CAProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [userName, setUserName] = useState("CA");

  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "ca") { router.push("/dashboard"); return; }
      setUserName(user.full_name || "CA");
    } catch {}
    fetchProfile(token);
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      setLoading(true);
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setEditForm({
          full_name: data.data.full_name || "",
          email:     data.data.email     || "",
          mobile:    data.data.mobile    || "",
        });
        setUserName(data.data.full_name || "CA");
      } else {
        // No profile yet — redirect to setup
        router.push("/ca/profile/setup");
      }
    } catch {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.full_name || !editForm.email) {
      setError("Name and email are required."); return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/profile/personal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: editForm.full_name,
          email: editForm.email,
          mobile: editForm.mobile,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(p => p ? { ...p, full_name: editForm.full_name, email: editForm.email, mobile: editForm.mobile } : p);
        setUserName(editForm.full_name);
        // Update localStorage
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...user, full_name: editForm.full_name, email: editForm.email }));
        setSuccess("Profile updated successfully!");
        setEditing(false);
      } else {
        setError(data.message || "Update failed.");
      }
    } catch {
      setError("Server error.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  // Opens the confirmation modal instead of window.confirm()
  const handleChangePassword = () => {
    if (!profile?.email) {
      setError("Email address not found.");
      return;
    }
    setError("");
    setSuccess("");
    setShowResetModal(true);
  };

  // Actually sends the reset email after the modal is confirmed
  const confirmSendReset = async () => {
    setShowResetModal(false);
    try {
      setSendingReset(true);
      setError("");
      setSuccess("");

      const res = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: profile?.email,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setSuccess(
          "Password reset email has been sent successfully. Please check your inbox."
        );
      } else {
        setError(data.message || "Unable to send reset email.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setSendingReset(false);
    }
  };

  const maskAadhaar = (v: string) => v ? v.replace(/(\d{4})(\d{4})(\d{4})/, "XXXX XXXX $3") : "—";
  const maskPan     = (v: string) => v ? v.slice(0, 2) + "XXXXXXX" + v.slice(-1) : "—";

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <CALayout s={s} userName={userName} handleLogout={handleLogout}>
      <div className="ca-profile-wrap">

        {/* Top Bar */}
        <div className="ca-topbar" style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>My Profile</h1>
            <div style={s.pageSub}>Your CA registration and KYC details</div>
          </div>
          <button className="ca-edit-btn" style={s.editBtn} onClick={() => router.push("/ca/profile/setup")}>
            <FaEdit size={14} /> Edit Firm / KYC Details
          </button>
        </div>

        {error   && <div style={s.errorBox}>⚠️ {error}</div>}
        {success && <div style={s.successBox}>✅ {success}</div>}

        {loading ? (
          <div style={s.center}>
            <div style={s.spinner} />
            <div style={s.mutedText}>Loading profile…</div>
          </div>
        ) : !profile ? (
          <div style={s.center}>
            <FaUserTie size={48} color="#cbd5e1" />
            <div style={s.mutedText}>No profile found.</div>
            <button style={s.editBtn} onClick={() => router.push("/ca/profile/setup")}>
              Complete Profile
            </button>
          </div>
        ) : (
          <div className="ca-grid" style={s.grid}>

            {/* ── CARD 1: Personal Info (editable) ── */}
            <div className="ca-card" style={s.card}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#eff6ff", color: "#1d4ed8" }}>
                  <FaUserTie size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.cardTitle}>Personal Information</div>
                  <div style={s.cardSub}>Your account details</div>
                </div>
                {!editing ? (
                  <button
                    style={s.smallEditBtn}
                    onClick={() => {
                      setEditing(true);
                      setEditForm({
                        full_name: profile.full_name || "",
                        email: profile.email || "",
                        mobile: profile.mobile || "",
                      });
                      setError(""); setSuccess("");
                    }}
                  >
                    <FaEdit size={12} /> Edit
                  </button>
                ) : (
                  <button
                    style={s.cancelBtn}
                    onClick={() => { setEditing(false); setError(""); }}
                  >
                    <FaTimes size={12} /> Cancel
                  </button>
                )}
              </div>

              {editing ? (
                <div style={s.formFields}>
                  <Field label="Full Name" required>
                    <div style={s.inputWrap}>
                      <FaUser style={s.inputIcon} />
                      <input
                        type="text" value={editForm.full_name}
                        onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Full name" style={s.input}
                      />
                    </div>
                  </Field>
                  <Field label="Email Address" required>
                    <div style={s.inputWrap}>
                      <FaEnvelope style={s.inputIcon} />
                      <input
                        type="email" value={editForm.email}
                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="Email address" style={s.input}
                      />
                    </div>
                  </Field>
                  <Field label="Mobile Number">
                    <div style={s.inputWrap}>
                      <FaPhone style={s.inputIcon} />
                      <input
                        type="text" value={editForm.mobile}
                        onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))}
                        placeholder="Mobile number" maxLength={10} style={s.input}
                      />
                    </div>

                  </Field>

                  <button onClick={handleUpdate} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                    <FaSave size={13} /> {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              ) : (
                <div style={s.fieldList}>
                  <InfoRow label="Full Name" value={profile.full_name} />
                  <InfoRow label="Email"     value={profile.email} />
                  <InfoRow label="Mobile"    value={profile.mobile} />
                </div>
              )}
            </div>

            {/* ── CARD 2: CA Firm Details ── */}
            <div className="ca-card" style={s.card}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#fef3c7", color: "#d97706" }}>
                  <FaBuilding size={18} />
                </div>
                <div>
                  <div style={s.cardTitle}>CA Firm Details</div>
                  <div style={s.cardSub}>ICAI registration information</div>
                </div>
              </div>
              <div style={s.fieldList}>
                <InfoRow label="Firm Name"          value={profile.firm_name} />
                <InfoRow label="Membership Number"  value={profile.membership_number} />
                <InfoRow label="Date of Enrollment" value={profile.enrollment_date ? new Date(profile.enrollment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"} />
              </div>
            </div>

            {/* ── CARD 3: KYC Details ── */}
            <div className="ca-card" style={s.card}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#d1fae5", color: "#059669" }}>
                  <FaIdCard size={18} />
                </div>
                <div>
                  <div style={s.cardTitle}>KYC Details</div>
                  <div style={s.cardSub}>Identity verification</div>
                </div>
              </div>
              <div style={s.fieldList}>
                <InfoRow label="PAN Number"     value={maskPan(profile.pan_number)} />
                <InfoRow label="Aadhaar Number" value={maskAadhaar(profile.aadhaar_number)} />
              </div>
            </div>

            {/* ── CARD 4: Office Address ── */}
            <div className="ca-card" style={s.card}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#fce7f3", color: "#db2777" }}>
                  <FaMapMarkerAlt size={18} />
                </div>
                <div>
                  <div style={s.cardTitle}>Office Address</div>
                  <div style={s.cardSub}>Registered CA office</div>
                </div>
              </div>
              <div style={s.fieldList}>
                <InfoRow label="Address" value={profile.office_address} />
                <InfoRow label="City"    value={profile.city} />
                <InfoRow label="State"   value={profile.state} />
                <InfoRow label="Pincode" value={profile.pincode} />
              </div>
            </div>

            {/* ── CARD 5: Certificate ── */}
            <div className="ca-card ca-card-full" style={{ ...s.card, gridColumn: "1 / -1" }}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#ede9fe", color: "#7c3aed" }}>
                  <FaFileImage size={18} />
                </div>
                <div>
                  <div style={s.cardTitle}>CA Certificate / ICAI Proof</div>
                  <div style={s.cardSub}>Uploaded membership certificate</div>
                </div>
              </div>

              {profile.certificate_path ? (
                <div style={s.certWrap}>
                  {profile.certificate_path.endsWith(".pdf") ? (
                    <div className="ca-pdf-box" style={s.pdfBox}>
                      <FaFilePdf size={36} color="#ef4444" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                          Certificate uploaded
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                          {profile.certificate_path.split("/").pop()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                     src={`${process.env.NEXT_PUBLIC_API_URL}/${profile.certificate_path}`}
                      alt="CA Certificate"
                      style={s.certImg}
                    />
                  )}
                  <div style={s.certUploaded}>
                    <FaCheckCircle size={13} color="#10b981" />
                    <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
                      Certificate uploaded successfully
                    </span>
                  </div>
                </div>
              ) : (
                <div style={s.certMissing}>
                  <FaFileImage size={32} color="#cbd5e1" />
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>No certificate uploaded yet.</div>
                  <button style={s.editBtn} onClick={() => router.push("/ca/profile/setup")}>
                    Upload Certificate
                  </button>
                </div>
              )}
            </div>

            {/* ── CARD 6: Profile Status ── */}
            <div className="ca-card ca-card-full" style={{ ...s.card, gridColumn: "1 / -1" }}>
              <div className="ca-status-row" style={s.statusRow}>
                <div className="ca-card-head" style={s.cardHead}>
                  <div style={{ ...s.cardIcon, background: profile.profile_completed ? "#d1fae5" : "#fef3c7", color: profile.profile_completed ? "#059669" : "#d97706" }}>
                    <FaCheckCircle size={18} />
                  </div>
                  <div>
                    <div style={s.cardTitle}>Profile Status</div>
                    <div style={s.cardSub}>Completion and verification status</div>
                  </div>
                </div>
                <span style={{
                  ...s.statusBadge,
                  background: profile.profile_completed ? "#d1fae5" : "#fef3c7",
                  color:      profile.profile_completed ? "#059669" : "#d97706",
                }}>
                  {profile.profile_completed ? "✅ Profile Complete" : "⚠️ Incomplete"}
                </span>
              </div>
              {!profile.profile_completed && (
                <div className="ca-incomplete-note" style={s.incompleteNote}>
                  Your profile is incomplete. Please fill all details to start filing loan applications.
                  <button style={{ ...s.editBtn, marginLeft: 16 }} onClick={() => router.push("/ca/profile/setup")}>
                    Complete Now
                  </button>
                </div>
              )}
            </div>

            {/* ── CARD 7: Security ── */}
            <div className="ca-card ca-card-full" style={{ ...s.card, gridColumn: "1 / -1" }}>
              <div className="ca-card-head" style={s.cardHead}>
                <div style={{ ...s.cardIcon, background: "#e0e7ff", color: "#1e3a5f" }}>
                  <FaIdCard size={18} />
                </div>
                <div>
                  <div style={s.cardTitle}>Security</div>
                  <div style={s.cardSub}>Manage your account password</div>
                </div>
              </div>

              <div className="ca-security-row" style={s.securityRow}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                    Password
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
                    We'll send a secure password reset link to your registered email address.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    disabled={sendingReset}
                    onClick={handleChangePassword}
                    style={{ ...s.changePasswordBtn, opacity: sendingReset ? 0.7 : 1 }}
                  >
                    {sendingReset ? "Sending..." : "Change Password"}
                  </button>

                  <div style={s.securityBadge}>🔒 Secured</div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ════ RESET PASSWORD CONFIRMATION MODAL ════ */}
      {showResetModal && (
        <div style={s.modalOverlay} onClick={() => setShowResetModal(false)}>
          <div className="ca-modal-card" style={s.modalCard} onClick={e => e.stopPropagation()}>
            <div style={s.modalIconWrap}>
              <FaEnvelope size={22} color="#1e3a5f" />
            </div>
            <div style={s.modalTitle}>Send Password Reset Link?</div>
            <div style={s.modalText}>
              We'll send a secure password reset link to:
            </div>
            <div style={s.modalEmail}>{profile?.email}</div>

            <div style={s.modalActions}>
              <button style={s.modalCancelBtn} onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
              <button style={s.modalSendBtn} onClick={confirmSendReset}>
                <FaPaperPlane size={12} /> Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ca-profile-wrap {
          width: 100%;
        }

        @media (max-width: 900px) {
          .ca-topbar {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .ca-edit-btn {
            width: 100%;
            justify-content: center;
          }

          .ca-grid {
            grid-template-columns: 1fr !important;
          }

          .ca-card,
          .ca-card-full {
            grid-column: 1 / -1 !important;
            padding: 18px !important;
          }

          .ca-card-head {
            flex-wrap: wrap;
          }

          .ca-status-row,
          .ca-security-row {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .ca-security-row > div:last-child {
            width: 100%;
            justify-content: space-between;
          }

          .ca-pdf-box {
            flex-direction: column;
            text-align: center;
          }

          .ca-incomplete-note {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .ca-incomplete-note button {
            margin-left: 0 !important;
            width: 100%;
            justify-content: center;
          }

          .ca-modal-card {
            max-width: 92vw !important;
            padding: 22px 18px 18px !important;
          }
        }

        @media (max-width: 480px) {
          .ca-card,
          .ca-card-full {
            padding: 16px !important;
          }
        }
      `}</style>
    </CALayout>
  );
}

/* ── SUB COMPONENTS ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value || "—"}</span>
    </div>
  );
}

/* ── STYLES ──
   NOTE: page / sidebar / nav* / user* / logout* keys are consumed by
   CALayout + CASidebar. Everything else styles this page's own content. */
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
  topBar:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap" as const, gap: 14 },
  pageTitle:{ fontSize: 23, fontWeight: 800, color: "#1e293b", margin: 0 },
  pageSub:  { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  editBtn:  { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  smallEditBtn: { display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#1e3a5f", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  cancelBtn: { display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#64748b", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  saveBtn:  { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1e3a5f,#2d5986)", color: "#fff", border: "none", padding: "11px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  successBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 24 },
  grid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 },
  card:     { background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardHead: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" },
  cardIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle:{ fontSize: 15, fontWeight: 700, color: "#1e293b" },
  cardSub:  { fontSize: 12, color: "#94a3b8", marginTop: 3 },
  fieldList:{ display: "flex", flexDirection: "column" as const, gap: 14 },
  formFields: { display: "flex", flexDirection: "column" as const, gap: 16 },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13, pointerEvents: "none" },
  input:     { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "11px 14px 11px 40px", fontSize: 14, color: "#1e293b", background: "#f9fafb", outline: "none", boxSizing: "border-box" as const },
  infoRow:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  infoLabel:{ fontSize: 13, color: "#64748b", fontWeight: 500, flexShrink: 0 },
  infoValue:{ fontSize: 13, color: "#1e293b", fontWeight: 600, textAlign: "right" as const, wordBreak: "break-all" as const },
  certWrap: { display: "flex", flexDirection: "column" as const, gap: 12 },
  certImg:  { width: "100%", maxHeight: 220, objectFit: "contain" as const, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc" },
  pdfBox:   { display: "flex", alignItems: "center", gap: 14, background: "#fef2f2", borderRadius: 10, padding: "16px 20px" },
  certUploaded: { display: "flex", alignItems: "center", gap: 8 },
  certMissing:  { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, padding: "28px 0", color: "#94a3b8" },
  statusRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 },
  statusBadge:  { padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  incompleteNote: { display: "flex", alignItems: "center", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", marginTop: 16, flexWrap: "wrap" as const, gap: 8 },
  securityRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 },
  securityBadge: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  changePasswordBtn: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5986)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  center:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "80px 0" },
  spinner:  { width: 34, height: 34, border: "3px solid #e2e8f0", borderTop: "3px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  mutedText:{ color: "#94a3b8", fontSize: 14 },

  /* ── Modal ── */
  modalOverlay: {
    position: "fixed" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "28px 28px 24px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "rgba(30,58,95,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 },
  modalText:  { fontSize: 13.5, color: "#64748b", lineHeight: 1.5 },
  modalEmail: { fontSize: 14, fontWeight: 700, color: "#1e3a5f", marginTop: 6, marginBottom: 22, wordBreak: "break-all" as const },
  modalActions: { display: "flex", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    background: "#f1f5f9",
    color: "#64748b",
    border: "none",
    padding: "11px 0",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  modalSendBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "linear-gradient(135deg,#1e3a5f,#2d5986)",
    color: "#fff",
    border: "none",
    padding: "11px 0",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};