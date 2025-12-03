import { type FormEvent, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

type Location = "generale" | "banco" | "cantina";

export default function NewProductPage() {
  const navigate = useNavigate();

  // ---- Stato prodotto ----
  const [name, setName] = useState("");
  const [note, setNote] = useState(""); // va su sku come nota libera
  const [unit, setUnit] = useState("pz");
  const [priceEuro, setPriceEuro] = useState<string>("0.00");
  const [vatRate, setVatRate] = useState<number>(22);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<string>("0");
  const [supplier, setSupplier] = useState("");
  const [isActive, setIsActive] = useState(true);

  // non lo mostriamo più, ma lo mandiamo comunque come null
  const productExpiry = "";

  // ---- Stato lotto iniziale ----
  const [lotCode, setLotCode] = useState("");
  const [lotQuantity, setLotQuantity] = useState<string>("0");
  const [lotLocation, setLotLocation] = useState<Location>("generale");
  const [lotExpiry, setLotExpiry] = useState<string>(""); // opzionale

  // ---- UI ----
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setNote("");
    setUnit("");
    setPriceEuro("");
    setVatRate(22);
    setDiscountPercent(0);
    setMinQuantity("");
    setSupplier("");
    setLotCode("");
    setLotQuantity("");
    setLotLocation("generale");
    setLotExpiry("");
    setIsActive(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  function parseEuroToCents(value: string): number {
    const normalized = value.replace(",", ".").trim();
    const num = Number(normalized);
    if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
    return Math.round(num * 100);
  }

  function parseFloatSafe(value: string, fallback = 0): number {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return fallback;
    const num = Number(normalized);
    if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
    return num;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Inserisci il nome del prodotto.");
      return;
    }
    if (!lotCode.trim()) {
      setErrorMsg("Inserisci il codice lotto iniziale.");
      return;
    }

    const qty = parseFloatSafe(lotQuantity, 0);
    if (qty <= 0) {
      setErrorMsg("La quantità del lotto deve essere maggiore di zero.");
      return;
    }

    setSaving(true);
    try {
      // 1) Crea il prodotto
      const productPayload = {
        name: name.trim(),
        sku: note.trim() || null, // usiamo sku come nota libera
        price_cents: parseEuroToCents(priceEuro),
        unit: unit.trim() || "",
        min_quantity: parseFloatSafe(minQuantity, 0),
        is_active: isActive,
        supplier: supplier.trim() || null,
        expiry_date: productExpiry || null, // per ora non usato in UI
        vat_rate: vatRate,
        discount_percent: discountPercent,
        quantity: qty, // giacenza iniziale = qty del primo lotto
      };

      const productRes = await api.post("/products", productPayload);
      const product = productRes.data as { id: number };
      const productId = product.id;

      // 2) Crea il primo lotto per questo prodotto
      const lotPayload = {
        lot_code: lotCode.trim(),
        supplier: supplier.trim() || null,
        expiry_date: lotExpiry || null,
        quantity: qty,
        // costo non impostato a livello lotto in questa schermata
        cost_cents: undefined as number | undefined,
        location: lotLocation,
        status: "ok" as const,
        block_reason: null as string | null,
      };

      await api.post(`/lots/product/${productId}`, lotPayload);

      setSuccessMsg("Prodotto e primo lotto creati con successo.");
      resetForm();
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.detail) {
        const det = err.response.data.detail;
        setErrorMsg(typeof det === "string" ? det : JSON.stringify(det));
      } else {
        setErrorMsg(
          "Errore durante il salvataggio. Controlla i campi e riprova."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        paddingTop: 8,
      }}
    >
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Nuovo prodotto</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Inserisci i dati dell&apos;articolo e del primo lotto associato.
            La scadenza è gestita a livello di lotto; per prodotti senza
            scadenza puoi lasciarla vuota.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/app/magazzino")}
          style={{
            borderRadius: 999,
            border: "1px solid #4b5563",
            background: "transparent",
            color: "#e5e7eb",
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Torna al magazzino
        </button>
      </header>

      <form onSubmit={handleSubmit}>
        <section
          style={{
            borderRadius: 18,
            padding: 18,
            background:
              "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
            border: "1px solid #1f2937",
            boxShadow: "0 18px 35px rgba(0,0,0,0.60)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Nome */}
          <div>
            <label style={labelStyle}>
              Nome prodotto <span style={{ color: "#f97316" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder=" "
              required
            />
          </div>

          {/* Nota interna + unità */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.8fr)",
              gap: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Nota interna</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={inputStyle}
                placeholder=" "
              />
            </div>
            <div>
              <label style={labelStyle}>Unità di misura</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={inputStyle}
                placeholder="bott / latt / Kg / pz"
              />
            </div>
          </div>

          {/* Prezzo + IVA + Sconto */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 90px 90px",
              gap: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Prezzo (€/unità)</label>
              <input
                type="text"
                inputMode="decimal"
                value={priceEuro}
                onChange={(e) => setPriceEuro(e.target.value)}
                style={inputStyle}
                placeholder=" "
              />
            </div>
            <div>
              <label style={labelStyle}>IVA %</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label style={labelStyle}>Sconto %</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(Number(e.target.value) || 0)
                }
                style={inputStyle}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Scorta minima + fornitore */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
              gap: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Scorta minima</label>
              <input
                type="text"
                inputMode="decimal"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                style={inputStyle}
                placeholder=" "
              />
            </div>
            <div>
              <label style={labelStyle}>Fornitore (anagrafica)</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                style={inputStyle}
                placeholder=" "
              />
            </div>
          </div>

          {/* Attivo */}
          <div style={{ marginTop: 4 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Prodotto attivo</span>
            </label>
          </div>

          {/* Divider visuale */}
          <hr
            style={{
              border: "none",
              borderTop: "1px dashed #374151",
              margin: "6px 0 4px 0",
            }}
          />

          {/* Sezione lotto iniziale */}
          <div>
            <h2
              style={{
                fontSize: 15,
                margin: "0 0 6px 0",
              }}
            >
              Lotto iniziale
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                margin: 0,
              }}
            >
              Ogni prodotto ha almeno un lotto. La scadenza è a livello di
              lotto: per alcolici o prodotti senza scadenza puoi lasciarla
              vuota.
            </p>
          </div>

          {/* Codice lotto + quantità + magazzino */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.9fr)",
              gap: 10,
            }}
          >
            <div>
              <label style={labelStyle}>
                Codice lotto <span style={{ color: "#f97316" }}>*</span>
              </label>
              <input
                type="text"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                style={inputStyle}
                placeholder=" "
                required
              />
            </div>
            <div>
              <label style={labelStyle}>
                Quantità del lotto{" "}
                <span style={{ color: "#f97316" }}>*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={lotQuantity}
                onChange={(e) => setLotQuantity(e.target.value)}
                style={inputStyle}
                placeholder=" "
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Magazzino</label>
              <select
                value={lotLocation}
                onChange={(e) => setLotLocation(e.target.value as Location)}
                style={{
                  ...inputStyle,
                  paddingRight: 26,
                  cursor: "pointer",
                }}
              >
                <option value="generale">Generale</option>
                <option value="banco">Banco</option>
                <option value="cantina">Cantina</option>
              </select>
            </div>
          </div>

          {/* Scadenza lotto */}
          <div>
            <label style={labelStyle}>Scadenza lotto</label>
            <input
              type="date"
              value={lotExpiry}
              onChange={(e) => setLotExpiry(e.target.value)}
              style={inputStyle}
            />
            <p
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              Lascia vuoto per prodotti senza scadenza (es. vodka, liquori).
            </p>
          </div>

          {/* Messaggi + bottoni */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {errorMsg && (
              <div
                style={{
                  fontSize: 12,
                  color: "#fecaca",
                  background: "rgba(127,29,29,0.4)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  border: "1px solid rgba(248,113,113,0.5)",
                }}
              >
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div
                style={{
                  fontSize: 12,
                  color: "#bbf7d0",
                  background: "rgba(22,101,52,0.4)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  border: "1px solid rgba(74,222,128,0.5)",
                }}
              >
                {successMsg}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                style={{
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "transparent",
                  color: "#e5e7eb",
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "7px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, rgb(34,197,94), rgb(22,163,74))",
                  color: "#020617",
                  boxShadow: "0 12px 24px rgba(34,197,94,0.3)",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Salvataggio..." : "Crea prodotto e lotto"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 3,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 9px",
  borderRadius: 10,
  border: "1px solid #4b5563",
  background: "rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};
