import { useState, useEffect, useCallback } from 'react';
import { googleCalendarService, type AppointmentData } from '../services/googleCalendar';
import { toast } from 'sonner';

interface GoogleCalendarHook {
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  createEvent: (appointmentData: AppointmentData) => Promise<string | null>;
  updateEvent: (eventId: string, appointmentData: AppointmentData) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getCalendars: () => Promise<any[]>;
  error: string | null;
}

export function useGoogleCalendar(): GoogleCalendarHook {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Calendar service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        await googleCalendarService.initialize();
        setIsInitialized(true);
        setIsAuthenticated(googleCalendarService.isAuthenticated());
      } catch (err) {
        setError('Failed to initialize Google Calendar');
        console.error('Google Calendar initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, []);

  const signIn = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await googleCalendarService.signIn();
      setIsAuthenticated(success);
      
      if (success) {
        toast.success('Conectado ao Google Calendar com sucesso!');
      } else {
        toast.error('Falha ao conectar com Google Calendar');
      }
      
      return success;
    } catch (err) {
      const message = 'Erro ao fazer login no Google Calendar';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await googleCalendarService.signOut();
      setIsAuthenticated(false);
      toast.success('Desconectado do Google Calendar');
    } catch (err) {
      const message = 'Erro ao desconectar do Google Calendar';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (appointmentData: AppointmentData): Promise<string | null> => {
    if (!isAuthenticated) {
      toast.error('Faça login no Google Calendar primeiro');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const eventId = await googleCalendarService.createAppointment(appointmentData);
      
      if (eventId) {
        toast.success('Evento criado no Google Calendar!');
      }
      
      return eventId;
    } catch (err) {
      const message = 'Erro ao criar evento no Google Calendar';
      setError(message);
      toast.error(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const updateEvent = useCallback(async (eventId: string, appointmentData: AppointmentData): Promise<void> => {
    if (!isAuthenticated) {
      toast.error('Faça login no Google Calendar primeiro');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await googleCalendarService.updateAppointment(eventId, appointmentData);
      toast.success('Evento atualizado no Google Calendar!');
    } catch (err) {
      const message = 'Erro ao atualizar evento no Google Calendar';
      setError(message);
      toast.error(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    if (!isAuthenticated) {
      toast.error('Faça login no Google Calendar primeiro');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await googleCalendarService.deleteAppointment(eventId);
      toast.success('Evento removido do Google Calendar!');
    } catch (err) {
      const message = 'Erro ao remover evento do Google Calendar';
      setError(message);
      toast.error(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const getCalendars = useCallback(async (): Promise<any[]> => {
    if (!isAuthenticated) {
      toast.error('Faça login no Google Calendar primeiro');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      
      return await googleCalendarService.getCalendars();
    } catch (err) {
      const message = 'Erro ao buscar calendários';
      setError(message);
      toast.error(message);
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return {
    isInitialized,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    createEvent,
    updateEvent,
    deleteEvent,
    getCalendars,
    error,
  };
}