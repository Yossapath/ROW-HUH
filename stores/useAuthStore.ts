import { create } from "zustand";
import type { AuthPayload } from "@/types";

interface AuthState {
  user: AuthPayload | null;
  isAuthenticated: boolean;
  /** Set when the account is Inactive (switched off, or not in Discord / no HUH? role). */
  inactive: { message: string; reason: string | null } | null;
  setUser: (user: AuthPayload | null) => void;
  setInactive: (inactive: { message: string; reason: string | null } | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  inactive: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setInactive: (inactive) => set({ inactive }),
  logout: () => set({ user: null, isAuthenticated: false, inactive: null }),
}));
