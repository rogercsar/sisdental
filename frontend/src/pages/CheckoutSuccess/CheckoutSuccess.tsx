import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { doctor } from "../../lib/api/client";
import type { Subscription } from "../../lib/api/types";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const sessionId = searchParams.get("session_id");

  const fetchSubscription = async () => {
    setError(null);
    try {
      const { subscription } = await doctor.getCurrentSubscription();
      setSubscription(subscription ?? null);
    } catch (e: any) {
      setError(
        e?.message || "Erro ao verificar status da assinatura. Tente novamente."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setError(
        "Nenhum session_id foi encontrado na URL. Se você finalizou o pagamento, tente acessar novamente pelo link de retorno do checkout ou volte para os planos."
      );
      setIsProcessing(false);
      return;
    }

    // Verifica o status da assinatura (webhook pode levar alguns segundos)
    fetchSubscription();
    // Opcional: pequena rechecagem após alguns segundos
    const retry = setTimeout(() => {
      if (!subscription) {
        fetchSubscription();
      }
    }, 3000);

    return () => clearTimeout(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleContinueToDashboard = () => {
    navigate("/dashboard");
  };

  const handleManageSubscription = () => {
    navigate("/pricing");
  };

  const handleRefreshStatus = async () => {
    setIsProcessing(true);
    await fetchSubscription();
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Processando sua assinatura...
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Estamos confirmando o pagamento e ativando o acesso.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Ocorreu um problema
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRefreshStatus}
                  className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={handleManageSubscription}
                  className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ver Planos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subscription?.subscription_status === "active";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {isActive ? (
              <CheckCircle className="mx-auto h-12 w-12 text-blue-600" />
            ) : (
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-600" />
            )}
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isActive ? "Assinatura confirmada!" : "Pagamento recebido, aguardando ativação"}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {subscription ? (
                <>
                  Plano: <span className="font-medium">{subscription.plan_name}</span> ·
                  Status: <span className="font-medium">{subscription.subscription_status}</span>
                </>
              ) : (
                <>Não encontramos uma assinatura ativa ainda. Pode levar alguns segundos para o processamento do pagamento pelo provedor.</>
              )}
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleContinueToDashboard}
                className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ir para o Dashboard
              </button>
              <button
                onClick={handleManageSubscription}
                className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Gerenciar assinatura
              </button>
              <button
                onClick={handleRefreshStatus}
                className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Atualizar status
              </button>
            </div>
            {sessionId && (
              <p className="mt-4 text-xs text-gray-400">Ref: sessão {sessionId}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}