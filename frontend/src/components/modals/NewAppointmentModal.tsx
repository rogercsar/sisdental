import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, User, FileText } from "lucide-react";
import { appointments, patients } from "@/lib/api/client";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";
import { Checkbox } from "@/components/ui/checkbox";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string; // Optional - if not provided, will show patient selection
  patientName?: string; // Optional - if not provided, will show patient selection
  onAppointmentCreated?: () => void;
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onAppointmentCreated,
}: NewAppointmentModalProps) {
  const [formData, setFormData] = useState({
    patientId: patientId || "", // Use provided patientId or empty for selection
    date: "",
    time: "",
    type: "",
    duration: 60,
    notes: "",
    dentist: "",
    room: "",
    priority: "normal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [syncWithGoogleCalendar, setSyncWithGoogleCalendar] = useState(() => {
    // Check if Google Calendar sync is enabled in settings
    const savedSettings = localStorage.getItem('googleCalendarSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return settings.enabled && settings.autoSync;
    }
    return false;
  });

  const { isAuthenticated, createEvent } = useGoogleCalendar();

  // Load patients when modal opens (only if no specific patient provided)
  const loadPatients = async () => {
    if (patientId) return; // Skip if we already have a specific patient
    
    try {
      setPatientsLoading(true);
      const response = await patients.list();
      if (response.patients) {
        setPatientsList(response.patients);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      toast.error("Erro ao carregar lista de pacientes");
    } finally {
      setPatientsLoading(false);
    }
  };

  // Load patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const appointmentTypes = [
    "Consulta de Rotina",
    "Limpeza Dental",
    "Restauração",
    "Endodontia (Canal)",
    "Extração",
    "Implante",
    "Ortodontia",
    "Emergência",
    "Avaliação",
    "Retorno",
    "Cirurgia",
    "Periodontal",
  ];

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
  ];

  const dentists = [
    "Dr. Carlos Mendes",
    "Dra. Ana Costa",
    "Dr. João Silva",
    "Dra. Maria Santos",
    "Dr. Pedro Oliveira",
  ];

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = "Paciente é obrigatório";
    }
    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }
    if (!formData.time) {
      newErrors.time = "Horário é obrigatório";
    }
    if (!formData.type) {
      newErrors.type = "Tipo de consulta é obrigatório";
    }
    if (!formData.dentist) {
      newErrors.dentist = "Profissional é obrigatório";
    }

    // Validate date is not in the past
    if (formData.date) {
      const selectedDate = new Date(`${formData.date}T${formData.time || "00:00"}`);
      const now = new Date();
      if (selectedDate < now) {
        newErrors.date = "Data não pode ser no passado";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setIsLoading(true);

    try {
      // Create appointment data matching the backend model
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const endTime = new Date(dateTime.getTime() + formData.duration * 60 * 1000);
      
      const appointmentData = {
        patient_id: formData.patientId, // Send as string (UUID) - backend will handle conversion
        // doctor_id is automatically set by backend based on authenticated user
        date_time: dateTime.toISOString(),
        end_time: endTime.toISOString(),
        type: formData.type,
        duration: formData.duration,
        notes: formData.notes,
        room: formData.room,
        priority: formData.priority,
        status: "scheduled",
      };

      const createdAppointment = await appointments.create(appointmentData);

      // Sync with Google Calendar if enabled
      if (syncWithGoogleCalendar && isAuthenticated) {
        try {
          // Get patient name for calendar sync
          const selectedPatient = patientName || 
            patientsList.find(p => p.id.toString() === formData.patientId)?.name ||
            'Paciente Desconhecido';
            
          await createEvent({
            patientName: selectedPatient,
            type: formData.type,
            dateTime: dateTime.toISOString(),
            duration: formData.duration,
            notes: formData.notes,
            dentist: formData.dentist,
          });
        } catch (calendarError) {
          console.error('Google Calendar sync failed:', calendarError);
          toast.warning('Consulta criada, mas falhou ao sincronizar com Google Calendar');
        }
      }

      toast.success("Consulta agendada com sucesso!");
      onAppointmentCreated?.();
      onClose();
      
      // Reset form
      setFormData({
        patientId: patientId || "", // Keep the original patientId if provided, otherwise reset
        date: "",
        time: "",
        type: "",
        duration: 60,
        notes: "",
        dentist: "",
        room: "",
        priority: "normal",
      });
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Erro ao agendar consulta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {patientName ? `Nova Consulta - ${patientName}` : "Nova Consulta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection - only show if no specific patient provided */}
          {!patientId && (
            <div>
              <Label htmlFor="patient">Paciente *</Label>
              <Select value={formData.patientId} onValueChange={(value) => handleChange("patientId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={patientsLoading ? "Carregando pacientes..." : "Selecione um paciente"} />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : patientsList.length === 0 ? (
                    <SelectItem value="no-patients" disabled>Nenhum paciente encontrado</SelectItem>
                  ) : (
                    patientsList.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {patient.name}
                          {patient.email && <span className="text-gray-500 text-sm">({patient.email})</span>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.patientId && <p className="text-sm text-red-600 mt-1">{errors.patientId}</p>}
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                error={errors.date}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label htmlFor="time">Horário *</Label>
              <Select value={formData.time} onValueChange={(value) => handleChange("time", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && <p className="text-sm text-red-600 mt-1">{errors.time}</p>}
            </div>
          </div>

          {/* Type and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo de Consulta *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type}</p>}
            </div>
            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Select 
                value={formData.duration.toString()} 
                onValueChange={(value) => handleChange("duration", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
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
          </div>

          {/* Professional and Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dentist">Profissional *</Label>
              <Select value={formData.dentist} onValueChange={(value) => handleChange("dentist", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((dentist) => (
                    <SelectItem key={dentist} value={dentist}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {dentist}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dentist && <p className="text-sm text-red-600 mt-1">{errors.dentist}</p>}
            </div>
            <div>
              <Label htmlFor="room">Sala/Consultório</Label>
              <Select value={formData.room} onValueChange={(value) => handleChange("room", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Consultório 1</SelectItem>
                  <SelectItem value="2">Consultório 2</SelectItem>
                  <SelectItem value="3">Consultório 3</SelectItem>
                  <SelectItem value="4">Sala de Cirurgia</SelectItem>
                  <SelectItem value="5">Sala de Raio-X</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Baixa
                  </span>
                </SelectItem>
                <SelectItem value="normal">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Normal
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Alta
                  </span>
                </SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Urgente
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Adicione observações sobre a consulta (opcional)"
              rows={3}
            />
          </div>

          {/* Google Calendar Sync */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <Label htmlFor="google-calendar-sync" className="text-sm">
                Sincronizar com Google Calendar
              </Label>
            </div>
            <Checkbox
              id="google-calendar-sync"
              checked={syncWithGoogleCalendar}
              onCheckedChange={setSyncWithGoogleCalendar}
              disabled={!isAuthenticated}
            />
          </div>
          
          {syncWithGoogleCalendar && !isAuthenticated && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Para sincronizar com Google Calendar, faça login nas configurações primeiro.
              </p>
            </div>
          )}

          {/* Summary */}
          {formData.date && formData.time && formData.type && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Resumo da Consulta</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Paciente:</strong> {patientName}</p>
                <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString("pt-BR")}</p>
                <p><strong>Horário:</strong> {formData.time}</p>
                <p><strong>Tipo:</strong> {formData.type}</p>
                <p><strong>Duração:</strong> {formData.duration} minutos</p>
                {formData.dentist && <p><strong>Profissional:</strong> {formData.dentist}</p>}
                {syncWithGoogleCalendar && isAuthenticated && (
                  <p><strong>Sincronização:</strong> ✓ Google Calendar</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Agendando..." : "Agendar Consulta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}