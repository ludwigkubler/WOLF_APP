import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Products from "./pages/Products";
import Closeout from "./pages/Closeout";
import AppShell from "./layout/AppShell";
import DashboardHome from "./pages/DashboardHome";
import NewProductPage from "./pages/NewProductPage"; // ← usa il file reale

// Placeholder per la futura pagina Inventario
function InventoryPagePlaceholder() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Inventario</h1>
      <p style={{ fontSize: 14, color: "#9ca3af" }}>
        Qui sposteremo la modalità “Inventario” attualmente dentro
        <code> Products.tsx </code>. Per ora continua a usarla nella pagina
        Magazzino.
      </p>
    </div>
  );
}

// Protezione semplice basata sul token
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const isLogged = !!localStorage.getItem("access_token");

  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* AREA PROTETTA */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="home" element={<DashboardHome />} />

          {/* Magazzino */}
          <Route path="magazzino" element={<Products />} />
          <Route path="magazzino/nuovo" element={<NewProductPage />} />
          <Route
            path="magazzino/inventario"
            element={<InventoryPagePlaceholder />}
          />

          {/* Cassa */}
          <Route path="cassa/chiusure" element={<Closeout />} />

          {/* Fallback dentro /app */}
          <Route path="*" element={<Navigate to="/app/home" replace />} />
        </Route>

        {/* ROOT → decidere se andare al login o all'app */}
        <Route
          path="/"
          element={
            isLogged ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/app/home" replace />
            )
          }
        />

        {/* TUTTO IL RESTO */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
