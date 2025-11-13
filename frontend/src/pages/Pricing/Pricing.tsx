import { useEffect, useState } from "react";
import { Check, Crown, Star, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { stripe } from "../../lib/api/client";
import type { Product, Price } from "../../lib/api/types";
import { useNavigate } from "react-router-dom";
import { startMercadoPagoCheckout } from "../../lib/payments/mercadopago";

// Helper for currency formatting
const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

interface Plan {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId: string;
  popular: boolean;
  description: string;
}

function PricingCard({
  name,
  price,
  currency,
  interval,
  trialDays,
  features,
  priceId,
  onCheckout,
  loading,
  popular = false,
  description,
}: {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  onCheckout: (priceId: string) => void;
  loading: boolean;
  popular?: boolean;
  description?: string;
}) {
  const isBasic = name.toLowerCase() === "base";

  return (
    <Card
      className={`relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
        popular ? "ring-2 ring-blue-500 scale-105" : "hover:scale-105"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1">
            <Star className="h-4 w-4" />
            Mais Popular
          </span>
        </div>
      )}

      <CardHeader className="text-center pt-8 pb-4">
        <div className="flex justify-center mb-4">
          <div
            className={`h-16 w-16 rounded-full flex items-center justify-center ${
              isBasic ? "bg-green-100" : "bg-blue-100"
            }`}
          >
            {isBasic ? (
              <Zap
                className={`h-8 w-8 ${isBasic ? "text-green-600" : "text-blue-600"}`}
              />
            ) : (
              <Crown
                className={`h-8 w-8 ${isBasic ? "text-green-600" : "text-blue-600"}`}
              />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>

        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}

        <div className="mb-6">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {formatCurrency(price, currency)}
          </div>
          <div className="text-sm text-gray-600">
            por usuário / {interval === "month" ? "mês" : interval}
          </div>
          {trialDays > 0 && (
            <div className="text-xs text-green-600 mt-2 font-medium">
              {trialDays} dias gratuitos
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-8">
        <ul className="space-y-4 mb-8">
          {features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start">
              <Check
                className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                  isBasic ? "text-green-500" : "text-blue-500"
                }`}
              />
              <span className="text-gray-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => priceId && onCheckout(priceId)}
          disabled={loading || !priceId}
          className={`w-full h-12 text-base font-semibold transition-all ${
            popular
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              : isBasic
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Processando..." : "Começar Agora"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log("Fetching products and prices...");
        const [productsResponse, pricesResponse] = await Promise.all([
          stripe.getProducts(),
          stripe.getPrices(),
        ]);

        const products = productsResponse.data;
        const prices = pricesResponse.data;

        // Filter out test products and only keep Base and Pro
        const validProducts = products.filter(
          (product: Product) =>
            product.name === "Base" || product.name === "Pro",
        );

        const formattedPlans = validProducts
          .map((product: Product) => {
            // Find all prices for this product
            const productPrices = prices.filter(
              (p: Price) => p.product_id === product.id,
            );

            // Prefer BRL prices, fallback to USD
            const price =
              productPrices.find((p: Price) => p.currency === "brl") ||
              productPrices[0];

            if (!price) {
              return null;
            }
            // Enhanced plan data with better features
            const planFeatures = {
              Base: [
                "Até 100 pacientes",
                "Agendamentos básicos",
                "Relatórios simples",
                "Suporte por email",
                "1 usuário",
              ],
              Pro: [
                "Pacientes ilimitados",
                "Agendamentos avançados",
                "Relatórios completos",
                "Suporte prioritário",
                "Usuários ilimitados",
                "Integração com laboratórios",
                "Backup automático",
                "Dashboard avançado",
              ],
            };

            const plan = {
              name: product.name,
              price: price.unit_amount,
              currency: price.currency,
              interval: price.interval || "month",
              trialDays: price.trial_period_days || 0,
              features: planFeatures[
                product.name as keyof typeof planFeatures
              ] || [product.description || ""],
              priceId: price.id,
              popular: product.name === "Pro",
              description:
                product.name === "Base"
                  ? "Ideal para clínicas pequenas"
                  : "Ideal para clínicas em crescimento",
            };

            return plan;
          })
          .filter((plan): plan is Plan => plan !== null);

        setPlans(formattedPlans);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      }
    };

    fetchPlans();
  }, []);

  const handleCheckout = async (priceId: string) => {
    setLoadingPriceId(priceId);
    try {
      const plan = plans.find((p) => p.priceId === priceId);
      if (!plan) throw new Error("Plano não encontrado");

      await startMercadoPagoCheckout({
        title: `Sisdental — Plano ${plan.name}`,
        unit_price: plan.price / 100,
        currency_id: plan.currency?.toUpperCase() === "BRL" ? "BRL" : (plan.currency?.toUpperCase() as any),
        metadata: { priceId, interval: plan.interval },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoadingPriceId(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="border-0 shadow-sm border-red-200 bg-red-50 max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erro ao carregar planos
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Escolha o Plano Ideal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Gerencie sua clínica odontológica com eficiência. Escolha o plano
            que melhor se adapta às suas necessidades.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500" />
            <span>Sem taxa de configuração</span>
            <span className="mx-2">•</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>Cancele quando quiser</span>
            <span className="mx-2">•</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>Suporte dedicado</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans?.map((plan) => (
            <PricingCard
              key={plan.priceId}
              name={plan.name}
              price={plan.price}
              currency={plan.currency}
              interval={plan.interval}
              trialDays={plan.trialDays}
              features={plan.features}
              priceId={plan.priceId}
              onCheckout={handleCheckout}
              loading={loadingPriceId === plan.priceId}
              popular={plan.popular}
              description={plan.description}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Perguntas Frequentes
          </h2>
          <div className="grid gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Posso mudar de plano a qualquer momento?
                </h3>
                <p className="text-gray-600">
                  Sim! Você pode fazer upgrade ou downgrade do seu plano a
                  qualquer momento. As mudanças são aplicadas no próximo ciclo
                  de cobrança.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Meus dados ficam seguros?
                </h3>
                <p className="text-gray-600">
                  Absolutamente. Utilizamos criptografia de ponta e seguimos as
                  melhores práticas de segurança para proteger os dados dos seus
                  pacientes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Há suporte técnico disponível?
                </h3>
                <p className="text-gray-600">
                  Sim! Oferecemos suporte por email para todos os planos, e
                  suporte prioritário para clientes do plano Pro.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
