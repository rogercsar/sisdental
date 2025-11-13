import { useUserStore } from "../lib/store/user";
import { Link } from "react-router-dom";
import { Loading } from "./Loading";
import { Button } from "./Button";
import { RefreshCw } from "lucide-react";

export function UserStatus() {
  const { user, isLoading, error, fetchUser, clearError } = useUserStore();

  if (isLoading) return <Loading size="sm" />;

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-500">{error}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearError();
            fetchUser();
          }}
          className="p-1"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (user) {
    return <span className="text-green-700">Logged in as {user.email}</span>;
  }

  return (
    <Link to="/login" className="text-blue-600 hover:underline">
      Sign in
    </Link>
  );
}

