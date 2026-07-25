// Path: frontend/src/app/set-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

function SetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // If someone opens this page with no token at all in the URL, tell them
  // immediately instead of letting them fill the form and hit a 400 later.
  useEffect(() => {
    if (!token) {
      setMessage("This link is invalid or missing a token. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!token) {
      setMessage("This link is invalid or missing a token. Please request a new one.");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage("Please fill all fields");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await axios.post(
  `${process.env.NEXT_PUBLIC_API_URL}/api/auth/set-password`,
        {
          token,
          password,
        }
      );

      setMessage("Password set successfully");

      setTimeout(() => {
        router.push("/");
      }, 1500);

    } catch (err: any) {
      setMessage(
        err.response?.data?.error ||
        "Failed to set password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: 420,
          background: "#fff",
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 5px 20px rgba(0,0,0,.1)",
        }}
      >
        <h2>Set Password</h2>

        <input
          type="password"
          placeholder="New Password (min 6 chars)"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          disabled={!token}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={!token}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        {message && (
          <p style={{ marginBottom: 10, color: message.includes("successfully") ? "#16a34a" : "#dc2626" }}>
            {message}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !token}
          style={{
            width: "100%",
            padding: 12,
            background: "#1e3a5f",
            color: "#fff",
            border: "none",
            opacity: (loading || !token) ? 0.7 : 1,
            cursor: (loading || !token) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Please wait..." : "Set Password"}
        </button>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}