import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Plus, 
  Filter, 
  Search,
  TrendingUp,
  PiggyBank,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  FileText,
  Wallet,
  Activity,
  BarChart3,
  Loader2,
  X
} from "lucide-react";
import { finances } from "@/lib/api/client";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category?: string;
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "cancelled";
  payment_method?: "cash" | "card" | "pix" | "transfer";
  patient_name?: string;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
}

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  pending_payments: number;
  monthly_growth: number;
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed": 
        return { 
          color: "bg-green-100 text-green-700", 
          text: "Concluído",
          icon: CheckCircle
        };
      case "pending": 
        return { 
          color: "bg-yellow-100 text-yellow-700", 
          text: "Pendente",
          icon: Clock
        };
      case "cancelled": 
        return { 
          color: "bg-red-100 text-red-700", 
          text: "Cancelado",
          icon: XCircle
        };
      default: 
        return { 
          color: "bg-gray-100 text-gray-700", 
          text: "Desconhecido",
          icon: Clock
        };
    }
  };

  const getPaymentMethodText = (method?: string) => {
    if (!method) return "N/A";
    switch (method) {
      case "cash": return "Dinheiro";
      case "card": return "Cartão";
      case "pix": return "PIX";
      case "transfer": return "Transferência";
      default: return method;
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;
  const isIncome = transaction.type === "income";

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isIncome ? "bg-green-100" : "bg-red-100"
            }`}>
              {isIncome ? (
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{transaction.description}</h3>
              <p className="text-sm text-gray-600">{transaction.category || "Sem categoria"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.text}
            </span>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Valor:</span>
            <span className={`text-lg font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}>
              {isIncome ? "+" : "-"}R$ {transaction.amount.toFixed(2).replace(".", ",")}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Data:</span>
            <span className="text-gray-900">
              {new Date(transaction.date).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Pagamento:</span>
            <span className="text-gray-900">{getPaymentMethodText(transaction.payment_method)}</span>
          </div>

          {transaction.patient_name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Paciente:</span>
              <span className="text-gray-900">{transaction.patient_name}</span>
            </div>
          )}

          {transaction.invoice_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Nota Fiscal:</span>
              <span className="text-gray-900">{transaction.invoice_number}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <FileText className="h-4 w-4" />
            Ver Detalhes
          </Button>
          {transaction.invoice_number && (
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Finances() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await finances.list({
        type: filterType !== "all" ? filterType : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      
      if (response && Array.isArray(response.finances)) {
        const transactions = response.finances as Transaction[];
        setTransactionList(transactions);
        // Calculate summary from data
        const revenue = transactions
          .filter(t => t.type === "income" && t.status === "completed")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const expenses = transactions
          .filter(t => t.type === "expense" && t.status === "completed")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const pending = transactions
          .filter(t => t.status === "pending")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        setSummary({
          total_revenue: revenue,
          total_expenses: expenses,
          net_profit: revenue - expenses,
          pending_payments: pending,
          monthly_growth: 8.5 // This would come from backend calculation
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar finanças");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFinances();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType, filterStatus, filterPeriod]);

  const filteredTransactions = transactionList.filter(transaction => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower) ||
      transaction.patient_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-1">Controle completo das finanças da sua clínica</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Transação
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary?.total_revenue || 0)}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +{summary?.monthly_growth || 0}% este mês
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Despesas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary?.total_expenses || 0)}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  <BarChart3 className="h-3 w-3" />
                  Gastos operacionais
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lucro Líquido</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary?.net_profit || 0)}
                </p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Activity className="h-3 w-3" />
                  Margem de {summary?.total_revenue ? Math.round((summary.net_profit / summary.total_revenue) * 100) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary?.pending_payments || 0)}
                </p>
                <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Aguardando recebimento
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Wallet className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart Placeholder */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Gráfico de receitas e despesas</p>
              <p className="text-sm text-gray-500">Visualização será implementada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Ano</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas as Transações</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="completed">Concluído</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Mais Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-0 shadow-sm mb-6 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Carregando transações...
            </h3>
          </CardContent>
        </Card>
      )}

      {/* Transactions Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}

      {!loading && filteredTransactions.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma transação encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== "all" || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Comece registrando sua primeira transação financeira."}
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Primeira Transação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}