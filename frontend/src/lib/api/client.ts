import axios from "axios";
import type {
  ApiResponse,
  Price,
  Product,
  AuthResponse,
  User,
  CheckoutSessionResponse,
  SubscriptionResponse,
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

// Auth endpoints
export const auth = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post<AuthResponse>("/api/login", {
        email,
        password,
      });
      console.log("Login response:", response.data);
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      } else {
        console.log("No access_token in response data");
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Login failed: ${error.message}`);
      }
      throw new Error("Login failed: Unknown error");
    }
  },

  signup: async (email: string, password: string, name?: string) => {
    try {
      const response = await api.post<AuthResponse>("/api/signup", {
        email,
        password,
        name,
      });
      // Store the access_token in localStorage
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      } else {
        console.log("No access_token in response data");
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Signup failed: ${error.message}`);
      }
      throw new Error("Signup failed: Unknown error");
    }
  },

  signout: async () => {
    try {
      const response = await api.post<ApiResponse<null>>("/api/auth/signout");
      // Remove the token from localStorage
      localStorage.removeItem("token");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Signout failed: ${error.message}`);
      }
      throw new Error("Signout failed: Unknown error");
    }
  },

  me: async () => {
    try {
      const response = await api.get<{ user: User, token: string }>("/api/auth/me");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
      throw new Error("Failed to fetch user: Unknown error");
    }
  },
};

// Stripe endpoints
export const stripe = {
  getPrices: async () => {
    try {
      const response =
        await api.get<ApiResponse<Price[]>>("/api/stripe/prices");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch prices: ${error.message}`);
      }
      throw new Error("Failed to fetch prices: Unknown error");
    }
  },

  getProducts: async () => {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        "/api/stripe/products",
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
      }
      throw new Error("Failed to fetch products: Unknown error");
    }
  },

  createCheckoutSession: async (priceId: string) => {
    try {
      const response = await api.post<CheckoutSessionResponse>(
        "/api/stripe/create-checkout-session",
        { priceId },
      );
      console.log("response", response.data);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }
      throw new Error("Failed to create checkout session: Unknown error");
    }
  },
};

// Doctor endpoints
export const doctor = {
  getCurrentSubscription: async () => {
    try {
      const response = await api.get<SubscriptionResponse>(
        "/api/subscriptions/me",
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch subscription: ${error.message}`);
      }
      throw new Error("Failed to fetch subscription: Unknown error");
    }
  },
};

// Patient endpoints
export const patients = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => {
    try {
      const response = await api.get<{ patients: any[], user: any }>("/api/patients/my", {
        params,
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch patients: ${error.message}`);
      }
      throw new Error("Failed to fetch patients: Unknown error");
    }
  },

  create: async (patientData: any) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        "/api/patients",
        patientData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create patient: ${error.message}`);
      }
      throw new Error("Failed to create patient: Unknown error");
    }
  },

  get: async (id: string) => {
    try {
      const response = await api.get<ApiResponse<any>>(`/api/patients/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch patient: ${error.message}`);
      }
      throw new Error("Failed to fetch patient: Unknown error");
    }
  },

  update: async (id: string, patientData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        `/api/patients/${id}`,
        patientData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update patient: ${error.message}`);
      }
      throw new Error("Failed to update patient: Unknown error");
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete<ApiResponse<null>>(
        `/api/patients/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete patient: ${error.message}`);
      }
      throw new Error("Failed to delete patient: Unknown error");
    }
  },
};

// Appointment endpoints
export const appointments = {
  list: async (params?: {
    page?: number;
    limit?: number;
    date?: string;
    status?: string;
  }) => {
    try {
      const response = await api.get<ApiResponse<any[]>>("/api/appointments", {
        params,
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }
      throw new Error("Failed to fetch appointments: Unknown error");
    }
  },

  create: async (appointmentData: any) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        "/api/appointments",
        appointmentData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create appointment: ${error.message}`);
      }
      throw new Error("Failed to create appointment: Unknown error");
    }
  },

  get: async (id: string) => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/api/appointments/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch appointment: ${error.message}`);
      }
      throw new Error("Failed to fetch appointment: Unknown error");
    }
  },

  update: async (id: string, appointmentData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        `/api/appointments/${id}`,
        appointmentData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update appointment: ${error.message}`);
      }
      throw new Error("Failed to update appointment: Unknown error");
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete<ApiResponse<null>>(
        `/api/appointments/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete appointment: ${error.message}`);
      }
      throw new Error("Failed to delete appointment: Unknown error");
    }
  },

  // Action methods using the new backend endpoints
  confirm: async (id: string) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/appointments/${id}/confirm`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to confirm appointment: ${error.message}`);
      }
      throw new Error("Failed to confirm appointment: Unknown error");
    }
  },

  complete: async (id: string) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/appointments/${id}/complete`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to complete appointment: ${error.message}`);
      }
      throw new Error("Failed to complete appointment: Unknown error");
    }
  },

  cancel: async (id: string, reason?: string) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/appointments/${id}/cancel`,
        reason ? { reason } : {},
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`);
      }
      throw new Error("Failed to cancel appointment: Unknown error");
    }
  },

  getByDate: async (date: string) => {
    try {
      const response = await api.get<ApiResponse<any[]>>(
        `/api/appointments/calendar/${date}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch appointments by date: ${error.message}`,
        );
      }
      throw new Error("Failed to fetch appointments by date: Unknown error");
    }
  },
};

// Finance endpoints
export const finances = {
  list: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    patient_id?: string;
  }) => {
    try {
      const response = await api.get<{ finances: any[], total: number, page: number, limit: number }>(
        "/api/finances",
        { params },
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch finances: ${error.message}`);
      }
      throw new Error("Failed to fetch finances: Unknown error");
    }
  },

  create: async (financeData: any) => {
    try {
      const response = await api.post<any>(
        "/api/finances",
        financeData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create finance record: ${error.message}`);
      }
      throw new Error("Failed to create finance record: Unknown error");
    }
  },

  get: async (id: string) => {
    try {
      const response = await api.get<any>(
        `/api/finances/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch finance record: ${error.message}`);
      }
      throw new Error("Failed to fetch finance record: Unknown error");
    }
  },

  update: async (id: string, financeData: any) => {
    try {
      const response = await api.put<{ success: boolean, message: string }>(
        `/api/finances/${id}`,
        financeData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update finance record: ${error.message}`);
      }
      throw new Error("Failed to update finance record: Unknown error");
    }
  },

  delete: async (id: string) => {
    try {
      await api.delete(`/api/finances/${id}`);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete finance record: ${error.message}`);
      }
      throw new Error("Failed to delete finance record: Unknown error");
    }
  },
};

// Reports endpoints
export const reports = {
  getDashboardStats: async () => {
    try {
      const response = await api.get<any>("/api/reports/dashboard-stats");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
      }
      throw new Error("Failed to fetch dashboard stats: Unknown error");
    }
  },

  getFinancialReport: async (params?: {
    start_date?: string;
    end_date?: string;
    period?: string;
  }) => {
    try {
      const response = await api.get<any>("/api/reports/financial", { params });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch financial report: ${error.message}`);
      }
      throw new Error("Failed to fetch financial report: Unknown error");
    }
  },

  getAppointmentReport: async (params?: {
    start_date?: string;
    end_date?: string;
    period?: string;
  }) => {
    try {
      const response = await api.get<any>("/api/reports/appointments", { params });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch appointment report: ${error.message}`);
      }
      throw new Error("Failed to fetch appointment report: Unknown error");
    }
  },

  getDailyAppointments: async (date?: string) => {
    try {
      const params = date ? { date } : {};
      const response = await api.get<any>("/api/reports/daily-appointments", { params });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch daily appointments: ${error.message}`);
      }
      throw new Error("Failed to fetch daily appointments: Unknown error");
    }
  },
};

// Settings endpoints
export const settings = {
  getClinicSettings: async () => {
    try {
      const response = await api.get<ApiResponse<any>>("/api/settings/clinic");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch clinic settings: ${error.message}`);
      }
      throw new Error("Failed to fetch clinic settings: Unknown error");
    }
  },

  updateClinicSettings: async (settingsData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        "/api/settings/clinic",
        settingsData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update clinic settings: ${error.message}`);
      }
      throw new Error("Failed to update clinic settings: Unknown error");
    }
  },

  getUserSettings: async () => {
    try {
      const response = await api.get<ApiResponse<any>>("/api/settings/user");
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user settings: ${error.message}`);
      }
      throw new Error("Failed to fetch user settings: Unknown error");
    }
  },

  updateUserSettings: async (settingsData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        "/api/settings/user",
        settingsData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update user settings: ${error.message}`);
      }
      throw new Error("Failed to update user settings: Unknown error");
    }
  },
};

// Upload endpoints
export const uploads = {
  uploadPatientImage: async (patientId: string, formData: FormData) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/patients/${patientId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw new Error("Failed to upload image: Unknown error");
    }
  },

  uploadClinicLogo: async (formData: FormData) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/uploads/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload logo: ${error.message}`);
      }
      throw new Error("Failed to upload logo: Unknown error");
    }
  },
};

// Patient Images endpoints
export const patientImages = {
  list: async (patientId: string, params?: {
    type?: string;
    category?: string;
  }) => {
    try {
      const response = await api.get<ApiResponse<any[]>>(
        `/api/patients/${patientId}/images`,
        { params }
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch patient images: ${error.message}`);
      }
      throw new Error("Failed to fetch patient images: Unknown error");
    }
  },

  get: async (patientId: string, imageId: string) => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/api/patients/${patientId}/images/${imageId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch patient image: ${error.message}`);
      }
      throw new Error("Failed to fetch patient image: Unknown error");
    }
  },

  create: async (patientId: string, imageData: any) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/patients/${patientId}/images`,
        imageData
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create patient image record: ${error.message}`);
      }
      throw new Error("Failed to create patient image record: Unknown error");
    }
  },

  update: async (patientId: string, imageId: string, imageData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        `/api/patients/${patientId}/images/${imageId}`,
        imageData
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update patient image: ${error.message}`);
      }
      throw new Error("Failed to update patient image: Unknown error");
    }
  },

  delete: async (patientId: string, imageId: string) => {
    try {
      const response = await api.delete<ApiResponse<null>>(
        `/api/patients/${patientId}/images/${imageId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete patient image: ${error.message}`);
      }
      throw new Error("Failed to delete patient image: Unknown error");
    }
  },
};

// Treatment endpoints
export const treatments = {
  list: async (patientId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/api/patients/${patientId}/treatments`,
        { params },
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch treatments: ${error.message}`);
      }
      throw new Error("Failed to fetch treatments: Unknown error");
    }
  },

  create: async (patientId: string, treatmentData: any) => {
    try {
      const response = await api.post<ApiResponse<any>>(
        `/api/patients/${patientId}/treatments`,
        treatmentData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create treatment: ${error.message}`);
      }
      throw new Error("Failed to create treatment: Unknown error");
    }
  },

  get: async (id: string) => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/api/treatments/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch treatment: ${error.message}`);
      }
      throw new Error("Failed to fetch treatment: Unknown error");
    }
  },

  update: async (id: string, treatmentData: any) => {
    try {
      const response = await api.put<ApiResponse<any>>(
        `/api/treatments/${id}`,
        treatmentData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update treatment: ${error.message}`);
      }
      throw new Error("Failed to update treatment: Unknown error");
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete<ApiResponse<null>>(
        `/api/treatments/${id}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete treatment: ${error.message}`);
      }
      throw new Error("Failed to delete treatment: Unknown error");
    }
  },
};

// Search endpoints
export const search = {
  global: async (query: string) => {
    try {
      const response = await api.get<{
        patients: any[];
        appointments: any[];
        finances: any[];
        total: number;
      }>("/api/search", {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to perform global search: ${error.message}`);
      }
      throw new Error("Failed to perform global search: Unknown error");
    }
  },

  patients: async (query: string, params?: { page?: number; limit?: number }) => {
    try {
      const response = await api.get<any[]>("/api/search/patients", {
        params: { q: query, ...params },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search patients: ${error.message}`);
      }
      throw new Error("Failed to search patients: Unknown error");
    }
  },

  appointments: async (query: string, params?: { page?: number; limit?: number }) => {
    try {
      const response = await api.get<any[]>("/api/search/appointments", {
        params: { q: query, ...params },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search appointments: ${error.message}`);
      }
      throw new Error("Failed to search appointments: Unknown error");
    }
  },

  finances: async (query: string) => {
    try {
      const response = await api.get<ApiResponse<any[]>>(
        "/api/search/finances",
        { params: { q: query } },
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search finances: ${error.message}`);
      }
      throw new Error("Failed to search finances: Unknown error");
    }
  },
};

export default api;
