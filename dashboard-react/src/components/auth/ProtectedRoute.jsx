import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import PageLoading from "../layout/PageLoading";

/** Wraps AppShell in the router — every operational page redirects to /login when unauthenticated, real enforcement (the backend rejects the request too, see backend/auth.py) not just a UI gate. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
