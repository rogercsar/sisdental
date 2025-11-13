import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doctor,
  stripe,
  reports,
  appointments,
  finances,
} from "@/lib/api/client";
import type { Subscription, Price, Product } from "@/lib/api/types";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Bell,
  Crown,
  BarChart3,
  Eye,
  CreditCard,
  Info,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

// Generate chart data from dashboard stats or fallback to basic data
const generateWeeklyRevenueData = (dashboardStats: any) => {
  if (dashboardStats?.weekly_revenue_breakdown) {
    return dashboardStats.weekly_revenue_breakdown;
  }
  // Fallback data based on monthly revenue
  const weeklyRevenue = (dashboardStats?.monthly_revenue || 0) / 4;
  return [
    { day: "Seg", amount: Math.round(weeklyRevenue * 0.8) },
    { day: "Ter", amount: Math.round(weeklyRevenue * 1.2) },
    { day: "Qua", amount: Math.round(weeklyRevenue * 0.9) },
    { day: "Qui", amount: Math.round(weeklyRevenue * 1.4) },
    { day: "Sex", amount: Math.round(weeklyRevenue * 1.6) },
    { day: "Sáb", amount: Math.round(weeklyRevenue * 0.7) },
    { day: "Dom", amount: Math.round(weeklyRevenue * 0.3) },
  ];
};

const generateWeeklyAppointmentData = (dashboardStats: any) => {
  if (dashboardStats?.weekly_appointments_breakdown) {
    return dashboardStats.weekly_appointments_breakdown;
  }
  // Fallback data based on total appointments
  const weeklyAppointments = (dashboardStats?.total_appointments || 0) / 4;
  return [
    { day: "Seg", count: Math.round(weeklyAppointments * 0.6) },
    { day: "Ter", count: Math.round(weeklyAppointments * 0.9) },
    { day: "Qua", count: Math.round(weeklyAppointments * 0.5) },
    { day: "Qui", count: Math.round(weeklyAppointments * 1.1) },
    { day: "Sex", count: Math.round(weeklyAppointments * 0.8) },
    { day: "Sáb", count: Math.round(weeklyAppointments * 0.4) },
    { day: "Dom", count: Math.round(weeklyAppointments * 0.2) },
  ];
};

// Mini chart components
function MiniRevenueChart({ dashboardStats }: { dashboardStats: any }) {
  const revenueData = generateWeeklyRevenueData(dashboardStats);
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={revenueData}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#10B981"
          strokeWidth={2}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MiniAppointmentChart({ dashboardStats }: { dashboardStats: any }) {
  const appointmentData = generateWeeklyAppointmentData(dashboardStats);
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={appointmentData}>
        <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentFinances, setRecentFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard stats and subscription data in parallel
        const [
          statsResponse,
          subscriptionResponse,
          pricesResponse,
          productsResponse,
          appointmentsResponse,
          financesResponse,
        ] = await Promise.all([
          reports.getDashboardStats().catch(() => ({ data: null })),
          doctor.getCurrentSubscription().catch(() => ({ subscription: null })),
          stripe.getPrices().catch(() => ({ data: [] })),
          stripe.getProducts().catch(() => ({ data: [] })),
          appointments.list({ limit: 5 }).catch(() => ({ data: [] })),
          finances.list({ limit: 5 }).catch(() => ({ finances: [] })),
        ]);

        setDashboardStats(statsResponse.data);
        setSubscription(subscriptionResponse.subscription);
        setPrices(pricesResponse.data);
        setProducts(productsResponse.data);
        setRecentAppointments(appointmentsResponse.data?.slice(0, 3) || []);
        setRecentFinances(financesResponse.finances?.slice(0, 2) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for page visibility changes to refresh data when user returns
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Loading your practice overview...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            There was an error loading your data.
          </p>
        </div>
        <Card className="border-0 shadow-sm border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="font-medium text-red-800">Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleSubscribe = async (priceId: string) => {
    try {
      const response = await stripe.createCheckoutSession(priceId);
      window.location.href = response.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create checkout session",
      );
    }
  };

  const isCurrentPlan = (planName: string) => {
    return subscription?.plan_name.toLowerCase() === planName.toLowerCase();
  };

  const getButtonText = (planName: string) => {
    if (!subscription || subscription.plan_name.toLowerCase() === "free") {
      return "Subscribe";
    }
    if (isCurrentPlan(planName)) {
      return "Plano Atual";
    }
    return "Alterar Plano";
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's your practice overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Pacientes
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats?.total_patients || 0}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />+
                  {dashboardStats?.patients_growth || 0}% este mês
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Agendamentos Hoje
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats?.appointments_today || 0}
                </p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {dashboardStats?.pending_appointments || 0} pendentes
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Receita Mensal
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  R${" "}
                  {(dashboardStats?.monthly_revenue || 0).toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 2 },
                  )}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />+
                  {dashboardStats?.revenue_growth || 0}% vs último mês
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Taxa de Satisfação
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats?.satisfaction_rate || 0}%
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  {dashboardStats?.satisfaction_rate >= 90
                    ? "Excelente"
                    : dashboardStats?.satisfaction_rate >= 80
                      ? "Bom"
                      : dashboardStats?.satisfaction_rate >= 70
                        ? "Regular"
                        : "Precisa melhorar"}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((appointment) => (
                     <div
                       key={appointment.id}
                       className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                     >
                      <div
                        className={`h-2 w-2 rounded-full mt-2 ${
                          appointment.status === "completed"
                            ? "bg-green-500"
                            : appointment.status === "confirmed"
                              ? "bg-blue-500"
                              : appointment.status === "scheduled"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {appointment.status === "completed"
                            ? "Consulta concluída"
                            : appointment.status === "confirmed"
                              ? "Consulta confirmada"
                              : appointment.status === "scheduled"
                                ? "Novo agendamento"
                                : "Agendamento"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {appointment.patient_name || "Paciente não informado"}{" "}
                          - {appointment.treatment || "Consulta"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(appointment.created_at).toLocaleDateString(
                            "pt-BR",
                          )}{" "}
                          às{" "}
                          {new Date(appointment.created_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">
                      Nenhuma atividade recente de agendamentos
                    </p>
                  </div>
                )}

                {recentFinances.length > 0 &&
                  recentFinances.map((finance) => (
                    <div
                      key={finance.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="h-2 w-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {finance.type === "income"
                            ? "Pagamento recebido"
                            : "Despesa registrada"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {finance.description} - R${" "}
                          {finance.amount?.toFixed(2) || "0,00"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(finance.created_at).toLocaleDateString(
                            "pt-BR",
                          )}{" "}
                          às{" "}
                          {new Date(finance.created_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                onClick={() => navigate("/dashboard/patients")}
              >
                <Users className="h-4 w-4" />
                Novo Paciente
              </Button>
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                onClick={() => navigate("/dashboard/appointments")}
              >
                <Calendar className="h-4 w-4" />
                Agendar Consulta
              </Button>
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                onClick={() => navigate("/dashboard/finances")}
              >
                <DollarSign className="h-4 w-4" />
                Registrar Pagamento
              </Button>
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                onClick={() => navigate("/dashboard/reports")}
              >
                <BarChart3 className="h-4 w-4" />
                Ver Relatórios
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Receita Semanal
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/reports")}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900">
                R${" "}
                {(dashboardStats?.weekly_revenue || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />+
                {dashboardStats?.weekly_revenue_growth || 0}% vs semana anterior
              </p>
            </div>
            <MiniRevenueChart dashboardStats={dashboardStats} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Consultas Semanal
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/appointments")}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats?.weekly_appointments || 0} consultas
              </p>
              <p className="text-sm text-blue-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dashboardStats?.appointments_today || 0} hoje,{" "}
                {dashboardStats?.appointments_tomorrow || 0} amanhã
              </p>
            </div>
            <MiniAppointmentChart dashboardStats={dashboardStats} />
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status */}
      <Card className="mb-8 border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg font-semibold">Plano Atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-gray-900">
                  {subscription?.plan_name || "Gratuito"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    subscription?.subscription_status === "active"
                      ? "bg-green-100 text-green-700"
                      : subscription?.subscription_status === "trialing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {subscription?.subscription_status === "active"
                    ? "Ativo"
                    : subscription?.subscription_status === "trialing"
                      ? "Período de teste"
                      : subscription
                        ? "Inativo"
                        : "Gratuito"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {subscription?.subscription_status === "active"
                  ? "Cobrado mensalmente"
                  : subscription?.subscription_status === "trialing"
                    ? "Período de teste ativo"
                    : subscription
                      ? "Assinatura inativa"
                      : "Faça upgrade para desbloquear recursos premium"}
              </p>
              {subscription?.created_at &&
                subscription?.plan_name !== "Free Plan" && (
                  <p className="text-xs text-gray-500">
                    Assinante desde:{" "}
                    {new Date(subscription.created_at).toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                )}
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="info" size="sm" className="gap-2">
                    <Info className="h-4 w-4" />
                    Ver Planos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      Planos Disponíveis
                    </DialogTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Escolha o plano ideal para sua clínica
                    </p>
                  </DialogHeader>
                  <div className="mt-6">
                    {products.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum plano disponível no momento.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {products.map((product) => {
                          const productPrice = prices.find(
                            (p) => p.product_id === product.id,
                          );

                          const isCurrent = isCurrentPlan(product.name);

                          return (
                            <div
                              key={product.id}
                              className={`relative border rounded-xl p-6 space-y-4 transition-all ${
                                isCurrent
                                  ? "border-blue-200 bg-blue-50/50 ring-2 ring-blue-100"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {isCurrent && (
                                <div className="absolute -top-3 left-6">
                                  <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                                    Plano Atual
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-xl font-bold text-gray-900">
                                    {product.name}
                                  </h3>
                                </div>
                                {product.description && (
                                  <p className="text-sm text-gray-600">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              {!productPrice ? (
                                <p className="text-sm text-gray-500">
                                  Preço não disponível para este plano.
                                </p>
                              ) : (
                                <div className="space-y-6">
                                  <div className="text-center py-4">
                                    <p className="text-3xl font-bold text-gray-900">
                                      {formatPrice(
                                        productPrice.unit_amount,
                                        productPrice.currency,
                                      )}
                                    </p>
                                    {productPrice.interval && (
                                      <p className="text-sm text-gray-600">
                                        por{" "}
                                        {productPrice.interval === "month"
                                          ? "mês"
                                          : productPrice.interval}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() =>
                                      handleSubscribe(productPrice.id)
                                    }
                                    className="w-full h-11"
                                    disabled={isCurrent}
                                    variant={
                                      isCurrent ? "secondary" : "default"
                                    }
                                  >
                                    {getButtonText(product.name)}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              {subscription &&
                subscription.plan_name.toLowerCase() !== "free plan" && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Gerenciar
                  </Button>
                )}
              {(!subscription ||
                subscription.plan_name.toLowerCase() === "free") && (
                <Button
                  variant="success"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate("/pricing")}
                >
                  <Crown className="h-4 w-4" />
                  Fazer Upgrade
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}