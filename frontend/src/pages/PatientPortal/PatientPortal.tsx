import { useState } from "react";
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
  Calendar,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Signature,
  CalendarPlus,
  DollarSign,
  Edit
} from "lucide-react";

// Interface definitions
interface PatientInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  memberSince: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  dentist: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  canCancel: boolean;
  canReschedule: boolean;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description: string;
  treatments: Treatment[];
  totalCost: number;
  estimatedDuration: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed';
  createdDate: string;
  dentist: string;
}

interface Treatment {
  id: string;
  name: string;
  description: string;
  cost: number;
  sessions: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface ConsentForm {
  id: string;
  title: string;
  description: string;
  required: boolean;
  signed: boolean;
  signedDate?: string;
  documentUrl: string;
}

interface PaymentHistory {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: string;
  status: 'paid' | 'pending' | 'overdue';
  receiptUrl?: string;
}

// Mock data
const mockPatient: PatientInfo = {
  id: "1",
  name: "Maria Silva",
  email: "maria.silva@email.com",
  phone: "(11) 99999-9999",
  memberSince: "2023-01-15"
};

const mockAppointments: Appointment[] = [
  {
    id: "1",
    date: "2024-02-20",
    time: "14:00",
    type: "Limpeza Dental",
    dentist: "Dr. Carlos Mendes",
    status: "scheduled",
    canCancel: true,
    canReschedule: true
  },
  {
    id: "2",
    date: "2024-01-15",
    time: "09:00",
    type: "Restauração",
    dentist: "Dra. Ana Costa",
    status: "completed",
    canCancel: false,
    canReschedule: false
  }
];

const mockTreatmentPlans: TreatmentPlan[] = [
  {
    id: "1",
    title: "Plano de Tratamento Ortodôntico",
    description: "Correção do alinhamento dental com aparelho fixo",
    treatments: [
      {
        id: "1",
        name: "Documentação Ortodôntica",
        description: "Radiografias e moldagem",
        cost: 350,
        sessions: 1,
        priority: "high",
        completed: true
      },
      {
        id: "2",
        name: "Instalação do Aparelho",
        description: "Colocação do aparelho fixo",
        cost: 1200,
        sessions: 1,
        priority: "high",
        completed: false
      },
      {
        id: "3",
        name: "Manutenções Mensais",
        description: "Ajustes e troca de elásticos",
        cost: 150,
        sessions: 24,
        priority: "medium",
        completed: false
      }
    ],
    totalCost: 5250,
    estimatedDuration: "24 meses",
    status: "pending",
    createdDate: "2024-01-10",
    dentist: "Dr. Carlos Mendes"
  }
];

const mockConsentForms: ConsentForm[] = [
  {
    id: "1",
    title: "Termo de Consentimento para Tratamento Ortodôntico",
    description: "Autorização para realização do tratamento ortodôntico",
    required: true,
    signed: false,
    documentUrl: "/forms/orthodontic-consent.pdf"
  },
  {
    id: "2",
    title: "Autorização para Compartilhamento de Imagens",
    description: "Permissão para uso de fotos antes/depois do tratamento",
    required: false,
    signed: true,
    signedDate: "2024-01-15",
    documentUrl: "/forms/image-consent.pdf"
  }
];

const mockPayments: PaymentHistory[] = [
  {
    id: "1",
    date: "2024-01-15",
    description: "Consulta Inicial + Documentação",
    amount: 350,
    method: "Cartão de Crédito",
    status: "paid",
    receiptUrl: "/receipts/001.pdf"
  },
  {
    id: "2",
    date: "2024-02-15",
    description: "Mensalidade do Tratamento",
    amount: 150,
    method: "PIX",
    status: "pending"
  }
];

// Components
function AppointmentBooking() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [notes, setNotes] = useState("");

  const availableTimes = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ];

  const treatmentTypes = [
    "Consulta de Rotina",
    "Limpeza Dental",
    "Restauração",
    "Canal",
    "Extração",
    "Ortodontia",
    "Implante"
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Agendar Consulta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Nova Consulta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Consulta
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {treatmentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Preferida
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horário Preferido
            </label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva seus sintomas ou preocupações..."
            />
          </div>
          <Button className="w-full">
            Solicitar Agendamento
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Sua solicitação será analisada e você receberá uma confirmação em até 24 horas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TreatmentPlanCard({ plan }: { plan: TreatmentPlan }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando Aprovação';
      case 'approved': return 'Aprovado';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{plan.title}</CardTitle>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
            {getStatusText(plan.status)}
          </span>
        </div>
        <p className="text-gray-600">{plan.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Custo Total</p>
            <p className="text-lg font-bold text-gray-900">
              R$ {plan.totalCost.toLocaleString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duração Estimada</p>
            <p className="text-lg font-bold text-gray-900">{plan.estimatedDuration}</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-gray-900">Tratamentos Inclusos:</h4>
          {plan.treatments.map(treatment => (
            <div key={treatment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {treatment.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{treatment.name}</p>
                  <p className="text-sm text-gray-600">{treatment.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  R$ {treatment.cost.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">{treatment.sessions}x sessões</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {plan.status === 'pending' && (
            <>
              <Button variant="outline" className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Recusar
              </Button>
              <Button className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}
          {plan.status === 'approved' && (
            <Button className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Fazer Pagamento
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsentFormCard({ form }: { form: ConsentForm }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{form.title}</h3>
              {form.required && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  Obrigatório
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{form.description}</p>
            {form.signed && form.signedDate && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Assinado em {new Date(form.signedDate).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {form.signed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2">
            <Eye className="h-4 w-4" />
            Visualizar
          </Button>
          {!form.signed && (
            <Button className="flex-1 gap-2">
              <Signature className="h-4 w-4" />
              Assinar
            </Button>
          )}
          {form.signed && (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Baixar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "Painel", icon: User },
    { id: "appointments", label: "Consultas", icon: Calendar },
    { id: "treatments", label: "Planos", icon: FileText },
    { id: "documents", label: "Documentos", icon: Signature },
    { id: "payments", label: "Pagamentos", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Portal do Paciente</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Olá, {mockPatient.name}</span>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
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
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Bem-vindo, {mockPatient.name}!</h2>
                    <p className="text-gray-600">Paciente desde {new Date(mockPatient.memberSince).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <AppointmentBooking />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Próxima Consulta</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mockAppointments.find(apt => apt.status === 'scheduled') ? '20/02' : 'Nenhuma'}
                      </p>
                      <p className="text-xs text-blue-600">
                        {mockAppointments.find(apt => apt.status === 'scheduled')?.time || 'Agendar nova'}
                      </p>
                    </div>
                    <Calendar className="h-12 w-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Planos Pendentes</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mockTreatmentPlans.filter(plan => plan.status === 'pending').length}
                      </p>
                      <p className="text-xs text-yellow-600">Aguardando aprovação</p>
                    </div>
                    <FileText className="h-12 w-12 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Documentos Pendentes</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mockConsentForms.filter(form => !form.signed).length}
                      </p>
                      <p className="text-xs text-red-600">Requer assinatura</p>
                    </div>
                    <Signature className="h-12 w-12 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Consulta concluída</p>
                      <p className="text-sm text-gray-600">Restauração no dente 36 - 15/01/2024</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Consulta agendada</p>
                      <p className="text-sm text-gray-600">Limpeza dental - 20/02/2024 às 14:00</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Novo plano de tratamento</p>
                      <p className="text-sm text-gray-600">Plano ortodôntico criado - Aguardando aprovação</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Minhas Consultas</h2>
              <AppointmentBooking />
            </div>

            <div className="space-y-4">
              {mockAppointments.map(appointment => (
                <Card key={appointment.id} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{appointment.type}</h3>
                          <p className="text-gray-600">com {appointment.dentist}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(appointment.date).toLocaleDateString('pt-BR')} às {appointment.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {appointment.status === 'scheduled' ? 'Agendado' :
                           appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                        {appointment.canReschedule && (
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {appointment.canCancel && (
                          <Button variant="outline" size="sm" className="text-red-600">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "treatments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Planos de Tratamento</h2>
            <div className="space-y-6">
              {mockTreatmentPlans.map(plan => (
                <TreatmentPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Documentos e Termos</h2>
            <div className="space-y-4">
              {mockConsentForms.map(form => (
                <ConsentFormCard key={form.id} form={form} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Histórico de Pagamentos</h2>
            <div className="space-y-4">
              {mockPayments.map(payment => (
                <Card key={payment.id} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{payment.description}</h3>
                          <p className="text-gray-600">
                            {new Date(payment.date).toLocaleDateString('pt-BR')} • {payment.method}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            R$ {payment.amount.toLocaleString('pt-BR')}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {payment.status === 'paid' ? 'Pago' :
                             payment.status === 'pending' ? 'Pendente' : 'Vencido'}
                          </span>
                        </div>
                        {payment.receiptUrl && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {payment.status === 'pending' && (
                          <Button variant="success" size="sm">
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}