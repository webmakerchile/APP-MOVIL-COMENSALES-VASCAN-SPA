import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";

export default function Historial() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-vascan-bg">
      <header className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <h1 className="text-white font-semibold text-lg">Historial de Pedidos</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-vascan-gold/15 border border-vascan-gold/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-vascan-gold/60" />
        </div>
        <div className="text-center">
          <p className="text-white/60 text-base font-medium">En construcción</p>
          <p className="text-white/30 text-sm mt-1">Historial próximamente</p>
        </div>
      </div>
    </div>
  );
}
