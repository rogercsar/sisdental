import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Phone,
  Mail,
  User,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Users,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { usePatientsStore } from "@/lib/store/patients";

import type { Patient } from "@/lib/supabase";

// Patient interface moved to supabase.ts

function PatientCard({
  patient,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onDelete: (patientId: string) => void;
}) {

  



  const navigate = useNavigate();

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return "N/A";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{patient.name}</h3>
              <p className="text-sm text-gray-600">
                {calculateAge(patient.date_of_birth)} anos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{patient.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{patient.phone}</span>
          </div>
          {patient.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{patient.address}</span>
            </div>
          )}
        </div>





        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => navigate(`/dashboard/patients/${patient.id}`)}
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onEdit(patient)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => onDelete(patient.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Add/Edit Patient Form Component
function PatientForm({
  isOpen,
  onClose,
  onSave,
  editingPatient,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    patient: Omit<Patient, "id" | "created_at" | "updated_at">,
    patientId?: string,
  ) => void;
  editingPatient?: Patient | null;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    medical_history: "",
    notes: "",
    cpf: "",
    emergency_contact: "",
    emergency_phone: "",
    profession: "",
    civil_status: "",
    gender: "",
    allergies: "",
    medications: "",
    diseases: "",
    surgeries: "",
    family_history: "",
    last_cleaning_date: "",
    orthodontic_treatment: false,
    previous_dentist: "",
    chief_complaint: "",
    pain_level: 0,
    sensitivity: false,
    insurance_provider: "",
    insurance_number: "",
    insurance_coverage: "",
    insurance_expiration: "",
    smoking: false,
    alcohol: false,
    drugs: false,
    bruxism: false,
  });

  // Populate form when editing
  useEffect(() => {
    if (editingPatient) {
      setFormData({
        name: editingPatient.name || "",
        email: editingPatient.email || "",
        phone: editingPatient.phone || "",
        date_of_birth: editingPatient.date_of_birth || "",
        address: editingPatient.address || "",
        medical_history: editingPatient.medical_history || "",
        notes: editingPatient.notes || "",
        cpf: editingPatient.cpf || "",
        emergency_contact: editingPatient.emergency_contact || "",
        emergency_phone: editingPatient.emergency_phone || "",
        profession: editingPatient.profession || "",
        civil_status: editingPatient.civil_status || "",
        gender: editingPatient.gender || "",
        allergies: editingPatient.allergies || "",
        medications: editingPatient.medications || "",
        diseases: editingPatient.diseases || "",
        surgeries: editingPatient.surgeries || "",
        family_history: editingPatient.family_history || "",
        last_cleaning_date: editingPatient.last_cleaning_date || "",
        orthodontic_treatment: editingPatient.orthodontic_treatment || false,
        previous_dentist: editingPatient.previous_dentist || "",
        chief_complaint: editingPatient.chief_complaint || "",
        pain_level: editingPatient.pain_level || 0,
        sensitivity: editingPatient.sensitivity || false,
        insurance_provider: editingPatient.insurance_provider || "",
        insurance_number: editingPatient.insurance_number || "",
        insurance_coverage: editingPatient.insurance_coverage || "",
        insurance_expiration: editingPatient.insurance_expiration || "",
        smoking: editingPatient.smoking || false,
        alcohol: editingPatient.alcohol || false,
        drugs: editingPatient.drugs || false,
        bruxism: editingPatient.bruxism || false,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        address: "",
        medical_history: "",
        notes: "",
        cpf: "",
        emergency_contact: "",
        emergency_phone: "",
        profession: "",
        civil_status: "",
        gender: "",
        allergies: "",
        medications: "",
        diseases: "",
        surgeries: "",
        family_history: "",
        last_cleaning_date: null,
        orthodontic_treatment: false,
        previous_dentist: "",
        chief_complaint: "",
        pain_level: 0,
        sensitivity: false,
        insurance_provider: "",
        insurance_number: "",
        insurance_coverage: "",
        insurance_expiration: null,
        smoking: false,
        alcohol: false,
        drugs: false,
        bruxism: false,
      });
    }
  }, [editingPatient]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.phone.trim()) newErrors.phone = "Telefone é obrigatório";
    if (!formData.date_of_birth)
      newErrors.date_of_birth = "Data de nascimento é obrigatória";
    if (!formData.address.trim()) newErrors.address = "Endereço é obrigatório";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData, editingPatient?.id);
      if (!editingPatient) {
        setFormData({
          name: "",
          email: "",
          phone: "",
          date_of_birth: "",
          address: "",
          medical_history: "",
          notes: "",
          cpf: "",
          emergency_contact: "",
          emergency_phone: "",
          profession: "",
          civil_status: "",
          gender: "",
          allergies: "",
          medications: "",
          diseases: "",
          surgeries: "",
          family_history: "",
          last_cleaning_date: "",
          orthodontic_treatment: false,
          previous_dentist: "",
          chief_complaint: "",
          pain_level: 0,
          sensitivity: false,
          insurance_provider: "",
          insurance_number: "",
          insurance_coverage: "",
          insurance_expiration: "",
          smoking: false,
          alcohol: false,
          drugs: false,
          bruxism: false,
        });
      }
      setErrors({});
      onClose();
    }
  };

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

    // Handle boolean conversions for checkboxes
    if (typeof value === "string" && (value === "true" || value === "false")) {
      processedValue = value === "true";
    }

    // Handle numeric conversions
    if (field === "pain_level" && typeof value === "string") {
      processedValue = parseInt(value) || 0;
    }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingPatient ? "Editar Paciente" : "Cadastrar Novo Paciente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="Ex: Maria Silva"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    handleChange("date_of_birth", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.date_of_birth ? "border-red-300" : "border-gray-200"
                  }`}
                />
                {errors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.date_of_birth}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="maria@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="(11) 99999-9999"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="Rua das Flores, 123, Centro - São Paulo, SP"
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profissão
                </label>
                <input
                  type="text"
                  value={formData.profession}
                  onChange={(e) => handleChange("profession", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Engenheiro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado Civil
                </label>
                <select
                  value={formData.civil_status}
                  onChange={(e) => handleChange("civil_status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União Estável</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gênero
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outros">Outros</option>
                  <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Contato de Emergência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    handleChange("emergency_contact", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone de Emergência
                </label>
                <input
                  type="tel"
                  value={formData.emergency_phone}
                  onChange={(e) =>
                    handleChange("emergency_phone", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informações Médicas
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Histórico Médico
                </label>
                <textarea
                  value={formData.medical_history}
                  onChange={(e) =>
                    handleChange("medical_history", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva condições médicas relevantes, cirurgias anteriores, etc."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alergias
                  </label>
                  <textarea
                    value={formData.allergies}
                    onChange={(e) => handleChange("allergies", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Liste alergias conhecidas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medicamentos Atuais
                  </label>
                  <textarea
                    value={formData.medications}
                    onChange={(e) =>
                      handleChange("medications", e.target.value)
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Liste medicamentos em uso"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doenças
                  </label>
                  <textarea
                    value={formData.diseases}
                    onChange={(e) => handleChange("diseases", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Liste doenças conhecidas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cirurgias
                  </label>
                  <textarea
                    value={formData.surgeries}
                    onChange={(e) => handleChange("surgeries", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Liste cirurgias realizadas"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Histórico Familiar
                </label>
                <textarea
                  value={formData.family_history}
                  onChange={(e) =>
                    handleChange("family_history", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o histórico médico familiar relevante"
                />
              </div>
            </div>
          </div>

          {/* Dental History */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Histórico Odontológico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Última Limpeza
                </label>
                <input
                  type="date"
                  value={formData.last_cleaning_date}
                  onChange={(e) =>
                    handleChange("last_cleaning_date", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dentista Anterior
                </label>
                <input
                  type="text"
                  value={formData.previous_dentist}
                  onChange={(e) =>
                    handleChange("previous_dentist", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do dentista anterior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queixa Principal
                </label>
                <textarea
                  value={formData.chief_complaint}
                  onChange={(e) =>
                    handleChange("chief_complaint", e.target.value)
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva a queixa principal do paciente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nível de Dor (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={(e) => handleChange("pain_level", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.orthodontic_treatment}
                  onChange={(e) =>
                    handleChange("orthodontic_treatment", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Tratamento Ortodôntico
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.sensitivity}
                  onChange={(e) =>
                    handleChange("sensitivity", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Sensibilidade Dentária
                </label>
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informações do Convênio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operadora do Convênio
                </label>
                <input
                  type="text"
                  value={formData.insurance_provider}
                  onChange={(e) =>
                    handleChange("insurance_provider", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Unimed, Bradesco Saúde"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Carteirinha
                </label>
                <input
                  type="text"
                  value={formData.insurance_number}
                  onChange={(e) =>
                    handleChange("insurance_number", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número do cartão do convênio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cobertura
                </label>
                <input
                  type="text"
                  value={formData.insurance_coverage}
                  onChange={(e) =>
                    handleChange("insurance_coverage", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tipo de cobertura"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Expiração
                </label>
                <input
                  type="date"
                  value={formData.insurance_expiration}
                  onChange={(e) =>
                    handleChange("insurance_expiration", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Habits */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hábitos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.smoking}
                  onChange={(e) => handleChange("smoking", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Fumante
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.alcohol}
                  onChange={(e) => handleChange("alcohol", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Consumo de Álcool
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.drugs}
                  onChange={(e) => handleChange("drugs", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Uso de Drogas
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.bruxism}
                  onChange={(e) => handleChange("bruxism", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Bruxismo
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Observações Adicionais
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adicione observações adicionais sobre o paciente..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              {editingPatient ? "Atualizar Paciente" : "Salvar Paciente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Patients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const {
    patients: patientList,
    searchResults,
    isLoading: loading,
    isSearching,
    error,
    fetchPatients,
    searchPatients,
    clearSearch,
    createPatient,
    updatePatient,
    deletePatient,
    clearError,
  } = usePatientsStore();


  // Use search results when searching, otherwise use regular patient list
  const displayedPatients = searchTerm.trim() !== "" ? searchResults : patientList;
  const isCurrentlySearching = searchTerm.trim() !== "" && isSearching;

  // fetchPatients is now handled by the store

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() !== "") {
        searchPatients(searchTerm);
      } else {
        clearSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchPatients, clearSearch]);

  const handleSavePatient = async (
    patientData: Omit<Patient, "id" | "created_at" | "updated_at">,
    patientId?: string,
  ) => {
    try {
      if (patientId) {
        // Update existing patient
        await updatePatient(patientId, patientData);
      } else {
        // Create new patient
        await createPatient(patientData);
      }
      setEditingPatient(null);
    } catch (err) {
      // Error is handled by the store
      console.error("Failed to save patient:", err);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setShowPatientForm(true);
  };

  const handleDeletePatient = async (patientId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      try {
        await deletePatient(patientId);
      } catch (err) {
        // Error is handled by the store
        console.error("Failed to delete patient:", err);
      }
    }
  };

  const handleCloseForm = () => {
    setShowPatientForm(false);
    setEditingPatient(null);
    clearError();
  };

  const stats = {
    total: displayedPatients.length,
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-gray-600 mt-1">
              Gerencie todos os seus pacientes em um só lugar
            </p>
          </div>
          <Button onClick={() => setShowPatientForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total de Pacientes
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>






      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pacientes por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
      {(loading || isCurrentlySearching) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isCurrentlySearching ? "Buscando pacientes..." : "Carregando pacientes..."}
            </h3>
          </CardContent>
        </Card>
      )}

      {/* Patients Grid */}
      {!loading && !isCurrentlySearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onEdit={handleEditPatient}
              onDelete={handleDeletePatient}
            />
          ))}
        </div>
      )}

      {!loading && !isCurrentlySearching && displayedPatients.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum paciente encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm.trim() !== ""
                ? `Nenhum resultado encontrado para "${searchTerm}". Tente outro termo de busca.`
                : "Comece adicionando seu primeiro paciente."}
            </p>
            <Button onClick={() => setShowPatientForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Paciente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Patient Form Modal */}
      <PatientForm
        isOpen={showPatientForm}
        onClose={handleCloseForm}
        onSave={handleSavePatient}
        editingPatient={editingPatient}
      />
    </div>
  );
}
