// Path: frontend/src/app/page.tsx
"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type Screen = "login" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const router = useRouter();

  const [screen, setScreen]           = useState<Screen>("login");
  const [message, setMessage]         = useState("");
  const [isError, setIsError]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [otp, setOtp]                 = useState("");
  const [showOtp, setShowOtp]         = useState(false); // controls inline OTP field on signup screen
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetOtp, setResetOtp]       = useState("");

  const [formData, setFormData] = useState({
    full_name: "", email: "", mobile: "", password: "", role: "",
  });

  const fullNameRef = useRef<HTMLInputElement>(null);
  const mobileRef   = useRef<HTMLInputElement>(null);
  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRef       = useRef<HTMLInputElement>(null);

  const msg      = (text: string, err = false) => { setMessage(text); setIsError(err); };
  const clearMsg = () => setMessage("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
      else handleLogin();
    }
  };

  /* ══ LOGIN ══ */
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      msg("Please enter email and password.", true);
      return;
    }

    setLoading(true);
    clearMsg();

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email: formData.email,
          password: formData.password,
        }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user?.role || "customer");

      msg("Login successful! Redirecting...");

      const role = res.data.user?.role;

      if (role === "admin") {
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1000);
      } else if (role === "ca") {
        try {
          const profileRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/ca/profile`,
            {
              headers: { Authorization: `Bearer ${res.data.token}` },
            }
          );
          const isComplete =
            profileRes.data?.profile_completed ||
            profileRes.data?.data?.profile_completed;

          setTimeout(() => {
            router.push(isComplete ? "/ca/dashboard" : "/ca/profile/setup");
          }, 1000);
        } catch {
          setTimeout(() => {
            router.push("/ca/profile/setup");
          }, 1000);
        }
      } else {
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (e: any) {
      msg(e.response?.data?.error || "Invalid email or password", true);
    } finally {
      setLoading(false);
    }
  };

  /* ══ SIGNUP (sends OTP, reveals inline OTP field — no screen change) ══ */
  const handleSignup = async () => {
    if (!formData.full_name || !formData.email || !formData.mobile || !formData.password || !formData.role) {
      msg("Please fill all fields including role.", true); return;
    }
    setLoading(true); clearMsg();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, formData);
      setSignupEmail(formData.email);
      setShowOtp(true);
      msg("OTP sent to your email. Please check your inbox.");
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e: any) {
      msg(e.response?.data?.error || "Signup failed. Try again.", true);
    } finally { setLoading(false); }
  };

  /* ══ VERIFY OTP ══ */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { msg("Enter the 6-digit OTP.", true); return; }
    setLoading(true); clearMsg();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, { email: signupEmail, otp });
      msg("Email verified! Redirecting to login...");
      setTimeout(() => {
        setScreen("login"); setOtp(""); setShowOtp(false); clearMsg();
        setFormData({ full_name: "", email: "", mobile: "", password: "", role: "" });
      }, 2000);
    } catch (e: any) {
      msg(e.response?.data?.error || "Invalid or expired OTP.", true);
    } finally { setLoading(false); }
  };

  /* ══ RESEND OTP ══ */
  const handleResendOtp = async () => {
    setLoading(true); clearMsg();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-otp`, { email: signupEmail });
      msg("New OTP sent to your email.");
    } catch (e: any) {
      msg(e.response?.data?.error || "Failed to resend OTP.", true);
    } finally { setLoading(false); }
  };

  /* ══ FORGOT PASSWORD ══ */
  const handleForgotPassword = async () => {
    if (!forgotEmail) { msg("Please enter your email address.", true); return; }
    setLoading(true); clearMsg();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, { email: forgotEmail });
      msg("Password reset OTP sent to your email.");
      setScreen("reset");
    } catch (e: any) {
      msg(e.response?.data?.error || "Email not found.", true);
    } finally { setLoading(false); }
  };

  /* ══ RESET PASSWORD ══ */
  const handleResetPassword = async () => {
    if (resetOtp.length !== 6) { msg("Enter the 6-digit OTP.", true); return; }
    if (newPassword.length < 6) { msg("Password must be at least 6 characters.", true); return; }
    setLoading(true); clearMsg();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,{
        email: forgotEmail, otp: resetOtp, newPassword,
      });
      msg("Password reset successful! You can now login.");
      setTimeout(() => {
        setScreen("login"); setResetOtp(""); setNewPassword("");
        setForgotEmail(""); clearMsg();
      }, 2000);
    } catch (e: any) {
      msg(e.response?.data?.error || "Invalid or expired OTP.", true);
    } finally { setLoading(false); }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="page">

      {/* ── LEFT PANEL ── */}
      <div className="left">
        <div className="leftContent">
          <div className="brand">
            <img
              src="/images/SN-Finance-Service-Logo-1.png"
              alt="SN Finance Service"
              className="logo"
            />
          </div>
          <h1 className="heroTitle">Fast, Safe &amp;<br />Trusted Loans</h1>
          <div className="heroSub">
            Apply for personal, home, or business loans with minimal documentation and get approval in 24 hours.
          </div>
          <div className="features">
            {["✅ Minimal Documentation", "✅ 24-Hour Approval", "✅ Secure & Encrypted", "✅ RBI Compliant"].map(f => (
              <div key={f} className="feature">{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right">
        <div className="formCard">

          {/* ════ FORGOT PASSWORD SCREEN ════ */}
          {screen === "forgot" && (
            <>
              <div className="bigIcon">🔑</div>
              <h2 className="formTitle">Forgot Password?</h2>
              <div className="formSub">
                Enter your registered email. We'll send a reset OTP.
              </div>
              <Alert message={message} isError={isError} />
              <input
                type="email" placeholder="Email Address"
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleForgotPassword(); }}
                className="input"
              />
              <button onClick={handleForgotPassword} disabled={loading} className="btn" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending…" : "Send Reset OTP"}
              </button>
              <div className="linkRow">
                <span onClick={() => { setScreen("login"); clearMsg(); }} className="link">← Back to Login</span>
              </div>
            </>
          )}

          {/* ════ RESET PASSWORD SCREEN ════ */}
          {screen === "reset" && (
            <>
              <div className="bigIcon">🔒</div>
              <h2 className="formTitle">Reset Password</h2>
              <div className="formSub">
                Enter the OTP sent to <strong>{forgotEmail}</strong> and your new password.
              </div>
              <Alert message={message} isError={isError} />
              <input
                type="text" placeholder="6-digit OTP" maxLength={6}
                value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g, ""))}
                className="input otpInput small"
              />
              <div className="passWrap">
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="New Password (min 6 chars)"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleResetPassword(); }}
                  className="input"
                  style={{ marginBottom: 0, paddingRight: 44 }}
                />
                <span className="eyeIcon" onClick={() => setShowNewPass(p => !p)}>
                  {showNewPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </span>
              </div>
              <button onClick={handleResetPassword} disabled={loading} className="btn" style={{ marginTop: 16, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Resetting…" : "Reset Password ✓"}
              </button>
              <div className="linkRow">
                <span onClick={() => { setScreen("forgot"); clearMsg(); }} className="link">← Back</span>
              </div>
            </>
          )}

          {/* ════ LOGIN SCREEN ════ */}
          {screen === "login" && (
            <>
              <h2 className="formTitle">Welcome Back 👋</h2>
              <div className="formSub">Login to access your dashboard</div>
              <Alert message={message} isError={isError} />
              <input
                ref={emailRef} type="email" name="email"
                placeholder="Email Address" className="input"
                value={formData.email} onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, passwordRef)}
              />
              <div className="passWrap">
                <input
                  ref={passwordRef}
                  type={showPass ? "text" : "password"}
                  name="password" placeholder="Password"
                  className="input"
                  style={{ marginBottom: 0, paddingRight: 44 }}
                  value={formData.password} onChange={handleChange}
                  onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
                />
                <span className="eyeIcon" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </span>
              </div>
              <div style={{ textAlign: "right", marginTop: 8, marginBottom: 20 }}>
                <span onClick={() => { setScreen("forgot"); clearMsg(); }} className="link" style={{ fontSize: 13 }}>
                  Forgot Password?
                </span>
              </div>
              <button onClick={handleLogin} disabled={loading} className="btn" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? "Please wait…" : "Login to Dashboard"}
              </button>
              <div className="linkRow">
                Don't have an account?
                <span onClick={() => { setScreen("signup"); clearMsg(); }} className="link"> Sign up</span>
              </div>
            </>
          )}

          {/* ════ SIGNUP SCREEN (OTP now appears INLINE below Password) ════ */}
          {screen === "signup" && (
            <>
              <h2 className="formTitle">Create Account</h2>
              <div className="formSub">
                {showOtp
                  ? <>OTP sent to <strong>{signupEmail}</strong>. Valid for 10 minutes.</>
                  : "Join SN Finance to manage your loans"}
              </div>
              <Alert message={message} isError={isError} />

              <input
                ref={fullNameRef} type="text" name="full_name"
                placeholder="Full Name" className="input"
                value={formData.full_name} onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, mobileRef)}
                disabled={showOtp}
              />
              <input
                ref={mobileRef} type="text" name="mobile"
                placeholder="Mobile Number" className="input"
                value={formData.mobile} onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, emailRef)}
                disabled={showOtp}
              />
              <select
                name="role" value={formData.role} onChange={handleChange}
                className="select" disabled={showOtp}
              >
                <option value="">Select your role</option>
                <option value="customer">Customer</option>
                <option value="ca">CA (Chartered Accountant)</option>
              </select>
              <input
                ref={emailRef} type="email" name="email"
                placeholder="Email Address" className="input"
                value={formData.email} onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, passwordRef)}
                disabled={showOtp}
              />
              <div className="passWrap" style={{ marginBottom: showOtp ? 14 : 0 }}>
                <input
                  ref={passwordRef}
                  type={showPass ? "text" : "password"}
                  name="password" placeholder="Password (min 6 chars)"
                  className="input"
                  style={{ marginBottom: 0, paddingRight: 44 }}
                  value={formData.password} onChange={handleChange}
                  onKeyDown={e => { if (e.key === "Enter") { showOtp ? handleVerifyOtp() : handleSignup(); } }}
                  disabled={showOtp}
                />
                <span className="eyeIcon" onClick={() => !showOtp && setShowPass(p => !p)}>
                  {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </span>
              </div>

              {/* ── OTP field appears right here, after Password, once signup succeeds ── */}
              {showOtp && (
                <>
                  <input
                    ref={otpRef}
                    type="text" placeholder="Enter 6-digit OTP" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => { if (e.key === "Enter") handleVerifyOtp(); }}
                    className="input otpInput"
                  />
                  <div className="linkRow" style={{ marginBottom: 14 }}>
                    Didn't receive OTP?
                    <span onClick={handleResendOtp} className="link"> Resend OTP</span>
                  </div>
                </>
              )}

              <button
                onClick={showOtp ? handleVerifyOtp : handleSignup}
                disabled={loading}
                className="btn"
                style={{ marginTop: showOtp ? 0 : 20, opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? "Please wait…"
                  : showOtp ? "Verify OTP ✓" : "Create Account & Send OTP"}
              </button>

              <div className="linkRow">
                {showOtp ? (
                  <span
                    onClick={() => { setShowOtp(false); setOtp(""); clearMsg(); }}
                    className="link"
                  >
                    ← Back to edit details
                  </span>
                ) : (
                  <>
                    Already have an account?
                    <span onClick={() => { setScreen("login"); clearMsg(); }} className="link"> Login</span>
                  </>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          min-height: 100vh;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .left {
          flex: 1;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%);
          display: flex;
          align-items: center;
          padding: 60px 56px;
        }
        .leftContent { max-width: 440px; }
        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 48px; }
        .logo { height: 44px; width: auto; object-fit: contain; }
        .heroTitle {
          font-size: 44px; font-weight: 900; color: #fff;
          line-height: 1.15; letter-spacing: -1px; margin: 0 0 20px;
        }
        .heroSub {
          color: rgba(255,255,255,0.7); font-size: 16px;
          line-height: 1.7; margin-bottom: 36px;
        }
        .features { display: flex; flex-direction: column; gap: 10px; }
        .feature { color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500; }

        .right {
          width: 500px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }
        .formCard {
          background: #fff;
          border-radius: 20px;
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .bigIcon { font-size: 48px; text-align: center; margin-bottom: 12px; }
        .formTitle { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 6px; }
        .formSub { font-size: 14px; color: #94a3b8; margin: 0 0 20px; line-height: 1.6; }

        .input, .select {
          width: 100%;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 16px;
          color: #1e293b;
          background: #f9fafb;
          outline: none;
          margin-bottom: 14px;
          box-sizing: border-box;
          display: block;
        }
        .input:disabled, .select:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .select { appearance: auto; }

        .otpInput { text-align: center; font-size: 24px; letter-spacing: 12px; margin-bottom: 10px; }
        .otpInput.small { font-size: 20px; letter-spacing: 10px; }

        .passWrap { position: relative; margin-bottom: 0; }
        .eyeIcon {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%); color: #94a3b8; cursor: pointer;
        }

        .btn {
          width: 100%;
          background: linear-gradient(135deg, #1e3a5f, #2d5986);
          color: #fff;
          border: none;
          padding: 13px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 18px;
          display: block;
        }
        .linkRow { text-align: center; font-size: 14px; color: #64748b; margin-top: 4px; }
        .link { color: #1e3a5f; font-weight: 700; cursor: pointer; margin-left: 4px; }

        /* ══════════ TABLET (≤1024px) ══════════ */
        @media (max-width: 1024px) {
          .left { padding: 48px 40px; }
          .heroTitle { font-size: 36px; }
          .right { width: 420px; padding: 32px 24px; }
        }

        /* ══════════ MOBILE / SMALL TABLET (≤768px) ══════════ */
        @media (max-width: 768px) {
          .page { flex-direction: column; min-height: auto; }

          .left {
            flex: none;
            padding: 32px 24px;
            text-align: center;
          }
          .leftContent { max-width: 100%; }
          .brand { justify-content: center; margin-bottom: 24px; }
          .logo { height: 36px; }
          .heroTitle { font-size: 28px; }
          .heroSub { font-size: 14px; margin-bottom: 20px; }
          .features {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px 16px;
          }
          .feature { font-size: 13px; }

          .right {
            width: 100%;
            padding: 24px 16px 48px;
          }
          .formCard {
            max-width: 100%;
            border-radius: 16px;
            padding: 28px 22px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          }
          .formTitle { font-size: 20px; }
        }

        /* ══════════ SMALL MOBILE (≤400px) ══════════ */
        @media (max-width: 400px) {
          .left { padding: 24px 16px; }
          .heroTitle { font-size: 24px; }
          .formCard { padding: 22px 16px; }
          .otpInput { font-size: 20px; letter-spacing: 8px; }
          .btn { padding: 12px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}

/* ── ALERT COMPONENT ── */
function Alert({ message, isError }: { message: string; isError: boolean }) {
  if (!message) return null;
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10, fontSize: 13,
      fontWeight: 500, marginBottom: 18,
      background: isError ? "#fef2f2" : "#f0fdf4",
      border:     `1px solid ${isError ? "#fecaca" : "#bbf7d0"}`,
      color:      isError ? "#dc2626" : "#16a34a",
    }}>
      {message}
    </div>
  );
}