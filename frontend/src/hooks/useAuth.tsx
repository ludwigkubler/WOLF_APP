import { useEffect, useState } from "react";
import api from "../services/api";

type Me = { username: string; role: "manager" | "staff" };

export function useAuth() {
  const [user, setUser] = useState<Me | null>(null);

  // All'avvio: se c'è un token salvato, prova a caricare il profilo
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) return;
    api.get("/auth/me")
      .then(r => setUser({ username: r.data.username, role: r.data.role }))
      .catch(() => {
        // token non valido: pulisco
        localStorage.removeItem("access_token");
        setUser(null);
      });
  }, []);

  // Login via JSON (usa /auth/login)
  async function login(username: string, password: string) {
    try {
      const { data } = await api.post("/auth/login", { username, password });
      localStorage.setItem("access_token", data.access_token);
      const me = await api.get("/auth/me");
      setUser({ username: me.data.username, role: me.data.role });
    } catch (e) {
      // propaghiamo l'errore così la UI può mostrare "credenziali errate"
      throw e;
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return { user, login, logout };
}
