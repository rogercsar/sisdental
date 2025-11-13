import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  UsersRound,
  LayoutDashboard,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut } = useAuthStore();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/patients", icon: UsersRound, label: "Pacientes" },
    {
      href: "/dashboard/appointments",
      icon: CalendarCheck,
      label: "Agendamentos",
    },
    { href: "/dashboard/finances", icon: DollarSign, label: "Financeiro" },
    { href: "/dashboard/reports", icon: BarChart3, label: "Relatórios" },
    { href: "/dashboard/settings", icon: Settings, label: "Configurações" },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch (error) {
      toast.error("Erro ao fazer logout");
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">
            {location.pathname === "/dashboard" && "Dashboard"}
            {location.pathname === "/dashboard/patients" && "Pacientes"}
            {location.pathname.startsWith("/dashboard/patients/") &&
              "Prontuário"}
            {location.pathname === "/dashboard/appointments" && "Agendamentos"}
            {location.pathname === "/dashboard/finances" && "Financeiro"}
            {location.pathname === "/dashboard/reports" && "Relatórios"}
            {location.pathname === "/dashboard/settings" && "Configurações"}
          </span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white overflow-hidden lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? "block" : "hidden"
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="h-screen overflow-hidden p-4 flex flex-col">
            <div className="flex-1">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={
                      location.pathname === item.href ? "secondary" : "ghost"
                    }
                    className={`shadow-none my-1 w-full justify-start ${
                      location.pathname === item.href ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Logout button at the bottom */}
            <div className="mt-auto pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                className="shadow-none w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  setIsSidebarOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
