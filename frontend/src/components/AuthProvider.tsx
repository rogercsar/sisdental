import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated on app start
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser().catch(() => {
        // If fetchUser fails, remove invalid token
        localStorage.removeItem("token");
      });
    }
  }, [fetchUser]);

  return <>{children}</>;
}