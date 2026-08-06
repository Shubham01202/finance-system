// Path: frontend/src/components/ui/Toast.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/* ─────────────────────────────────────────────
   HOOK — import this in any page that needs toasts.
   Usage:
     const { toasts, showToast, removeToast } = useToast();
     showToast("Saved successfully", "success");
     ...
     <ToastContainer toasts={toasts} onRemove={removeToast} />
───────────────────────────────────────────── */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  return { toasts, showToast, removeToast };
}

/* ─────────────────────────────────────────────
   PRESENTATIONAL CONTAINER — render this once per page,
   anywhere inside the JSX tree (it's fixed-positioned).
───────────────────────────────────────────── */
const iconFor: Record<ToastType, React.ReactNode> = {
  success: <FaCheckCircle size={15} />,
  error: <FaTimesCircle size={15} />,
  info: <FaExclamationCircle size={15} />,
};

const colorFor: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
};

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 9999,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {toasts.map((t) => {
        const c = colorFor[t.type];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              padding: "12px 14px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              minWidth: 240,
              maxWidth: 380,
              animation: "toast-in 0.2s ease",
            }}
          >
            {iconFor[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: c.text,
                opacity: 0.6,
                cursor: "pointer",
                display: "flex",
                padding: 0,
              }}
              aria-label="Dismiss"
            >
              <FaTimes size={12} />
            </button>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}