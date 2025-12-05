import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import api from "../services/api";

type Warehouse = "banco" | "cantina";

type Product = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  supplier?: string | null;
};

type Me = {
  username: string;
  role: string;
};

export default function Inventario() {
  const [me, setMe] = useState<Me | null>(null);

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [loc, setLoc] = useState<"all" | Warehouse>("all");

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");

  const [invQty, setInvQty] = useState<Record<number, string>>({});
  const [busySave, setBusySave] = useState(false);

  /* ------------------------ helpers ----------------------------- */

  function explainAxiosError(e: any, fallback: string) {
    const status = e?.response?.status;
    const detail = e?.response?.data?.detail || e?.message;
    return `${fallback}${status ? ` (${status})` : ""}${
      detail ? `\n${detail}` : ""
    }`;
  }

  /* ----------------------- caricamento dati --------------------- */

  async function loadMe() {
    try {
      const { data } = await api.get("/auth/me");
      setMe({ username: data.username, role: data.role });
    } catch {
      setMe(null);
    }
  }

  async function loadProducts() {
    setLoading(true);
    setErr(null);
    try {
      const qs = loc === "all" ? "" : `?location=${loc}`;
      const { data } = await api.get<Product[]>(`/products${qs}`);
      setItems(data);
      setInvQty(Object.fromEntries(data.map((p) => [p.id, String(p.quantity ?? 0)])));
    } catch (e: any) {
      setErr(explainAxiosError(e, "Impossibile caricare i prodotti"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe().then(loadProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => {
      if (p.supplier) s.add(p.supplier);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((p) => {
      const okSupplier = supplierFilter ? p.supplier === supplierFilter : true;
      const okSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.supplier || "").toLowerCase().includes(term);
      return okSupplier && okSearch;
    });
  }, [items, search, supplierFilter]);

  /* ------------------------- salvataggio ------------------------ */

  async function saveInventory() {
    if (me?.role !== "manager")
      return alert("Solo i manager possono salvare l'inventario.");
    try {
      setBusySave(true);
      const itemsPayload = Object.entries(invQty).map(([id, q]) => {
        const raw = Number(q);
        const quantity = isNaN(raw) || raw < 0 ? 0 : raw;
        return { id: Number(id), quantity };
      });
      await api.post("/products/inventory", { items: itemsPayload });
      await loadProducts();
      alert("Inventario salvato");
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore salvataggio inventario"));
    } finally {
      setBusySave(false);
    }
  }

  /* ------------------------------ UI ---------------------------- */

  return (
    <div style={page}>
      <div style={shell}>
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={sectionLabel}>Gestione magazzino</div>
              <h1 style={{ margin: 0, fontSize: 22 }}>Inventario</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
                Modifica rapidamente le giacenze fisiche per allineare il
                sistema.
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: 12 }}>
              <div style={{ color: "#9ca3af" }}>
                Utente: {me ? `${me.username} (${me.role})` : "—"}
              </div>
              <button
                onClick={loadProducts}
                disabled={loading}
                style={{ ...ghostButton, marginTop: 6 }}
              >
                {loading ? "Carico..." : "Ricarica"}
              </button>
            </div>
          </div>
          {err && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#fecaca" }}>
              {err}
            </p>
          )}
        </header>

        {/* Pannello opzioni inventario */}
        <section style={{ marginBottom: 16 }}>
          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  Modalità inventario attiva
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                  Modifica i valori nella colonna <b>Q.tà inventario</b>.{" "}
                  <br />
                  Con <b>Salva inventario</b> sovrascrivi le giacenze correnti
                  per tutti i prodotti.
                </p>
              </div>
              <button
                onClick={saveInventory}
                disabled={busySave}
                style={primaryButton}
              >
                {busySave ? "Salvo..." : "💾 Salva inventario"}
              </button>
            </div>
          </div>
        </section>

        {/* Filtri */}
        <section style={{ marginBottom: 16 }}>
          <div
            style={{
              ...card,
              display: "grid",
              gap: 10,
              gridTemplateColumns:
                "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)",
              alignItems: "end",
            }}
          >
            <div>
              <label style={label}>Cerca</label>
              <input
                style={input}
                placeholder="Nome o fornitore"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={label}>Fornitore</label>
              <select
                style={input}
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">Tutti</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Magazzino</label>
              <select
                style={input}
                value={loc}
                onChange={(e) => setLoc(e.target.value as any)}
              >
                <option value="all">Tutti</option>
                <option value="banco">Banco</option>
                <option value="cantina">Cantina</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            Prodotti visibili: {visibleItems.length}
          </div>
        </section>

        {/* Tabella inventario */}
        <section>
          <div style={card}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Nome</th>
                  <th style={th}>Fornitore</th>
                  <th style={th}>Q.tà attuale</th>
                  <th style={th}>Q.tà inventario</th>
                  <th style={th}>Unità</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={5} style={tdEmpty}>
                      Nessun prodotto trovato con i filtri correnti.
                    </td>
                  </tr>
                )}
                {visibleItems.map((p) => (
                  <tr key={p.id}>
                    <td style={tdMain}>{p.name}</td>
                    <td style={td}>{p.supplier || "—"}</td>
                    <td style={tdRight}>{p.quantity}</td>
                    <td style={td}>
                      <input
                        style={{
                          ...input,
                          width: "100%",
                          padding: "4px 6px",
                          fontSize: 12,
                        }}
                        value={invQty[p.id] ?? ""}
                        onChange={(e) =>
                          setInvQty((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        inputMode="decimal"
                      />
                    </td>
                    <td style={td}>{p.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

/* --------------------------- STILI BASE ------------------------- */

const page: CSSProperties = {
  minHeight: "100vh",
  color: "#e5e7eb",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const shell: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

const card: CSSProperties = {
  borderRadius: 18,
  padding: 14,
  background:
    "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
  border: "1px solid #1f2937",
  boxShadow: "0 18px 35px rgba(0,0,0,0.60)",
};

const sectionLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 2,
  color: "#6b7280",
};

const label: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 4,
};

const input: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #374151",
  padding: "6px 9px",
  fontSize: 13,
  background: "#020617",
  color: "#e5e7eb",
  outline: "none",
};

const primaryButton: CSSProperties = {
  borderRadius: 999,
  border: "1px solid #4f46e5",
  background:
    "linear-gradient(135deg, rgba(129,140,248,0.95), rgba(79,70,229,0.95))",
  color: "#e5e7eb",
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  borderRadius: 999,
  border: "1px solid #4b5563",
  background: "transparent",
  color: "#e5e7eb",
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #1f2937",
  fontSize: 12,
  color: "#9ca3af",
};

const td: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #111827",
  verticalAlign: "top",
};

const tdMain: CSSProperties = {
  ...td,
  fontWeight: 500,
};

const tdRight: CSSProperties = {
  ...td,
  textAlign: "right",
};

const tdEmpty: CSSProperties = {
  padding: 16,
  textAlign: "center",
  fontSize: 13,
  color: "#9ca3af",
};
