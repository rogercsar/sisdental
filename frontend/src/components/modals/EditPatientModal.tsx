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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { usePatientsStore } from "@/lib/store/patients";
import type { Patient } from "@/lib/supabase";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onPatientUpdated: (patient: Patient) => void;
}

export function EditPatientModal({
  isOpen,
  onClose,
  patient,
  onPatientUpdated,
}: EditPatientModalProps) {
  const { updatePatient, isLoading } = usePatientsStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    cpf: "",
    profession: "",
    civil_status: "",
    gender: "",
    emergency_contact: "",
    emergency_phone: "",
    insurance_provider: "",
    insurance_number: "",
    insurance_coverage: "",
    insurance_expiration: "",
    allergies: "",
    medications: "",
    diseases: "",
    surgeries: "",
    family_history: "",
    chief_complaint: "",
    pain_level: 0,
    smoking: false,
    alcohol: false,
    bruxism: false,
    drugs: false,
    sensitivity: false,
    orthodontic_treatment: false,
    last_cleaning_date: "",
    previous_dentist: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (patient && isOpen) {
      setFormData({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        address: patient.address || "",
        date_of_birth: patient.date_of_birth
          ? new Date(patient.date_of_birth.toString()).toISOString().split("T")[0]
          : "",
        cpf: patient.cpf || "",
        profession: patient.profession || "",
        civil_status: patient.civil_status || "",
        gender: patient.gender || "",
        emergency_contact: patient.emergency_contact || "",
        emergency_phone: patient.emergency_phone || "",
        insurance_provider: patient.insurance_provider || "",
        insurance_number: patient.insurance_number || "",
        insurance_coverage: patient.insurance_coverage || "",
        insurance_expiration: patient.insurance_expiration
          ? new Date(patient.insurance_expiration.toString()).toISOString().split("T")[0]
          : "",
        allergies: patient.allergies || "",
        medications: patient.medications || "",
        diseases: patient.diseases || "",
        surgeries: patient.surgeries || "",
        family_history: patient.family_history || "",
        chief_complaint: patient.chief_complaint || "",
        pain_level: patient.pain_level || 0,
        smoking: patient.smoking || false,
        alcohol: patient.alcohol || false,
        bruxism: patient.bruxism || false,
        drugs: patient.drugs || false,
        sensitivity: patient.sensitivity || false,
        orthodontic_treatment: patient.orthodontic_treatment || false,
        last_cleaning_date: patient.last_cleaning_date
          ? new Date(patient.last_cleaning_date.toString()).toISOString().split("T")[0]
          : "",
        previous_dentist: patient.previous_dentist || "",
      });
    }
  }, [patient, isOpen]);

  // Helper functions for input masks
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
        .replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
        .replace(/^(\d{2})(\d{4})/, "($1) $2")
        .replace(/^(\d{2})/, "($1)");
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        .replace(/^(\d{3})(\d{3})(\d{3})/, "$1.$2.$3")
        .replace(/^(\d{3})(\d{3})/, "$1.$2")
        .replace(/^(\d{3})/, "$1");
    }
    return value;
  };

  const handleChange = (field: string, value: string | boolean | number) => {
    let processedValue = value;

    // Apply input masks
    if (typeof value === "string") {
      if (field === "phone" || field === "emergency_phone") {
        processedValue = formatPhone(value);
      } else if (field === "cpf") {
        processedValue = formatCPF(value);
      }
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Endereço é obrigatório";
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

    try {
      const updateData = {
        ...formData,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : null,
        insurance_expiration: formData.insurance_expiration 
          ? new Date(formData.insurance_expiration) 
          : null,
        last_cleaning_date: formData.last_cleaning_date 
          ? new Date(formData.last_cleaning_date) 
          : null,
      };

      const updatedPatient = await updatePatient(patient.id, updateData);
      onPatientUpdated(updatedPatient);
      toast.success("Paciente atualizado com sucesso!");
      onClose();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Erro ao atualizar paciente");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  error={errors.name}
                  placeholder="Nome completo do paciente"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  error={errors.email}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  error={errors.phone}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gênero</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleChange("profession", e.target.value)}
                  placeholder="Profissão do paciente"
                />
              </div>
              <div>
                <Label htmlFor="civil_status">Estado Civil</Label>
                <Select value={formData.civil_status} onValueChange={(value) => handleChange("civil_status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado civil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Solteiro(a)</SelectItem>
                    <SelectItem value="married">Casado(a)</SelectItem>
                    <SelectItem value="divorced">Divorciado(a)</SelectItem>
                    <SelectItem value="widowed">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="address">Endereço *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                error={errors.address}
                placeholder="Endereço completo"
                rows={2}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Contato de Emergência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Nome do Contato</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleChange("emergency_contact", e.target.value)}
                  placeholder="Nome do contato de emergência"
                />
              </div>
              <div>
                <Label htmlFor="emergency_phone">Telefone de Emergência</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => handleChange("emergency_phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Informações Médicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                  placeholder="Liste as alergias separadas por vírgula"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="medications">Medicamentos</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleChange("medications", e.target.value)}
                  placeholder="Liste os medicamentos separados por vírgula"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="diseases">Doenças</Label>
                <Textarea
                  id="diseases"
                  value={formData.diseases}
                  onChange={(e) => handleChange("diseases", e.target.value)}
                  placeholder="Liste as doenças separadas por vírgula"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="family_history">Histórico Familiar</Label>
                <Textarea
                  id="family_history"
                  value={formData.family_history}
                  onChange={(e) => handleChange("family_history", e.target.value)}
                  placeholder="Histórico médico familiar"
                  rows={2}
                />
              </div>
            </div>

            {/* Habits */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Hábitos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smoking"
                    checked={formData.smoking}
                    onCheckedChange={(checked) => handleChange("smoking", checked)}
                  />
                  <Label htmlFor="smoking">Fumante</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="alcohol"
                    checked={formData.alcohol}
                    onCheckedChange={(checked) => handleChange("alcohol", checked)}
                  />
                  <Label htmlFor="alcohol">Álcool</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bruxism"
                    checked={formData.bruxism}
                    onCheckedChange={(checked) => handleChange("bruxism", checked)}
                  />
                  <Label htmlFor="bruxism">Bruxismo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="drugs"
                    checked={formData.drugs}
                    onCheckedChange={(checked) => handleChange("drugs", checked)}
                  />
                  <Label htmlFor="drugs">Drogas</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Dental Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Informações Dentárias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chief_complaint">Queixa Principal</Label>
                <Textarea
                  id="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={(e) => handleChange("chief_complaint", e.target.value)}
                  placeholder="Descreva a queixa principal do paciente"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="pain_level">Nível de Dor (0-10)</Label>
                <Select value={formData.pain_level.toString()} onValueChange={(value) => handleChange("pain_level", parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível de dor" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i} - {i === 0 ? "Sem dor" : i <= 3 ? "Dor leve" : i <= 6 ? "Dor moderada" : "Dor intensa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="previous_dentist">Dentista Anterior</Label>
                <Input
                  id="previous_dentist"
                  value={formData.previous_dentist}
                  onChange={(e) => handleChange("previous_dentist", e.target.value)}
                  placeholder="Nome do dentista anterior"
                />
              </div>
              <div>
                <Label htmlFor="last_cleaning_date">Última Limpeza</Label>
                <Input
                  id="last_cleaning_date"
                  type="date"
                  value={formData.last_cleaning_date}
                  onChange={(e) => handleChange("last_cleaning_date", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sensitivity"
                  checked={formData.sensitivity}
                  onCheckedChange={(checked) => handleChange("sensitivity", checked)}
                />
                <Label htmlFor="sensitivity">Sensibilidade Dental</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="orthodontic_treatment"
                  checked={formData.orthodontic_treatment}
                  onCheckedChange={(checked) => handleChange("orthodontic_treatment", checked)}
                />
                <Label htmlFor="orthodontic_treatment">Tratamento Ortodôntico</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}