import { Navigate } from "react-router-dom";
export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const t = localStorage.getItem("access_token");
  return t ? children : <Navigate to="/login" replace />;
}
