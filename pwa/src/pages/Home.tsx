import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  UtensilsCrossed,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Check,
  RefreshCw,
  QrCode,
  UserPlus,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import QRModal from "@/components/QRModal";
import Toast from "@/components/Toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface Minuta {
  id: string;
  casinoId: string;
  fecha: string;
  familia: string;
  opcion1: string;
  opcion2: string;
  opcion3: string;
  opcion4: string | null;
  opcion5: string | null;
  activo: boolean;
}

interface Pedido {
  id: string;
  userId: string;
  minutaId: string;
  opcionSeleccionada: number;
  tipo?: string;
  codigoQr: string | null;
}

type DaySelection = {
  minutaId: string;
  opcionSeleccionada: number;
  tipo: "seleccion" | "no_asiste";
};

type ToastState = { message: string; type: "success" | "error" | "warning" } | null;

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getOptions(m: Minuta) {
  const opts: { number: number; text: string }[] = [
    { number: 1, text: m.opcion1 },
    { number: 2, text: m.opcion2 },
    { number: 3, text: m.opcion3 },
  ];
  if (m.opcion4) opts.push({ number: 4, text: m.opcion4 });
  if (m.opcion5) opts.push({ number: 5, text: m.opcion5 });
  return opts;
}

// ── Home Screen ────────────────────────────────────────────────────────────
export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selections, setSelections] = useState<Record<string, DaySelection>>({});
  const [expandedMinuta, setExpandedMinuta] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [qrModal, setQrModal] = useState<{
    qrCode: string; opcionNum: number; opcionText: string; fecha: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
  }, []);

  // ── Queries ──
  const { data: minutas, isLoading, isRefetching, refetch } = useQuery<Minuta[]>({
    queryKey: ["/api/minutas", user?.casinoId ?? "none"],
    enabled: !!user?.casinoId,
  });

  const { data: periodoData } = useQuery<{ activo: boolean; periodo: unknown }>({
    queryKey: ["/api/periodo-activo", user?.casinoId ?? "none"],
    enabled: !!user?.casinoId,
  });

  const { data: pedidos } = useQuery<Pedido[]>({
    queryKey: ["/api/pedidos", user?.id ?? "none"],
    enabled: !!user?.id,
  });

  const periodoActivo = periodoData?.activo ?? false;

  // ── Derived data ──
  const sortedMinutas = useMemo(
    () => (minutas ?? []).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
    [minutas]
  );

  const pedidoByMinuta = useMemo(() => {
    const map: Record<string, Pedido> = {};
    (pedidos ?? []).forEach((p) => { map[p.minutaId] = p; });
    return map;
  }, [pedidos]);

  // ── Mutations ──
  const submitWeek = useMutation({
    mutationFn: async (selArray: DaySelection[]) => {
      const res = await apiRequest("POST", "/api/pedidos/semanal", {
        userId: user!.id,
        selecciones: selArray,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pedidos"] });
      setSelections({});
      showToast("¡Inscripción semanal registrada correctamente!", "success");
    },
    onError: (err: Error) => {
      showToast(err.message || "Hubo un problema al registrar tu inscripción.", "error");
    },
  });

  // ── Handlers ──
  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function selectOption(minutaId: string, opcion: number) {
    setSelections((prev) => ({
      ...prev,
      [minutaId]: { minutaId, opcionSeleccionada: opcion, tipo: "seleccion" },
    }));
    setExpandedMinuta(null);
  }

  function selectNoAsiste(minutaId: string) {
    setSelections((prev) => ({
      ...prev,
      [minutaId]: { minutaId, opcionSeleccionada: 0, tipo: "no_asiste" },
    }));
    setExpandedMinuta(null);
  }

  function toggleMinuta(minutaId: string) {
    setExpandedMinuta((prev) => (prev === minutaId ? null : minutaId));
  }

  function handleSubmitWeek() {
    if (!periodoActivo) {
      showToast("No hay un periodo de inscripción activo. Contacta a tu administrador.", "warning");
      return;
    }
    const selArray = Object.values(selections);
    if (selArray.length === 0) {
      showToast("Selecciona al menos una opción antes de enviar.", "warning");
      return;
    }
    submitWeek.mutate(selArray);
  }

  function openQrModal(minuta: Minuta, pedido: Pedido) {
    const options = getOptions(minuta);
    const opt = options.find((o) => o.number === pedido.opcionSeleccionada);
    setQrModal({
      qrCode: pedido.codigoQr || pedido.id,
      opcionNum: pedido.opcionSeleccionada,
      opcionText: opt?.text ?? "",
      fecha: minuta.fecha,
    });
  }

  // ── Status helpers ──
  function getDayStatus(minuta: Minuta): "registered" | "selected" | "no_asiste" | "pending" {
    const pedido = pedidoByMinuta[minuta.id];
    if (pedido) return pedido.opcionSeleccionada === 0 ? "no_asiste" : "registered";
    const sel = selections[minuta.id];
    if (sel) return sel.tipo === "no_asiste" ? "no_asiste" : "selected";
    return "pending";
  }

  const statusStyles = {
    registered: { dot: "bg-green-500", badge: "bg-green-500/15 text-green-400", label: "Inscrito", border: "#22C55E" },
    selected:   { dot: "bg-green-300", badge: "bg-green-300/15 text-green-300", label: "Seleccionado", border: "#86EFAC" },
    no_asiste:  { dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-400", label: "No asiste", border: "#F97316" },
    pending:    { dot: "bg-white/15",  badge: "bg-white/6 text-white/30", label: "Pendiente", border: "rgba(255,255,255,0.12)" },
  };

  const pendingSelections = Object.keys(selections).length;
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Render ──
  return (
    <div className="h-full flex flex-col bg-vascan-bg overflow-hidden">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

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
      <header className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vascan-gold/15 border border-vascan-gold/20 flex items-center justify-center">
            <span className="text-vascan-gold font-bold text-sm">V</span>
          </div>
          <div>
            <p className="text-white font-semibold text-base leading-tight">Hola, {user?.nombre}</p>
            <p className="text-vascan-goldLight text-xs leading-tight capitalize">
              {user?.role === "admin" ? "Administrador" : user?.role === "interlocutor" ? "Interlocutor" : "Comensal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/historial")}
            className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            title="Historial de pedidos"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Section title */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 pb-3">
        <UtensilsCrossed className="w-5 h-5 text-vascan-gold" />
        <h2 className="text-white font-semibold text-lg">Inscripción Semanal</h2>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-vascan-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Cargando minutas...</p>
        </div>
      ) : !user?.casinoId ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10 text-white/20" />}
          title="Sin casino asignado"
          subtitle="Contacta a tu administrador para ser asignado a un casino"
        />
      ) : sortedMinutas.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-10 h-10 text-white/20" />}
          title="Sin minutas disponibles"
          subtitle="No hay menús programados para esta semana"
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-6 space-y-2.5">
            {/* Period warning banner */}
            {!periodoActivo && (
              <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm leading-relaxed">
                  El periodo de inscripción no está activo. Solo puedes ver el menú.
                </p>
              </div>
            )}

            {/* Day cards */}
            {sortedMinutas.map((minuta) => {
              const d = new Date(minuta.fecha + "T12:00:00");
              const dayShort = DAYS_SHORT[d.getDay()];
              const dayFull = DAYS_ES[d.getDay()];
              const dayNum = d.getDate();
              const month = MONTHS_ES[d.getMonth()];
              const isToday = minuta.fecha === todayStr;
              const status = getDayStatus(minuta);
              const st = statusStyles[status];
              const isExpanded = expandedMinuta === minuta.id;
              const pedido = pedidoByMinuta[minuta.id];
              const sel = selections[minuta.id];
              const options = getOptions(minuta);
              const alreadyRegistered = !!pedido;

              return (
                <div
                  key={minuta.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  {/* Card header */}
                  <button
                    onClick={() => !alreadyRegistered && toggleMinuta(minuta.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                      !alreadyRegistered ? "active:bg-white/5" : ""
                    } ${isToday ? "bg-vascan-gold/5" : ""}`}
                    style={{ borderLeft: `4px solid ${st.border}` }}
                  >
                    {/* Left: date */}
                    <div className="flex items-center gap-3.5">
                      <div className="text-center w-10">
                        <p className={`text-[10px] uppercase font-medium tracking-wide ${isToday ? "text-vascan-gold" : "text-white/35"}`}>
                          {dayShort}
                        </p>
                        <p className={`text-xl font-bold leading-none my-0.5 ${isToday ? "text-vascan-gold" : "text-white"}`}>
                          {dayNum}
                        </p>
                        <p className="text-[10px] text-white/35">{month}</p>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{dayFull}</p>
                        <p className="text-vascan-goldLight text-xs capitalize">{minuta.familia || "Almuerzo"}</p>
                      </div>
                    </div>

                    {/* Right: status + chevron */}
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {!alreadyRegistered && (
                        isExpanded
                          ? <ChevronUp className="w-4 h-4 text-white/30" />
                          : <ChevronDown className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                  </button>

                  {/* Expanded options panel */}
                  {isExpanded && !alreadyRegistered && (
                    <div className="px-4 pt-3 pb-4 border-t border-white/8 space-y-2">
                      <p className="text-white/50 text-xs font-medium mb-3">Selecciona tu opción:</p>

                      {options.map((opt) => {
                        const isSelected = sel?.tipo === "seleccion" && sel?.opcionSeleccionada === opt.number;
                        return (
                          <button
                            key={opt.number}
                            onClick={() => selectOption(minuta.id, opt.number)}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-green-500/60 bg-green-500/8"
                                : "border-white/8 bg-white/3 hover:border-white/15"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                              isSelected ? "bg-green-500 text-white" : "bg-vascan-gold/20 text-vascan-gold"
                            }`}>
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : opt.number}
                            </div>
                            <p className={`flex-1 text-sm leading-snug ${isSelected ? "text-white font-medium" : "text-white/65"}`}>
                              {opt.text}
                            </p>
                            {isSelected && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                          </button>
                        );
                      })}

                      {/* No asiste */}
                      <button
                        onClick={() => selectNoAsiste(minuta.id)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          sel?.tipo === "no_asiste"
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "border-orange-500/30 bg-orange-500/5 text-orange-400 hover:border-orange-500/50"
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        No asisto este día
                      </button>
                    </div>
                  )}

                  {/* Registered info row */}
                  {alreadyRegistered && (
                    <div className="px-4 py-2.5 border-t border-white/8">
                      {pedido.opcionSeleccionada === 0 ? (
                        <p className="text-white/40 text-xs">No asistirás este día</p>
                      ) : (
                        <button
                          onClick={() => openQrModal(minuta, pedido)}
                          className="w-full flex items-center justify-between"
                        >
                          <p className="text-white/50 text-xs">
                            Opción {pedido.opcionSeleccionada} inscrita
                          </p>
                          <span className="flex items-center gap-1.5 text-vascan-gold text-xs font-medium">
                            <QrCode className="w-3.5 h-3.5" />
                            Ver vale
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vale de visita (interlocutor) */}
            {user?.role === "interlocutor" && (
              <button
                onClick={() => navigate("/vale-visita")}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border border-white/10 bg-white/4 hover:bg-white/6 transition-colors text-left"
              >
                <UserPlus className="w-5 h-5 text-vascan-gold" />
                <p className="flex-1 text-white font-medium text-sm">Emitir Vale de Visita</p>
                <ChevronDown className="w-4 h-4 text-white/30 -rotate-90" />
              </button>
            )}

            {/* Submit button */}
            {pendingSelections > 0 && (
              <button
                onClick={handleSubmitWeek}
                disabled={submitWeek.isPending}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:opacity-60 text-white font-semibold text-base transition-all mt-2"
              >
                {submitWeek.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirmar Inscripción ({pendingSelections} {pendingSelections === 1 ? "día" : "días"})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 pb-16">
      <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-white/50 font-medium text-base text-center">{title}</p>
      <p className="text-white/30 text-sm text-center leading-relaxed">{subtitle}</p>
    </div>
  );
}
