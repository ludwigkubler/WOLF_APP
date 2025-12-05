import { useEffect, useMemo, useState, type CSSProperties } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

type Me = { username: string; role: "manager" | "staff" };

const DENOMS = [0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50] as const;

export default function Closeout() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);

  // contamonete/banconote
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(DENOMS.map(d => [d < 1 ? d.toFixed(2) : String(d), ""]))
  );
  const [pos, setPos] = useState<string>("");
  const [saty, setSaty] = useState<string>("");
  const [bottles, setBottles] = useState<string>(""); // una per riga
  const [kegs, setKegs] = useState<string>("");       // uno per riga
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setMe(data);
        if (data.role !== "manager") {
          alert("Solo i manager possono accedere alla chiusura.");
          nav("/products");
        }
      } catch {
        nav("/login");
      }
    })();
  }, [nav]);

  const cashTotal = useMemo(() => {
    let cents = 0;
    for (const d of DENOMS) {
      const k = d < 1 ? d.toFixed(2) : String(d);
      const c = parseInt(counts[k] || "0") || 0;
      cents += Math.round(d * 100) * c;
    }
    return (cents / 100).toFixed(2);
  }, [counts]);

  async function save() {
    try {
      setSaving(true);
      setMsg(null);
      const cash: Record<string, number> = {};
      for (const d of DENOMS) {
        const k = d < 1 ? d.toFixed(2) : String(d);
        cash[k] = parseInt(counts[k] || "0") || 0;
      }
      const payload = {
        cash,
        pos_eur: parseFloat(pos || "0") || 0,
        satispay_eur: parseFloat(saty || "0") || 0,
        bottles_finished: bottles.split("\n").map(s => s.trim()).filter(Boolean),
        kegs_finished: kegs.split("\n").map(s => s.trim()).filter(Boolean),
        notes: notes || null,
      };
      await api.post("/closeouts", payload);
      setMsg("Chiusura salvata ✅");
      // reset counts
      setCounts(Object.fromEntries(DENOMS.map(d => [d < 1 ? d.toFixed(2) : String(d), ""])));
      setPos(""); setSaty(""); setBottles(""); setKegs(""); setNotes("");
    } catch {
      alert("Errore salvataggio chiusura.");
    } finally {
      setSaving(false);
    }
  }

  const wrap: CSSProperties = { fontFamily: "system-ui", padding: 20 };
  const card: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 16, maxWidth: 1100, margin: "0 auto" };
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const input: CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10 };
  const label: CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 6, display: "block" };
  const small: CSSProperties = { fontSize: 12, color: "#6b7280" };

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ marginRight: "auto" }}>💰 Chiusura di fine serata</h2>
        <button onClick={() => nav("/products")}>Torna al magazzino</button>
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        {me && <p style={{ color: "#374151", marginTop: 0 }}>Utente: {me.username} ({me.role})</p>}
        {msg && <p style={{ color: "green" }}>{msg}</p>}
        <div style={grid}>
          {/* Colonna sinistra: contanti */}
          <div>
            <h3>Contanti</h3>
            <table cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th style={{textAlign:"left"}}>Taglio</th><th style={{textAlign:"left"}}>Pezzi</th><th style={{textAlign:"right"}}>Subtot €</th></tr>
              </thead>
              <tbody>
                {DENOMS.map(d => {
                  const k = d < 1 ? d.toFixed(2) : String(d);
                  const pcs = parseInt(counts[k] || "0") || 0;
                  const sub = ((Math.round(d*100)*pcs)/100).toFixed(2);
                  return (
                    <tr key={k} style={{ borderTop:"1px solid #f3f4f6" }}>
                      <td>{d < 1 ? `${k}` : `${k}`}</td>
                      <td>
                        <input style={{ ...input, width: 120 }} type="number" min={0}
                          value={counts[k]} onChange={e => setCounts({ ...counts, [k]: e.target.value })} />
                      </td>
                      <td style={{ textAlign:"right" }}>{sub}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop:"2px solid #e5e7eb", fontWeight: 800 }}>
                  <td colSpan={2}>Totale cassa</td>
                  <td style={{ textAlign:"right" }}>{cashTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Colonna destra: POS / Satispay + liste */}
          <div>
            <h3>Pagamenti elettronici</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>POS €</label>
                <input style={input} type="number" step="0.01" value={pos} onChange={e=>setPos(e.target.value)} />
              </div>
              <div>
                <label style={label}>Satispay €</label>
                <input style={input} type="number" step="0.01" value={saty} onChange={e=>setSaty(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={label}>Bottiglie finite <span style={small}>— una per riga</span></label>
              <textarea style={{ ...input, height: 90, resize: "vertical" }} value={bottles} onChange={e=>setBottles(e.target.value)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={label}>Fusti finiti <span style={small}>— uno per riga</span></label>
              <textarea style={{ ...input, height: 80, resize: "vertical" }} value={kegs} onChange={e=>setKegs(e.target.value)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={label}>Note</label>
              <textarea style={{ ...input, height: 80, resize: "vertical" }} value={notes} onChange={e=>setNotes(e.target.value)} />
              <div style={small}>Qui puoi indicare aggiunta/rimozione cassa, anomalie, ecc.</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={save} disabled={saving} style={{ padding: "10px 14px" }}>
            {saving ? "Salvo..." : "Salva chiusura"}
          </button>
        </div>
      </div>
    </div>
  );
}
