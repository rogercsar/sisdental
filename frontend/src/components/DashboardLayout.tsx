import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleIcon, Home, LogOut } from 'lucide-react';
import { Button } from './Button';
import { useAuthStore } from '../lib/store/auth';
import type { User } from '../lib/api/types';

interface UserMenuProps {
  user: User | null;
}

function UserMenu({ user }: UserMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  if (!user) {
    return (
      <>
        <Link
          to="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Link to="/sign-up">
          <Button className="rounded-full">Sign Up</Button>
        </Link>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-2"
      >
        <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center">
          {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
        </div>
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <Link
              to="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user } = useAuthStore();

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center text-[#1185a3]">
          <CircleIcon className="h-6 w-6 text-[#1185a3]" />
          <span className="ml-2 text-xl font-semibold">Sis Dental</span>
        </Link>
        <div className="flex items-center space-x-4">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
    </section>
  );
} 