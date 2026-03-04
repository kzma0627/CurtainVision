import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../data/fabrics";

export default function AuthModal() {
  const { t } = useTranslation();
  const { showAuthModal, setShowAuthModal, login } = useAuth();

  if (!showAuthModal) return null;

  const handleGoogleLogin = async () => {
    if (!window.google?.accounts?.id) {
      console.warn("Google Identity Services not loaded");
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.warn("Google prompt skipped:", notification.getNotDisplayedReason?.() || notification.getSkippedReason?.());
      }
    });
  };

  // Google callback — registered in index.html via data-callback
  window.__handleGoogleCredential = async (response) => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!resp.ok) throw new Error("Auth failed");
      const data = await resp.json();
      login(data.token, data.user);
    } catch (e) {
      console.error("Google auth error:", e);
    }
  };

  return (
    <>
      <div
        onClick={() => setShowAuthModal(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100 }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: Math.min(380, window.innerWidth - 32), background: "#faf7f2",
        borderRadius: 16, padding: "32px 28px", zIndex: 1101,
        boxShadow: "0 12px 48px rgba(0,0,0,0.2)", textAlign: "center",
        animation: "fadeUp 0.25s ease",
      }}>
        <button onClick={() => setShowAuthModal(false)} style={{
          position: "absolute", top: 12, right: 16, fontSize: 20, color: "#b0a494", padding: "4px 8px",
        }}>&times;</button>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a3022", marginBottom: 8 }}>
          {t("auth.loginTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#8a7e6e", marginBottom: 24 }}>
          {t("auth.loginSub")}
        </p>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%", padding: "12px 20px", borderRadius: 12,
            border: "1px solid #d6cbb8", background: "#fff",
            color: "#3a3022", fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t("auth.google")}
        </button>

        {/* Apple Sign-In — deferred */}
        <button
          disabled
          style={{
            width: "100%", padding: "12px 20px", borderRadius: 12,
            border: "1px solid #d6cbb8", background: "#f5f3ef",
            color: "#b0a494", fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 20, cursor: "not-allowed",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#b0a494">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          {t("auth.apple")} — {t("auth.appleSoon")}
        </button>

        <button
          onClick={() => setShowAuthModal(false)}
          style={{ background: "none", color: "#8a7e6e", fontSize: 12, textDecoration: "underline", padding: "6px" }}
        >
          {t("auth.skip")}
        </button>
      </div>
    </>
  );
}
