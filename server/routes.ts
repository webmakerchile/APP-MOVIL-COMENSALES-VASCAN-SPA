import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { storage } from "./storage";
import { pool } from "./db";
import { loginSchema, insertUserSchema, insertMinutaSchema, insertPedidoSchema, insertCasinoSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);
const upload = multer({ dest: "/tmp/uploads/" });

function requireAdmin(req: Request, res: Response, next: Function) {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ message: "No autenticado" });
  }
  storage.getUser(userId).then((user) => {
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Acceso restringido a administradores" });
    }
    (req as any).currentUser = user;
    next();
  }).catch(() => {
    return res.status(500).json({ message: "Error de autenticación" });
  });
}

async function autoSeed() {
  try {
    const existingCasinos = await storage.getCasinos();
    if (existingCasinos.length > 0) return;

    console.log("Auto-seeding database...");

    const casino = await storage.createCasino({
      nombre: "Casino Central Santiago",
      direccion: "Av. Providencia 1234, Santiago",
    });

    const casino2 = await storage.createCasino({
      nombre: "Casino Planta Rancagua",
      direccion: "Calle Industrial 567, Rancagua",
    });

    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const menus1 = [
      { o1: "Pollo al horno con arroz y ensalada", o2: "Pescado frito con puré de papas", o3: "Pasta boloñesa con parmesano", o4: "Ensalada César con pollo grillado" },
      { o1: "Lomo saltado con arroz", o2: "Cazuela de vacuno", o3: "Tortilla española con ensalada", o4: "Wrap de pollo teriyaki" },
      { o1: "Chuleta de cerdo con arroz", o2: "Merluza al horno con verduras", o3: "Lasaña de carne", o4: "Bowl de quinoa con pollo" },
      { o1: "Estofado de res con papas", o2: "Salmón grillado con espárragos", o3: "Risotto de champiñones", o4: null },
      { o1: "Pollo a la plancha con ensalada", o2: "Albóndigas en salsa con arroz", o3: "Tacos de carne", o4: "Sopa de verduras con pan" },
      { o1: "Milanesa de pollo con puré", o2: "Pescado al vapor con arroz", o3: "Empanadas de pino", o4: null },
      { o1: "Asado alemán con puré", o2: "Carbonada", o3: "Pastel de choclo", o4: "Ensalada mediterránea" },
    ];

    for (let i = 0; i < dates.length; i++) {
      const menu = menus1[i % menus1.length];
      await storage.createMinuta({
        casinoId: casino.id,
        fecha: dates[i],
        opcion1: menu.o1,
        opcion2: menu.o2,
        opcion3: menu.o3,
        opcion4: menu.o4,
      });

      await storage.createMinuta({
        casinoId: casino2.id,
        fecha: dates[i],
        opcion1: "Cazuela de vacuno con verduras",
        opcion2: "Lomo saltado con arroz",
        opcion3: "Tortilla española con ensalada",
      });
    }

    const hashedPassword = await bcrypt.hash("123456", 10);
    await storage.createUser({
      rut: "12345678-9",
      password: hashedPassword,
      nombre: "Juan",
      apellido: "Pérez",
      role: "comensal",
      casinoId: casino.id,
    });

    await storage.createUser({
      rut: "11111111-1",
      password: hashedPassword,
      nombre: "Admin",
      apellido: "Sistema",
      role: "admin",
      casinoId: null,
    });

    await storage.createUser({
      rut: "22222222-2",
      password: hashedPassword,
      nombre: "María",
      apellido: "González",
      role: "interlocutor",
      casinoId: casino.id,
    });

    console.log("Auto-seed complete.");
  } catch (err) {
    console.error("Auto-seed error:", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "vascan-dev-fallback-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    }),
  );

  await autoSeed();

  // ── Admin Panel ──
  app.get("/admin", (_req: Request, res: Response) => {
    const filePath = path.resolve(process.cwd(), "web", "src", "admin.html");
    res.sendFile(filePath);
  });

  // ── Auth Routes ──
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "RUT y contraseña son requeridos" });
      }

      const { rut, password } = parsed.data;
      const user = await storage.getUserByRut(rut);

      if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      if (!user.activo) {
        return res.status(403).json({ message: "Usuario desactivado" });
      }

      (req.session as any).userId = user.id;

      const { password: _, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      return res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
      }

      const existing = await storage.getUserByRut(parsed.data.rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Usuarios CRUD (admin-only) ──
  app.get("/api/usuarios", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password, ...u }) => u);
      return res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/usuarios", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { rut, nombre, apellido, role, casinoId, password: pwd } = req.body;
      if (!rut || !nombre || !apellido) {
        return res.status(400).json({ message: "RUT, nombre y apellido son requeridos" });
      }

      const existing = await storage.getUserByRut(rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya está registrado" });
      }

      const defaultPwd = pwd || rut.replace(/[^0-9]/g, "").slice(0, 4) || "1234";
      const hashedPassword = await bcrypt.hash(defaultPwd, 10);
      const user = await storage.createUser({
        rut,
        nombre,
        apellido,
        password: hashedPassword,
        role: role || "comensal",
        casinoId: casinoId || null,
      });

      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/usuarios/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, apellido, role, casinoId, activo, password: newPwd } = req.body;

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (apellido !== undefined) updateData.apellido = apellido;
      if (role !== undefined) updateData.role = role;
      if (casinoId !== undefined) updateData.casinoId = casinoId || null;
      if (activo !== undefined) updateData.activo = activo;
      if (newPwd) updateData.password = await bcrypt.hash(newPwd, 10);

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.delete("/api/usuarios/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      return res.json({ message: "Usuario eliminado" });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Casinos CRUD ──
  app.get("/api/casinos", async (_req: Request, res: Response) => {
    try {
      const casinosList = await storage.getCasinos();
      return res.json(casinosList);
    } catch (error) {
      console.error("Get casinos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/casinos/all", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const casinosList = await storage.getAllCasinos();
      return res.json(casinosList);
    } catch (error) {
      console.error("Get all casinos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/casinos", async (req: Request, res: Response) => {
    try {
      const parsed = insertCasinoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      const casino = await storage.createCasino(parsed.data);
      return res.status(201).json(casino);
    } catch (error) {
      console.error("Create casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/casinos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, direccion, activo } = req.body;
      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (direccion !== undefined) updateData.direccion = direccion;
      if (activo !== undefined) updateData.activo = activo;

      const casino = await storage.updateCasino(id, updateData);
      if (!casino) {
        return res.status(404).json({ message: "Casino no encontrado" });
      }
      return res.json(casino);
    } catch (error) {
      console.error("Update casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.delete("/api/casinos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCasino(id);
      if (!deleted) {
        return res.status(404).json({ message: "Casino no encontrado" });
      }
      return res.json({ message: "Casino desactivado" });
    } catch (error) {
      console.error("Delete casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Minutas CRUD ──
  app.get("/api/minutas", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const minutasList = await storage.getAllMinutas();
      return res.json(minutasList);
    } catch (error) {
      console.error("Get all minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/minutas/:casinoId", async (req: Request, res: Response) => {
    try {
      const { casinoId } = req.params;
      const minutasList = await storage.getMinutasByCasino(casinoId);
      return res.json(minutasList);
    } catch (error) {
      console.error("Get minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/minutas", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertMinutaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
      }
      const minuta = await storage.createMinuta(parsed.data);
      return res.status(201).json(minuta);
    } catch (error) {
      console.error("Create minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/minutas/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { casinoId, fecha, opcion1, opcion2, opcion3, opcion4, activo } = req.body;
      const updateData: any = {};
      if (casinoId !== undefined) updateData.casinoId = casinoId;
      if (fecha !== undefined) updateData.fecha = fecha;
      if (opcion1 !== undefined) updateData.opcion1 = opcion1;
      if (opcion2 !== undefined) updateData.opcion2 = opcion2;
      if (opcion3 !== undefined) updateData.opcion3 = opcion3;
      if (opcion4 !== undefined) updateData.opcion4 = opcion4;
      if (activo !== undefined) updateData.activo = activo;

      const minuta = await storage.updateMinuta(id, updateData);
      if (!minuta) {
        return res.status(404).json({ message: "Minuta no encontrada" });
      }
      return res.json(minuta);
    } catch (error) {
      console.error("Update minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.delete("/api/minutas/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMinuta(id);
      if (!deleted) {
        return res.status(404).json({ message: "Minuta no encontrada" });
      }
      return res.json({ message: "Minuta desactivada" });
    } catch (error) {
      console.error("Delete minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Pedidos (with Interlocutor logic) ──
  app.get("/api/pedidos/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const pedidosList = await storage.getPedidosByUser(userId);
      return res.json(pedidosList);
    } catch (error) {
      console.error("Get pedidos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/pedidos", async (req: Request, res: Response) => {
    try {
      const parsed = insertPedidoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const user = await storage.getUser(parsed.data.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const minuta = await storage.getMinuta(parsed.data.minutaId);
      if (!minuta) {
        return res.status(404).json({ message: "Minuta no encontrada" });
      }

      if (user.role === "comensal") {
        const existing = await storage.getPedidoByUserAndMinuta(parsed.data.userId, parsed.data.minutaId);
        if (existing) {
          return res.status(409).json({ message: "Ya tienes un pedido registrado para esta fecha. Solo puedes emitir 1 vale por comida." });
        }
      }

      let opcionFinal = parsed.data.opcionSeleccionada;
      if (user.role === "interlocutor") {
        opcionFinal = 1;
      }

      const codigoQr = `VASCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pedido = await storage.createPedido({
        userId: parsed.data.userId,
        minutaId: parsed.data.minutaId,
        opcionSeleccionada: opcionFinal,
        codigoQr,
      });

      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create pedido error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Consolidación / Reportes ──
  app.get("/api/reportes/consolidacion", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { casinoId, fecha } = req.query;
      if (!casinoId || !fecha) {
        return res.status(400).json({ message: "casinoId y fecha son requeridos" });
      }

      const casino = await storage.getCasino(casinoId as string);
      if (!casino) {
        return res.status(404).json({ message: "Casino no encontrado" });
      }

      const minutasList = await storage.getMinutasByCasino(casinoId as string);
      const minuta = minutasList.find((m) => m.fecha === fecha);

      if (!minuta) {
        return res.json({ casinoNombre: casino.nombre, fecha, minuta: null, opciones: [], totalPedidos: 0 });
      }

      const pedidosForMinuta = await storage.getPedidosByMinuta(minuta.id);
      const totalPedidos = pedidosForMinuta.length;

      const opciones = [];
      const optionTexts = [minuta.opcion1, minuta.opcion2, minuta.opcion3, minuta.opcion4].filter(Boolean);

      for (let i = 0; i < optionTexts.length; i++) {
        const num = i + 1;
        const count = pedidosForMinuta.filter((p) => p.opcionSeleccionada === num).length;
        opciones.push({
          numero: num,
          descripcion: optionTexts[i],
          cantidad: count,
          porcentaje: totalPedidos > 0 ? Math.round((count / totalPedidos) * 100) : 0,
        });
      }

      return res.json({
        casinoNombre: casino.nombre,
        fecha,
        minuta: { id: minuta.id, opcion1: minuta.opcion1, opcion2: minuta.opcion2, opcion3: minuta.opcion3, opcion4: minuta.opcion4 },
        opciones,
        totalPedidos,
      });
    } catch (error) {
      console.error("Consolidacion error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ── Carga Masiva de Usuarios ──
  app.post("/api/usuarios/upload", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió archivo" });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      let created = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: { row: number; error: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        try {
          const rut = String(row["RUT"] || row["rut"] || "").trim();
          const nombre = String(row["Nombre"] || row["nombre"] || "").trim();
          const apellido = String(row["Apellido"] || row["apellido"] || "").trim();
          const rolRaw = String(row["Rol"] || row["rol"] || "comensal").trim().toLowerCase();
          const casinoId = String(row["Casino_ID"] || row["casino_id"] || row["CasinoID"] || "").trim();

          if (!rut || !nombre) {
            errorDetails.push({ row: rowNum, error: "RUT o Nombre vacío" });
            errors++;
            continue;
          }

          const rol = rolRaw === "interlocutor" ? "interlocutor" : "comensal";
          const existing = await storage.getUserByRut(rut);
          if (existing) { skipped++; continue; }

          const digits = rut.replace(/[^0-9]/g, "");
          const defaultPassword = digits.slice(0, 4) || "1234";
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          await storage.createUser({ rut, nombre, apellido, password: hashedPassword, role: rol, casinoId: casinoId || null });
          created++;
        } catch (err: any) {
          errorDetails.push({ row: rowNum, error: err.message || "Error desconocido" });
          errors++;
        }
      }

      try { fs.unlinkSync(req.file.path); } catch {}
      return res.json({ created, skipped, errors, errorDetails });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Error al procesar el archivo" });
    }
  });

  // ── Plantillas Descargables ──
  app.get("/api/plantillas/usuarios", (_req: Request, res: Response) => {
    try {
      const wb = XLSX.utils.book_new();

      const instrucciones = [
        ["PLANTILLA DE CARGA DE USUARIOS — VASCAN SPA"],
        [],
        ["INSTRUCCIONES:"],
        ["1. Complete los datos en la hoja 'Usuarios' respetando el formato indicado."],
        ["2. El campo RUT debe incluir el guión y dígito verificador (ej: 12345678-9)."],
        ["3. El campo Rol acepta: comensal, interlocutor."],
        ["4. Casino_ID debe ser el identificador UUID del casino asignado."],
        ["5. La contraseña por defecto serán los primeros 4 dígitos del RUT."],
        ["6. Los usuarios con RUT duplicado serán omitidos automáticamente."],
        [],
        ["CAMPOS OBLIGATORIOS: RUT, Nombre, Apellido"],
        ["CAMPOS OPCIONALES: Rol (default: comensal), Casino_ID"],
      ];
      const wsInst = XLSX.utils.aoa_to_sheet(instrucciones);
      wsInst["!cols"] = [{ wch: 70 }];
      XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

      const headers = ["RUT", "Nombre", "Apellido", "Rol", "Casino_ID"];
      const example1 = ["12345678-9", "Juan", "Pérez", "comensal", ""];
      const example2 = ["98765432-1", "María", "González", "interlocutor", ""];
      const example3 = ["11223344-5", "Carlos", "Muñoz", "comensal", ""];
      const wsData = XLSX.utils.aoa_to_sheet([headers, example1, example2, example3]);
      wsData["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsData, "Usuarios");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Usuarios_Vascan.xlsx");
      return res.send(Buffer.from(buf));
    } catch (error) {
      console.error("Template error:", error);
      return res.status(500).json({ message: "Error al generar plantilla" });
    }
  });

  app.get("/api/plantillas/minutas", async (_req: Request, res: Response) => {
    try {
      const wb = XLSX.utils.book_new();
      const casinosList = await storage.getCasinos();

      const instrucciones = [
        ["PLANTILLA DE MINUTAS SEMANALES — VASCAN SPA"],
        [],
        ["INSTRUCCIONES:"],
        ["1. Complete las minutas en la hoja correspondiente a cada casino."],
        ["2. Cada semana tiene 5 columnas (Lunes a Viernes) y hasta 5 opciones por día."],
        ["3. El campo Fecha usa formato AAAA-MM-DD (ej: 2026-03-09)."],
        ["4. Las opciones 4 y 5 son opcionales."],
        ["5. Para importar estas minutas, use el panel de administración."],
        [],
        ["FORMATO POR SEMANA:"],
        ["", "", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
        ["SEMANA_X", "OPCIÓN 1", "(Plato 1)", "(Plato 1)", "(Plato 1)", "(Plato 1)", "(Plato 1)"],
        ["", "OPCIÓN 2", "(Plato 2)", "(Plato 2)", "(Plato 2)", "(Plato 2)", "(Plato 2)"],
        ["", "OPCIÓN 3", "(Plato 3)", "(Plato 3)", "(Plato 3)", "(Plato 3)", "(Plato 3)"],
        ["", "OPCIÓN 4", "(Plato 4)", "(Plato 4)", "(Plato 4)", "(Plato 4)", "(Plato 4)"],
        ["", "OPCIÓN 5", "(Plato 5)", "(Plato 5)", "(Plato 5)", "(Plato 5)", "(Plato 5)"],
      ];
      const wsInst = XLSX.utils.aoa_to_sheet(instrucciones);
      wsInst["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);

      for (const casino of casinosList) {
        const sheetData: any[][] = [];
        sheetData.push(["PLANIFICACIÓN SEMANAL DE MINUTAS"]);
        sheetData.push(["Casino:", casino.nombre]);
        sheetData.push(["Dirección:", casino.direccion || ""]);
        sheetData.push(["ID Casino:", casino.id]);
        sheetData.push([]);

        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(monday);
          weekStart.setDate(monday.getDate() + week * 7);
          const dates: string[] = [];
          const dateLabels: string[] = [];
          const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

          for (let d = 0; d < 5; d++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + d);
            dates.push(day.toISOString().split("T")[0]);
            dateLabels.push(`${DIAS[d]} ${day.getDate()}/${day.getMonth() + 1}`);
          }

          const weekNum = week + 1;
          sheetData.push(["", "", ...dateLabels]);
          sheetData.push(["", "FECHA", ...dates]);
          sheetData.push([`SEMANA ${weekNum}`, "OPCIÓN 1", "", "", "", "", ""]);
          sheetData.push(["", "OPCIÓN 2", "", "", "", "", ""]);
          sheetData.push(["", "OPCIÓN 3", "", "", "", "", ""]);
          sheetData.push(["", "OPCIÓN 4", "", "", "", "", ""]);
          sheetData.push(["", "OPCIÓN 5", "", "", "", "", ""]);
          sheetData.push([]);
          sheetData.push(["", "CONSOLIDACIÓN", ...dateLabels]);
          sheetData.push(["", "Inscritos Op.1", 0, 0, 0, 0, 0]);
          sheetData.push(["", "Inscritos Op.2", 0, 0, 0, 0, 0]);
          sheetData.push(["", "Inscritos Op.3", 0, 0, 0, 0, 0]);
          sheetData.push(["", "Inscritos Op.4", 0, 0, 0, 0, 0]);
          sheetData.push(["", "Inscritos Op.5", 0, 0, 0, 0, 0]);
          sheetData.push(["", "Sin inscripción", "", "", "", "", ""]);
          sheetData.push(["", "Visitas", "", "", "", "", ""]);
          sheetData.push(["", "TOTAL", 0, 0, 0, 0, 0]);
          sheetData.push([]);
          sheetData.push([]);
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 32 }, { wch: 32 }, { wch: 32 }, { wch: 32 }, { wch: 32 }];
        const safeSheetName = casino.nombre.substring(0, 28).replace(/[\\\/\?\*\[\]]/g, "");
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      }

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Minutas_Vascan.xlsx");
      return res.send(Buffer.from(buf));
    } catch (error) {
      console.error("Template minutas error:", error);
      return res.status(500).json({ message: "Error al generar plantilla" });
    }
  });

  // ── Importar Minutas desde Excel ──
  app.post("/api/minutas/upload", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió archivo" });
      }

      const workbook = XLSX.readFile(req.file.path);
      let created = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: { sheet: string; row: number; error: string }[] = [];

      for (const sheetName of workbook.SheetNames) {
        if (sheetName === "Instrucciones") continue;
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 }) as any[][];

        let casinoId = "";
        for (const row of rows) {
          if (row[0] === "ID Casino:" && row[1]) {
            casinoId = String(row[1]).trim();
            break;
          }
        }
        if (!casinoId) continue;

        const casino = await storage.getCasino(casinoId);
        if (!casino) {
          errorDetails.push({ sheet: sheetName, row: 0, error: `Casino ID "${casinoId}" no encontrado` });
          errors++;
          continue;
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1] || row[1] !== "FECHA") continue;

          const fechas = [row[2], row[3], row[4], row[5], row[6]].filter(Boolean).map(f => String(f).trim());

          for (let dayIdx = 0; dayIdx < fechas.length; dayIdx++) {
            const fecha = fechas[dayIdx];
            if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;

            try {
              const opciones: string[] = [];
              for (let optRow = 1; optRow <= 5; optRow++) {
                const optionRow = rows[i + optRow];
                if (optionRow && optionRow[dayIdx + 2]) {
                  opciones.push(String(optionRow[dayIdx + 2]).trim());
                }
              }

              if (opciones.length < 3) continue;

              const existingMinutas = await storage.getMinutasByCasino(casinoId);
              const existing = existingMinutas.find(m => m.fecha === fecha);
              if (existing) { skipped++; continue; }

              await storage.createMinuta({
                casinoId,
                fecha,
                opcion1: opciones[0],
                opcion2: opciones[1],
                opcion3: opciones[2],
                opcion4: opciones[3] || null,
              });
              created++;
            } catch (err: any) {
              errorDetails.push({ sheet: sheetName, row: i, error: err.message });
              errors++;
            }
          }
        }
      }

      try { fs.unlinkSync(req.file!.path); } catch {}
      return res.json({ created, skipped, errors, errorDetails });
    } catch (error) {
      console.error("Upload minutas error:", error);
      return res.status(500).json({ message: "Error al procesar el archivo" });
    }
  });

  // ── Seed Data (manual) ──
  app.get("/api/seed", async (_req: Request, res: Response) => {
    try {
      await autoSeed();
      return res.json({ message: "Seed ejecutado" });
    } catch (error) {
      console.error("Seed error:", error);
      return res.status(500).json({ message: "Error al crear datos de prueba" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
