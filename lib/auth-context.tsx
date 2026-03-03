import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface AuthUser {
  id: string;
  rut: string;
  nombre: string;
  apellido: string;
  role: string;
  casinoId: string | null;
  activo: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (rut: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem("vascan_user");
      if (stored) {
        try {
          const baseUrl = getApiUrl();
          const url = new URL("/api/auth/me", baseUrl);
          const res = await fetch(url.toString(), { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            await AsyncStorage.setItem("vascan_user", JSON.stringify(data.user));
          } else {
            setUser(JSON.parse(stored));
          }
        } catch {
          setUser(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.error("Error loading user:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(rut: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { rut, password });
    const data = await res.json();
    setUser(data.user);
    await AsyncStorage.setItem("vascan_user", JSON.stringify(data.user));
  }

  async function logout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (e) {
      // ignore
    }
    setUser(null);
    await AsyncStorage.removeItem("vascan_user");
  }

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
