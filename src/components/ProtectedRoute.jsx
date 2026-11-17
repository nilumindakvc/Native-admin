import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "./ui";

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated, isAdmin, profileError, signOut } = useAuth();

  if (loading) return <Loading label="Checking session…" />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">Admin access required</h2>
          <p className="mt-2 text-sm text-slate-500">
            {profileError
              ? `Your profile could not be verified: ${profileError}`
              : "This account is signed in but does not have the admin role."}
          </p>
          <button className="btn-secondary mt-6" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return children;
}
