// src/pages/DashboardHome.tsx
import { Link } from "react-router-dom";

export default function DashboardHome() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        paddingTop: 10,
      }}
    >
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Wolf APP</h1>
      <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 18 }}>
        Seleziona cosa vuoi fare dal menu a sinistra. Puoi iniziare dal
        magazzino o dalla cassa di fine serata.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <HomeCard
          title="Magazzino"
          description="Controlla le giacenze, gestisci i lotti, verifica le scadenze."
          to="/app/magazzino"
          icon="📦"
        />
        <HomeCard
          title="Nuovo prodotto"
          description="Inserisci un nuovo articolo con prezzo, IVA, scorta minima."
          to="/app/magazzino/nuovo"
          icon="➕"
        />
        <HomeCard
          title="Inventario"
          description="Allinea rapidamente le giacenze fisiche con il sistema."
          to="/app/magazzino/inventario"
          icon="📋"
        />
        <HomeCard
          title="Chiusura di cassa"
          description="Registra la fine serata, controlla incassi e differenze."
          to="/app/cassa/chiusure"
          icon="🕙"
        />
      </div>
    </div>
  );
}

type HomeCardProps = {
  title: string;
  description: string;
  to: string;
  icon?: string;
};

function HomeCard({ title, description, to, icon }: HomeCardProps) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          borderRadius: 14,
          padding: 14,
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))",
          border: "1px solid #1f2937",
          boxShadow: "0 18px 35px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          height: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <span
              style={{
                fontSize: 18,
              }}
            >
              {icon}
            </span>
          )}
          <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          {description}
        </p>
        <span
          style={{
            marginTop: "auto",
            fontSize: 12,
            color: "#a5b4fc",
          }}
        >
          Apri &rarr;
        </span>
      </div>
    </Link>
  );
}
