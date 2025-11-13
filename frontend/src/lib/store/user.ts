import { create } from "zustand";
import { auth } from "../api/client";
import type { User } from "../api/types";

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
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

  signup: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.signup(email, password, name);
      if (response.error) {
        throw new Error(response.error);
      }
      if (!response.user) {
        throw new Error("Invalid response format");
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

  signout: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await auth.signout();
      if (response.error) {
        throw new Error(response.error);
      }
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
      set({ user: response.user, isLoading: false });
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
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
