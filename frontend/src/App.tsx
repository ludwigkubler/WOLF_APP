import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Closeout from "./pages/Closeout";
import AppShell from "./layout/AppShell";
import DashboardHome from "./pages/DashboardHome";
import NewProductPage from "./pages/NewProductPage"; // ← usa il file reale
import MagazzinoListPage from "./pages/MagazzinoListPage";
import Inventario from "./pages/Inventario";

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
          <Route path="magazzino" element={<MagazzinoListPage />} />
          <Route path="magazzino/nuovo" element={<NewProductPage />} />
          <Route path="magazzino/inventario" element={<Inventario />} />

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
