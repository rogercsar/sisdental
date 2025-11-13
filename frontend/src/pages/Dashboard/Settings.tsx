import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings as SettingsIcon,
  Building2,
  User,
  Bell,
  Shield,
  Database,
  Clock,
  Camera,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  Edit,
  AlertTriangle,
  CheckCircle,
  Key,
  Monitor,
} from "lucide-react";
import { GoogleCalendarSettings } from "@/components/settings/GoogleCalendarSettings";
import { settings } from "@/lib/api/client";

// Define local settings type (used for UI state)
interface LocalSettings {
  clinic: {
    name: string;
    cnpj: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    description: string;
    specialties: string[];
    workingHours: {
      monday: { start: string; end: string; closed: boolean };
      tuesday: { start: string; end: string; closed: boolean };
      wednesday: { start: string; end: string; closed: boolean };
      thursday: { start: string; end: string; closed: boolean };
      friday: { start: string; end: string; closed: boolean };
      saturday: { start: string; end: string; closed: boolean };
      sunday: { start: string; end: string; closed: boolean };
    };
  };
  user: {
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar: string;
    timezone: string;
    language: string;
    lastLogin: string;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    appointmentReminders: boolean;
    paymentAlerts: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
    reminderTime: number; // hours before appointment
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number; // minutes
    passwordExpiry: number; // days
    loginAttempts: number;
    ipWhitelist: string[];
    auditLog: boolean;
  };
  system: {
    theme: "light" | "dark" | "auto";
    currency: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
    language: string;
    timezone: string;
    autoBackup: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
    soundEnabled: boolean;
  };
}

// Minimal backend settings types (shape we use from API)
interface BackendClinicSettings {
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  logo_url?: string;
  business_hours?: LocalSettings["clinic"]["workingHours"];
  appointment_duration?: number;
  buffer_time?: number;
  max_advance_booking?: number;
}


const defaultSettings: LocalSettings = {
  clinic: {
    name: "Clínica Dental Sorriso",
    cnpj: "12.345.678/0001-90",
    address: "Rua das Flores, 123, Centro - São Paulo, SP",
    phone: "(11) 3456-7890",
    email: "contato@clinicasorriso.com.br",
    website: "www.clinicasorriso.com.br",
    logo: "/logo.png",
    description: "Clínica odontológica especializada em tratamentos estéticos e preventivos",
    specialties: ["Ortodontia", "Implantodontia", "Estética Dental", "Periodontia"],
    workingHours: {
      monday: { start: "08:00", end: "18:00", closed: false },
      tuesday: { start: "08:00", end: "18:00", closed: false },
      wednesday: { start: "08:00", end: "18:00", closed: false },
      thursday: { start: "08:00", end: "18:00", closed: false },
      friday: { start: "08:00", end: "17:00", closed: false },
      saturday: { start: "08:00", end: "12:00", closed: false },
      sunday: { start: "", end: "", closed: true }
    }
  },
  user: {
    name: "Dr. Carlos Mendes",
    email: "carlos@clinicasorriso.com.br",
    phone: "(11) 99999-9999",
    role: "Administrador",
    avatar: "/avatar.jpg",
    timezone: "America/Sao_Paulo",
    language: "pt-BR",
    lastLogin: "2024-01-15T10:30:00"
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    paymentAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
    reminderTime: 24
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 60,
    passwordExpiry: 90,
    loginAttempts: 5,
    ipWhitelist: [],
    auditLog: true
  },
  system: {
    theme: "light",
    currency: "BRL",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    autoBackup: true,
    backupFrequency: "daily",
    soundEnabled: true
  }
};

function ToggleSwitch({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-blue-600" : "bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("clinic");
  const [localSettings, setLocalSettings] = useState(defaultSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicSettings, setClinicSettings] = useState<BackendClinicSettings | null>(null);

  const tabs = [
    { id: "clinic", label: "Clínica", icon: Building2 },
    { id: "account", label: "Conta", icon: User },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "security", label: "Segurança", icon: Shield },
    { id: "system", label: "Sistema", icon: SettingsIcon }
  ];

  const updateSetting = (section: keyof LocalSettings, key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [clinicResponse, userResponse] = await Promise.all([
        settings.getClinicSettings().catch((err: unknown) => ({ data: null, error: err instanceof Error ? err.message : "Unknown error" })),
        settings.getUserSettings().catch((err: unknown) => ({ data: null, error: err instanceof Error ? err.message : "Unknown error" })),
      ]);

      if (clinicResponse.data) {
        setClinicSettings(clinicResponse.data);
        // Map backend data to local state
        setLocalSettings(prev => ({
          ...prev,
          clinic: {
            name: clinicResponse.data.clinic_name || prev.clinic.name,
            cnpj: "12.345.678/0001-90", // Not in backend model, keep default
            address: clinicResponse.data.clinic_address || prev.clinic.address,
            phone: clinicResponse.data.clinic_phone || prev.clinic.phone,
            email: clinicResponse.data.clinic_email || prev.clinic.email,
            website: "www.clinica.com.br", // Not in backend model, keep default
            logo: clinicResponse.data.logo_url || prev.clinic.logo,
            description: "Clínica odontológica", // Not in backend model, keep default
            specialties: prev.clinic.specialties, // Not in backend model, keep default
            workingHours: clinicResponse.data.business_hours ? 
              clinicResponse.data.business_hours : prev.clinic.workingHours
          }
        }));
      }

      if (userResponse.data) {
        // Map backend data to local state
        setLocalSettings(prev => ({
          ...prev,
          user: {
            ...prev.user,
            timezone: userResponse.data.timezone || prev.user.timezone,
            language: userResponse.data.language || prev.user.language,
          },
          system: {
            ...prev.system,
            theme: userResponse.data.theme || prev.system.theme,
            language: userResponse.data.language || prev.system.language,
            timezone: userResponse.data.timezone || prev.system.timezone
          },
          notifications: {
            ...prev.notifications,
            emailNotifications: userResponse.data.notification_email ?? prev.notifications.emailNotifications,
            smsNotifications: userResponse.data.notification_sms ?? prev.notifications.smsNotifications,
            pushNotifications: userResponse.data.notification_push ?? prev.notifications.pushNotifications
          }
        }));
      }

      console.log("✅ SETTINGS: Successfully loaded settings from backend:", {
        clinic: clinicResponse.data,
        user: userResponse.data
      });
    } catch (err) {
      console.error("❌ SETTINGS: Error loading settings:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare clinic settings data
      const clinicData = {
        clinic_name: localSettings.clinic.name,
        clinic_address: localSettings.clinic.address,
        clinic_phone: localSettings.clinic.phone,
        clinic_email: localSettings.clinic.email,
        logo_url: localSettings.clinic.logo,
        business_hours: localSettings.clinic.workingHours,
        appointment_duration: clinicSettings?.appointment_duration || 30,
        buffer_time: clinicSettings?.buffer_time || 15,
        max_advance_booking: clinicSettings?.max_advance_booking || 90
      };

      // Prepare user settings data
      const userData = {
        theme: localSettings.system.theme,
        language: localSettings.system.language,
        timezone: localSettings.system.timezone,
        notification_email: localSettings.notifications.emailNotifications,
        notification_sms: localSettings.notifications.smsNotifications,
        notification_push: localSettings.notifications.pushNotifications
      };

      // Save to backend
      const [clinicResponse, userResponse] = await Promise.all([
        settings.updateClinicSettings(clinicData),
        settings.updateUserSettings(userData)
      ]);

      console.log("✅ SETTINGS: Successfully saved settings to backend:", {
        clinic: clinicResponse,
        user: userResponse
      });

      setHasChanges(false);
      
      // Refresh settings from backend
      await fetchSettings();
    } catch (err) {
      console.error("❌ SETTINGS: Error saving settings:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">Gerencie as configurações da sua clínica e conta</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Configurações
            </Button>
            <Button 
              onClick={saveSettings}
              disabled={!hasChanges || loading}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Change Indicator */}
      {hasChanges && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">Você possui alterações não salvas</p>
          </div>
        </div>
      )}

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
      {activeTab === "clinic" && (
        <div className="space-y-8">
          {/* Clinic Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Clínica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Clínica
                    </label>
                    <input
                      type="text"
                      value={localSettings.clinic.name}
                      onChange={(e) => updateSetting("clinic", "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={localSettings.clinic.cnpj}
                      onChange={(e) => updateSetting("clinic", "cnpj", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={localSettings.clinic.email}
                      onChange={(e) => updateSetting("clinic", "email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={localSettings.clinic.phone}
                      onChange={(e) => updateSetting("clinic", "phone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={localSettings.clinic.website}
                      onChange={(e) => updateSetting("clinic", "website", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endereço Completo
                    </label>
                    <textarea
                      value={localSettings.clinic.address}
                      onChange={(e) => updateSetting("clinic", "address", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={localSettings.clinic.description}
                      onChange={(e) => updateSetting("clinic", "description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Logo da Clínica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Fazer Upload do Logo
                  </Button>
                  <p className="text-sm text-gray-600">
                    Recomendado: 200x200px, formato PNG ou JPG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(localSettings.clinic.workingHours).map(([day, hours]) => {
                  const dayNames = {
                    monday: "Segunda-feira",
                    tuesday: "Terça-feira", 
                    wednesday: "Quarta-feira",
                    thursday: "Quinta-feira",
                    friday: "Sexta-feira",
                    saturday: "Sábado",
                    sunday: "Domingo"
                  };
                  
                  return (
                    <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-32">
                        <span className="font-medium text-gray-900">{dayNames[day as keyof typeof dayNames]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => updateSetting("clinic", "workingHours", {
                            ...localSettings.clinic.workingHours,
                            [day]: { ...hours, closed: !e.target.checked }
                          })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Aberto</span>
                      </div>
                      {!hours.closed && (
                        <>
                          <input
                            type="time"
                            value={hours.start}
                            onChange={(e) => updateSetting("clinic", "workingHours", {
                              ...localSettings.clinic.workingHours,
                              [day]: { ...hours, start: e.target.value }
                            })}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-gray-500">às</span>
                          <input
                            type="time"
                            value={hours.end}
                            onChange={(e) => updateSetting("clinic", "workingHours", {
                              ...localSettings.clinic.workingHours,
                              [day]: { ...hours, end: e.target.value }
                            })}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "account" && (
        <div className="space-y-8">
          {/* User Profile */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6 mb-6">
                <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Alterar Foto
                  </Button>
                  <p className="text-sm text-gray-600">
                    Formatos aceitos: JPG, PNG (máx. 2MB)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={localSettings.user.name}
                      onChange={(e) => updateSetting("user", "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={localSettings.user.email}
                      onChange={(e) => updateSetting("user", "email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={localSettings.user.phone}
                      onChange={(e) => updateSetting("user", "phone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo
                    </label>
                    <input
                      type="text"
                      value={localSettings.user.role}
                      onChange={(e) => updateSetting("user", "role", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuso Horário
                    </label>
                    <select
                      value={localSettings.user.timezone}
                      onChange={(e) => updateSetting("user", "timezone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                      <option value="America/Manaus">Manaus (UTC-4)</option>
                      <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma
                    </label>
                    <select
                      value={localSettings.user.language}
                      onChange={(e) => updateSetting("user", "language", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button className="gap-2">
                  <Key className="h-4 w-4" />
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-8">
          {/* Notification Preferences */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificações por Email</h4>
                    <p className="text-sm text-gray-600">Receber notificações no seu email</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.notifications.emailNotifications}
                    onChange={(value) => updateSetting("notifications", "emailNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificações por SMS</h4>
                    <p className="text-sm text-gray-600">Receber SMS para alertas importantes</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.notifications.smsNotifications}
                    onChange={(value) => updateSetting("notifications", "smsNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificações Push</h4>
                    <p className="text-sm text-gray-600">Notificações instantâneas no navegador</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.notifications.pushNotifications}
                    onChange={(value) => updateSetting("notifications", "pushNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Lembretes de Consulta</h4>
                    <p className="text-sm text-gray-600">Lembrar sobre consultas agendadas</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.notifications.appointmentReminders}
                    onChange={(value) => updateSetting("notifications", "appointmentReminders", value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Alertas de Pagamento</h4>
                    <p className="text-sm text-gray-600">Notificar sobre pagamentos e cobranças</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.notifications.paymentAlerts}
                    onChange={(value) => updateSetting("notifications", "paymentAlerts", value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reminder Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configurações de Lembrete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enviar lembrete de consulta
                  </label>
                  <select
                    value={localSettings.notifications.reminderTime}
                    onChange={(e) => updateSetting("notifications", "reminderTime", parseInt(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 hora antes</option>
                    <option value={2}>2 horas antes</option>
                    <option value={6}>6 horas antes</option>
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes</option>
                    <option value={48}>48 horas antes</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-8">
          {/* Security Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-gray-600">Adicionar uma camada extra de segurança</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.security.twoFactorAuth}
                    onChange={(value) => updateSetting("security", "twoFactorAuth", value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Log de Auditoria</h4>
                    <p className="text-sm text-gray-600">Registrar todas as atividades do sistema</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.security.auditLog}
                    onChange={(value) => updateSetting("security", "auditLog", value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeout da Sessão (minutos)
                    </label>
                    <select
                      value={localSettings.security.sessionTimeout}
                      onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={120}>2 horas</option>
                      <option value={240}>4 horas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tentativas de Login Máximas
                    </label>
                    <select
                      value={localSettings.security.loginAttempts}
                      onChange={(e) => updateSetting("security", "loginAttempts", parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={3}>3 tentativas</option>
                      <option value={5}>5 tentativas</option>
                      <option value={10}>10 tentativas</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Login realizado</p>
                      <p className="text-sm text-gray-600">192.168.1.100 • 15/01/2024 às 10:30</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Edit className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Configurações alteradas</p>
                      <p className="text-sm text-gray-600">192.168.1.100 • 14/01/2024 às 16:45</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "system" && (
        <div className="space-y-8">
          {/* System Preferences */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Preferências do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tema
                    </label>
                    <select
                      value={localSettings.system.theme}
                      onChange={(e) => updateSetting("system", "theme", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Moeda
                    </label>
                    <select
                      value={localSettings.system.currency}
                      onChange={(e) => updateSetting("system", "currency", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="BRL">Real (R$)</option>
                      <option value="USD">Dólar (US$)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Data
                    </label>
                    <select
                      value={localSettings.system.dateFormat}
                      onChange={(e) => updateSetting("system", "dateFormat", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                      <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                      <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Hora
                    </label>
                    <select
                      value={localSettings.system.timeFormat}
                      onChange={(e) => updateSetting("system", "timeFormat", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="24h">24 horas</option>
                      <option value="12h">12 horas (AM/PM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma do Sistema
                    </label>
                    <select
                      value={localSettings.system.language}
                      onChange={(e) => updateSetting("system", "language", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Sons do Sistema</h4>
                      <p className="text-sm text-gray-600">Reproduzir sons para notificações</p>
                    </div>
                    <ToggleSwitch
                      enabled={localSettings.system.soundEnabled}
                      onChange={(value) => updateSetting("system", "soundEnabled", value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup e Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Backup Automático</h4>
                    <p className="text-sm text-gray-600">Fazer backup dos dados automaticamente</p>
                  </div>
                  <ToggleSwitch
                    enabled={localSettings.system.autoBackup}
                    onChange={(value) => updateSetting("system", "autoBackup", value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequência do Backup
                  </label>
                  <select
                    value={localSettings.system.backupFrequency}
                    onChange={(e) => updateSetting("system", "backupFrequency", e.target.value)}
                    disabled={!localSettings.system.autoBackup}
                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Fazer Backup Agora
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Restaurar Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar Integration */}
          <GoogleCalendarSettings />
        </div>
      )}
    </div>
  );
}