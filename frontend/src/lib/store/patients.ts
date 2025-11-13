import { create } from "zustand";
import { patients as patientsApi, search as searchApi } from "../api/client";
import type { Patient } from "../supabase";

interface PatientsState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  searchResults: Patient[];
  isSearching: boolean;
  fetchPatients: () => Promise<void>;
  getPatient: (id: string) => Promise<Patient | null>;
  searchPatients: (query: string) => Promise<void>;
  clearSearch: () => void;
  createPatient: (
    patientData: Omit<Patient, "id" | "created_at" | "updated_at">,
  ) => Promise<Patient>;
  updatePatient: (
    id: string,
    patientData: Partial<Patient>,
  ) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  clearError: () => void;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsApi.list();
      set({ patients: response.patients || [], isLoading: false });
    } catch (error) {
      console.error("Fetch patients error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch patients",
        isLoading: false,
      });
    }
  },

  getPatient: async (id) => {
    try {
      // Check if patient is already in store
      const existingPatient = get().patients.find((p) => p.id === id);
      if (existingPatient) {
        return existingPatient;
      }

      // Fetch patient from API
      const response = await patientsApi.get(id);
      return response.data || null;
    } catch (error) {
      console.error("Get patient error:", error);
      return null;
    }
  },

  createPatient: async (patientData) => {
    set({ isLoading: true, error: null });
    try {
      // Add flag to assign to current doctor
      const requestData = {
        ...patientData,
        assign_to_current_doctor: true,
      };

      const response = await patientsApi.create(requestData);
      
      // Refresh patients list
      await get().fetchPatients();

      set({ isLoading: false });
      return response.data;
    } catch (error) {
      console.error("Create patient error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to create patient",
        isLoading: false,
      });
      throw error;
    }
  },

  updatePatient: async (id, patientData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsApi.update(id, patientData);

      // Refresh patients list
      await get().fetchPatients();

      set({ isLoading: false });
      return response.data;
    } catch (error) {
      console.error("Update patient error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to update patient",
        isLoading: false,
      });
      throw error;
    }
  },

  deletePatient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await patientsApi.delete(id);
      
      // Refresh patients list
      await get().fetchPatients();

      set({ isLoading: false });
    } catch (error) {
      console.error("Delete patient error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete patient",
        isLoading: false,
      });
      throw error;
    }
  },

  searchPatients: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const results = await searchApi.patients(query);
      set({ searchResults: results || [], isSearching: false });
      console.log("✅ SEARCH: Found", results?.length || 0, "patients for query:", query);
    } catch (error) {
      console.error("❌ SEARCH: Patient search error:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to search patients",
        isSearching: false,
      });
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  clearError: () => set({ error: null }),
}));

