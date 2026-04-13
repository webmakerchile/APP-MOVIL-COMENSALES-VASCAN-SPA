import cron from "node-cron";
import { db } from "./db";
import { pedidos, minutas, casinos } from "../shared/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────
interface DailyReportEntry {
  casinoNombre: string;
  fecha: string;
  totalInscritos: number;
  totalNoAsiste: number;
  totalVisitas: number;
  porOpcion: Record<number, number>;
}

// ── Core report generator ──────────────────────────────────────────────────
export async function generateDailyReport(targetDate?: string): Promise<DailyReportEntry[]> {
  const today = targetDate ?? new Date().toISOString().split("T")[0];

  const allCasinos = await db.select().from(casinos).where(eq(casinos.activo, true));
  const report: DailyReportEntry[] = [];

  for (const casino of allCasinos) {
    const minutasByCasino = await db
      .select()
      .from(minutas)
      .where(and(eq(minutas.casinoId, casino.id), eq(minutas.fecha, today), eq(minutas.activo, true)));

    if (minutasByCasino.length === 0) continue;

    let totalInscritos = 0;
    let totalNoAsiste = 0;
    let totalVisitas = 0;
    const porOpcion: Record<number, number> = {};

    for (const minuta of minutasByCasino) {
      const pedidosList = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.minutaId, minuta.id));

      for (const p of pedidosList) {
        if (p.tipo === "no_asiste" || p.opcionSeleccionada === 0) {
          totalNoAsiste++;
        } else if (p.tipo === "visita") {
          totalVisitas++;
          totalInscritos++;
        } else {
          totalInscritos++;
          const op = p.opcionSeleccionada ?? 0;
          porOpcion[op] = (porOpcion[op] ?? 0) + 1;
        }
      }
    }

    report.push({
      casinoNombre: casino.nombre,
      fecha: today,
      totalInscritos,
      totalNoAsiste,
      totalVisitas,
      porOpcion,
    });
  }

  return report;
}

// ── Pretty logger ──────────────────────────────────────────────────────────
function logReport(entries: DailyReportEntry[], targetDate: string) {
  console.log("─".repeat(60));
  console.log(`📊 REPORTE DIARIO VASCAN — ${targetDate}`);
  console.log("─".repeat(60));

  if (entries.length === 0) {
    console.log("  Sin minutas programadas para hoy.");
  } else {
    for (const e of entries) {
      console.log(`\n  Casino: ${e.casinoNombre}`);
      console.log(`  ├─ Inscritos : ${e.totalInscritos}`);
      console.log(`  ├─ No asiste : ${e.totalNoAsiste}`);
      console.log(`  ├─ Visitas   : ${e.totalVisitas}`);
      const opKeys = Object.keys(e.porOpcion).map(Number).sort();
      for (const k of opKeys) {
        console.log(`  │    Opción ${k}: ${e.porOpcion[k]} persona(s)`);
      }
      console.log(`  └─ Total     : ${e.totalInscritos + e.totalNoAsiste}`);
    }
  }

  console.log("\n" + "─".repeat(60));
}

// ── Cron setup ────────────────────────────────────────────────────────────
/**
 * Runs every day at:
 *  - 03:00 UTC  → 00:00 Chile Standard Time (UTC-3)
 *  - 04:00 UTC  → 00:00 Chile Summer Time   (UTC-4, during daylight saving)
 *
 * We run at BOTH to cover both timezone offsets.
 */
export function startCronJobs() {
  // Midnight CL (UTC-3)
  cron.schedule("0 3 * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    console.log(`[cron] Generando reporte diario para ${today}...`);
    try {
      const entries = await generateDailyReport(today);
      logReport(entries, today);
    } catch (err) {
      console.error("[cron] Error al generar reporte diario:", err);
    }
  }, { timezone: "UTC" });

  // Midnight CL summer time (UTC-4)
  cron.schedule("0 4 * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    // Avoid running twice if already ran at 03:00 UTC for this date
    const nowUTC = new Date().getUTCHours();
    if (nowUTC === 4) {
      console.log(`[cron] Reporte horario verano CL para ${today}...`);
      try {
        const entries = await generateDailyReport(today);
        logReport(entries, today);
      } catch (err) {
        console.error("[cron] Error al generar reporte (horario verano):", err);
      }
    }
  }, { timezone: "UTC" });

  console.log("[cron] Reportes diarios programados (03:00 y 04:00 UTC → medianoche CL)");
}
