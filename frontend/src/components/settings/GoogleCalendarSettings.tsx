import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";
import { Calendar, CheckCircle, XCircle, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GoogleCalendarSettingsProps {
  onSettingsChange?: (settings: GoogleCalendarSettings) => void;
}

interface GoogleCalendarSettings {
  enabled: boolean;
  autoSync: boolean;
  selectedCalendarId: string;
  reminderMinutes: number;
}

export function GoogleCalendarSettings({ onSettingsChange }: GoogleCalendarSettingsProps) {
  const {
    isInitialized,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    getCalendars,
    error,
  } = useGoogleCalendar();

  const [settings, setSettings] = useState<GoogleCalendarSettings>({
    enabled: false,
    autoSync: true,
    selectedCalendarId: 'primary',
    reminderMinutes: 60,
  });

  const [calendars, setCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('googleCalendarSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('googleCalendarSettings', JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  // Load calendars when authenticated
  useEffect(() => {
    if (isAuthenticated && settings.enabled) {
      loadCalendars();
    }
  }, [isAuthenticated, settings.enabled]);

  const loadCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const calendarList = await getCalendars();
      setCalendars(calendarList);
    } catch (err) {
      toast.error('Erro ao carregar calendários');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled && !isAuthenticated) {
      const success = await signIn();
      if (!success) return;
    }

    setSettings(prev => ({ ...prev, enabled }));
  };

  const handleSignOut = async () => {
    await signOut();
    setSettings(prev => ({ ...prev, enabled: false }));
    setCalendars([]);
  };

  const updateSetting = <K extends keyof GoogleCalendarSettings>(
    key: K,
    value: GoogleCalendarSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Integração Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {isAuthenticated ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </div>
          
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                onClick={signIn}
                disabled={isLoading || !isInitialized}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-sync">Sincronizar consultas automaticamente</Label>
            <Checkbox
              id="enable-sync"
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isLoading}
            />
          </div>

          {settings.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-select">Calendário de destino</Label>
                <Select
                  value={settings.selectedCalendarId}
                  onValueChange={(value) => updateSetting('selectedCalendarId', value)}
                  disabled={!isAuthenticated || loadingCalendars}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Calendário Principal</SelectItem>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingCalendars && (
                  <p className="text-sm text-gray-500">Carregando calendários...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-select">Lembrete padrão</Label>
                <Select
                  value={settings.reminderMinutes.toString()}
                  onValueChange={(value) => updateSetting('reminderMinutes', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos antes</SelectItem>
                    <SelectItem value="30">30 minutos antes</SelectItem>
                    <SelectItem value="60">1 hora antes</SelectItem>
                    <SelectItem value="120">2 horas antes</SelectItem>
                    <SelectItem value="1440">1 dia antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync">Sincronização automática</Label>
                <Checkbox
                  id="auto-sync"
                  checked={settings.autoSync}
                  onCheckedChange={(checked) => updateSetting('autoSync', checked)}
                />
              </div>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Como funciona:</p>
              <ul className="space-y-1 text-sm">
                <li>• Suas consultas serão automaticamente sincronizadas com o Google Calendar</li>
                <li>• Pacientes receberão convites por email quando informado</li>
                <li>• Lembretes automáticos serão configurados</li>
                <li>• Alterações em consultas serão refletidas automaticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { GoogleCalendarSettings };