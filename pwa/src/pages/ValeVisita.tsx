import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import QRModal from "@/components/QRModal";

// ── Types ──────────────────────────────────────────────────────────────────
interface Minuta {
  id: string;
  casinoId: string;
  fecha: string;
  familia: string;
  opcion1: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function parseDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00");
}

function formatDay(dateStr: string) {
  const d = parseDate(dateStr);
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ValeVisita() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nombreVisita, setNombreVisita] = useState("");
  const [selectedMinuta, setSelectedMinuta] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{
    qrCode: string; opcionNum: number; opcionText: string; fecha: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: minutas, isLoading } = useQuery<Minuta[]>({
    queryKey: ["/api/minutas", user?.casinoId ?? "none"],
    enabled: !!user?.casinoId,
  });

  const createVale = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pedidos/visita", {
        userId: user!.id,
        minutaId: selectedMinuta,
        nombreVisita: nombreVisita.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pedidos"] });
      const minuta = sortedMinutas.find((m) => m.id === selectedMinuta);
      setQrModal({
        qrCode: data.codigoQr,
        opcionNum: 0,
        opcionText: `Vale de visita — ${nombreVisita.trim()}`,
        fecha: minuta?.fecha ?? "",
      });
      setNombreVisita("");
      setSelectedMinuta(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message ?? "No se pudo crear el vale de visita.");
    },
  });

  const sortedMinutas = (minutas ?? []).sort(
    (a, b) => parseDate(a.fecha).getTime() - parseDate(b.fecha).getTime()
  );

  const canSubmit = nombreVisita.trim().length > 0 && selectedMinuta !== null && !createVale.isPending;

  return (
    <div className="h-full flex flex-col bg-vascan-bg overflow-hidden">
      {qrModal && (
        <QRModal
          qrCode={qrModal.qrCode}
          opcionNum={qrModal.opcionNum}
          opcionText={qrModal.opcionText}
          fecha={qrModal.fecha}
          onClose={() => { setQrModal(null); navigate("/"); }}
        />
      )}

      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-white font-semibold text-lg">Vale de Visita</h1>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-8 space-y-5">

          {/* Info banner */}
          <div className="flex items-start gap-4 px-4 py-4 rounded-xl bg-vascan-gold/8 border border-vascan-gold/20">
            <div className="w-9 h-9 rounded-lg bg-vascan-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserPlus className="w-5 h-5 text-vascan-gold" />
            </div>
            <p className="text-white/55 text-sm leading-relaxed">
              Emite un vale para personas que no están registradas en el sistema: visitas, entrevistas o ingresos nuevos.
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Nombre de la visita
            </label>
            <input
              type="text"
              placeholder="Nombre completo de la visita"
              value={nombreVisita}
              onChange={(e) => { setNombreVisita(e.target.value); setErrorMsg(null); }}
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-vascan-gold/50 focus:bg-white/6 transition-colors"
            />
          </div>

          {/* Day selector */}
          <div>
            <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Selecciona el día
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-white/30">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : sortedMinutas.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-white/30 text-sm">No hay minutas disponibles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedMinutas.map((m) => {
                  const isSelected = selectedMinuta === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMinuta(m.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "bg-green-500/8 border-green-500/40"
                          : "bg-white/4 border-white/8 hover:border-white/15"
                      }`}
                    >
                      <div>
                        <p className={`font-semibold text-sm ${isSelected ? "text-green-400" : "text-white"}`}>
                          {formatDay(m.fecha)}
                        </p>
                        <p className="text-white/35 text-xs mt-0.5 capitalize">{m.familia}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={() => { setErrorMsg(null); createVale.mutate(); }}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition-all mt-2 ${
              canSubmit
                ? "bg-vascan-gold text-vascan-bg hover:brightness-110 active:scale-[0.98]"
                : "bg-vascan-gold/20 text-vascan-gold/40 cursor-not-allowed"
            }`}
          >
            {createVale.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Emitiendo vale...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Emitir Vale de Visita
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
