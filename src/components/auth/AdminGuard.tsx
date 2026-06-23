import { Navigate, Outlet } from "react-router-dom";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Loader2 } from "lucide-react";

export default function AdminGuard() {
  const { isAdmin, loading } = useUserAccess();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
