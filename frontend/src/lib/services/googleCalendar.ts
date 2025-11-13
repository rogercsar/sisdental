import { google } from 'googleapis';

// Google Calendar configuration
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

interface AppointmentData {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  type: string;
  dateTime: string;
  duration: number;
  notes?: string;
  dentist?: string;
}

export class GoogleCalendarService {
  private gapi: any = null;
  private isInitialized = false;
  private isSignedIn = false;

  async initialize() {
    if (this.isInitialized) return;

    // Load Google API
    await this.loadGoogleAPI();
    
    // Initialize gapi client
    await window.gapi.load('client:auth2', async () => {
      await window.gapi.client.init({
        apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        discoveryDocs: [DISCOVERY_DOC],
        scope: CALENDAR_SCOPES.join(' ')
      });

      this.gapi = window.gapi;
      this.isInitialized = true;
      this.isSignedIn = this.gapi.auth2.getAuthInstance().isSignedIn.get();
    });
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isSignedIn = true;
      return true;
    } catch (error) {
      console.error('Google Calendar sign-in failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
    } catch (error) {
      console.error('Google Calendar sign-out failed:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.isSignedIn;
  }

  async createAppointment(appointmentData: AppointmentData, calendarId = 'primary'): Promise<string | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const startTime = new Date(appointmentData.dateTime);
    const endTime = new Date(startTime.getTime() + appointmentData.duration * 60 * 1000);

    const event: CalendarEvent = {
      summary: `${appointmentData.type} - ${appointmentData.patientName}`,
      description: this.buildEventDescription(appointmentData),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    // Add patient as attendee if email is provided
    if (appointmentData.patientEmail) {
      event.attendees = [
        {
          email: appointmentData.patientEmail,
          displayName: appointmentData.patientName,
        },
      ];
    }

    try {
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      return response.result.id;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateAppointment(
    eventId: string, 
    appointmentData: AppointmentData, 
    calendarId = 'primary'
  ): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const startTime = new Date(appointmentData.dateTime);
    const endTime = new Date(startTime.getTime() + appointmentData.duration * 60 * 1000);

    const event: CalendarEvent = {
      summary: `${appointmentData.type} - ${appointmentData.patientName}`,
      description: this.buildEventDescription(appointmentData),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    try {
      await this.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event,
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteAppointment(eventId: string, calendarId = 'primary'): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  async getCalendars() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const response = await this.gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch calendars');
    }
  }

  private buildEventDescription(appointmentData: AppointmentData): string {
    let description = `Consulta: ${appointmentData.type}\nPaciente: ${appointmentData.patientName}`;
    
    if (appointmentData.patientPhone) {
      description += `\nTelefone: ${appointmentData.patientPhone}`;
    }
    
    if (appointmentData.patientEmail) {
      description += `\nEmail: ${appointmentData.patientEmail}`;
    }
    
    if (appointmentData.dentist) {
      description += `\nProfissional: ${appointmentData.dentist}`;
    }
    
    if (appointmentData.notes) {
      description += `\n\nObservações:\n${appointmentData.notes}`;
    }

    description += `\n\n--- Sistema Odontológico ---`;
    
    return description;
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService();

// Types for external use
export type { AppointmentData, CalendarEvent };