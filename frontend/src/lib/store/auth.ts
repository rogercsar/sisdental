import { create } from "zustand";
import { auth } from "../api/client";
import { supabase } from "../supabase";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.login(email, password);

      if (response.error) {
        console.error("Login error in response:", response.error);
        throw new Error(response.error);
      }

      if (!response.user) {
        throw new Error("Invalid response format");
      }

      // Set Supabase session with the access token from backend
      if (response.access_token) {
        await supabase.auth.setSession({
          access_token: response.access_token,
          refresh_token: response.refresh_token || "",
        });
      }

      set({ user: response.user, isLoading: false });
    } catch (error) {
      console.error("Login error:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to login",
        isLoading: false,
      });
      throw error;
    }
  },

  signUp: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.signup(email, password, name);
      if (response.error) {
        throw new Error(response.error);
      }
      if (!response.user) {
        throw new Error("Invalid response format");
      }

      // Set Supabase session with the access token from backend
      if (response.access_token) {
        await supabase.auth.setSession({
          access_token: response.access_token,
          refresh_token: response.refresh_token || "",
        });
      }

      set({ user: response.user, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to sign up",
        isLoading: false,
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.signout();
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Clear Supabase session
      await supabase.auth.signOut();
      
      set({ user: null, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to sign out",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.me();

      if (!response?.user) {
        throw new Error("Invalid response format: User object is missing");
      }
      
      // If we have a token in localStorage, try to restore Supabase session
      const token = localStorage.getItem("token");
      if (token && response.token) {
        // We could potentially restore the Supabase session here if needed
        // For now, the token in the Authorization header should be sufficient
      }
      
      set({ user: response.user, isLoading: false });
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        await supabase.auth.signOut();
        set({ user: null, isLoading: false });
        return;
      }
      set({
        error: error instanceof Error ? error.message : "Failed to fetch user",
        isLoading: false,
        user: null,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));