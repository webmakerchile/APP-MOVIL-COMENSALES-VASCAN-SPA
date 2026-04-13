import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Clock, ChefHat } from "lucide-react";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="h-full flex flex-col bg-vascan-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-white/40 text-xs">Hola,</p>
          <h1 className="text-white font-semibold text-lg">
            {user?.nombre} {user?.apellido}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center"
        >
          <LogOut className="w-5 h-5 text-white/50" />
        </button>
      </header>

      {/* Placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-vascan-gold/15 border border-vascan-gold/20 flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-vascan-gold/60" />
        </div>
        <div className="text-center">
          <p className="text-white/60 text-base font-medium">En construcción</p>
          <p className="text-white/30 text-sm mt-1">Minuta del día próximamente</p>
        </div>
      </div>
    </div>
  );
}
