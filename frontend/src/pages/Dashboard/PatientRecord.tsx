import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  AlertTriangle,
  Heart,
  Pill,
  Edit,
  Plus,
  Download,
  Upload,
  Image as ImageIcon,
  Users,
  Shield,
  FileImage,
  Circle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  Activity,
} from "lucide-react";
import { ToothChart } from "@/components/ui/tooth";
import { usePatientsStore } from "@/lib/store/patients";
import type { Patient } from "@/lib/supabase";
import { EditPatientModal } from "@/components/modals/EditPatientModal";
import { NewAppointmentModal } from "@/components/modals/NewAppointmentModal";
import { NewTreatmentModal } from "@/components/modals/NewTreatmentModal";
import { ImageUploadModal } from "@/components/modals/ImageUploadModal";
import { EditMedicalHistoryModal } from "@/components/modals/EditMedicalHistoryModal";

// Mock data for appointments, treatments, and images (until backend endpoints are ready)
const mockAppointments = [
  {
    id: "1",
    date: "2024-03-20",
    time: "09:00",
    type: "Consulta de Rotina",
    status: "scheduled" as const,
    notes: "Consulta de acompanhamento",
    duration: 60,
  },
  {
    id: "2",
    date: "2024-02-15",
    time: "14:00", 
    type: "Restauração",
    status: "completed" as const,
    notes: "Restauração de resina no dente 16",
    duration: 90,
  },
];

const mockTreatments = [
  {
    id: "1",
    procedure: "Restauração de Resina Composta",
    tooth: "16",
    date: "2024-02-15",
    status: "completed" as const,
    cost: 350.0,
    notes: "Restauração classe II, sem intercorrências.",
    dentist: "Dr. Carlos Mendes",
  },
  {
    id: "2",
    procedure: "Endodontia (Tratamento de Canal)",
    tooth: "36", 
    date: "2024-03-20",
    status: "in_progress" as const,
    cost: 800.0,
    notes: "Primeira sessão realizada. Limpeza e instrumentação dos canais.",
    dentist: "Dr. Carlos Mendes",
  },
];

const mockImages = [
  {
    id: "1",
    type: "xray" as const,
    title: "Radiografia Panorâmica",
    date: "2024-01-15",
    url: "/placeholder-xray.jpg",
    notes: "Exame inicial"
  },
  {
    id: "2", 
    type: "photo" as const,
    title: "Foto Intraoral",
    date: "2024-01-15",
    url: "/placeholder-photo.jpg",
    tooth: "36",
    notes: "Antes do tratamento"
  },
];

export default function PatientRecord() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getPatient } = usePatientsStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Modal states
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewTreatmentModalOpen, setIsNewTreatmentModalOpen] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [isEditMedicalHistoryModalOpen, setIsEditMedicalHistoryModalOpen] = useState(false);

  // Handle modal callbacks
  const handlePatientUpdated = (updatedPatient: Patient) => {
    setPatient(updatedPatient);
  };

  const handleAppointmentCreated = () => {
    // Refresh appointments data when implemented
    console.log("Appointment created - refresh data");
  };

  const handleTreatmentCreated = () => {
    // Refresh treatments data when implemented
    console.log("Treatment created - refresh data");
  };

  const handleImageUploaded = () => {
    // Refresh images data when implemented
    console.log("Image uploaded - refresh data");
  };

  // Use mock data for appointments and treatments until backend endpoints are ready
  const appointments = mockAppointments;
  const treatments = mockTreatments;
  const images = mockImages;

  useEffect(() => {
    const loadPatient = async () => {
      if (!id) return;
      try {
        const patientData = await getPatient(id);
        setPatient(patientData);
      } catch (error) {
        console.error("Failed to load patient:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id, getPatient]);

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Carregando dados do paciente...
            </h3>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Paciente não encontrado
            </h3>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/patients")}
            >
              Voltar aos Pacientes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return "N/A";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "scheduled":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "planned":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "no_show":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluída";
      case "scheduled":
        return "Agendada";
      case "in_progress":
        return "Em Andamento";
      case "planned":
        return "Planejado";
      case "cancelled":
        return "Cancelada";
      case "no_show":
        return "Faltou";
      default:
        return status;
    }
  };

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: User },
    { id: "medical", label: "Histórico Médico", icon: Heart },
    { id: "dental", label: "Histórico Dental", icon: Circle },
    { id: "treatments", label: "Tratamentos", icon: Stethoscope },
    { id: "images", label: "Imagens", icon: ImageIcon },
    { id: "appointments", label: "Consultas", icon: Calendar },
  ];

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            className="gap-2 text-gray-600 hover:text-gray-900"
            onClick={() => navigate("/dashboard/patients")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Pacientes
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {patient.name}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 mt-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {patient.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {patient.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {getAge(patient.date_of_birth?.toString() || null)} anos
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Phone className="h-4 w-4" />
              Ligar
            </Button>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button className="gap-2" onClick={() => setIsEditPatientModalOpen(true)}>
              <Edit className="h-4 w-4" />
              Editar Paciente
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nome Completo</p>
                    <p className="font-medium text-gray-900">{patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{patient.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium text-gray-900">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data de Nascimento</p>
                    <p className="font-medium text-gray-900">
                      {patient.date_of_birth 
                        ? new Date(patient.date_of_birth.toString()).toLocaleDateString("pt-BR")
                        : "Não informado"
                      }
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Endereço</p>
                    <p className="font-medium text-gray-900">{patient.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CPF</p>
                    <p className="font-medium text-gray-900">{patient.cpf || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profissão</p>
                    <p className="font-medium text-gray-900">{patient.profession || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado Civil</p>
                    <p className="font-medium text-gray-900">{patient.civil_status || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gênero</p>
                    <p className="font-medium text-gray-900">{patient.gender || "Não informado"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Contato de Emergência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="font-medium text-gray-900">
                      {patient.emergency_contact || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium text-gray-900">
                      {patient.emergency_phone || "Não informado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats & Recent Activity */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Resumo Rápido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total de Consultas
                  </span>
                  <span className="font-bold text-blue-600">
                    {appointments.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tratamentos</span>
                  <span className="font-bold text-green-600">
                    {treatments.filter((t) => t.status === "completed").length}/
                    {treatments.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Última Consulta</span>
                  <span className="font-medium text-gray-900">
                    {appointments.length > 0
                      ? new Date(appointments[0].date).toLocaleDateString("pt-BR")
                      : "N/A"
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Nível de Dor</span>
                  <span className="font-bold text-red-600">
                    {patient.pain_level || 0}/10
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full gap-2 justify-start"
                  onClick={() => setIsNewAppointmentModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Nova Consulta
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-start"
                  onClick={() => setIsNewTreatmentModalOpen(true)}
                >
                  <Stethoscope className="h-4 w-4" />
                  Novo Tratamento
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-start"
                  onClick={() => setIsImageUploadModalOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Adicionar Imagem
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "medical" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Histórico Médico</h2>
            <Button 
              className="gap-2"
              onClick={() => setIsEditMedicalHistoryModalOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Editar Histórico Médico
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Medical Conditions */}
            <div className="space-y-6">
              {/* Allergies */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Alergias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patient.allergies?.split(',').map((allergy, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <Shield className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-700">
                          {allergy.trim()}
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500 italic">
                        Nenhuma alergia registrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Current Medications */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-600">
                    <Pill className="h-5 w-5" />
                    Medicamentos Atuais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patient.medications?.split(',').map((medication, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <Pill className="h-4 w-4 text-blue-600" />
                        <div>
                          <span className="font-medium text-blue-700">
                            {medication.trim()}
                          </span>
                          <p className="text-sm text-blue-600">
                            Uso contínuo
                          </p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500 italic">
                        Nenhum medicamento registrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Habits and Medical History Details */}
            <div className="space-y-6">
              {/* Habits */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Hábitos e Estilo de Vida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Fumante</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          patient.smoking
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {patient.smoking ? "Sim" : "Não"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Álcool</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          patient.alcohol
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {patient.alcohol ? "Sim" : "Não"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Bruxismo</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          patient.bruxism
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {patient.bruxism ? "Sim" : "Não"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Drogas</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          patient.drugs
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {patient.drugs ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dental" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dental History */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Histórico Dental
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Queixa Principal</p>
                  <p className="font-medium text-gray-900">
                    {patient.chief_complaint || "Nenhuma queixa"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nível de Dor (0-10)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${((patient.pain_level || 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-red-600">
                      {patient.pain_level || 0}/10
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sensibilidade</p>
                  <p className="font-medium text-gray-900">
                    {patient.sensitivity ? "Sim" : "Não"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tooth Chart */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Odontograma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <ToothChart />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add other tabs with mock data as needed */}
      {activeTab === "treatments" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Tratamentos (Mock Data)
            </h2>
            <Button 
              className="gap-2"
              onClick={() => setIsNewTreatmentModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Tratamento
            </Button>
          </div>
          <p className="text-gray-600">
            Esta seção será implementada com dados reais do backend em breve.
          </p>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Consultas (Mock Data)
            </h2>
            <Button 
              className="gap-2"
              onClick={() => setIsNewAppointmentModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
          <p className="text-gray-600">
            Esta seção será implementada com dados reais do backend em breve.
          </p>
        </div>
      )}

      {activeTab === "images" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Imagens (Mock Data)
            </h2>
            <Button 
              className="gap-2"
              onClick={() => setIsImageUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Adicionar Imagem
            </Button>
          </div>
          <p className="text-gray-600">
            Esta seção será implementada com dados reais do backend em breve.
          </p>
        </div>
      )}

      {/* Modals */}
      {patient && (
        <>
          <EditPatientModal
            isOpen={isEditPatientModalOpen}
            onClose={() => setIsEditPatientModalOpen(false)}
            patient={patient}
            onPatientUpdated={handlePatientUpdated}
          />
          
          <NewAppointmentModal
            isOpen={isNewAppointmentModalOpen}
            onClose={() => setIsNewAppointmentModalOpen(false)}
            patientId={patient.id.toString()}
            patientName={patient.name}
            onAppointmentCreated={handleAppointmentCreated}
          />
          
          <NewTreatmentModal
            isOpen={isNewTreatmentModalOpen}
            onClose={() => setIsNewTreatmentModalOpen(false)}
            patientId={patient.id.toString()}
            patientName={patient.name}
            onTreatmentCreated={handleTreatmentCreated}
          />
          
          <ImageUploadModal
            isOpen={isImageUploadModalOpen}
            onClose={() => setIsImageUploadModalOpen(false)}
            patientId={patient.id.toString()}
            patientName={patient.name}
            onImageUploaded={handleImageUploaded}
          />
          
          <EditMedicalHistoryModal
            isOpen={isEditMedicalHistoryModalOpen}
            onClose={() => setIsEditMedicalHistoryModalOpen(false)}
            patient={patient}
            onPatientUpdated={handlePatientUpdated}
          />
        </>
      )}
    </div>
  );
}