import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, isManager, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium text-muted">Checking manager credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || !isManager) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
