import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";
import { storage } from "./storage";
import { pool, db } from "./db";
import { loginSchema, insertUserSchema, insertMinutaSchema, insertPedidoSchema, insertCasinoSchema, pedidos as pedidosTable } from "@shared/schema";

const PgSession = connectPgSimple(session);
const upload = multer({ dest: "/tmp/uploads/" });

const SUPER_ADMIN_RUT = "21212011-1";

function validarRutChileno(rutCompleto: string): boolean {
  const cleaned = rutCompleto.replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
  if (cleaned.length < 2) return false;
  const cuerpo = cleaned.slice(0, -1);
  const dvIngresado = cleaned.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? "0" : resto === 1 ? "K" : String(11 - resto);
  return dvIngresado === dvCalculado;
}

function looksLikeRut(val: string): boolean {
  return /\d/.test(val) && /^[\d.\-kK]+$/.test(val.trim());
}

async function ensureSuperAdmin() {
  try {
    const existing = await storage.getUserByRut(SUPER_ADMIN_RUT);
    if (!existing) {
      const hashed = await bcrypt.hash("peseta832", 10);
      await storage.createUser({
        rut: SUPER_ADMIN_RUT,
        password: hashed,
        nombre: "Super",
        apellido: "Admin",
        role: "admin",
        casinoId: null,
      });
      console.log("Super admin created.");
    }
  } catch (err) {
    console.error("Super admin init error:", err);
  }
  try {
    const oliver = await storage.getUserByRut("olivervasquez");
    if (!oliver) {
      const hashed = await bcrypt.hash("6676", 10);
      await storage.createUser({
        rut: "olivervasquez",
        password: hashed,
        nombre: "Oliver",
        apellido: "Vasquez",
        role: "admin",
        casinoId: null,
      });
      console.log("Oliver admin created.");
    }
  } catch (err) {
    console.error("Oliver admin init error:", err);
  }
}

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
  await ensureSuperAdmin();

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
      const usersWithoutPasswords = allUsers
        .filter(u => u.rut !== SUPER_ADMIN_RUT)
        .map(({ password, ...u }) => u);
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

      if (looksLikeRut(rut) && !validarRutChileno(rut)) {
        return res.status(400).json({ message: "El RUT ingresado no es válido. Verifique el dígito verificador." });
      }

      const existing = await storage.getUserByRut(rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya está registrado en el sistema" });
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

  app.get("/api/casinos/:id/has-history", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const casinoMinutas = await storage.getAllMinutasByCasino(id);
      const allUsers = await storage.getUsers();
      const usersInCasino = allUsers.filter(u => u.casinoId === id);
      const hasHistory = casinoMinutas.length > 0 || usersInCasino.length > 0;
      return res.json({ hasHistory, minutas: casinoMinutas.length, usuarios: usersInCasino.length });
    } catch (error) {
      return res.status(500).json({ message: "Error al verificar historial" });
    }
  });

  app.delete("/api/casinos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const force = req.query.force === "true";

      const casinoMinutas = await storage.getAllMinutasByCasino(id);
      const allUsers = await storage.getUsers();
      const usersInCasino = allUsers.filter(u => u.casinoId === id);
      const hasHistory = casinoMinutas.length > 0 || usersInCasino.length > 0;

      if (hasHistory && !force) {
        const deleted = await storage.deleteCasino(id);
        if (!deleted) return res.status(404).json({ message: "Casino no encontrado" });
        return res.json({ message: "Casino desactivado (tiene historial asociado)", action: "deactivated" });
      }

      if (!hasHistory || force) {
        const result = await storage.hardDeleteCasino(id);
        if (!result) return res.status(404).json({ message: "Casino no encontrado" });
        return res.json({ message: "Casino eliminado permanentemente", action: "deleted" });
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
      const isAdmin = !!(req.session as any).userId;
      const all = req.query.all === "true";
      const minutasList = (isAdmin && all)
        ? await storage.getAllMinutasByCasino(casinoId)
        : await storage.getMinutasByCasino(casinoId);
      return res.json(minutasList);
    } catch (error) {
      console.error("Get minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/minutas/batch-toggle", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { ids, activo } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Debe enviar una lista de IDs" });
      }
      let updated = 0;
      for (const id of ids) {
        const result = await storage.updateMinuta(id, { activo });
        if (result) updated++;
      }
      return res.json({ message: `${updated} minutas ${activo ? 'activadas' : 'desactivadas'}`, updated });
    } catch (error) {
      console.error("Batch toggle minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/minutas", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { casinoIds, ...rest } = req.body;
      const targetIds: string[] = casinoIds && Array.isArray(casinoIds) && casinoIds.length > 0
        ? casinoIds
        : rest.casinoId ? [rest.casinoId] : [];

      if (targetIds.length === 0) {
        return res.status(400).json({ message: "Debe seleccionar al menos un casino" });
      }

      const created: any[] = [];
      for (const cid of targetIds) {
        const data = { ...rest, casinoId: cid };
        const parsed = insertMinutaSchema.safeParse(data);
        if (!parsed.success) {
          return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
        }
        const minuta = await storage.createMinuta(parsed.data);
        created.push(minuta);
      }
      return res.status(201).json(created.length === 1 ? created[0] : created);
    } catch (error) {
      console.error("Create minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/minutas/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { casinoId, fecha, familia, opcion1, opcion2, opcion3, opcion4, opcion5, activo } = req.body;
      const updateData: any = {};
      if (casinoId !== undefined) updateData.casinoId = casinoId;
      if (fecha !== undefined) updateData.fecha = fecha;
      if (familia !== undefined) updateData.familia = familia;
      if (opcion1 !== undefined) updateData.opcion1 = opcion1;
      if (opcion2 !== undefined) updateData.opcion2 = opcion2;
      if (opcion3 !== undefined) updateData.opcion3 = opcion3;
      if (opcion4 !== undefined) updateData.opcion4 = opcion4;
      if (opcion5 !== undefined) updateData.opcion5 = opcion5;
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

  app.post("/api/minutas/:id/clonar", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fecha, casinoIds } = req.body;
      const original = await storage.getMinuta(id);
      if (!original) {
        return res.status(404).json({ message: "Minuta original no encontrada" });
      }
      const targetDate = fecha || original.fecha;
      const targetCasinos: string[] = casinoIds && Array.isArray(casinoIds) && casinoIds.length > 0
        ? casinoIds
        : [original.casinoId];

      const created: any[] = [];
      for (const cid of targetCasinos) {
        const cloneData: any = {
          casinoId: cid,
          fecha: targetDate,
          familia: original.familia,
          opcion1: original.opcion1,
          opcion2: original.opcion2,
          opcion3: original.opcion3,
          opcion4: original.opcion4,
          opcion5: original.opcion5,
        };
        const minuta = await storage.createMinuta(cloneData);
        created.push(minuta);
      }
      return res.status(201).json(created.length === 1 ? created[0] : created);
    } catch (error) {
      console.error("Clone minuta error:", error);
      return res.status(500).json({ message: "Error al clonar minuta" });
    }
  });

  // ── Familias CRUD ──
  app.get("/api/familias", async (req: Request, res: Response) => {
    try {
      const allFamilias = await storage.getAllFamilias();
      return res.json(allFamilias);
    } catch (error) {
      console.error("Get familias error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/familias", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { nombre, color } = req.body;
      if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });
      const familia = await storage.createFamilia({ nombre, color: color || "#D4A843" });
      return res.status(201).json(familia);
    } catch (error: any) {
      if (error.code === "23505") return res.status(409).json({ message: "Ya existe una familia con ese nombre" });
      console.error("Create familia error:", error);
      return res.status(500).json({ message: "Error al crear familia" });
    }
  });

  app.put("/api/familias/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, color, activo } = req.body;
      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (color !== undefined) updateData.color = color;
      if (activo !== undefined) updateData.activo = activo;
      const familia = await storage.updateFamilia(id, updateData);
      if (!familia) return res.status(404).json({ message: "Familia no encontrada" });
      return res.json(familia);
    } catch (error) {
      console.error("Update familia error:", error);
      return res.status(500).json({ message: "Error al actualizar familia" });
    }
  });

  app.delete("/api/familias/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFamilia(id);
      if (!deleted) return res.status(404).json({ message: "Familia no encontrada" });
      return res.json({ message: "Familia desactivada" });
    } catch (error) {
      console.error("Delete familia error:", error);
      return res.status(500).json({ message: "Error al eliminar familia" });
    }
  });

  // ── Periodos (time windows for minuta availability) ──
  app.get("/api/periodos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allPeriodos = await storage.getAllPeriodos();
      return res.json(allPeriodos);
    } catch (error) {
      console.error("Get periodos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/periodos/casino/:casinoId", async (req: Request, res: Response) => {
    try {
      const { casinoId } = req.params;
      const periodosList = await storage.getPeriodosByCasino(casinoId);
      return res.json(periodosList);
    } catch (error) {
      console.error("Get periodos by casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/periodos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { casinoId, nombre, fechaInicio, fechaFin } = req.body;
      if (!casinoId || !nombre || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Todos los campos son obligatorios" });
      }
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        return res.status(400).json({ message: "La fecha/hora de fin debe ser posterior a la de inicio" });
      }
      const periodo = await storage.createPeriodo({
        casinoId,
        nombre,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
      });
      return res.status(201).json(periodo);
    } catch (error) {
      console.error("Create periodo error:", error);
      return res.status(500).json({ message: "Error al crear periodo" });
    }
  });

  app.put("/api/periodos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, fechaInicio, fechaFin, activo } = req.body;
      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (fechaInicio !== undefined) updateData.fechaInicio = new Date(fechaInicio);
      if (fechaFin !== undefined) updateData.fechaFin = new Date(fechaFin);
      if (activo !== undefined) updateData.activo = activo;
      if (updateData.fechaInicio && updateData.fechaFin && new Date(updateData.fechaFin) <= new Date(updateData.fechaInicio)) {
        return res.status(400).json({ message: "La fecha/hora de fin debe ser posterior a la de inicio" });
      }
      const periodo = await storage.updatePeriodo(id, updateData);
      if (!periodo) return res.status(404).json({ message: "Periodo no encontrado" });
      return res.json(periodo);
    } catch (error) {
      console.error("Update periodo error:", error);
      return res.status(500).json({ message: "Error al actualizar periodo" });
    }
  });

  app.delete("/api/periodos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePeriodo(id);
      if (!deleted) return res.status(404).json({ message: "Periodo no encontrado" });
      return res.json({ message: "Periodo desactivado" });
    } catch (error) {
      console.error("Delete periodo error:", error);
      return res.status(500).json({ message: "Error al eliminar periodo" });
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

      const casinoPeriodos = await storage.getPeriodosByCasino(minuta.casinoId);
      const now = new Date();
      const activePeriodos = casinoPeriodos.filter(p => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
      if (casinoPeriodos.filter(p => p.activo).length > 0 && activePeriodos.length === 0) {
        return res.status(403).json({ message: "La inscripción no está disponible en este momento. Fuera del horario de inscripción." });
      }

      const tipo = req.body.tipo || "seleccion";
      const nombreVisita = req.body.nombreVisita || null;

      if (tipo === "visita" && user.role !== "interlocutor" && user.role !== "admin") {
        return res.status(403).json({ message: "Solo interlocutores pueden emitir vales de visita" });
      }

      let opcionFinal = parsed.data.opcionSeleccionada;
      if (tipo === "no_asiste") {
        opcionFinal = 0;
      } else if (user.role === "interlocutor" && tipo !== "visita") {
        opcionFinal = 1;
      }

      if (user.role === "comensal" && tipo === "seleccion") {
        const existing = await storage.getPedidoByUserAndMinuta(parsed.data.userId, parsed.data.minutaId);
        if (existing) {
          return res.status(409).json({ message: "Ya tienes un pedido registrado para esta fecha. Solo puedes emitir 1 vale por comida." });
        }
      }

      const codigoQr = tipo === "no_asiste" ? null : `VASCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pedido = await storage.createPedido({
        userId: parsed.data.userId,
        minutaId: parsed.data.minutaId,
        opcionSeleccionada: opcionFinal,
        codigoQr,
        tipo,
        nombreVisita,
      });

      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create pedido error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/periodo-activo/:casinoId", async (req: Request, res: Response) => {
    try {
      const { casinoId } = req.params;
      const periodosList = await storage.getPeriodosByCasino(casinoId);
      const now = new Date();
      const activo = periodosList.find(p => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
      return res.json({ activo: !!activo, periodo: activo || null });
    } catch (error) {
      return res.status(500).json({ message: "Error al verificar periodo" });
    }
  });

  app.post("/api/pedidos/semanal", async (req: Request, res: Response) => {
    try {
      const { userId, selecciones } = req.body;
      if (!userId || !selecciones || !Array.isArray(selecciones)) {
        return res.status(400).json({ message: "userId y selecciones son requeridos" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

      if (user.casinoId) {
        const periodosList = await storage.getPeriodosByCasino(user.casinoId);
        const now = new Date();
        const periodoActivo = periodosList.find(p => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
        if (!periodoActivo) {
          return res.status(403).json({ message: "No hay un periodo de inscripción activo. Contacta a tu administrador." });
        }
      }

      const results: any[] = [];
      for (const sel of selecciones) {
        const { minutaId, opcionSeleccionada, tipo } = sel;
        if (!minutaId) continue;

        const existing = await storage.getPedidoByUserAndMinuta(userId, minutaId);
        if (existing) continue;

        const minuta = await storage.getMinuta(minutaId);
        if (!minuta) continue;

        let opcion = opcionSeleccionada || 1;
        const selTipo = tipo || "seleccion";
        if (selTipo === "no_asiste") opcion = 0;

        const codigoQr = selTipo === "no_asiste" ? null : `VASCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const pedido = await storage.createPedido({
          userId,
          minutaId,
          opcionSeleccionada: opcion,
          codigoQr,
          tipo: selTipo,
        });
        results.push(pedido);
      }

      return res.status(201).json(results);
    } catch (error) {
      console.error("Create pedidos semanales error:", error);
      return res.status(500).json({ message: "Error al registrar selecciones semanales" });
    }
  });

  app.post("/api/pedidos/visita", async (req: Request, res: Response) => {
    try {
      const { userId, minutaId, nombreVisita } = req.body;
      if (!userId || !minutaId || !nombreVisita) {
        return res.status(400).json({ message: "userId, minutaId y nombreVisita son requeridos" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

      if (user.role !== "interlocutor" && user.role !== "admin") {
        return res.status(403).json({ message: "Solo interlocutores pueden emitir vales de visita" });
      }

      const minuta = await storage.getMinuta(minutaId);
      if (!minuta) return res.status(404).json({ message: "Minuta no encontrada" });

      const codigoQr = `VASCAN-VISITA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pedido = await storage.createPedido({
        userId,
        minutaId,
        opcionSeleccionada: 1,
        codigoQr,
        tipo: "visita",
        nombreVisita,
      });

      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create vale visita error:", error);
      return res.status(500).json({ message: "Error al crear vale de visita" });
    }
  });

  // ── Dashboard Stats ──
  app.get("/api/reportes/dashboard", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allPedidos = await db.select().from(pedidosTable);
      const totalInscripciones = allPedidos.filter(p => p.tipo === "seleccion" || !p.tipo).length;
      const totalNoAsiste = allPedidos.filter(p => p.tipo === "no_asiste").length;
      const totalVisitas = allPedidos.filter(p => p.tipo === "visita").length;
      return res.json({ totalInscripciones, totalNoAsiste, totalVisitas });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return res.status(500).json({ message: "Error al obtener estadísticas" });
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
      const seleccionPedidos = pedidosForMinuta.filter(p => p.tipo !== "no_asiste" && p.tipo !== "visita");
      const noAsistePedidos = pedidosForMinuta.filter(p => p.tipo === "no_asiste");
      const visitaPedidos = pedidosForMinuta.filter(p => p.tipo === "visita");
      const totalPedidos = seleccionPedidos.length;

      const opciones = [];
      const allOptions: (string | null)[] = [minuta.opcion1, minuta.opcion2, minuta.opcion3, minuta.opcion4, minuta.opcion5];

      for (let i = 0; i < allOptions.length; i++) {
        if (!allOptions[i]) continue;
        const num = i + 1;
        const count = seleccionPedidos.filter((p) => p.opcionSeleccionada === num).length;
        opciones.push({
          numero: num,
          descripcion: allOptions[i],
          cantidad: count,
          porcentaje: totalPedidos > 0 ? Math.round((count / totalPedidos) * 100) : 0,
        });
      }

      return res.json({
        casinoNombre: casino.nombre,
        fecha,
        minuta: { id: minuta.id, familia: minuta.familia, opcion1: minuta.opcion1, opcion2: minuta.opcion2, opcion3: minuta.opcion3, opcion4: minuta.opcion4, opcion5: minuta.opcion5 },
        opciones,
        totalPedidos,
        totalNoAsiste: noAsistePedidos.length,
        totalVisitas: visitaPedidos.length,
        visitas: visitaPedidos.map(v => ({ nombreVisita: v.nombreVisita, codigoQr: v.codigoQr })),
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
          const rolRaw = String(row["Rol"] || row["rol"] || row["ROL"] || "comensal").trim().toLowerCase();
          const casinoRaw = String(row["Casino_ID"] || row["casino_id"] || row["CasinoID"] || row["CASINO"] || row["Casino"] || "").trim();

          if (!rut || !nombre) {
            errorDetails.push({ row: rowNum, error: "RUT o Nombre vacío" });
            errors++;
            continue;
          }

          if (looksLikeRut(rut) && !validarRutChileno(rut)) {
            errorDetails.push({ row: rowNum, error: `RUT ${rut} inválido — dígito verificador incorrecto` });
            errors++;
            continue;
          }

          const rol = rolRaw === "interlocutor" ? "interlocutor" : (rolRaw === "admin" ? "admin" : "comensal");

          let casinoId = "";
          if (casinoRaw) {
            if (casinoRaw.includes("-") && casinoRaw.length > 20) {
              casinoId = casinoRaw;
            } else {
              const allCasinos = await storage.getCasinos();
              const match = allCasinos.find(c => c.nombre.toLowerCase() === casinoRaw.toLowerCase());
              if (match) casinoId = match.id;
            }
          }
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

  // ── ExcelJS Style Presets ──
  const EX = {
    darkFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1A1A2E" } },
    navyFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF16213E" } },
    headerBlueFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0F3460" } },
    goldLightFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF8E7" } },
    greenFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE8F5E9" } },
    orangeFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF3E0" } },
    redLightFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFCDD2" } },
    whiteFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } },
    grayFill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF5F5F5" } },
    optFills: [
      { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE3F2FD" } },
      { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE8F5E9" } },
      { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF3E0" } },
      { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF3E5F5" } },
      { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFEBEE" } },
    ],
    fontTitle: { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } },
    fontSubGold: { name: "Calibri", size: 11, color: { argb: "FFD4A843" } },
    fontSubtitle: { name: "Calibri", size: 12, bold: true, color: { argb: "FFD4A843" } },
    fontHeader: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } },
    fontNormal: { name: "Calibri", size: 11, color: { argb: "FF333333" } },
    fontSmall: { name: "Calibri", size: 10, color: { argb: "FF666666" } },
    fontGold: { name: "Calibri", size: 11, bold: true, color: { argb: "FFB8902E" } },
    fontBoldDark: { name: "Calibri", size: 11, bold: true, color: { argb: "FF1A1A2E" } },
    borderThin: {
      top: { style: "thin" as const, color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin" as const, color: { argb: "FFCCCCCC" } },
      left: { style: "thin" as const, color: { argb: "FFCCCCCC" } },
      right: { style: "thin" as const, color: { argb: "FFCCCCCC" } },
    },
    borderGold: {
      top: { style: "medium" as const, color: { argb: "FFD4A843" } },
      bottom: { style: "medium" as const, color: { argb: "FFD4A843" } },
      left: { style: "medium" as const, color: { argb: "FFD4A843" } },
      right: { style: "medium" as const, color: { argb: "FFD4A843" } },
    },
    center: { horizontal: "center" as const, vertical: "middle" as const },
    left: { horizontal: "left" as const, vertical: "middle" as const, wrapText: true },
    right: { horizontal: "right" as const, vertical: "middle" as const },
  };

  // ── Plantillas Descargables ──
  app.get("/api/plantillas/usuarios", async (_req: Request, res: Response) => {
    try {
      const casinosList = await storage.getCasinos();
      const wb = new ExcelJS.Workbook();
      wb.creator = "Vascan SPA";
      wb.created = new Date();

      const wsInst = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF1A1A2E" } } });
      wsInst.columns = [{ width: 26 }, { width: 68 }];
      wsInst.mergeCells("A1:B1");
      wsInst.getCell("A1").value = "PLANTILLA DE CARGA DE USUARIOS";
      wsInst.getCell("A1").font = EX.fontTitle;
      wsInst.getCell("A1").fill = EX.darkFill as any;
      wsInst.getCell("A1").alignment = EX.center;
      wsInst.getRow(1).height = 36;

      wsInst.mergeCells("A2:B2");
      wsInst.getCell("A2").value = "VASCAN SPA — Sistema de Inscripción de Comensales";
      wsInst.getCell("A2").font = EX.fontSubGold;
      wsInst.getCell("A2").fill = EX.navyFill as any;
      wsInst.getCell("A2").alignment = EX.center;
      wsInst.getRow(2).height = 24;

      wsInst.getCell("A4").value = "INSTRUCCIONES";
      wsInst.getCell("A4").font = EX.fontSubtitle;
      wsInst.getCell("A4").fill = EX.goldLightFill as any;
      wsInst.getCell("B4").fill = EX.goldLightFill as any;
      wsInst.getRow(4).height = 28;

      const instructions = [
        "Complete los datos en la hoja 'Usuarios' respetando el formato indicado.",
        "El campo RUT debe incluir guión y dígito verificador (ej: 12345678-9).",
        "El campo ROL tiene un menú desplegable: comensal, interlocutor, admin.",
        "El campo CASINO tiene un menú desplegable con los casinos disponibles.",
        "La contraseña por defecto serán los primeros 4 dígitos del RUT.",
        "Los usuarios con RUT duplicado serán omitidos automáticamente.",
      ];
      instructions.forEach((text, i) => {
        const row = 6 + i;
        wsInst.getCell(`A${row}`).value = `${i + 1}.`;
        wsInst.getCell(`A${row}`).font = EX.fontGold;
        wsInst.getCell(`A${row}`).alignment = EX.right;
        wsInst.getCell(`B${row}`).value = text;
        wsInst.getCell(`B${row}`).font = EX.fontNormal;
      });

      const obRow = 13;
      wsInst.getCell(`A${obRow}`).value = "CAMPOS OBLIGATORIOS:";
      wsInst.getCell(`A${obRow}`).font = EX.fontBoldDark;
      wsInst.getCell(`A${obRow}`).fill = EX.greenFill as any;
      wsInst.getCell(`A${obRow}`).border = EX.borderThin;
      wsInst.getCell(`B${obRow}`).value = "RUT, Nombre, Apellido";
      wsInst.getCell(`B${obRow}`).font = EX.fontNormal;
      wsInst.getCell(`B${obRow}`).fill = EX.greenFill as any;
      wsInst.getCell(`B${obRow}`).border = EX.borderThin;

      wsInst.getCell(`A${obRow + 1}`).value = "CAMPOS OPCIONALES:";
      wsInst.getCell(`A${obRow + 1}`).font = EX.fontBoldDark;
      wsInst.getCell(`A${obRow + 1}`).fill = EX.orangeFill as any;
      wsInst.getCell(`A${obRow + 1}`).border = EX.borderThin;
      wsInst.getCell(`B${obRow + 1}`).value = "Rol (default: comensal), Casino (seleccionar del desplegable)";
      wsInst.getCell(`B${obRow + 1}`).font = EX.fontNormal;
      wsInst.getCell(`B${obRow + 1}`).fill = EX.orangeFill as any;
      wsInst.getCell(`B${obRow + 1}`).border = EX.borderThin;

      const wsUsers = wb.addWorksheet("Usuarios", { properties: { tabColor: { argb: "FFD4A843" } } });
      wsUsers.columns = [
        { header: "RUT", key: "rut", width: 18 },
        { header: "NOMBRE", key: "nombre", width: 22 },
        { header: "APELLIDO", key: "apellido", width: 22 },
        { header: "ROL", key: "rol", width: 18 },
        { header: "CASINO", key: "casino", width: 32 },
      ];

      const headerRowU = wsUsers.getRow(1);
      headerRowU.height = 30;
      headerRowU.eachCell(cell => {
        cell.font = EX.fontHeader;
        cell.fill = EX.headerBlueFill as any;
        cell.alignment = EX.center;
        cell.border = EX.borderGold;
      });

      const casinoNames = casinosList.map(c => c.nombre);
      const casinoMap: Record<string, string> = {};
      casinosList.forEach(c => { casinoMap[c.nombre] = c.id; });

      const examples = [
        { rut: "12345678-9", nombre: "Juan", apellido: "Pérez", rol: "comensal", casino: casinoNames[0] || "" },
        { rut: "98765432-1", nombre: "María", apellido: "González", rol: "interlocutor", casino: casinoNames[0] || "" },
        { rut: "11223344-5", nombre: "Carlos", apellido: "Muñoz", rol: "comensal", casino: "" },
      ];
      examples.forEach(ex => wsUsers.addRow(ex));

      for (let i = 0; i < 97; i++) wsUsers.addRow({ rut: "", nombre: "", apellido: "", rol: "", casino: "" });

      const DATA_ROWS = 100;
      for (let r = 2; r <= DATA_ROWS + 1; r++) {
        const row = wsUsers.getRow(r);
        const isExample = r <= 4;
        const isEven = r % 2 === 0;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = isExample ? { ...EX.fontSmall, italic: true } : EX.fontNormal;
          cell.fill = (isExample ? EX.goldLightFill : (isEven ? EX.grayFill : EX.whiteFill)) as any;
          cell.border = EX.borderThin;
          cell.alignment = colNumber === 1 ? EX.center : EX.left;
        });

        wsUsers.getCell(`D${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"comensal,interlocutor,admin"'],
          showErrorMessage: true,
          errorTitle: "Rol inválido",
          error: "Seleccione: comensal, interlocutor o admin",
          promptTitle: "Seleccionar Rol",
          prompt: "Elija el rol del usuario",
          showInputMessage: true,
        };

        if (casinoNames.length > 0) {
          wsUsers.getCell(`E${r}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`"${casinoNames.join(",")}"`],
            showErrorMessage: true,
            errorTitle: "Casino inválido",
            error: "Seleccione un casino de la lista",
            promptTitle: "Seleccionar Casino",
            prompt: "Elija el casino asignado",
            showInputMessage: true,
          };
        }
      }

      const wsCasinos = wb.addWorksheet("Casinos (Referencia)", { properties: { tabColor: { argb: "FF0F3460" } } });
      wsCasinos.columns = [
        { header: "NOMBRE", key: "nombre", width: 35 },
        { header: "DIRECCIÓN", key: "direccion", width: 40 },
        { header: "ID (UUID)", key: "id", width: 42 },
        { header: "ESTADO", key: "estado", width: 12 },
      ];
      const headerRowC = wsCasinos.getRow(1);
      headerRowC.height = 28;
      headerRowC.eachCell(cell => {
        cell.font = EX.fontHeader;
        cell.fill = EX.headerBlueFill as any;
        cell.alignment = EX.center;
        cell.border = EX.borderGold;
      });
      casinosList.forEach(c => {
        const row = wsCasinos.addRow({ nombre: c.nombre, direccion: c.direccion || "—", id: c.id, estado: c.activo ? "Activo" : "Inactivo" });
        row.eachCell(cell => {
          cell.font = EX.fontNormal;
          cell.border = EX.borderThin;
          cell.alignment = EX.left;
        });
      });
      wsCasinos.state = "visible";

      const buf = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Usuarios_Vascan.xlsx");
      return res.send(Buffer.from(buf as ArrayBuffer));
    } catch (error) {
      console.error("Template error:", error);
      return res.status(500).json({ message: "Error al generar plantilla" });
    }
  });

  app.get("/api/plantillas/minutas", async (_req: Request, res: Response) => {
    try {
      const casinosList = await storage.getCasinos();
      const wb = new ExcelJS.Workbook();
      wb.creator = "Vascan SPA";
      wb.created = new Date();

      const wsInst = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF1A1A2E" } } });
      wsInst.columns = [{ width: 22 }, { width: 72 }];
      wsInst.mergeCells("A1:B1");
      wsInst.getCell("A1").value = "PLANTILLA DE PLANIFICACIÓN DE MINUTAS";
      wsInst.getCell("A1").font = EX.fontTitle;
      wsInst.getCell("A1").fill = EX.darkFill as any;
      wsInst.getCell("A1").alignment = EX.center;
      wsInst.getRow(1).height = 36;
      wsInst.mergeCells("A2:B2");
      wsInst.getCell("A2").value = "VASCAN SPA — Sistema de Inscripción de Comensales";
      wsInst.getCell("A2").font = EX.fontSubGold;
      wsInst.getCell("A2").fill = EX.navyFill as any;
      wsInst.getCell("A2").alignment = EX.center;
      wsInst.getRow(2).height = 24;

      wsInst.getCell("A4").value = "INSTRUCCIONES";
      wsInst.getCell("A4").font = EX.fontSubtitle;
      wsInst.getCell("A4").fill = EX.goldLightFill as any;
      wsInst.getCell("B4").fill = EX.goldLightFill as any;

      const minInstructions = [
        "Complete las minutas en la hoja correspondiente a cada casino.",
        "Cada semana tiene 5 columnas (Lunes a Viernes) y hasta 5 opciones de menú por día.",
        "La fila FECHA contiene las fechas en formato AAAA-MM-DD. No modificar el formato.",
        "Las opciones 4 y 5 son opcionales (dejar en blanco si no aplica).",
        "Para importar, suba este archivo en el panel de administración > Carga Masiva.",
        "La sección CONSOLIDACIÓN se llena automáticamente con los datos de inscripción.",
      ];
      minInstructions.forEach((text, i) => {
        const row = 6 + i;
        wsInst.getCell(`A${row}`).value = `${i + 1}.`;
        wsInst.getCell(`A${row}`).font = EX.fontGold;
        wsInst.getCell(`A${row}`).alignment = EX.right;
        wsInst.getCell(`B${row}`).value = text;
        wsInst.getCell(`B${row}`).font = EX.fontNormal;
      });
      wsInst.getCell("A13").value = "IMPORTANTE:";
      wsInst.getCell("A13").font = EX.fontBoldDark;
      wsInst.getCell("A13").fill = EX.redLightFill as any;
      wsInst.getCell("A13").border = EX.borderThin;
      wsInst.getCell("B13").value = "No modificar la estructura de las hojas ni las filas de FECHA / ID Casino.";
      wsInst.getCell("B13").font = EX.fontNormal;
      wsInst.getCell("B13").fill = EX.redLightFill as any;
      wsInst.getCell("B13").border = EX.borderThin;

      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

      for (const casino of casinosList) {
        const safeSheetName = casino.nombre.substring(0, 28).replace(/[\\\/\?\*\[\]]/g, "");
        const ws = wb.addWorksheet(safeSheetName, { properties: { tabColor: { argb: "FFD4A843" } } });
        ws.columns = [
          { width: 20 }, { width: 20 }, { width: 30 }, { width: 30 }, { width: 30 }, { width: 30 }, { width: 30 },
        ];

        ws.mergeCells("A1:G1");
        ws.getCell("A1").value = "PLANIFICACIÓN SEMANAL DE MINUTAS";
        ws.getCell("A1").font = EX.fontTitle;
        ws.getCell("A1").fill = EX.darkFill as any;
        ws.getCell("A1").alignment = EX.center;
        ws.getRow(1).height = 32;

        ws.getCell("A2").value = "Casino:";
        ws.getCell("A2").font = EX.fontGold;
        ws.getCell("B2").value = casino.nombre;
        ws.getCell("B2").font = EX.fontBoldDark;
        ws.getCell("A3").value = "Dirección:";
        ws.getCell("A3").font = EX.fontSmall;
        ws.getCell("B3").value = casino.direccion || "—";
        ws.getCell("B3").font = EX.fontSmall;
        ws.getCell("A4").value = "ID Casino:";
        ws.getCell("A4").font = { ...EX.fontSmall, size: 8 };
        ws.getCell("B4").value = casino.id;
        ws.getCell("B4").font = { ...EX.fontSmall, size: 8 };

        let currentRow = 6;

        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(monday);
          weekStart.setDate(monday.getDate() + week * 7);
          const dates: string[] = [];
          const dateLabels: string[] = [];

          for (let d = 0; d < 5; d++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + d);
            dates.push(day.toISOString().split("T")[0]);
            dateLabels.push(`${DIAS[d]} ${day.getDate()}/${day.getMonth() + 1}`);
          }

          const weekHeaderRow = ws.getRow(currentRow);
          weekHeaderRow.values = [`SEMANA ${week + 1}`, `${dates[0]} al ${dates[4]}`, ...dateLabels];
          weekHeaderRow.height = 26;
          weekHeaderRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = EX.fontHeader;
            cell.fill = EX.headerBlueFill as any;
            cell.alignment = EX.center;
            cell.border = EX.borderGold;
          });
          currentRow++;

          const dateRow = ws.getRow(currentRow);
          dateRow.values = ["", "FECHA", ...dates];
          dateRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { ...EX.fontSmall, bold: true, color: { argb: "FF0F3460" } };
            cell.fill = EX.goldLightFill as any;
            cell.alignment = EX.center;
            cell.border = EX.borderThin;
          });
          currentRow++;

          for (let opt = 0; opt < 5; opt++) {
            const optRow = ws.getRow(currentRow);
            optRow.values = [opt === 0 ? "" : "", `OPCIÓN ${opt + 1}`, "", "", "", "", ""];
            optRow.height = 24;
            const optFill = EX.optFills[opt];
            optRow.getCell(1).font = EX.fontSmall;
            optRow.getCell(1).fill = optFill as any;
            optRow.getCell(1).border = EX.borderThin;
            optRow.getCell(2).font = EX.fontGold;
            optRow.getCell(2).fill = optFill as any;
            optRow.getCell(2).alignment = EX.left;
            optRow.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              const cell = optRow.getCell(c);
              cell.font = EX.fontNormal;
              cell.fill = EX.whiteFill as any;
              cell.alignment = EX.left;
              cell.border = EX.borderThin;
            }
            currentRow++;
          }

          currentRow++;

          const consHeaderRow = ws.getRow(currentRow);
          consHeaderRow.values = ["", "CONSOLIDACIÓN", ...dateLabels];
          consHeaderRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { ...EX.fontHeader, color: { argb: "FFB8902E" } };
            cell.fill = EX.goldLightFill as any;
            cell.alignment = EX.center;
            cell.border = EX.borderThin;
          });
          currentRow++;

          for (let i = 0; i < 5; i++) {
            const consRow = ws.getRow(currentRow);
            consRow.values = ["", `Inscritos Op.${i + 1}`, 0, 0, 0, 0, 0];
            consRow.getCell(2).font = EX.fontSmall;
            consRow.getCell(2).fill = EX.optFills[i] as any;
            consRow.getCell(2).alignment = EX.left;
            consRow.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              consRow.getCell(c).font = EX.fontNormal;
              consRow.getCell(c).fill = EX.optFills[i] as any;
              consRow.getCell(c).alignment = EX.center;
              consRow.getCell(c).border = EX.borderThin;
            }
            currentRow++;
          }

          const extraLabels = ["Sin inscripción", "Visitas"];
          for (const label of extraLabels) {
            const row = ws.getRow(currentRow);
            row.values = ["", label, "", "", "", "", ""];
            row.getCell(2).font = EX.fontSmall;
            row.getCell(2).fill = EX.grayFill as any;
            row.getCell(2).alignment = EX.left;
            row.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              row.getCell(c).font = EX.fontNormal;
              row.getCell(c).fill = EX.grayFill as any;
              row.getCell(c).alignment = EX.center;
              row.getCell(c).border = EX.borderThin;
            }
            currentRow++;
          }

          const totalRow = ws.getRow(currentRow);
          totalRow.values = ["", "TOTAL COMENSALES", 0, 0, 0, 0, 0];
          totalRow.height = 26;
          totalRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = EX.fontHeader;
            cell.fill = EX.darkFill as any;
            cell.alignment = EX.center;
            cell.border = EX.borderGold;
          });
          currentRow += 3;
        }
      }

      const buf = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Minutas_Vascan.xlsx");
      return res.send(Buffer.from(buf as ArrayBuffer));
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
                opcion5: opciones[4] || null,
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
