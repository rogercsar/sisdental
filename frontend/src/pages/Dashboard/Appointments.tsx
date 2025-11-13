import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Plus, 
  Filter, 
  Search,
  Clock, 
  User, 
  Phone,
  Mail,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  CalendarDays,
  Timer,
  MapPin,
  Stethoscope,
  TrendingUp,
  Activity,
  Grid3X3,
  List,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import EnhancedCalendar from "@/components/calendar/EnhancedCalendar";
import { appointments, search } from "@/lib/api/client";
import { NewAppointmentModal } from "@/components/modals/NewAppointmentModal";

interface Appointment {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  date: string;
  time: string;
  duration?: number;
  treatment?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
  is_first_visit?: boolean;
  created_at?: string;
  updated_at?: string;
}

function AppointmentCard({ 
  appointment, 
  onAppointmentUpdated 
}: { 
  appointment: Appointment;
  onAppointmentUpdated?: () => void;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "scheduled": 
        return { 
          color: "bg-blue-100 text-blue-700", 
          text: "Agendado",
          icon: Calendar,
          iconColor: "text-blue-600"
        };
      case "confirmed": 
        return { 
          color: "bg-green-100 text-green-700", 
          text: "Confirmado",
          icon: CheckCircle,
          iconColor: "text-green-600"
        };
      case "completed": 
        return { 
          color: "bg-emerald-100 text-emerald-700", 
          text: "Concluído",
          icon: CheckCircle,
          iconColor: "text-emerald-600"
        };
      case "cancelled": 
        return { 
          color: "bg-red-100 text-red-700", 
          text: "Cancelado",
          icon: XCircle,
          iconColor: "text-red-600"
        };
      case "no_show": 
        return { 
          color: "bg-orange-100 text-orange-700", 
          text: "Faltou",
          icon: AlertCircle,
          iconColor: "text-orange-600"
        };
      default: 
        return { 
          color: "bg-gray-100 text-gray-700", 
          text: "Desconhecido",
          icon: AlertCircle,
          iconColor: "text-gray-600"
        };
    }
  };

  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  const formatTime = (time: string) => {
    return time;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const handleConfirm = async () => {
    try {
      await appointments.confirm(appointment.id);
      toast.success("Consulta confirmada com sucesso!");
      onAppointmentUpdated?.();
    } catch (error) {
      toast.error("Erro ao confirmar consulta");
    }
  };

  const handleComplete = async () => {
    try {
      await appointments.complete(appointment.id);
      toast.success("Consulta concluída com sucesso!");
      onAppointmentUpdated?.();
    } catch (error) {
      toast.error("Erro ao concluir consulta");
    }
  };

  const handleCancel = async () => {
    try {
      await appointments.cancel(appointment.id);
      toast.success("Consulta cancelada com sucesso!");
      onAppointmentUpdated?.();
    } catch (error) {
      toast.error("Erro ao cancelar consulta");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
      return;
    }
    
    try {
      await appointments.delete(appointment.id);
      toast.success("Agendamento excluído com sucesso!");
      onAppointmentUpdated?.();
    } catch (error) {
      toast.error("Erro ao excluir agendamento");
    }
  };

  return (
    <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200">
      <CardContent className="p-4">
        {/* Header with patient name and status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{appointment.patient_name || "Paciente não informado"}</h3>
            {appointment.is_first_visit && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                Primeira consulta
              </span>
            )}
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.text}
          </span>
        </div>

        {/* Treatment type */}
        <p className="text-sm text-gray-600 mb-3">{appointment.treatment || "Consulta"}</p>

        {/* Date and time */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(appointment.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(appointment.time)}</span>
          </div>
        </div>

        {/* Contact info (only if available) */}
        {(appointment.patient_email || appointment.patient_phone) && (
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {appointment.patient_phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{appointment.patient_phone}</span>
              </div>
            )}
            {appointment.patient_email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{appointment.patient_email}</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {appointment.status === "scheduled" && (
            <>
              <Button 
                size="sm" 
                className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-xs"
                onClick={handleConfirm}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </>
          )}
          {appointment.status === "confirmed" && (
            <>
              <Button 
                size="sm" 
                className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                onClick={handleComplete}
              >
                Concluir
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </>
          )}
          {(appointment.status === "completed" || appointment.status === "cancelled") && (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleDelete}>
                <Trash2 className="h-3 w-3" />
                Excluir
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Edit className="h-3 w-3" />
                Editar
              </Button>
            </>
          )}
          {appointment.status === "no_show" && (
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
              Excluir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [appointmentList, setAppointmentList] = useState<Appointment[]>([]);
  const [searchResults, setSearchResults] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarRefresh, setCalendarRefresh] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const searchAppointments = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const results = await search.appointments(query);
      setSearchResults(Array.isArray(results) ? results : []);
      console.log("✅ SEARCH: Found", Array.isArray(results) ? results.length : 0, "appointments for query:", query);
    } catch (error) {
      console.error("❌ SEARCH: Appointment search error:", error);
      setError(error instanceof Error ? error.message : "Failed to search appointments");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let dateFilter = undefined;
      if (filterDate === "today") {
        dateFilter = today;
      } else if (filterDate === "tomorrow") {
        dateFilter = tomorrow;
      }

      const response = await appointments.list({
        date: dateFilter,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
      
      if (response.data) {
        setAppointmentList(response.data);
      }
    } catch (err) {
      console.error("❌ Error fetching appointments:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() !== "") {
        searchAppointments(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAppointments();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filterStatus, filterDate]);

  // Use search results when searching, otherwise use regular appointment list
  const displayedAppointments = searchTerm.trim() !== "" ? searchResults : appointmentList;
  const isCurrentlySearching = searchTerm.trim() !== "" && isSearching;

  // Filter displayed appointments by status and date (only applies to regular list, not search results)
  const filteredAppointments = searchTerm.trim() !== "" 
    ? displayedAppointments 
    : displayedAppointments.filter(appointment => {
        // Apply status filter
        if (filterStatus !== "all" && appointment.status !== filterStatus) {
          return false;
        }
        
        // Apply date filter  
        if (filterDate === "today" && appointment.date !== today) {
          return false;
        } else if (filterDate === "tomorrow" && appointment.date !== tomorrow) {
          return false;
        }
        
        return true;
      });

  const stats = {
    total: appointmentList.length,
    today: appointmentList.filter(a => a.date === today).length,
    confirmed: appointmentList.filter(a => a.status === "confirmed").length,
    completed: appointmentList.filter(a => a.status === "completed").length,
    cancelled: appointmentList.filter(a => a.status === "cancelled" || a.status === "no_show").length
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-gray-600 mt-1">Gerencie todos os agendamentos da sua clínica</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-gray-200 rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="gap-2"
              >
                <Grid3X3 className="h-4 w-4" />
                Agenda
              </Button>
            </div>
            <Button 
              onClick={() => setShowAddAppointment(true)} 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Agendamentos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Agendamentos hoje
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
                <p className="text-sm font-medium text-gray-600">Confirmados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  Prontos para atender
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <Activity className="h-3 w-3" />
                  Tratamentos finalizados
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <XCircle className="h-3 w-3" />
                  Requerem atenção
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Only show for list view */}
      {viewMode === "list" && (
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por paciente ou tratamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as Datas</option>
                  <option value="today">Hoje</option>
                  <option value="tomorrow">Amanhã</option>
                  <option value="week">Esta Semana</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Status</option>
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="no_show">Faltou</option>
                </select>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Mais Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Content based on view mode */}
      {viewMode === "list" ? (
        <>
          {/* Loading State */}
          {(loading || isCurrentlySearching) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isCurrentlySearching ? "Buscando agendamentos..." : "Carregando agendamentos..."}
                </h3>
              </CardContent>
            </Card>
          )}

          {/* Appointments Grid */}
          {!loading && !isCurrentlySearching && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  onAppointmentUpdated={() => {
                    fetchAppointments();
                    setCalendarRefresh(prev => prev + 1); // Also refresh calendar
                  }}
                />
              ))}
            </div>
          )}

          {!loading && !isCurrentlySearching && filteredAppointments.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm.trim() !== ""
                    ? `Nenhum resultado encontrado para "${searchTerm}". Tente outro termo de busca.`
                    : filterStatus !== "all" || filterDate !== "all"
                    ? "Tente ajustar os filtros de busca."
                    : "Comece criando seu primeiro agendamento."}
                </p>
                <Button onClick={() => setShowAddAppointment(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Agendamento
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <EnhancedCalendar refreshTrigger={calendarRefresh} />
      )}

      {/* New Appointment Modal */}
      <NewAppointmentModal
        isOpen={showAddAppointment}
        onClose={() => setShowAddAppointment(false)}
        onAppointmentCreated={() => {
          fetchAppointments();
          setCalendarRefresh(prev => prev + 1); // Trigger calendar refresh
        }}
      />
    </div>
  );
}