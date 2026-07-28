"use client";

/**
 * Global error boundary — catches errors that escape the root layout.
 * This is the last line of defense before a white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f0fdf4",
          color: "#14532d",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
            অ্যাপ্লিকেশন ত্রুটি
          </h1>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.7, lineHeight: 1.5 }}>
            একটি গুরুতর সমস্যা হয়েছে। পেজ রিলোড করুন।
          </p>
          <button
            onClick={reset}
            style={{
              background: "#059669",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontFamily: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </body>
    </html>
  );
}
