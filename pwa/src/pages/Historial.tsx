import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, QrCode, Clock, CheckCircle, XCircle, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import QRModal from "@/components/QRModal";

// ── Types ──────────────────────────────────────────────────────────────────
interface PedidoEnriquecido {
  id: string;
  userId: string;
  minutaId: string;
  opcionSeleccionada: number;
  tipo: string | null;
  codigoQr: string | null;
  fecha: string | null;
  familia: string | null;
  opcionTexto: string | null;
  createdAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_FULL = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function parseDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00");
}

function formatMonthYear(dateStr: string) {
  const d = parseDate(dateStr);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr: string) {
  const d = parseDate(dateStr);
  return {
    day: DAYS_ES[d.getDay()],
    num: d.getDate(),
    month: MONTHS_SHORT[d.getMonth()],
    year: d.getFullYear(),
  };
}

function groupByMonth(pedidos: PedidoEnriquecido[]): Record<string, PedidoEnriquecido[]> {
  const groups: Record<string, PedidoEnriquecido[]> = {};
  for (const p of pedidos) {
    const key = p.fecha ? formatMonthYear(p.fecha) : "Sin fecha";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}

function isNoAsiste(p: PedidoEnriquecido) {
  return p.opcionSeleccionada === 0 || p.tipo === "no_asiste";
}

function isVisita(p: PedidoEnriquecido) {
  return p.tipo === "visita";
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Historial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qrModal, setQrModal] = useState<{
    qrCode: string; opcionNum: number; opcionText: string; fecha: string;
  } | null>(null);

  const { data: pedidos, isLoading, error } = useQuery<PedidoEnriquecido[]>({
    queryKey: ["/api/historial", user?.id ?? "none"],
    enabled: !!user?.id,
  });

  const grouped = pedidos && pedidos.length > 0 ? groupByMonth(pedidos) : {};
  const monthKeys = Object.keys(grouped);

  const totalInscritos = pedidos?.filter((p) => !isNoAsiste(p)).length ?? 0;
  const totalNoAsiste = pedidos?.filter((p) => isNoAsiste(p)).length ?? 0;

  return (
    <div className="h-full flex flex-col bg-vascan-bg overflow-hidden">
      {qrModal && (
        <QRModal
          qrCode={qrModal.qrCode}
          opcionNum={qrModal.opcionNum}
          opcionText={qrModal.opcionText}
          fecha={qrModal.fecha}
          onClose={() => setQrModal(null)}
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
        <div className="flex-1">
          <h1 className="text-white font-semibold text-lg leading-tight">Historial de Pedidos</h1>
          <p className="text-white/35 text-xs leading-tight">{user?.nombre} {user?.apellido}</p>
        </div>
      </header>

      {/* Stats bar */}
      {!isLoading && (pedidos?.length ?? 0) > 0 && (
        <div className="flex-shrink-0 flex gap-3 px-4 pb-4">
          <StatCard
            icon={<CheckCircle className="w-4 h-4 text-green-400" />}
            label="Inscritos"
            value={totalInscritos}
            color="green"
          />
          <StatCard
            icon={<XCircle className="w-4 h-4 text-orange-400" />}
            label="No asistió"
            value={totalNoAsiste}
            color="orange"
          />
          <StatCard
            icon={<UtensilsCrossed className="w-4 h-4 text-vascan-gold" />}
            label="Total"
            value={pedidos?.length ?? 0}
            color="gold"
          />
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-vascan-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Cargando historial...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-red-400/60" />
          </div>
          <p className="text-white/50 font-medium text-base">Error al cargar historial</p>
          <p className="text-white/30 text-sm text-center">Intenta nuevamente más tarde</p>
        </div>
      ) : monthKeys.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 pb-16">
          <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/50 font-medium text-base">Sin historial aún</p>
          <p className="text-white/30 text-sm text-center leading-relaxed">
            Tus inscripciones aparecerán aquí una vez que realices pedidos
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 px-5 py-2.5 rounded-xl bg-vascan-gold/15 border border-vascan-gold/25 text-vascan-gold text-sm font-medium hover:bg-vascan-gold/20 transition-colors"
          >
            Ir a inscribirse
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-8 space-y-6">
            {monthKeys.map((monthKey) => (
              <div key={monthKey}>
                {/* Month separator */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-vascan-gold/70 text-xs font-semibold uppercase tracking-wider flex-shrink-0">
                    {monthKey}
                  </p>
                  <div className="flex-1 h-px bg-white/6" />
                </div>

                {/* Cards for this month */}
                <div className="space-y-2">
                  {grouped[monthKey].map((pedido) => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onShowQr={() => {
                        if (pedido.codigoQr && pedido.fecha) {
                          setQrModal({
                            qrCode: pedido.codigoQr,
                            opcionNum: pedido.opcionSeleccionada,
                            opcionText: pedido.opcionTexto ?? "",
                            fecha: pedido.fecha,
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "green" | "orange" | "gold";
}) {
  const bg = {
    green: "bg-green-500/8 border-green-500/15",
    orange: "bg-orange-500/8 border-orange-500/15",
    gold: "bg-vascan-gold/8 border-vascan-gold/15",
  }[color];

  return (
    <div className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border ${bg}`}>
      {icon}
      <p className="text-white font-bold text-xl leading-none">{value}</p>
      <p className="text-white/35 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function PedidoCard({
  pedido,
  onShowQr,
}: {
  pedido: PedidoEnriquecido;
  onShowQr: () => void;
}) {
  const noAsiste = isNoAsiste(pedido);
  const visita = isVisita(pedido);
  const hasQr = !!pedido.codigoQr && !noAsiste;

  const fecha = pedido.fecha ? formatShortDate(pedido.fecha) : null;

  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-colors"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: noAsiste
          ? "rgba(249,115,22,0.15)"
          : "rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${noAsiste ? "#F97316" : "#22C55E"}`,
      }}
    >
      {/* Date column */}
      {fecha ? (
        <div className="text-center w-9 flex-shrink-0">
          <p className="text-white/30 text-[9px] uppercase tracking-wide">{fecha.day}</p>
          <p className="text-white font-bold text-lg leading-none">{fecha.num}</p>
          <p className="text-white/30 text-[9px]">{fecha.month}</p>
        </div>
      ) : (
        <div className="w-9 flex-shrink-0" />
      )}

      {/* Divider */}
      <div className="w-px h-10 bg-white/8 flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        {noAsiste ? (
          <>
            <p className="text-orange-400 font-medium text-sm leading-tight">No asistió</p>
            <p className="text-white/30 text-xs mt-0.5 capitalize">{pedido.familia || "Almuerzo"}</p>
          </>
        ) : visita ? (
          <>
            <p className="text-vascan-gold font-medium text-sm leading-tight">Vale de visita</p>
            <p className="text-white/40 text-xs mt-0.5 truncate capitalize">{pedido.familia || "Almuerzo"}</p>
          </>
        ) : (
          <>
            <p className="text-white font-medium text-sm leading-tight truncate">
              Opción {pedido.opcionSeleccionada}
              {pedido.opcionTexto ? ` — ${pedido.opcionTexto}` : ""}
            </p>
            <p className="text-white/30 text-xs mt-0.5 capitalize">{pedido.familia || "Almuerzo"}</p>
          </>
        )}
      </div>

      {/* Status icon / QR button */}
      {hasQr ? (
        <button
          onClick={onShowQr}
          className="w-9 h-9 rounded-lg bg-vascan-gold/10 border border-vascan-gold/20 flex items-center justify-center text-vascan-gold hover:bg-vascan-gold/15 transition-colors flex-shrink-0"
        >
          <QrCode className="w-4 h-4" />
        </button>
      ) : noAsiste ? (
        <XCircle className="w-5 h-5 text-orange-400/60 flex-shrink-0" />
      ) : (
        <CheckCircle className="w-5 h-5 text-green-400/60 flex-shrink-0" />
      )}
    </div>
  );
}
