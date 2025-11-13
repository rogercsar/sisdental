import { useState } from "react";
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
import { Stethoscope, DollarSign, User, Calendar, FileText, Zap } from "lucide-react";
import { treatments } from "@/lib/api/client";

interface NewTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onTreatmentCreated?: () => void;
}

export function NewTreatmentModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onTreatmentCreated,
}: NewTreatmentModalProps) {
  const [formData, setFormData] = useState({
    procedure: "",
    tooth: "",
    date: "",
    status: "planned",
    cost: "",
    sessions: 1,
    completed_sessions: 0,
    next_session_date: "",
    dentist: "",
    notes: "",
    priority: "normal",
    materials: "",
    estimated_duration: 60,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const procedures = [
    "Restauração de Resina",
    "Restauração de Amálgama",
    "Endodontia (Canal)",
    "Extração Simples",
    "Extração Cirúrgica",
    "Limpeza Dental",
    "Aplicação de Flúor",
    "Clareamento Dental",
    "Implante Dentário",
    "Prótese Parcial",
    "Prótese Total",
    "Coroa Protética",
    "Faceta de Porcelana",
    "Ortodontia",
    "Aparelho Ortodôntico",
    "Cirurgia Periodontal",
    "Raspagem e Alisamento",
    "Gengivectomia",
    "Enxerto Gengival",
    "Tratamento de ATM",
    "Placa de Bruxismo",
    "Radiografia",
    "Tomografia",
    "Biopsia",
    "Outros",
  ];

  const teeth = [
    // Adult teeth numbering
    ...Array.from({ length: 16 }, (_, i) => `${i + 11}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 21}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 31}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 41}`),
    "Todos",
    "Arcada Superior",
    "Arcada Inferior",
    "Quadrante 1",
    "Quadrante 2",
    "Quadrante 3",
    "Quadrante 4",
  ];

  const dentists = [
    "Dr. Carlos Mendes",
    "Dra. Ana Costa",
    "Dr. João Silva",
    "Dra. Maria Santos",
    "Dr. Pedro Oliveira",
  ];

  const statusOptions = [
    { value: "planned", label: "Planejado", color: "text-orange-600" },
    { value: "in_progress", label: "Em Andamento", color: "text-blue-600" },
    { value: "completed", label: "Concluído", color: "text-green-600" },
    { value: "cancelled", label: "Cancelado", color: "text-red-600" },
    { value: "paused", label: "Pausado", color: "text-gray-600" },
  ];

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Auto-set completed_sessions to 0 if status is planned
    if (field === "status" && value === "planned") {
      setFormData((prev) => ({ ...prev, completed_sessions: 0 }));
    }

    // Auto-set completed_sessions to sessions if status is completed
    if (field === "status" && value === "completed") {
      setFormData((prev) => ({ ...prev, completed_sessions: prev.sessions }));
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/\D/g, "");
    
    // Format as currency
    if (numericValue) {
      const number = parseFloat(numericValue) / 100;
      return number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return "";
  };

  const handleCostChange = (value: string) => {
    const formatted = formatCurrency(value);
    setFormData((prev) => ({ ...prev, cost: formatted }));
    if (errors.cost) {
      setErrors((prev) => ({ ...prev, cost: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.procedure) {
      newErrors.procedure = "Procedimento é obrigatório";
    }
    if (!formData.tooth) {
      newErrors.tooth = "Dente é obrigatório";
    }
    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }
    if (!formData.cost) {
      newErrors.cost = "Custo é obrigatório";
    }
    if (!formData.dentist) {
      newErrors.dentist = "Profissional é obrigatório";
    }
    if (formData.sessions < 1) {
      newErrors.sessions = "Número de sessões deve ser maior que 0";
    }
    if (formData.completed_sessions > formData.sessions) {
      newErrors.completed_sessions = "Sessões concluídas não pode ser maior que o total";
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
      // Convert cost back to number
      const costNumber = parseFloat(formData.cost.replace(/\./g, "").replace(",", "."));

      // Create treatment data matching the backend model
      const treatmentData = {
        price: costNumber,
        teeth_number: formData.tooth,
        treatment_type: formData.procedure,
        status: formData.status,
        next_session: formData.next_session_date ? new Date(formData.next_session_date).toISOString() : new Date().toISOString(),
        observations: formData.notes,
        date_of_treatment: new Date(formData.date).toISOString(),
      };

      await treatments.create(patientId, treatmentData);

      toast.success("Tratamento criado com sucesso!");
      onTreatmentCreated?.();
      onClose();
      
      // Reset form
      setFormData({
        procedure: "",
        tooth: "",
        date: "",
        status: "planned",
        cost: "",
        sessions: 1,
        completed_sessions: 0,
        next_session_date: "",
        dentist: "",
        notes: "",
        priority: "normal",
        materials: "",
        estimated_duration: 60,
      });
    } catch (error) {
      console.error("Error creating treatment:", error);
      toast.error("Erro ao criar tratamento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Novo Tratamento - {patientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="procedure">Procedimento *</Label>
                <Select value={formData.procedure} onValueChange={(value) => handleChange("procedure", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.map((procedure) => (
                      <SelectItem key={procedure} value={procedure}>
                        {procedure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.procedure && <p className="text-sm text-red-600 mt-1">{errors.procedure}</p>}
              </div>
              <div>
                <Label htmlFor="tooth">Dente/Região *</Label>
                <Select value={formData.tooth} onValueChange={(value) => handleChange("tooth", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dente" />
                  </SelectTrigger>
                  <SelectContent>
                    {teeth.map((tooth) => (
                      <SelectItem key={tooth} value={tooth}>
                        {tooth}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tooth && <p className="text-sm text-red-600 mt-1">{errors.tooth}</p>}
              </div>
            </div>
          </div>

          {/* Date and Professional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data do Tratamento *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                error={errors.date}
              />
            </div>
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
          </div>

          {/* Status and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custo *
              </Label>
              <Input
                id="cost"
                value={formData.cost}
                onChange={(e) => handleCostChange(e.target.value)}
                error={errors.cost}
                placeholder="0,00"
                prefix="R$"
              />
            </div>
          </div>

          {/* Sessions and Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Planejamento de Sessões</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sessions">Total de Sessões</Label>
                <Select 
                  value={formData.sessions.toString()} 
                  onValueChange={(value) => handleChange("sessions", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Número de sessões" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(10)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} {i === 0 ? "sessão" : "sessões"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sessions && <p className="text-sm text-red-600 mt-1">{errors.sessions}</p>}
              </div>
              <div>
                <Label htmlFor="completed_sessions">Sessões Concluídas</Label>
                <Select 
                  value={formData.completed_sessions.toString()} 
                  onValueChange={(value) => handleChange("completed_sessions", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sessões concluídas" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(formData.sessions + 1)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i} {i === 1 ? "sessão" : "sessões"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.completed_sessions && <p className="text-sm text-red-600 mt-1">{errors.completed_sessions}</p>}
              </div>
              <div>
                <Label htmlFor="estimated_duration">Duração Estimada (min)</Label>
                <Select 
                  value={formData.estimated_duration.toString()} 
                  onValueChange={(value) => handleChange("estimated_duration", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="180">3 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === "in_progress" && formData.completed_sessions < formData.sessions && (
              <div>
                <Label htmlFor="next_session_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Próxima Sessão
                </Label>
                <Input
                  id="next_session_date"
                  type="date"
                  value={formData.next_session_date}
                  onChange={(e) => handleChange("next_session_date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informações Adicionais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Prioridade
                </Label>
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
              <div>
                <Label htmlFor="materials">Materiais Utilizados</Label>
                <Input
                  id="materials"
                  value={formData.materials}
                  onChange={(e) => handleChange("materials", e.target.value)}
                  placeholder="Ex: Resina composta, anestésico..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações e Notas Clínicas
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Descreva o procedimento, condições encontradas, reações do paciente, etc."
                rows={4}
              />
            </div>
          </div>

          {/* Progress Indicator */}
          {formData.sessions > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Progresso do Tratamento</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-blue-700 mb-1">
                    <span>Sessões: {formData.completed_sessions}/{formData.sessions}</span>
                    <span>{Math.round((formData.completed_sessions / formData.sessions) * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="h-2 bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${(formData.completed_sessions / formData.sessions) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-900">
                    R$ {formData.cost || "0,00"}
                  </p>
                  <p className="text-sm text-blue-700">
                    {formData.estimated_duration}min por sessão
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Criar Tratamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}