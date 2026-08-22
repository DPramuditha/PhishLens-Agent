import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DotmHex2 } from './ui/dotm-hex-2';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#141416] text-white">
        <div className="flex flex-col items-center gap-4">
          <DotmHex2 bloom={true} size={48} dotSize={6} className="text-indigo-500 animate-pulse" />
          <p className="text-sm font-medium text-zinc-400 tracking-wider font-[Cabin,system-ui,sans-serif]">
            Verifying security session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated user to login, preserving intended destination in location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
