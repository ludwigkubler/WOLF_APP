import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

// --- Tipi ---
type Warehouse = "banco" | "cantina"; // UI: solo magazzini fisici
type ApiWarehouse = "generale" | "banco" | "cantina"; // backend

type Product = {
  id: number;
  name: string;
  price_cents: number; // netto (senza IVA)
  unit: string;
  quantity: number;
  min_quantity: number;
  is_active: boolean;
  supplier?: string | null;
  expiry_date?: string | null;
  vat_rate: number;
  discount_percent: number;
};

type LotStatus = "ok" | "blocked" | "discarded";

type Lot = {
  id: number;
  product_id: number;
  lot_code: string;
  supplier?: string | null;
  expiry_date?: string | null;
  quantity: number;
  cost_cents?: number | null;
  location: ApiWarehouse;
  status: LotStatus;
  block_reason?: string | null;
  created_at?: string;
};

type LotSearchResult = {
  id: number;
  product_id: number;
  product_name: string;
  lot_code: string;
  supplier?: string | null;
  expiry_date?: string | null;
  quantity: number;
  cost_cents?: number | null;
  location: ApiWarehouse;
  status: LotStatus;
  block_reason?: string | null;
  created_at?: string;
};

type Me = { username: string; role: "manager" | "staff" };

// --- UI helpers ---
const page: CSSProperties = {
  minHeight: "100vh",
  background: "#0b1120",
  color: "#e5e7eb",
  padding: "24px 32px",
  boxSizing: "border-box",
};

const shell: CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
};

const card: CSSProperties = {
  borderRadius: 14,
  padding: 18,
  background: "#020617",
  boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
  border: "1px solid #1f2937",
};

const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
  color: "#e5e7eb",
};

const input: CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1px solid #334155",
  borderRadius: 9,
  fontSize: 13,
  color: "#e5e7eb",
  backgroundColor: "#020617",
  outline: "none",
};

const hint: CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  marginTop: 4,
};

const row: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "1fr 1fr",
};

const actionsRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginTop: 16,
};

const tableCard: CSSProperties = {
  ...card,
  padding: 0,
  marginTop: 0,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

const thStyle: CSSProperties = {
  padding: "7px 8px",
  borderBottom: "1px solid #1e293b",
  background: "#020617",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "#9ca3af",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #111827",
  textAlign: "left",
  verticalAlign: "middle",
};

const primaryButton: CSSProperties = {
  borderRadius: 999,
  padding: "7px 14px",
  border: "none",
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "#020617",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  borderRadius: 999,
  padding: "7px 12px",
  border: "1px solid #1f2937",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: 12,
  cursor: "pointer",
};

const pill: CSSProperties = {
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 11,
  border: "1px solid #1f2937",
  background: "#020617",
  color: "#e5e7eb",
};

// helpers
function euroToCents(eur: number) {
  return Math.round((eur || 0) * 100);
}
function centsToEuro(cents: number) {
  return (cents / 100).toFixed(2);
}

// Prezzo finale = netto * (1+IVA) * (1 - sconto)
function finalPriceFromNetEuro(
  net_eur: number,
  vat_rate: number,
  discount_percent: number
): string {
  const gross = (net_eur || 0) * (1 + (vat_rate || 0) / 100);
  const final = gross * (1 - (discount_percent || 0) / 100);
  return final.toFixed(2);
}
function finalPriceFromNetCents(
  net_cents: number,
  vat_rate: number,
  discount_percent: number
): string {
  return finalPriceFromNetEuro(
    (net_cents || 0) / 100,
    vat_rate,
    discount_percent
  );
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
      style: {
        ...pill,
        background: "#020617",
        color: "#9ca3af",
        borderColor: "#1e293b",
      } as CSSProperties,
    };
  if (dd < 0)
    return {
      text: "❌ Scaduto",
      style: {
        ...pill,
        background: "#450a0a",
        color: "#fee2e2",
        borderColor: "#7f1d1d",
      } as CSSProperties,
    };
  if (dd === 0)
    return {
      text: "🔴 Oggi",
      style: {
        ...pill,
        background: "#7f1d1d",
        color: "#fee2e2",
        borderColor: "#b91c1c",
      } as CSSProperties,
    };
  if (dd <= 7)
    return {
      text: `🟠 ${dd}g`,
      style: {
        ...pill,
        background: "#451a03",
        color: "#ffedd5",
        borderColor: "#9a3412",
      } as CSSProperties,
    };
  if (dd <= 30)
    return {
      text: `🟡 ${dd}g`,
      style: {
        ...pill,
        background: "#422006",
        color: "#fef9c3",
        borderColor: "#854d0e",
      } as CSSProperties,
    };
  return {
    text: `🟢 ${dd}g`,
    style: {
      ...pill,
      background: "#022c22",
      color: "#bbf7d0",
      borderColor: "#16a34a",
    } as CSSProperties,
  };
}

function explainAxiosError(e: any, fallback: string) {
  const status = e?.response?.status;
  const detail = e?.response?.data?.detail || e?.message;
  return `${fallback}${status ? ` (${status})` : ""}${
    detail ? `\n${detail}` : ""
  }`;
}

// == Form prodotto (create / edit) ==
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

function ProductForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy,
}: {
  value: Draft;
  onChange: (v: Draft) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
}) {
  const finalPrice = finalPriceFromNetEuro(
    parseFloat(value.price_eur || "0"),
    value.vat_rate,
    parseFloat(value.discount_percent || "0")
  );

  return (
    <div style={{ ...card, width: "100%" }}>
      <div style={{ marginBottom: 10 }}>
        <label style={label}>Nome prodotto *</label>
        <input
          style={input}
          placeholder="Es. Coca Cola 0.33L"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          required
        />
        <div style={hint}>
          Il nome come comparirà nelle liste e nei report.
        </div>
      </div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div>
          <label style={label}>Fornitore</label>
          <input
            style={input}
            placeholder="Es. Giani srl"
            value={value.supplier || ""}
            onChange={(e) =>
              onChange({ ...value, supplier: e.target.value || null })
            }
          />
          <div style={hint}>Opzionale. Utile per filtri e riordini.</div>
        </div>
        <div>
          <label style={label}>Data di scadenza</label>
          <input
            type="date"
            style={input}
            value={value.expiry_date || ""}
            onChange={(e) =>
              onChange({ ...value, expiry_date: e.target.value || null })
            }
          />
          <div style={hint}>Opzionale. Formato YYYY-MM-DD.</div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Unità di misura</label>
        <select
          style={input}
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value })}
        >
          <option value="pz">pz</option>
          <option value="bott">bott</option>
          <option value="latt">latt</option>
          <option value="L/kg">L/kg</option>
        </select>
      </div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div>
          <label style={label}>Prezzo netto (€)</label>
          <input
            type="number"
            step="0.01"
            style={input}
            placeholder="0.00"
            value={value.price_eur || ""}
            onChange={(e) => onChange({ ...value, price_eur: e.target.value })}
          />
          <div style={hint}>Prezzo unitario al netto dell’IVA.</div>
        </div>
        <div>
          <label style={label}>IVA (%)</label>
          <select
            style={input}
            value={value.vat_rate}
            onChange={(e) =>
              onChange({ ...value, vat_rate: Number(e.target.value) })
            }
          >
            <option value={4}>4%</option>
            <option value={10}>10%</option>
            <option value={22}>22%</option>
          </select>
          <div style={hint}>Aliquota applicata al prezzo netto.</div>
        </div>
      </div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div>
          <label style={label}>Sconto (%)</label>
          <input
            type="number"
            step="1"
            min={0}
            max={100}
            style={input}
            placeholder="0"
            value={value.discount_percent || ""}
            onChange={(e) =>
              onChange({ ...value, discount_percent: e.target.value })
            }
          />
          <div style={hint}>Percentuale di sconto (0–100%).</div>
        </div>
        <div>
          <label style={label}>Prezzo finale (€)</label>
          <input
            style={{ ...input, background: "#020617", borderColor: "#1e293b" }}
            value={finalPrice}
            readOnly
          />
          <div style={hint}>
            Calcolato: Netto × (1+IVA) × (1–Sconto).
          </div>
        </div>
      </div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div>
          <label style={label}>Quantità attuale</label>
          <input
            type="number"
            step="0.01"
            style={input}
            placeholder="0"
            value={value.quantity || ""}
            onChange={(e) => onChange({ ...value, quantity: e.target.value })}
          />
        </div>
        <div>
          <label style={label}>Quantità minima</label>
          <input
            type="number"
            step="0.01"
            style={input}
            placeholder="0"
            value={value.min_quantity || ""}
            onChange={(e) =>
              onChange({ ...value, min_quantity: e.target.value })
            }
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          id="is_active_id"
          type="checkbox"
          checked={!!value.is_active}
          onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
        />
        <label htmlFor="is_active_id" style={{ margin: 0 }}>
          Prodotto attivo
        </label>
      </div>

      <div style={actionsRow}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          style={{
            ...primaryButton,
            opacity: busy ? 0.7 : 1,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Salvataggio..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

// --------------------- Pagina ---------------------
export default function Products() {
  const [me, setMe] = useState<Me | null>(null);

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [loc, setLoc] = useState<"all" | Warehouse>("all");

  const [inventoryMode, setInventoryMode] = useState(false);
  const [invQty, setInvQty] = useState<Record<number, number>>({});

  const emptyDraft = useMemo(
    () => ({
      name: "",
      supplier: "",
      expiry_date: "",
      unit: "pz",
      price_eur: "",
      vat_rate: 22,
      discount_percent: "",
      quantity: "",
      min_quantity: "",
      is_active: true,
    }),
    []
  );
  const [newForm, setNewForm] = useState<Draft>(emptyDraft);
  const [busyCreate, setBusyCreate] = useState(false);
  const [lastCreated, setLastCreated] = useState<Product | null>(null);

  const [editing, setEditing] = useState<{
    product: Product;
    draft: Draft;
  } | null>(null);
  const [busyEdit, setBusyEdit] = useState(false);

  const [lotsModal, setLotsModal] = useState<
    | null
    | {
        product: Product;
        rows: Lot[];
        loading: boolean;
        filter: string;
        newLot: {
          lot_code: string;
          supplier: string;
          expiry_date: string;
          quantity: string;
          cost_eur: string;
          location: ApiWarehouse;
          status: LotStatus;
          block_reason: string;
        };
      }
  >(null);

  const [minExpiry, setMinExpiry] = useState<Record<number, string | null>>({});
  const [minLotCode, setMinLotCode] = useState<Record<number, string | null>>(
    {}
  );

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [expiryFilter, setExpiryFilter] = useState<
    "all" | "expired" | "7" | "30"
  >("all");

  // ricerca globale per numero di lotto
  const [lotSearchCode, setLotSearchCode] = useState("");
  const [lotSearchLocation, setLotSearchLocation] =
    useState<"all" | ApiWarehouse>("all");
  const [lotSearchResults, setLotSearchResults] = useState<LotSearchResult[]>(
    []
  );
  const [lotSearchLoading, setLotSearchLoading] = useState(false);
  const [lotSearchError, setLotSearchError] = useState<string | null>(null);

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
      setInvQty(Object.fromEntries(data.map((p) => [p.id, p.quantity])));
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
  }, []);
  useEffect(() => {
    setMinExpiry({});
    setMinLotCode({});
    loadProducts();
  }, [loc]);
  useEffect(() => {
    if (items.length) preloadExpiries(items.map((p) => p.id));
  }, [items, loc]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => {
      if (p.supplier) s.add(p.supplier);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  async function openLots(p: Product) {
    setLotsModal({
      product: p,
      rows: [],
      loading: true,
      filter: "",
      newLot: {
        lot_code: "",
        supplier: p.supplier || "",
        expiry_date: "",
        quantity: "",
        cost_eur: "",
        location: (loc === "all" ? "banco" : loc) as ApiWarehouse,
        status: "ok",
        block_reason: "",
      },
    });
    try {
      const qs = loc === "all" ? "" : `?location=${loc}`;
      const url = `/lots/product/${p.id}${qs}`;
      const { data } = await api.get<Lot[]>(url);

      setLotsModal((m) =>
        m
          ? {
              ...m,
              rows: data,
              loading: false,
            }
          : null
      );
      const nonNullLots = data.filter((l) => !!l.expiry_date);
      nonNullLots.sort((a, b) =>
        (a.expiry_date || "").localeCompare(b.expiry_date || "")
      );
      const min = nonNullLots[0]?.expiry_date ?? null;
      const code = nonNullLots[0]?.lot_code ?? null;
      setMinExpiry((prev) => ({ ...prev, [p.id]: min }));
      setMinLotCode((prev) => ({ ...prev, [p.id]: code }));
    } catch (e: any) {
      setLotsModal((m) => (m ? { ...m, loading: false } : null));
      alert(explainAxiosError(e, "Errore caricamento lotti"));
    }
  }

  const lotsAvgCost = useMemo(() => {
    if (!lotsModal || !lotsModal.rows.length) return null;
    let wsum = 0;
    let qsum = 0;
    for (const l of lotsModal.rows) {
      if (l.cost_cents != null) {
        wsum += l.cost_cents * (l.quantity || 0);
        qsum += l.quantity || 0;
      }
    }
    if (qsum <= 0) return null;
    return wsum / qsum / 100;
  }, [lotsModal]);

  const visibleLots = useMemo(() => {
    if (!lotsModal) return [];
    const term = lotsModal.filter.trim().toLowerCase();
    if (!term) return lotsModal.rows;
    return lotsModal.rows.filter((l) => {
      return (
        l.lot_code.toLowerCase().includes(term) ||
        (l.supplier || "").toLowerCase().includes(term)
      );
    });
  }, [lotsModal]);

  async function addLot() {
    if (!lotsModal) return;
    const p = lotsModal.product;
    const nl = lotsModal.newLot;

    if (!nl.lot_code.trim()) {
      alert("Inserisci un numero di lotto (codice alfanumerico).");
      return;
    }

    try {
      await api.post(`/lots/product/${p.id}`, {
        lot_code: nl.lot_code.trim(),
        supplier: nl.supplier || null,
        expiry_date: nl.expiry_date || null,
        quantity: parseFloat(nl.quantity || "0"),
        cost_cents: nl.cost_eur
          ? Math.round(parseFloat(nl.cost_eur) * 100)
          : null,
        location: nl.location,
        status: nl.status,
        block_reason: nl.block_reason || null,
      });
      await openLots(p);
      await loadProducts();
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore creazione lotto"));
    }
  }

  async function updateLot(l: Lot) {
    if (!l.lot_code.trim()) {
      alert("Il numero di lotto non può essere vuoto.");
      return;
    }
    try {
      await api.put(`/lots/${l.id}`, {
        lot_code: l.lot_code.trim(),
        supplier: l.supplier || null,
        expiry_date: l.expiry_date || null,
        quantity: l.quantity,
        cost_cents: l.cost_cents ?? null,
        location: l.location,
        status: l.status,
        block_reason: l.block_reason || null,
      });
      if (lotsModal) await openLots(lotsModal.product);
      await loadProducts();
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore salvataggio lotto"));
    }
  }

  async function deleteLot(l: Lot) {
    if (!confirm(`Eliminare il lotto ${l.lot_code}?`)) return;
    try {
      await api.delete(`/lots/${l.id}`);
      if (lotsModal) await openLots(lotsModal.product);
      await loadProducts();
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore eliminazione lotto"));
    }
  }

  async function createProduct() {
    if (me?.role !== "manager")
      return alert("Solo i manager possono creare prodotti.");
    try {
      setBusyCreate(true);
      const { data: created } = await api.post<Product>("/products", {
        name: newForm.name,
        supplier: newForm.supplier || null,
        expiry_date: newForm.expiry_date || null,
        unit: newForm.unit,
        price_cents: euroToCents(parseFloat(newForm.price_eur || "0")),
        vat_rate: newForm.vat_rate,
        discount_percent: parseFloat(newForm.discount_percent || "0"),
        quantity: parseFloat(newForm.quantity || "0"),
        min_quantity: parseFloat(newForm.min_quantity || "0"),
        is_active: newForm.is_active,
      });
      setNewForm({ ...emptyDraft });
      setLastCreated(created);
      await loadProducts();
      await openLots(created);
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore creazione prodotto"));
    } finally {
      setBusyCreate(false);
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

  function startEdit(p: Product) {
    setEditing({
      product: p,
      draft: {
        name: p.name,
        supplier: p.supplier || "",
        expiry_date: p.expiry_date || "",
        unit: p.unit,
        price_eur: String(p.price_cents / 100),
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

  async function saveInventory() {
    if (me?.role !== "manager")
      return alert("Solo i manager possono salvare l'inventario.");
    try {
      const itemsPayload = Object.entries(invQty).map(([id, q]) => {
        const raw = Number(q);
        const quantity = isNaN(raw) || raw < 0 ? 0 : raw;
        return { id: Number(id), quantity };
      });
      await api.post("/products/inventory", { items: itemsPayload });
      setInventoryMode(false);
      await loadProducts();
      alert("Inventario salvato");
    } catch (e: any) {
      alert(explainAxiosError(e, "Errore salvataggio inventario"));
    }
  }

  const visibleItems = useMemo(() => {
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

  function exportPDF() {
    const now = new Date();
    const rows = visibleItems
      .map((p) => {
        const expISO = minExpiry[p.id];
        const badge = expiryBadge(expISO);
        const priceFinal = finalPriceFromNetCents(
          p.price_cents,
          p.vat_rate,
          p.discount_percent
        );
        return `
        <tr>
          <td>${p.name}</td>
          <td>${p.supplier || ""}</td>
          <td>${expISO || ""}</td>
          <td style="text-align:right">${(p.price_cents / 100).toFixed(
            2
          )}</td>
          <td style="text-align:right">${p.vat_rate}</td>
          <td style="text-align:right">${p.discount_percent}</td>
          <td style="text-align:right">${priceFinal}</td>
          <td style="text-align:right">${p.quantity}</td>
          <td>${p.unit}</td>
          <td style="text-align:right">${p.min_quantity}</td>
          <td>${badge.text}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html><head><meta charset="utf-8" />
      <title>Lista magazzino</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; }
        h1 { margin: 0 0 4px 0; font-size: 18px; }
        h2 { margin: 2px 0 16px 0; font-size: 13px; color: #555; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; }
        th { background: #f3f4f6; text-align: left; }
      </style></head>
      <body>
        <h1>Magazzino — Vista corrente</h1>
        <h2>Generato: ${now.toLocaleString()} — Magazzino: ${loc}</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Fornitore</th><th>Scadenza (min)</th>
              <th>Prezzo netto €</th><th>IVA %</th><th>Sconto %</th><th>Prezzo finale €</th>
              <th>Q.tà</th><th>Unità</th><th>Min</th><th>Badge scadenza</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  async function searchLotsByCode() {
    const term = lotSearchCode.trim();
    if (!term) {
      setLotSearchResults([]);
      setLotSearchError(null);
      return;
    }
    setLotSearchLoading(true);
    setLotSearchError(null);
    try {
      const params: any = { lot_code: term };
      if (lotSearchLocation !== "all") params.location = lotSearchLocation;
      const { data } = await api.get<LotSearchResult[]>(
        "/lots/search/by-code",
        { params }
      );
      setLotSearchResults(data);
    } catch (e: any) {
      setLotSearchError(explainAxiosError(e, "Errore ricerca lotti"));
    } finally {
      setLotSearchLoading(false);
    }
  }

  return (
    <div style={page}>
      <div style={shell}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#6b7280",
              }}
            >
              Gestione magazzino
            </span>
            <h2 style={{ margin: 0, fontSize: 24 }}>Magazzino</h2>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Link
              to="/closeout"
              style={{
                ...ghostButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>💰</span>
              <span>Fine serata</span>
            </Link>
            <button onClick={loadProducts} disabled={loading} style={ghostButton}>
              {loading ? "Carico..." : "Ricarica"}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("access_token");
                location.href = "/login";
              }}
              style={{
                ...ghostButton,
                borderColor: "#b91c1c",
                color: "#fecaca",
              }}
            >
              Esci
            </button>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p style={{ color: "#9ca3af", marginTop: 0, fontSize: 13 }}>
            Utente: {me ? `${me.username} (${me.role})` : "(non rilevato)"}
          </p>
          {err && (
            <p style={{ color: "#fecaca", fontSize: 13, marginTop: 0 }}>
              {err}
            </p>
          )}
        </div>

        {me?.role === "manager" && (
          <section style={{ marginBottom: 20 }}>
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>➕ Nuovo prodotto</h3>
              <span style={{ ...pill, fontSize: 10 }}>Solo manager</span>
            </div>
            <ProductForm
              value={newForm}
              onChange={setNewForm}
              onSubmit={createProduct}
              submitLabel="Aggiungi prodotto"
              busy={busyCreate}
            />
            {lastCreated && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  style={{
                    ...primaryButton,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={() => openLots(lastCreated)}
                >
                  <span>📦</span>
                  <span>Gestisci lotti di “{lastCreated.name}”</span>
                </button>
              </div>
            )}
          </section>
        )}

        <section style={{ marginBottom: 16 }}>
          <div
            style={{
              ...card,
              borderLeft: "4px solid #fbbf24",
              background: "#111827",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={inventoryMode}
                onChange={(e) => setInventoryMode(e.target.checked)}
              />
              <b>Modalità inventario</b>
            </label>
            <div style={hint}>
              Quando è attiva, puoi modificare le quantità direttamente nella
              colonna “Q.tà”. Clicca <b>Salva inventario</b> per sovrascrivere
              le giacenze.
            </div>
            {inventoryMode && (
              <div style={{ marginTop: 4 }}>
                <button onClick={saveInventory} style={primaryButton}>
                  💾 Salva inventario
                </button>
              </div>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div
            style={{
              ...card,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto auto",
              alignItems: "end",
              marginBottom: 12,
            }}
          >
            <div>
              <label style={label}>Cerca</label>
              <input
                style={input}
                placeholder="Nome o fornitore..."
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
              <div style={hint}>
                Filtro basato sul lotto con scadenza più vicina.
              </div>
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
              <div style={hint}>Influenza giacenze e lotti visualizzati.</div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Export
              </div>
              <a
                href={`${
                  import.meta.env.VITE_API_URL
                }/exports/shopping.xlsx?${new URLSearchParams({
                  supplier: supplierFilter || "",
                  only_low_stock: "true",
                  days_to_expiry: "14",
                })}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...ghostButton,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  paddingInline: 10,
                }}
              >
                <span>📥</span>
                <span>Lista spesa (Excel)</span>
              </a>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginTop: 4,
                }}
              >
                Sotto scorta + in scadenza entro 14 giorni.
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Stampa
              </div>
              <button
                onClick={exportPDF}
                style={{ ...ghostButton, width: "100%" }}
              >
                🖨️ Stampa / PDF
              </button>
            </div>
          </div>

          {/* Ricerca globale per numero di lotto */}
          <div
            style={{
              ...card,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1.6fr 1fr auto",
              alignItems: "end",
            }}
          >
            <div>
              <label style={label}>Cerca per numero di lotto (globale)</label>
              <input
                style={input}
                placeholder="Es. L12345, LOT2025-01..."
                value={lotSearchCode}
                onChange={(e) => setLotSearchCode(e.target.value)}
              />
              <div style={hint}>
                Ricerca su tutti i prodotti e magazzini, utile in caso di
                richiami del produttore.
              </div>
            </div>
            <div>
              <label style={label}>Magazzino lotti</label>
              <select
                style={input}
                value={lotSearchLocation}
                onChange={(e) =>
                  setLotSearchLocation(e.target.value as "all" | ApiWarehouse)
                }
              >
                <option value="all">Tutti</option>
                <option value="banco">Banco</option>
                <option value="cantina">Cantina</option>
                <option value="generale">Generale</option>
              </select>
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={searchLotsByCode}
                style={{ ...primaryButton, whiteSpace: "nowrap" }}
              >
                {lotSearchLoading ? "Cerco..." : "Cerca lotto"}
              </button>
              {lotSearchError && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#fecaca",
                    textAlign: "left",
                  }}
                >
                  {lotSearchError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Risultati ricerca numero di lotto */}
        {lotSearchResults.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={tableCard}>
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #1f2937",
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                Risultati ricerca per lotto{" "}
                <b>{lotSearchCode.trim().toUpperCase()}</b> — righe:{" "}
                {lotSearchResults.length}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table cellPadding={0} style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Prodotto</th>
                      <th style={thStyle}>Numero lotto</th>
                      <th style={thStyle}>Magazzino</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        Q.tà
                      </th>
                      <th style={thStyle}>Scadenza</th>
                      <th style={thStyle}>Stato</th>
                      <th style={thStyle}>Motivo blocco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotSearchResults.map((l) => {
                      let bg = "#020617";
                      if (l.status === "blocked") bg = "#3b0764";
                      if (l.status === "discarded") bg = "#4a044e";
                      return (
                        <tr key={l.id} style={{ background: bg }}>
                          <td style={tdStyle}>{l.product_name}</td>
                          <td style={tdStyle}>{l.lot_code}</td>
                          <td style={tdStyle}>{l.location}</td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                            }}
                          >
                            {l.quantity}
                          </td>
                          <td style={tdStyle}>{l.expiry_date || "-"}</td>
                          <td style={tdStyle}>
                            {l.status === "ok"
                              ? "OK"
                              : l.status === "blocked"
                              ? "Bloccato"
                              : "Scartato"}
                          </td>
                          <td style={tdStyle}>{l.block_reason || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section>
          {loading ? (
            <p style={{ color: "#9ca3af" }}>Carico...</p>
          ) : (
            <div style={tableCard}>
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #1f2937",
                  fontSize: 11,
                  color: "#9ca3af",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  Vista magazzino — righe rosate = sotto scorta. Badge colore =
                  scadenza più vicina (per lotto).
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  Prodotti visibili: {visibleItems.length}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table cellPadding={0} style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nome</th>
                      <th style={thStyle}>Fornitore</th>
                      <th style={thStyle}>Scadenza (min)</th>
                      <th style={thStyle}>Lotto (min)</th>
                      <th style={thStyle}>Badge</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        Prezzo netto €
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>IVA %</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        Sconto %
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        Prezzo finale €
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Q.tà</th>
                      <th style={thStyle}>Unità</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Min</th>
                      <th style={thStyle}>Attivo</th>
                      {me?.role === "manager" && <th style={thStyle}>Azioni</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((p) => {
                      const low = p.quantity < p.min_quantity;
                      const finalPrice = finalPriceFromNetCents(
                        p.price_cents,
                        p.vat_rate,
                        p.discount_percent
                      );
                      const minExpISO = minExpiry[p.id];
                      const badge = expiryBadge(minExpISO);
                      const lotCode = minLotCode[p.id];
                      return (
                        <tr
                          key={p.id}
                          style={{
                            background: low ? "#1f1020" : "#020617",
                          }}
                        >
                          <td style={tdStyle}>{p.name}</td>
                          <td style={tdStyle}>{p.supplier || "-"}</td>
                          <td style={tdStyle}>{minExpISO || "-"}</td>
                          <td style={tdStyle}>{lotCode || "-"}</td>
                          <td style={tdStyle}>
                            <span style={badge.style as any}>{badge.text}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {centsToEuro(p.price_cents)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {p.vat_rate}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {p.discount_percent}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {finalPrice}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {inventoryMode ? (
                              <input
                                type="number"
                                step="0.01"
                                style={{ ...input, padding: "4px 8px" }}
                                value={invQty[p.id] ?? 0}
                                onChange={(e) =>
                                  setInvQty({
                                    ...invQty,
                                    [p.id]: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            ) : (
                              p.quantity
                            )}
                          </td>
                          <td style={tdStyle}>{p.unit}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {p.min_quantity}
                          </td>
                          <td style={tdStyle}>{p.is_active ? "Sì" : "No"}</td>
                          {me?.role === "manager" && (
                            <td
                              style={{
                                ...tdStyle,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <button
                                onClick={() => openLots(p)}
                                title="Gestisci lotti"
                                style={{
                                  ...ghostButton,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                }}
                              >
                                📦 Lotti
                              </button>{" "}
                              <button
                                onClick={() => startEdit(p)}
                                title="Modifica prodotto"
                                style={{
                                  ...ghostButton,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                }}
                              >
                                ✏️ Modifica
                              </button>{" "}
                              <button
                                onClick={() => del(p.id)}
                                title="Elimina prodotto"
                                style={{
                                  ...ghostButton,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  borderColor: "#b91c1c",
                                  color: "#fecaca",
                                }}
                              >
                                🗑️ Elimina
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {visibleItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={me?.role === "manager" ? 14 : 13}
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            padding: 18,
                            color: "#6b7280",
                          }}
                        >
                          Nessun prodotto
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {editing && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 50,
            }}
            onClick={() => setEditing(null)}
          >
            <div
              style={{
                ...card,
                maxWidth: 760,
                width: "100%",
                borderColor: "#22c55e",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ marginRight: "auto", fontSize: 16 }}>
                  ✏️ Modifica prodotto
                </h3>
                <button
                  onClick={() => openLots(editing.product)}
                  style={{
                    ...ghostButton,
                    marginRight: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>📦</span>
                  <span>Gestisci lotti</span>
                </button>
                <button onClick={() => setEditing(null)} style={ghostButton}>
                  Chiudi
                </button>
              </div>
              <ProductForm
                value={editing.draft}
                onChange={(d) => setEditing({ ...editing, draft: d })}
                onSubmit={saveEdit}
                submitLabel="Salva modifiche"
                busy={busyEdit}
              />
              <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
                Per modificare o eliminare i lotti (es. lotti scaduti o
                richiamati), usa il pulsante <b>Gestisci lotti</b> qui sopra:
                si aprirà la lista dei lotti di questo prodotto, con il relativo
                numero di lotto e stato.
              </div>
            </div>
          </div>
        )}

        {lotsModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 60,
            }}
            onClick={() => setLotsModal(null)}
          >
            <div
              style={{
                ...card,
                maxWidth: 1040,
                width: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ marginRight: "auto", fontSize: 16 }}>
                  📦 Lotti — {lotsModal.product.name}
                </h3>
                {lotsAvgCost != null && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#e5e7eb",
                      marginRight: 12,
                    }}
                  >
                    Costo medio: <b>€ {lotsAvgCost.toFixed(2)}</b>
                  </div>
                )}
                <button onClick={() => setLotsModal(null)} style={ghostButton}>
                  Chiudi
                </button>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Ogni riga rappresenta un lotto distinto (identificato dal{" "}
                <b>numero di lotto</b>). Puoi filtrare per numero di lotto o
                fornitore, modificare quantità/scadenza/magazzino e stato.
                Usa lo stato <b>Bloccato</b> o <b>Scartato</b> con motivo in
                caso di richiami sanitari o scarti.
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={label}>
                  Filtra lotti (numero lotto / fornitore)
                </label>
                <input
                  style={input}
                  placeholder="Es. L12345, LOT2025-01, nome fornitore..."
                  value={lotsModal.filter}
                  onChange={(e) =>
                    setLotsModal(
                      (m) => m && { ...m, filter: e.target.value }
                    )
                  }
                />
              </div>

              {lotsModal.loading ? (
                <p style={{ color: "#9ca3af" }}>Carico lotti...</p>
              ) : (
                <>
                  <table
                    cellPadding={6}
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: 10,
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#020617" }}>
                        <th style={thStyle}>Numero lotto</th>
                        <th style={thStyle}>Fornitore</th>
                        <th style={thStyle}>Scadenza</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>
                          Q.tà
                        </th>
                        <th style={{ ...thStyle, textAlign: "right" }}>
                          Costo €
                        </th>
                        <th style={thStyle}>Magazzino</th>
                        <th style={thStyle}>Stato</th>
                        <th style={thStyle}>Motivo blocco</th>
                        <th style={thStyle}>Azioni lotto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLots.map((l) => {
                        let bg = "#020617";
                        if (l.status === "blocked") bg = "#3b0764";
                        if (l.status === "discarded") bg = "#4a044e";
                        return (
                          <tr
                            key={l.id}
                            style={{
                              borderTop: "1px solid #111827",
                              background: bg,
                            }}
                          >
                            <td style={tdStyle}>
                              <input
                                style={input}
                                placeholder="Numero lotto"
                                value={l.lot_code}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                lot_code: e.target.value,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td style={tdStyle}>
                              <input
                                style={input}
                                value={l.supplier || ""}
                                placeholder="Fornitore"
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? { ...r, supplier: e.target.value }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td style={tdStyle}>
                              <input
                                type="date"
                                style={input}
                                value={l.expiry_date || ""}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                expiry_date: e.target.value,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input
                                type="number"
                                step="0.01"
                                style={{ ...input, textAlign: "right" }}
                                value={l.quantity}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                quantity:
                                                  Number(e.target.value) || 0,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input
                                type="number"
                                step="0.01"
                                style={{ ...input, textAlign: "right" }}
                                value={
                                  l.cost_cents != null
                                    ? (l.cost_cents / 100).toFixed(2)
                                    : ""
                                }
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                cost_cents: e.target.value
                                                  ? Math.round(
                                                      parseFloat(
                                                        e.target.value
                                                      ) * 100
                                                    )
                                                  : null,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td style={tdStyle}>
                              <select
                                style={input}
                                value={l.location}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                location: e.target
                                                  .value as ApiWarehouse,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              >
                                <option value="banco">Banco</option>
                                <option value="cantina">Cantina</option>
                                <option value="generale">Generale</option>
                              </select>
                            </td>
                            <td style={tdStyle}>
                              <select
                                style={input}
                                value={l.status}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                status: e.target
                                                  .value as LotStatus,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              >
                                <option value="ok">OK</option>
                                <option value="blocked">Bloccato</option>
                                <option value="discarded">Scartato</option>
                              </select>
                            </td>
                            <td style={tdStyle}>
                              <input
                                style={input}
                                placeholder={
                                  l.status === "ok"
                                    ? "—"
                                    : "Motivo blocco/scarto"
                                }
                                value={l.block_reason || ""}
                                disabled={l.status === "ok"}
                                onChange={(e) =>
                                  setLotsModal(
                                    (m) =>
                                      m && {
                                        ...m,
                                        rows: m.rows.map((r) =>
                                          r.id === l.id
                                            ? {
                                                ...r,
                                                block_reason: e.target.value,
                                              }
                                            : r
                                        ),
                                      }
                                  )
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <button
                                onClick={() => updateLot(l)}
                                title="Salva lotto"
                                style={{
                                  ...ghostButton,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                }}
                              >
                                💾 Salva lotto
                              </button>{" "}
                              <button
                                onClick={() => deleteLot(l)}
                                title="Elimina lotto"
                                style={{
                                  ...ghostButton,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  borderColor: "#b91c1c",
                                  color: "#fecaca",
                                }}
                              >
                                🗑️ Elimina lotto
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleLots.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            style={{
                              ...tdStyle,
                              textAlign: "center",
                              padding: 14,
                              color: "#6b7280",
                            }}
                          >
                            Nessun lotto trovato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 10 }}>
                    <h4 style={{ marginBottom: 6, fontSize: 14 }}>
                      ➕ Aggiungi nuovo lotto
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1.3fr 1.1fr 1fr 1fr 1.1fr 1fr 1fr auto",
                        gap: 8,
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <label style={label}>Numero lotto</label>
                        <input
                          style={input}
                          placeholder="Codice lotto (es. L12345)"
                          value={lotsModal.newLot.lot_code}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    lot_code: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div>
                        <label style={label}>Fornitore</label>
                        <input
                          style={input}
                          placeholder="Fornitore"
                          value={lotsModal.newLot.supplier}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    supplier: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div>
                        <label style={label}>Scadenza</label>
                        <input
                          type="date"
                          style={input}
                          value={lotsModal.newLot.expiry_date}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    expiry_date: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div>
                        <label style={label}>Q.tà</label>
                        <input
                          type="number"
                          step="0.01"
                          style={{ ...input, textAlign: "right" }}
                          placeholder="Quantità"
                          value={lotsModal.newLot.quantity}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    quantity: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div>
                        <label style={label}>Costo € (opz.)</label>
                        <input
                          type="number"
                          step="0.01"
                          style={{ ...input, textAlign: "right" }}
                          placeholder="Costo €"
                          value={lotsModal.newLot.cost_eur}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    cost_eur: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div>
                        <label style={label}>Magazzino</label>
                        <select
                          style={input}
                          value={lotsModal.newLot.location}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    location: e.target
                                      .value as ApiWarehouse,
                                  },
                                }
                            )
                          }
                        >
                          <option value="banco">Banco</option>
                          <option value="cantina">Cantina</option>
                          <option value="generale">Generale</option>
                        </select>
                      </div>
                      <div>
                        <label style={label}>Stato</label>
                        <select
                          style={input}
                          value={lotsModal.newLot.status}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    status: e.target.value as LotStatus,
                                  },
                                }
                            )
                          }
                        >
                          <option value="ok">OK</option>
                          <option value="blocked">Bloccato</option>
                          <option value="discarded">Scartato</option>
                        </select>
                      </div>
                      <div>
                        <label style={label}>Motivo blocco</label>
                        <input
                          style={input}
                          placeholder="Se bloccato/scartato"
                          value={lotsModal.newLot.block_reason}
                          disabled={lotsModal.newLot.status === "ok"}
                          onChange={(e) =>
                            setLotsModal(
                              (m) =>
                                m && {
                                  ...m,
                                  newLot: {
                                    ...m.newLot,
                                    block_reason: e.target.value,
                                  },
                                }
                            )
                          }
                        />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button
                          onClick={addLot}
                          style={{
                            ...primaryButton,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Aggiungi lotto
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
