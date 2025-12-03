import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PAGE_TITLE = import.meta.env.VITE_LOGIN_TITLE || "Wolf Birreria — Gestionale";
const FOOTER_BLUR_TEXT =
  import.meta.env.VITE_LOGIN_FOOTER || "Accesso riservato — © " + new Date().getFullYear() + " Wolf Birreria";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = PAGE_TITLE;
    const u = localStorage.getItem("remember_user");
    if (u) { setUsername(u); setRemember(true); }
  }, []);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username || !password) { setErr("Inserisci username e password."); return; }
    try {
      setBusy(true);
      setErr(null);
      await login(username, password);
      if (remember) localStorage.setItem("remember_user", username);
      else localStorage.removeItem("remember_user");
      navigate("/app/home");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Accesso non riuscito.";
      setErr(typeof msg === "string" ? msg : "Accesso non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- SFONDO ---------- */
  const bg: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 0,
    background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 35%, #fde047 70%, #fef08a 100%)",
  };
  const bgGlowA: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 0,
    background: "radial-gradient(800px 520px at 20% 15%, rgba(255,255,255,.35) 0%, transparent 60%)",
    filter: "blur(24px)", pointerEvents: "none",
  };
  const bgGlowB: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 0,
    background: "radial-gradient(700px 500px at 85% 85%, rgba(255,255,255,.35) 0%, transparent 60%)",
    filter: "blur(24px)", pointerEvents: "none",
  };

  /* ---------- CENTRO ASSOLUTO ---------- */
  const centerWrap: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif",
  };

  const card: CSSProperties = {
    width: "min(500px, 92vw)",
    padding: 28,
    background: "rgba(255,255,255,0.68)",
    backdropFilter: "blur(14px) saturate(120%)",
    WebkitBackdropFilter: "blur(14px) saturate(120%)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.65)",
    boxShadow: "0 22px 60px rgba(0,0,0,.18)",
  };

  const logoBox: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 };
  const subtitle: CSSProperties = { textAlign: "center", fontSize: 16, color: "#111827", marginBottom: 16, fontWeight: 800, opacity: .95 };

  /* ---------- FIELD UNIFICATO (username & password identici) ---------- */
  const fieldWrap: CSSProperties = {
    display: "flex", alignItems: "center", width: "100%",
    border: "1px solid #d1d5db", borderRadius: 12,
    background: "rgba(255,255,255,0.92)",
  };
  const fieldInput: CSSProperties = {
    flex: 1, border: "none", outline: "none",
    padding: "12px 14px", background: "transparent", fontSize: 15, color: "#111827",
  };
  // slot destro 44px: mantiene stesse dimensioni sui due campi
  const rightSlot: CSSProperties = {
    width: 44, height: 44, display: "grid", placeItems: "center",
  };
  const eyeBtn: CSSProperties = {
    width: 36, height: 36, display: "grid", placeItems: "center",
    background: "transparent", border: 0, cursor: "pointer",
    outline: "none", boxShadow: "none",
    appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
  };

  const label: CSSProperties = { fontSize: 13, fontWeight: 800, marginBottom: 6, display: "block", color: "#111827" };

  const helpers: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, marginBottom: 16 };
  const helperText: CSSProperties = { fontSize: 12, color: "#111827", opacity: .95, lineHeight: 1.35, textAlign: "right" };

  const btn: CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 12, border: "none",
    background: busy ? "#e5e7eb" : "linear-gradient(180deg,#fbbf24,#f59e0b)",
    color: "#111827", fontWeight: 900, cursor: busy ? "not-allowed" : "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), 0 10px 20px rgba(245,158,11,.35)", transition: "transform .08s ease",
  };

  const errorBox: CSSProperties = { background: "rgba(254,226,226,0.95)", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 12px", fontSize: 14, marginBottom: 14 };

  const footerWrap: CSSProperties = { position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 16px", display: "flex", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(255,255,255,0.45)", borderTop: "1px solid rgba(0,0,0,.06)", zIndex: 40 };
  const footerText: CSSProperties = { fontSize: 12, color: "#111827" };

  return (
    <>
      {/* sfondo giallo + glow */}
      <div style={bg} /><div style={bgGlowA} /><div style={bgGlowB} />

      <div style={centerWrap}>
        {/* mascotte decorativa (non influisce sul layout) */}
        <img
          src="/logo%20extra.png" alt="" aria-hidden="true"
          style={{ position: "fixed", right: 28, bottom: 28, width: 180, transform: "rotate(-6deg)", filter: "drop-shadow(0 16px 36px rgba(0,0,0,.25))", opacity: .9, pointerEvents: "none", zIndex: 1 }}
        />

        <form style={card} onSubmit={onSubmit}>
          <div style={logoBox}>
            <img src="/logo.webp" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo%20extra.png"; }} alt="Wolf Birreria" style={{ height: 64 }} />
          </div>

          <div style={subtitle}>Sai cosa fare..</div>

          {err && <div style={errorBox}>{err}</div>}

          {/* USERNAME (slot destro vuoto per identica larghezza/altezza) */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Username</label>
            <div style={fieldWrap}>
              <input
                style={fieldInput}
                placeholder="es. jessico calcetto"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div style={rightSlot} aria-hidden="true" />
            </div>
          </div>

          {/* PASSWORD (stesso wrapper, slot destro con occhio) */}
          <div style={{ marginBottom: 8 }}>
            <label style={label}>Password</label>
            <div style={fieldWrap}>
              <input
                style={fieldInput}
                placeholder="••••••••"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSubmit(e as any); }}
              />
              <div style={rightSlot}>
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  title={showPwd ? "Nascondi password" : "Mostra password"}
                  style={eyeBtn}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <div style={helpers}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Ricordami
            </label>
            <div style={helperText}>
              Non riesci ad accedere? <br /> hai provato a mettere <b>password</b> come password?
            </div>
          </div>

          <button
            type="submit" style={btn} disabled={busy}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            {busy ? "Accesso in corso..." : "Entra"}
          </button>
        </form>
      </div>

      {/* Piè di pagina sfocato */}
      <div style={footerWrap}><div style={footerText}>{FOOTER_BLUR_TEXT}</div></div>
    </>
  );
}
