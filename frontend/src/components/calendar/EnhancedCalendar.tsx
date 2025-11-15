import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Loader2,
} from "lucide-react";
import { appointments } from "@/lib/api/client";
import { toast } from "sonner";

// Configure moment locale
moment.locale("pt-br");
const localizer = momentLocalizer(moment);

// Interface definitions
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    type: string;
    status:
      | "scheduled"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled"
      | "no_show";
    notes?: string;
    duration: number;
    dentist: string;
    room?: string;
    equipment?: string[];
  };
}

interface Resource {
  id: string;
  name: string;
  type: "dentist" | "room" | "equipment";
  available: boolean;
  color: string;
}

// Mock data
const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Maria Silva - Limpeza",
    start: new Date(2024, 1, 15, 9, 0),
    end: new Date(2024, 1, 15, 10, 0),
    resource: {
      patientId: "1",
      patientName: "Maria Silva",
      patientPhone: "(11) 99999-9999",
      patientEmail: "maria@email.com",
      type: "Limpeza Dental",
      status: "scheduled",
      duration: 60,
      dentist: "Dr. Carlos Mendes",
      room: "Sala 1",
      equipment: ["Cadeira 1", "Ultrassom"],
    },
  },
  {
    id: "2",
    title: "João Santos - Canal",
    start: new Date(2024, 1, 15, 10, 30),
    end: new Date(2024, 1, 15, 12, 0),
    resource: {
      patientId: "2",
      patientName: "João Santos",
      patientPhone: "(11) 88888-8888",
      patientEmail: "joao@email.com",
      type: "Endodontia",
      status: "confirmed",
      duration: 90,
      dentist: "Dra. Ana Costa",
      room: "Sala 2",
      equipment: ["Cadeira 2", "Microscópio"],
    },
  },
  {
    id: "3",
    title: "Ana Costa - Ortodontia",
    start: new Date(2024, 1, 15, 14, 0),
    end: new Date(2024, 1, 15, 15, 0),
    resource: {
      patientId: "3",
      patientName: "Ana Costa",
      patientPhone: "(11) 77777-7777",
      patientEmail: "ana@email.com",
      type: "Consulta Ortodôntica",
      status: "in_progress",
      duration: 60,
      dentist: "Dr. Carlos Mendes",
      room: "Sala 1",
      equipment: ["Cadeira 1"],
    },
  },
];

const mockResources: Resource[] = [
  {
    id: "dr_carlos",
    name: "Dr. Carlos Mendes",
    type: "dentist",
    available: true,
    color: "#3B82F6",
  },
  {
    id: "dra_ana",
    name: "Dra. Ana Costa",
    type: "dentist",
    available: true,
    color: "#10B981",
  },
  {
    id: "sala_1",
    name: "Sala 1",
    type: "room",
    available: true,
    color: "#F59E0B",
  },
  {
    id: "sala_2",
    name: "Sala 2",
    type: "room",
    available: true,
    color: "#EF4444",
  },
];

// Custom event component
function EventComponent({ event }: { event: CalendarEvent }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "confirmed":
        return "bg-green-100 border-green-300 text-green-800";
      case "in_progress":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "completed":
        return "bg-gray-100 border-gray-300 text-gray-800";
      case "cancelled":
        return "bg-red-100 border-red-300 text-red-800";
      case "no_show":
        return "bg-orange-100 border-orange-300 text-orange-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <CalendarIcon className="h-3 w-3" />;
      case "confirmed":
        return <CheckCircle className="h-3 w-3" />;
      case "in_progress":
        return <Activity className="h-3 w-3" />;
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "cancelled":
        return <XCircle className="h-3 w-3" />;
      case "no_show":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={`p-2 rounded border-l-4 ${getStatusColor(event.resource?.status || "scheduled")} text-xs`}
    >
      <div className="flex items-center gap-1 mb-1">
        {getStatusIcon(event.resource?.status || "scheduled")}
        <span className="font-medium truncate">
          {event.resource?.patientName}
        </span>
      </div>
      <div className="text-xs opacity-75">{event.resource?.type}</div>
      <div className="text-xs opacity-75">{event.resource?.dentist}</div>
    </div>
  );
}

// Event details modal
function EventDetailsModal({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}) {
  if (!event || !event.resource) return null;

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "confirmed":
        return "Confirmado";
      case "in_progress":
        return "Em Andamento";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      case "no_show":
        return "Faltou";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-gray-100 text-gray-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "no_show":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Detalhes da Consulta</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Patient Info */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <User className="h-5 w-5 text-gray-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {event.resource.patientName}
            </h3>
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3 w-3" />
                {event.resource.patientPhone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {event.resource.patientEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Tipo</label>
            <p className="text-sm text-gray-900">{event.resource.type}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.resource.status)}`}
            >
              {getStatusText(event.resource.status)}
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Dentista
            </label>
            <p className="text-sm text-gray-900">{event.resource.dentist}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Duração</label>
            <p className="text-sm text-gray-900">
              {event.resource.duration} min
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Horário</label>
            <p className="text-sm text-gray-900">
              {moment(event.start).format("HH:mm")} -{" "}
              {moment(event.end).format("HH:mm")}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Sala</label>
            <p className="text-sm text-gray-900">{event.resource.room}</p>
          </div>
        </div>

        {/* Equipment */}
        {event.resource.equipment && event.resource.equipment.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">
              Equipamentos
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {event.resource.equipment.map((item, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {event.resource.notes && (
          <div>
            <label className="text-sm font-medium text-gray-600">
              Observações
            </label>
            <p className="text-sm text-gray-900 mt-1">{event.resource.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onEdit(event)}
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-600 hover:text-red-700"
            onClick={() => onDelete(event.id)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Appointment form modal
function AppointmentForm({
  event,
  isOpen,
  onClose,
  onSave,
}: {
  event?: CalendarEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<CalendarEvent>) => void;
}) {
  const [formData, setFormData] = useState({
    patientName: event?.resource?.patientName || "",
    patientPhone: event?.resource?.patientPhone || "",
    patientEmail: event?.resource?.patientEmail || "",
    type: event?.resource?.type || "",
    dentist: event?.resource?.dentist || "",
    room: event?.resource?.room || "",
    date: event
      ? moment(event.start).format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD"),
    time: event ? moment(event.start).format("HH:mm") : "09:00",
    duration: event?.resource?.duration || 60,
    notes: event?.resource?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = moment(
      `${formData.date} ${formData.time}`,
      "YYYY-MM-DD HH:mm",
    ).toDate();
    const endDate = moment(startDate)
      .add(formData.duration, "minutes")
      .toDate();

    onSave({
      id: event?.id || Date.now().toString(),
      title: `${formData.patientName} - ${formData.type}`,
      start: startDate,
      end: endDate,
      resource: {
        patientId: event?.resource?.patientId || Date.now().toString(),
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        patientEmail: formData.patientEmail,
        type: formData.type,
        status: "scheduled",
        duration: formData.duration,
        dentist: formData.dentist,
        room: formData.room,
        notes: formData.notes,
        equipment: [],
      },
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? "Editar Consulta" : "Nova Consulta"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Paciente
              </label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.patientPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientPhone: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.patientEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientEmail: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Consulta
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpeza Dental">Limpeza Dental</SelectItem>
                  <SelectItem value="Restauração">Restauração</SelectItem>
                  <SelectItem value="Endodontia">Endodontia</SelectItem>
                  <SelectItem value="Ortodontia">Ortodontia</SelectItem>
                  <SelectItem value="Extração">Extração</SelectItem>
                  <SelectItem value="Implante">Implante</SelectItem>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dentista
              </label>
              <Select
                value={formData.dentist}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, dentist: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Carlos Mendes">
                    Dr. Carlos Mendes
                  </SelectItem>
                  <SelectItem value="Dra. Ana Costa">Dra. Ana Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração (min)
              </label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h 30min</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sala
              </label>
              <Select
                value={formData.room}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, room: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sala 1">Sala 1</SelectItem>
                  <SelectItem value="Sala 2">Sala 2</SelectItem>
                  <SelectItem value="Sala 3">Sala 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {event ? "Atualizar" : "Criar"} Consulta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Transform backend appointment data to calendar events
const transformAppointmentToEvent = (appointment: any): CalendarEvent => {
  // Parse the date and time
  const dateTime = new Date(`${appointment.date}T${appointment.time}`);
  const duration = appointment.duration || 60; // default 60 minutes
  const endTime = new Date(dateTime.getTime() + duration * 60 * 1000);
  
  return {
    id: appointment.id,
    title: `${appointment.patient_name || "Paciente"} - ${appointment.treatment || "Consulta"}`,
    start: dateTime,
    end: endTime,
    resource: {
      patientId: appointment.patient_id,
      patientName: appointment.patient_name || "Paciente não informado",
      patientPhone: appointment.patient_phone || "",
      patientEmail: appointment.patient_email || "",
      type: appointment.treatment || "Consulta",
      status: appointment.status as any,
      duration: duration,
      dentist: "Dr. Responsável", // Backend doesn't return dentist info yet
      room: "Consultório",
      notes: appointment.notes || "",
      equipment: [],
    },
  };
};

export default function EnhancedCalendar({ refreshTrigger }: { refreshTrigger?: number }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments from API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await appointments.list({
        // Don't filter by date to show all appointments in calendar
        limit: 1000 // High limit to get all appointments
      });
      
      if (response.data) {
        const calendarEvents = response.data.map(transformAppointmentToEvent);
        setEvents(calendarEvents);
      }
    } catch (err) {
      console.error("❌ Calendar: Error fetching appointments:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos");
      toast.error("Erro ao carregar agendamentos para o calendário");
    } finally {
      setLoading(false);
    }
  };

  // Load appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Refresh appointments when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchAppointments();
    }
  }, [refreshTrigger]);

  // Custom calendar messages in Portuguese
  const messages = {
    allDay: "Todo o dia",
    previous: "Anterior",
    next: "Próximo",
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    date: "Data",
    time: "Hora",
    event: "Evento",
    noEventsInRange: "Nenhum evento neste período",
    showMore: (total: number) => `+ ${total} mais`,
  };

  // Event handlers
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  }, []);

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      setEditingEvent(undefined);
      setShowAppointmentForm(true);
    },
    [],
  );

  const handleEventDrop = useCallback(
    ({
      event,
      start,
      end,
    }: {
      event: CalendarEvent;
      start: Date;
      end: Date;
    }) => {
      setEvents((prev) =>
        prev.map((existingEvent) =>
          existingEvent.id === event.id
            ? { ...existingEvent, start, end }
            : existingEvent,
        ),
      );
    },
    [],
  );

  const handleEventResize = useCallback(
    ({
      event,
      start,
      end,
    }: {
      event: CalendarEvent;
      start: Date;
      end: Date;
    }) => {
      setEvents((prev) =>
        prev.map((existingEvent) =>
          existingEvent.id === event.id
            ? { ...existingEvent, start, end }
            : existingEvent,
        ),
      );
    },
    [],
  );

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventDetails(false);
    setShowAppointmentForm(true);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setShowEventDetails(false);
  }, []);

  const handleSaveAppointment = useCallback(
    (appointmentData: Partial<CalendarEvent>) => {
      if (editingEvent) {
        // Update existing event
        setEvents((prev) =>
          prev.map((event) =>
            event.id === editingEvent.id
              ? { ...event, ...appointmentData }
              : event,
          ),
        );
      } else {
        // Create new event
        setEvents((prev) => [...prev, appointmentData as CalendarEvent]);
      }
      setEditingEvent(undefined);
    },
    [editingEvent],
  );

  // Custom event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource?.status || "scheduled";
    let backgroundColor = "#3B82F6";

    switch (status) {
      case "confirmed":
        backgroundColor = "#10B981";
        break;
      case "in_progress":
        backgroundColor = "#F59E0B";
        break;
      case "completed":
        backgroundColor = "#6B7280";
        break;
      case "cancelled":
        backgroundColor = "#EF4444";
        break;
      case "no_show":
        backgroundColor = "#F97316";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Agenda de Consultas
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={view}
                onValueChange={(value: "month" | "week" | "day") =>
                  setView(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="day">Dia</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="gap-2"
                onClick={() => {
                  setEditingEvent(undefined);
                  setShowAppointmentForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nova Consulta
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div style={{ height: "600px" }} className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-gray-600">Carregando agendamentos...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 z-10">
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={fetchAppointments}
                  className="text-red-700 text-sm underline mt-1"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={["month", "week", "day"]}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              resizable
              eventPropGetter={eventStyleGetter}
              components={{
                event: EventComponent,
              }}
              messages={messages}
              formats={{
                timeGutterFormat: "HH:mm",
                eventTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
                dayHeaderFormat: (date) => moment(date).format("dddd, DD/MM"),
                dayRangeHeaderFormat: ({ start, end }) =>
                  `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM")}`,
                monthHeaderFormat: (date) => moment(date).format("MMMM YYYY"),
              }}
              step={15}
              timeslots={4}
              min={new Date(0, 0, 0, 7, 0, 0)}
              max={new Date(0, 0, 0, 19, 0, 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <EventDetailsModal
          event={selectedEvent}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      </Dialog>

      {/* Appointment Form Modal */}
      <AppointmentForm
        event={editingEvent}
        isOpen={showAppointmentForm}
        onClose={() => {
          setShowAppointmentForm(false);
          setEditingEvent(undefined);
        }}
        onSave={handleSaveAppointment}
      />
    </div>
  );
}

