import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../lib/store/user";

const AUTH_PATHS = ["/login", "/sign-up"];

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, user } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthPath = AUTH_PATHS.includes(location.pathname);
    
    // If we're on an auth path and have a user, redirect to home
    if (isAuthPath && user) {
      navigate("/");
      return;
    }

    // Only fetch user if we're not on an auth page and don't have a user
    if (!isAuthPath && !user) {
      fetchUser().catch((error) => {
        console.error("Error fetching user:", error);
        // Only redirect to login if we're not already there and the error is auth-related
        if (location.pathname !== "/login" && error.message.includes("401")) {
          navigate("/login");
        }
      });
    }
  }, [fetchUser, location.pathname, navigate, user]);

  return <>{children}</>;
}

