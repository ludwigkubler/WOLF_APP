// src/layout/AppShell.tsx
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  // Se entri su "/" dentro la shell, manda alla home dashboard
  useEffect(() => {
    if (location.pathname === "/app") {
      navigate("/app/home", { replace: true });
    }
  }, [location.pathname, navigate]);

  function isActive(path: string) {
    return location.pathname.startsWith(path);
  }

  const userLabel = "(utente)"; // se hai già un contesto utente puoi sostituirlo

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 260,
          borderRight: "1px solid #1f2937",
          background: "#020617",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo / titolo */}
        <div
          style={{
            padding: "16px 18px 10px 18px",
            borderBottom: "1px solid #1f2937",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#6b7280",
            }}
          >
            Wolf App
          </div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>Pannello principale</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {userLabel}
          </div>
        </div>

        {/* NAV */}
        <nav
          style={{
            padding: "12px 10px 12px 12px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* Categoria: Magazzino */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#6b7280",
                padding: "4px 6px",
              }}
            >
              Magazzino
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li>
                <NavItem
                  to="/app/magazzino"
                  label="Lista magazzino"
                  icon="📦"
                  active={isActive("/app/magazzino")}
                />
              </li>
              <li>
                <NavItem
                  to="/app/magazzino/nuovo"
                  label="Nuovo prodotto"
                  icon="➕"
                  active={isActive("/app/magazzino/nuovo")}
                />
              </li>
              <li>
                <NavItem
                  to="/app/magazzino/inventario"
                  label="Inventario"
                  icon="📋"
                  active={isActive("/app/magazzino/inventario")}
                />
              </li>
            </ul>
          </div>

          {/* Categoria: Cassa */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#6b7280",
                padding: "4px 6px",
              }}
            >
              Cassa
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li>
                <NavItem
                  to="/app/cassa/chiusure"
                  label="Chiusure fine serata"
                  icon="🕙"
                  active={isActive("/app/cassa/chiusure")}
                />
              </li>
              {/* Segnaposto per il futuro */}
              <li>
                <NavItem
                  to="/app/cassa/fatture"
                  label="Fatture (coming soon)"
                  icon="📄"
                  active={isActive("/app/cassa/fatture")}
                  disabled
                />
              </li>
              <li>
                <NavItem
                  to="/app/cassa/bilancio"
                  label="Bilancio (coming soon)"
                  icon="📊"
                  active={isActive("/app/cassa/bilancio")}
                  disabled
                />
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer sidebar */}
        <div
          style={{
            padding: 10,
            borderTop: "1px solid #1f2937",
            fontSize: 11,
            color: "#6b7280",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>v1.0</span>
          <button
            style={{
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid #374151",
              background: "transparent",
              color: "#e5e7eb",
              fontSize: 11,
              cursor: "pointer",
            }}
            onClick={() => {
              localStorage.removeItem("access_token");
              window.location.href = "/login";
            }}
          >
            Esci
          </button>
        </div>
      </aside>

      {/* AREA CONTENUTO */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 55%), radial-gradient(circle at bottom right, rgba(52,211,153,0.08), transparent 55%)",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  icon?: string;
  active?: boolean;
  disabled?: boolean;
};

function NavItem({ to, label, icon, active, disabled }: NavItemProps) {
  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 13,
    textDecoration: "none",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };

  const activeStyle: React.CSSProperties = active
    ? {
        background: "linear-gradient(135deg,#22c55e,#16a34a)",
        color: "#020617",
        fontWeight: 600,
      }
    : {
        background: "transparent",
        color: "#e5e7eb",
      };

  const content = (
    <span style={{ ...baseStyle, ...activeStyle }}>
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      <span>{label}</span>
    </span>
  );

  if (disabled) {
    return content as any;
  }

  return <Link to={to}>{content}</Link>;
}
