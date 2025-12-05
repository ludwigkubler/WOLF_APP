import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import api from "../services/api";

type Warehouse = "banco" | "cantina";
// type ApiWarehouse = "generale" | "banco" | "cantina";

type Product = {
  id: number;
  name: string;
  price_cents: number;
  unit: string;
  quantity: number;
  min_quantity: number;
  is_active: boolean;
  supplier?: string | null;
  expiry_date?: string | null;
  vat_rate: number;
  discount_percent: number;
};

type Lot = {
  id: number;
  product_id: number;
  lot_code: string;
  expiry_date?: string | null;
};

type Me = {
  username: string;
  role: string; // "manager" | "staff" | ...
};

type SortKey = "name" | "supplier" | "expiry" | "quantity";
type SortDir = "asc" | "desc";

export default function MagazzinoListPage() {
  const [me, setMe] = useState<Me | null>(null);

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [loc, setLoc] = useState<"all" | Warehouse>("all");

  const [minExpiry, setMinExpiry] = useState<Record<number, string | null>>({});
  const [minLotCode, setMinLotCode] = useState<Record<number, string | null>>(
    {}
  );

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [expiryFilter, setExpiryFilter] = useState<
    "all" | "expired" | "7" | "30"
  >("all");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // editing prodotto
  type Draft = {
    name: string;
    supplier?: string | null;
    expiry_date?: string | null;
    unit: string;
    price_eur: string;
    vat_rate: number;
    discount_percent: string;
    quantity: string;
    min_quantity: string;
    is_active: boolean;
  };

  const [editing, setEditing] = useState<{
    product: Product;
    draft: Draft;
  } | null>(null);
  const [busyEdit, setBusyEdit] = useState(false);

  /* -------------------------- helpers -------------------------- */

  function euroFromCents(cents: number) {
    return (cents / 100).toFixed(2);
  }

  function euroToCents(eur: number) {
    if (!isFinite(eur)) return 0;
    return Math.round(eur * 100);
  }

  function daysUntil(dateISO?: string | null) {
    if (!dateISO) return Infinity;
    const d = new Date(dateISO);
    if (isNaN(d.getTime())) return Infinity;
    const today = new Date();
    const t0 = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const t1 = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    ).getTime();
    return Math.floor((t1 - t0) / 86400000);
  }

  function expiryBadge(expISO?: string | null) {
    const dd = daysUntil(expISO);
    if (dd === Infinity)
      return {
        text: "—",
        style: pillGray,
      };
    if (dd < 0)
      return {
        text: "❌ Scaduto",
        style: pillRed,
      };
    if (dd === 0)
      return {
        text: "🔴 Oggi",
        style: pillRedStrong,
      };
    if (dd <= 7)
      return {
        text: `🟠 ${dd}g`,
        style: pillOrange,
      };
    if (dd <= 30)
      return {
        text: `🟡 ${dd}g`,
        style: pillYellow,
      };
    return {
      text: `🟢 ${dd}g`,
      style: pillGreen,
    };
  }

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
      // reset min scadenze quando cambia lista
      setMinExpiry({});
      setMinLotCode({});
    } catch (e: any) {
      setErr(explainAxiosError(e, "Impossibile caricare i prodotti"));
    } finally {
      setLoading(false);
    }
  }

  async function preloadExpiries(ids: number[]) {
    const missing = ids.filter((id) => !(id in minExpiry));
    for (const id of missing) {
      try {
        const qs = loc === "all" ? "" : `?location=${loc}`;
        const { data } = await api.get<Lot[]>(`/lots/product/${id}${qs}`);
        const nonNullLots = data.filter((l) => !!l.expiry_date);
        nonNullLots.sort((a, b) =>
          (a.expiry_date || "").localeCompare(b.expiry_date || "")
        );
        const min = nonNullLots[0]?.expiry_date ?? null;
        const code = nonNullLots[0]?.lot_code ?? null;
        setMinExpiry((prev) => ({ ...prev, [id]: min }));
        setMinLotCode((prev) => ({ ...prev, [id]: code }));
      } catch {
        setMinExpiry((prev) => ({ ...prev, [id]: null }));
        setMinLotCode((prev) => ({ ...prev, [id]: null }));
      }
    }
  }

  useEffect(() => {
    loadMe().then(loadProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // quando cambia il magazzino, ricarico prodotti e resetto scadenze
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  useEffect(() => {
    if (items.length) preloadExpiries(items.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loc]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => {
      if (p.supplier) s.add(p.supplier);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  /* ---------------------- filtro + ordinamento ------------------ */

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((p) => {
      const okSupplier = supplierFilter ? p.supplier === supplierFilter : true;
      const okSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.supplier || "").toLowerCase().includes(term);

      const expISO = minExpiry[p.id];

      if (expiryFilter === "all") return okSupplier && okSearch;
      const dd = daysUntil(expISO);
      const isExpired = dd < 0;
      const in7 = dd >= 0 && dd <= 7;
      const in30 = dd >= 0 && dd <= 30;
      const okExp =
        (expiryFilter === "expired" && isExpired) ||
        (expiryFilter === "7" && in7) ||
        (expiryFilter === "30" && in30);
      return okSupplier && okSearch && okExp;
    });
  }, [items, search, supplierFilter, expiryFilter, minExpiry]);

  const visibleItems = useMemo(() => {
    const arr = [...filteredItems];
    arr.sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;

      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "supplier":
          av = (a.supplier || "").toLowerCase();
          bv = (b.supplier || "").toLowerCase();
          break;
        case "expiry":
          av = minExpiry[a.id] || "";
          bv = minExpiry[b.id] || "";
          break;
        case "quantity":
          av = a.quantity ?? 0;
          bv = b.quantity ?? 0;
          break;
      }

      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      return sortDir === "asc" ? 1 : -1;
    });
    return arr;
  }, [filteredItems, sortKey, sortDir, minExpiry]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  /* ---------------------- edit / delete prodotto ---------------- */

  function startEdit(p: Product) {
    setEditing({
      product: p,
      draft: {
        name: p.name,
        supplier: p.supplier || "",
        expiry_date: p.expiry_date || "",
        unit: p.unit,
        price_eur: euroFromCents(p.price_cents),
        vat_rate: p.vat_rate,
        discount_percent: String(p.discount_percent ?? 0),
        quantity: String(p.quantity ?? 0),
        min_quantity: String(p.min_quantity ?? 0),
        is_active: p.is_active,
      },
    });
  }

  async function saveEdit() {
    if (!editing) return;
    if (me?.role !== "manager")
      return alert("Solo i manager possono modificare.");
    try {
      setBusyEdit(true);
      const d = editing.draft;
      await api.put(`/products/${editing.product.id}`, {
        name: d.name,
        supplier: d.supplier || null,
        expiry_date: d.expiry_date || null,
        unit: d.unit,
        price_cents: euroToCents(parseFloat(d.price_eur || "0")),
        vat_rate: d.vat_rate,
        discount_percent: parseFloat(d.discount_percent || "0"),
        quantity: parseFloat(d.quantity || "0"),
        min_quantity: parseFloat(d.min_quantity || "0"),
        is_active: d.is_active,
      });
      setEditing(null);
      await loadProducts();
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore aggiornamento"));
    } finally {
      setBusyEdit(false);
    }
  }

  async function del(id: number) {
    if (me?.role !== "manager")
      return alert("Solo i manager possono eliminare.");
    if (!confirm("Eliminare il prodotto?")) return;
    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore eliminazione"));
    }
  }

  /* ---------------------------- UI ------------------------------ */

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "";

  return (
    <div style={page}>
      <div style={shell}>
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={sectionLabel}>Gestione magazzino</div>
              <h1 style={{ margin: 0, fontSize: 22 }}>Lista magazzino</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
                Cerca, ordina e modifica i prodotti presenti in magazzino.
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

        {/* Barra filtri */}
        <section style={{ marginBottom: 16 }}>
        <div style={card}>
            <div style={filtersRow}>
            <div style={filterItem}>
                <label style={label}>Cerca</label>
                <input
                style={input}
                placeholder="Prodotto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div style={filterItem}>
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
            <div style={filterItem}>
                <label style={label}>Scadenza</label>
                <select
                style={input}
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value as any)}
                >
                <option value="all">Tutte</option>
                <option value="expired">Scaduti</option>
                <option value="7">Entro 7 giorni</option>
                <option value="30">Entro 30 giorni</option>
                </select>
            </div>
            <div style={filterItem}>
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
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            Prodotti visibili: {visibleItems.length}
        </div>
        </section>


        {/* Pannello modifica prodotto */}
        {editing && (
          <section style={{ marginBottom: 16 }}>
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={sectionLabel}>Modifica prodotto</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {editing.product.name}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={ghostButton}
                    onClick={() => setEditing(null)}
                    disabled={busyEdit}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={saveEdit}
                    disabled={busyEdit}
                  >
                    {busyEdit ? "Salvo..." : "Salva modifiche"}
                  </button>
                </div>
              </div>

              {/* Form semplificato */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1.5fr) minmax(0,1fr) 120px 120px",
                  gap: 10,
                }}
              >
                <div>
                  <label style={label}>Nome</label>
                  <input
                    style={input}
                    value={editing.draft.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Fornitore</label>
                  <input
                    style={input}
                    value={editing.draft.supplier || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, supplier: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Prezzo €/unità</label>
                  <input
                    style={input}
                    value={editing.draft.price_eur}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, price_eur: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Unità</label>
                  <input
                    style={input}
                    value={editing.draft.unit}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, unit: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 80px 120px 120px",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <div>
                  <label style={label}>IVA %</label>
                  <input
                    type="number"
                    style={input}
                    value={editing.draft.vat_rate}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: {
                          ...editing.draft,
                          vat_rate: Number(e.target.value || 0),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Sconto %</label>
                  <input
                    style={input}
                    value={editing.draft.discount_percent}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: {
                          ...editing.draft,
                          discount_percent: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Scorta minima</label>
                  <input
                    style={input}
                    value={editing.draft.min_quantity}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: {
                          ...editing.draft,
                          min_quantity: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={label}>Attivo</label>
                  <select
                    style={input}
                    value={editing.draft.is_active ? "1" : "0"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: {
                          ...editing.draft,
                          is_active: e.target.value === "1",
                        },
                      })
                    }
                  >
                    <option value="1">Sì</option>
                    <option value="0">No</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tabella principale */}
        <section>
          <div style={card}>
            <table style={table}>
              <thead>
                <tr>
                  <th
                    style={th}
                    onClick={() => toggleSort("name")}
                    title="Ordina per nome"
                  >
                    Nome {sortArrow("name")}
                  </th>
                  <th
                    style={th}
                    onClick={() => toggleSort("supplier")}
                    title="Ordina per fornitore"
                  >
                    Fornitore {sortArrow("supplier")}
                  </th>
                  <th
                    style={th}
                    onClick={() => toggleSort("expiry")}
                    title="Ordina per scadenza più vicina"
                  >
                    Scadenza min. {sortArrow("expiry")}
                  </th>
                  <th
                    style={th}
                    onClick={() => toggleSort("quantity")}
                    title="Ordina per quantità"
                  >
                    Q.tà
                    {loc !== "all" ? ` (${loc})` : ""}
                    {sortArrow("quantity")}
                  </th>
                  <th style={th}>Unità</th>
                  <th style={th}>Scorta min.</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={7} style={tdEmpty}>
                      Nessun prodotto trovato con i filtri correnti.
                    </td>
                  </tr>
                )}
                {visibleItems.map((p) => {
                  const expISO = minExpiry[p.id];
                  const badge = expiryBadge(expISO);
                  return (
                    <tr key={p.id}>
                      <td style={tdMain}>{p.name}</td>
                      <td style={td}>{p.supplier || <span>—</span>}</td>
                      <td style={td}>
                        <span style={badge.style as any}>{badge.text}</span>
                        {minLotCode[p.id] && (
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>
                            lotto {minLotCode[p.id]}
                          </div>
                        )}
                      </td>
                      <td style={tdRight}>{p.quantity}</td>
                      <td style={td}>{p.unit}</td>
                      <td style={tdRight}>{p.min_quantity}</td>
                      <td style={td}>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          <button
                            style={smallButton}
                            onClick={() => startEdit(p)}
                          >
                            ✏️ Modifica
                          </button>
                          <button
                            style={smallDangerButton}
                            onClick={() => del(p.id)}
                          >
                            🗑 Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
  cursor: "pointer",
  userSelect: "none",
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

const smallButton: CSSProperties = {
  borderRadius: 999,
  border: "1px solid #4b5563",
  background: "transparent",
  color: "#e5e7eb",
  padding: "3px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const smallDangerButton: CSSProperties = {
  ...smallButton,
  borderColor: "#b91c1c",
  color: "#fecaca",
};

/* pill varianti */

const pillBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "1px 7px",
  fontSize: 11,
  borderWidth: 1,
  borderStyle: "solid",
};

const pillGray: CSSProperties = {
  ...pillBase,
  background: "#020617",
  color: "#9ca3af",
  borderColor: "#1e293b",
};

const pillRed: CSSProperties = {
  ...pillBase,
  background: "#450a0a",
  color: "#fee2e2",
  borderColor: "#7f1d1d",
};

const pillRedStrong: CSSProperties = {
  ...pillBase,
  background: "#7f1d1d",
  color: "#fee2e2",
  borderColor: "#b91c1c",
};

const pillOrange: CSSProperties = {
  ...pillBase,
  background: "#451a03",
  color: "#ffedd5",
  borderColor: "#9a3412",
};

const pillYellow: CSSProperties = {
  ...pillBase,
  background: "#422006",
  color: "#fef9c3",
  borderColor: "#854d0e",
};

const pillGreen: CSSProperties = {
  ...pillBase,
  background: "#022c22",
  color: "#bbf7d0",
  borderColor: "#16a34a",
};

const filtersRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "flex-end",
};

const filterItem: CSSProperties = {
  flex: "1 1 220px",
  minWidth: 0,
};

