var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";

// server/storage.ts
import { eq, and } from "drizzle-orm";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  casinos: () => casinos,
  familias: () => familias,
  insertCasinoSchema: () => insertCasinoSchema,
  insertFamiliaSchema: () => insertFamiliaSchema,
  insertMinutaSchema: () => insertMinutaSchema,
  insertPedidoSchema: () => insertPedidoSchema,
  insertPeriodoSchema: () => insertPeriodoSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  minutas: () => minutas,
  pedidos: () => pedidos,
  periodos: () => periodos,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  date,
  timestamp,
  boolean,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var userRoleEnum = pgEnum("user_role", [
  "admin",
  "comensal",
  "interlocutor"
]);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rut: text("rut").notNull().unique(),
  password: text("password").notNull(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  role: userRoleEnum("role").notNull().default("comensal"),
  casinoId: varchar("casino_id").references(() => casinos.id),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var casinos = pgTable("casinos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var familias = pgTable("familias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  color: text("color").notNull().default("#D4A843"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var minutas = pgTable("minutas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  casinoId: varchar("casino_id").notNull().references(() => casinos.id),
  fecha: date("fecha").notNull(),
  familia: text("familia").notNull().default("almuerzo"),
  opcion1: text("opcion_1").notNull(),
  opcion2: text("opcion_2").notNull(),
  opcion3: text("opcion_3").notNull(),
  opcion4: text("opcion_4"),
  opcion5: text("opcion_5"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var periodos = pgTable("periodos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  casinoId: varchar("casino_id").notNull().references(() => casinos.id),
  nombre: text("nombre").notNull(),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  fechaFin: timestamp("fecha_fin").notNull(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var pedidos = pgTable("pedidos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  minutaId: varchar("minuta_id").notNull().references(() => minutas.id),
  opcionSeleccionada: integer("opcion_seleccionada").notNull(),
  tipo: text("tipo").notNull().default("seleccion"),
  nombreVisita: text("nombre_visita"),
  asignadoPorDefecto: boolean("asignado_por_defecto").notNull().default(false),
  codigoQr: text("codigo_qr"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  rut: true,
  password: true,
  nombre: true,
  apellido: true,
  role: true,
  casinoId: true
});
var loginSchema = z.object({
  rut: z.string().min(1),
  password: z.string().min(1)
});
var insertCasinoSchema = createInsertSchema(casinos).pick({
  nombre: true,
  direccion: true
});
var insertFamiliaSchema = createInsertSchema(familias).pick({
  nombre: true,
  color: true
});
var insertMinutaSchema = createInsertSchema(minutas).pick({
  casinoId: true,
  fecha: true,
  familia: true,
  opcion1: true,
  opcion2: true,
  opcion3: true,
  opcion4: true,
  opcion5: true
});
var insertPedidoSchema = createInsertSchema(pedidos).pick({
  userId: true,
  minutaId: true,
  opcionSeleccionada: true,
  codigoQr: true,
  tipo: true,
  nombreVisita: true
});
var insertPeriodoSchema = createInsertSchema(periodos).pick({
  casinoId: true,
  nombre: true,
  fechaInicio: true,
  fechaFin: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByRut(rut) {
    const [user] = await db.select().from(users).where(eq(users.rut, rut));
    return user;
  }
  async getAllUsers() {
    return db.select().from(users);
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, data) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
  async getCasinos() {
    return db.select().from(casinos).where(eq(casinos.activo, true));
  }
  async getAllCasinos() {
    return db.select().from(casinos);
  }
  async getCasino(id) {
    const [casino] = await db.select().from(casinos).where(eq(casinos.id, id));
    return casino;
  }
  async createCasino(insertCasino) {
    const [casino] = await db.insert(casinos).values(insertCasino).returning();
    return casino;
  }
  async updateCasino(id, data) {
    const [casino] = await db.update(casinos).set(data).where(eq(casinos.id, id)).returning();
    return casino;
  }
  async deleteCasino(id) {
    const [casino] = await db.update(casinos).set({ activo: false }).where(eq(casinos.id, id)).returning();
    return !!casino;
  }
  async hardDeleteCasino(id) {
    const [casino] = await db.delete(casinos).where(eq(casinos.id, id)).returning();
    return !!casino;
  }
  async getMinutasByCasino(casinoId) {
    return db.select().from(minutas).where(and(eq(minutas.casinoId, casinoId), eq(minutas.activo, true)));
  }
  async getAllMinutasByCasino(casinoId) {
    return db.select().from(minutas).where(eq(minutas.casinoId, casinoId));
  }
  async getAllMinutas() {
    return db.select().from(minutas);
  }
  async getMinuta(id) {
    const [minuta] = await db.select().from(minutas).where(eq(minutas.id, id));
    return minuta;
  }
  async createMinuta(insertMinuta) {
    const [minuta] = await db.insert(minutas).values(insertMinuta).returning();
    return minuta;
  }
  async updateMinuta(id, data) {
    const [minuta] = await db.update(minutas).set(data).where(eq(minutas.id, id)).returning();
    return minuta;
  }
  async deleteMinuta(id) {
    const [minuta] = await db.update(minutas).set({ activo: false }).where(eq(minutas.id, id)).returning();
    return !!minuta;
  }
  async getPedidosByUser(userId) {
    return db.select().from(pedidos).where(eq(pedidos.userId, userId));
  }
  async getPedidoByUserAndMinuta(userId, minutaId) {
    const [pedido] = await db.select().from(pedidos).where(and(eq(pedidos.userId, userId), eq(pedidos.minutaId, minutaId)));
    return pedido;
  }
  async createPedido(insertPedido) {
    const [pedido] = await db.insert(pedidos).values(insertPedido).returning();
    return pedido;
  }
  async getPedidosByMinuta(minutaId) {
    return db.select().from(pedidos).where(eq(pedidos.minutaId, minutaId));
  }
  async getAllFamilias() {
    return db.select().from(familias);
  }
  async createFamilia(insertFamilia) {
    const [familia] = await db.insert(familias).values(insertFamilia).returning();
    return familia;
  }
  async updateFamilia(id, data) {
    const [familia] = await db.update(familias).set(data).where(eq(familias.id, id)).returning();
    return familia;
  }
  async deleteFamilia(id) {
    const [familia] = await db.update(familias).set({ activo: false }).where(eq(familias.id, id)).returning();
    return !!familia;
  }
  async getPeriodosByCasino(casinoId) {
    return db.select().from(periodos).where(eq(periodos.casinoId, casinoId));
  }
  async getAllPeriodos() {
    return db.select().from(periodos);
  }
  async getPeriodo(id) {
    const [periodo] = await db.select().from(periodos).where(eq(periodos.id, id));
    return periodo;
  }
  async createPeriodo(insertPeriodo) {
    const [periodo] = await db.insert(periodos).values(insertPeriodo).returning();
    return periodo;
  }
  async updatePeriodo(id, data) {
    const [periodo] = await db.update(periodos).set(data).where(eq(periodos.id, id)).returning();
    return periodo;
  }
  async deletePeriodo(id) {
    const [periodo] = await db.update(periodos).set({ activo: false }).where(eq(periodos.id, id)).returning();
    return !!periodo;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
var PgSession = connectPgSimple(session);
var upload = multer({ dest: "/tmp/uploads/" });
var SUPER_ADMIN_RUT = "21212011-1";
function validarRutChileno(rutCompleto) {
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
function looksLikeRut(val) {
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
        casinoId: null
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
        casinoId: null
      });
      console.log("Oliver admin created.");
    }
  } catch (err) {
    console.error("Oliver admin init error:", err);
  }
}
function requireAdmin(req, res, next) {
  const userId = req.session.userId;
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
    req.currentUser = user;
    next();
  }).catch(() => {
    return res.status(500).json({ message: "Error de autenticaci\xF3n" });
  });
}
async function autoSeed() {
  try {
    const existingCasinos = await storage.getCasinos();
    if (existingCasinos.length > 0) return;
    console.log("Auto-seeding database...");
    const casino = await storage.createCasino({
      nombre: "Casino Central Santiago",
      direccion: "Av. Providencia 1234, Santiago"
    });
    const casino2 = await storage.createCasino({
      nombre: "Casino Planta Rancagua",
      direccion: "Calle Industrial 567, Rancagua"
    });
    const today = /* @__PURE__ */ new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const menus1 = [
      { o1: "Pollo al horno con arroz y ensalada", o2: "Pescado frito con pur\xE9 de papas", o3: "Pasta bolo\xF1esa con parmesano", o4: "Ensalada C\xE9sar con pollo grillado" },
      { o1: "Lomo saltado con arroz", o2: "Cazuela de vacuno", o3: "Tortilla espa\xF1ola con ensalada", o4: "Wrap de pollo teriyaki" },
      { o1: "Chuleta de cerdo con arroz", o2: "Merluza al horno con verduras", o3: "Lasa\xF1a de carne", o4: "Bowl de quinoa con pollo" },
      { o1: "Estofado de res con papas", o2: "Salm\xF3n grillado con esp\xE1rragos", o3: "Risotto de champi\xF1ones", o4: null },
      { o1: "Pollo a la plancha con ensalada", o2: "Alb\xF3ndigas en salsa con arroz", o3: "Tacos de carne", o4: "Sopa de verduras con pan" },
      { o1: "Milanesa de pollo con pur\xE9", o2: "Pescado al vapor con arroz", o3: "Empanadas de pino", o4: null },
      { o1: "Asado alem\xE1n con pur\xE9", o2: "Carbonada", o3: "Pastel de choclo", o4: "Ensalada mediterr\xE1nea" }
    ];
    for (let i = 0; i < dates.length; i++) {
      const menu = menus1[i % menus1.length];
      await storage.createMinuta({
        casinoId: casino.id,
        fecha: dates[i],
        opcion1: menu.o1,
        opcion2: menu.o2,
        opcion3: menu.o3,
        opcion4: menu.o4
      });
      await storage.createMinuta({
        casinoId: casino2.id,
        fecha: dates[i],
        opcion1: "Cazuela de vacuno con verduras",
        opcion2: "Lomo saltado con arroz",
        opcion3: "Tortilla espa\xF1ola con ensalada"
      });
    }
    const hashedPassword = await bcrypt.hash("123456", 10);
    await storage.createUser({
      rut: "12345678-9",
      password: hashedPassword,
      nombre: "Juan",
      apellido: "P\xE9rez",
      role: "comensal",
      casinoId: casino.id
    });
    await storage.createUser({
      rut: "11111111-1",
      password: hashedPassword,
      nombre: "Admin",
      apellido: "Sistema",
      role: "admin",
      casinoId: null
    });
    await storage.createUser({
      rut: "22222222-2",
      password: hashedPassword,
      nombre: "Mar\xEDa",
      apellido: "Gonz\xE1lez",
      role: "interlocutor",
      casinoId: casino.id
    });
    console.log("Auto-seed complete.");
  } catch (err) {
    console.error("Auto-seed error:", err);
  }
}
async function registerRoutes(app2) {
  app2.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "vascan-dev-fallback-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );
  await autoSeed();
  await ensureSuperAdmin();
  app2.get("/admin", (_req, res) => {
    const filePath = path.resolve(process.cwd(), "web", "src", "admin.html");
    res.sendFile(filePath);
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "RUT y contrase\xF1a son requeridos" });
      }
      const { rut, password } = parsed.data;
      const user = await storage.getUserByRut(rut);
      if (!user) {
        return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      }
      if (!user.activo) {
        return res.status(403).json({ message: "Usuario desactivado" });
      }
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesi\xF3n" });
      }
      return res.json({ message: "Sesi\xF3n cerrada" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const userId = req.session.userId;
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
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inv\xE1lidos", errors: parsed.error.errors });
      }
      const existing = await storage.getUserByRut(parsed.data.rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya est\xE1 registrado" });
      }
      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword
      });
      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.get("/api/usuarios", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.filter((u) => u.rut !== SUPER_ADMIN_RUT).map(({ password, ...u }) => u);
      return res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/usuarios", requireAdmin, async (req, res) => {
    try {
      const { rut, nombre, apellido, role, casinoId, password: pwd } = req.body;
      if (!rut || !nombre || !apellido) {
        return res.status(400).json({ message: "RUT, nombre y apellido son requeridos" });
      }
      if (looksLikeRut(rut) && !validarRutChileno(rut)) {
        return res.status(400).json({ message: "El RUT ingresado no es v\xE1lido. Verifique el d\xEDgito verificador." });
      }
      const existing = await storage.getUserByRut(rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya est\xE1 registrado en el sistema" });
      }
      const defaultPwd = pwd || rut.replace(/[^0-9]/g, "").slice(0, 4) || "1234";
      const hashedPassword = await bcrypt.hash(defaultPwd, 10);
      const user = await storage.createUser({
        rut,
        nombre,
        apellido,
        password: hashedPassword,
        role: role || "comensal",
        casinoId: casinoId || null
      });
      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.put("/api/usuarios/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, apellido, role, casinoId, activo, password: newPwd } = req.body;
      const updateData = {};
      if (nombre !== void 0) updateData.nombre = nombre;
      if (apellido !== void 0) updateData.apellido = apellido;
      if (role !== void 0) updateData.role = role;
      if (casinoId !== void 0) updateData.casinoId = casinoId || null;
      if (activo !== void 0) updateData.activo = activo;
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
  app2.delete("/api/usuarios/:id", requireAdmin, async (req, res) => {
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
  app2.get("/api/casinos", async (_req, res) => {
    try {
      const casinosList = await storage.getCasinos();
      return res.json(casinosList);
    } catch (error) {
      console.error("Get casinos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.get("/api/casinos/all", requireAdmin, async (_req, res) => {
    try {
      const casinosList = await storage.getAllCasinos();
      return res.json(casinosList);
    } catch (error) {
      console.error("Get all casinos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/casinos", async (req, res) => {
    try {
      const parsed = insertCasinoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inv\xE1lidos" });
      }
      const casino = await storage.createCasino(parsed.data);
      return res.status(201).json(casino);
    } catch (error) {
      console.error("Create casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.put("/api/casinos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, direccion, activo } = req.body;
      const updateData = {};
      if (nombre !== void 0) updateData.nombre = nombre;
      if (direccion !== void 0) updateData.direccion = direccion;
      if (activo !== void 0) updateData.activo = activo;
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
  app2.get("/api/casinos/:id/has-history", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const casinoMinutas = await storage.getAllMinutasByCasino(id);
      const allUsers = await storage.getUsers();
      const usersInCasino = allUsers.filter((u) => u.casinoId === id);
      const hasHistory = casinoMinutas.length > 0 || usersInCasino.length > 0;
      return res.json({ hasHistory, minutas: casinoMinutas.length, usuarios: usersInCasino.length });
    } catch (error) {
      return res.status(500).json({ message: "Error al verificar historial" });
    }
  });
  app2.delete("/api/casinos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const force = req.query.force === "true";
      const casinoMinutas = await storage.getAllMinutasByCasino(id);
      const allUsers = await storage.getUsers();
      const usersInCasino = allUsers.filter((u) => u.casinoId === id);
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
  app2.get("/api/minutas", requireAdmin, async (_req, res) => {
    try {
      const minutasList = await storage.getAllMinutas();
      return res.json(minutasList);
    } catch (error) {
      console.error("Get all minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.get("/api/minutas/:casinoId", async (req, res) => {
    try {
      const { casinoId } = req.params;
      const isAdmin = !!req.session.userId;
      const all = req.query.all === "true";
      const minutasList = isAdmin && all ? await storage.getAllMinutasByCasino(casinoId) : await storage.getMinutasByCasino(casinoId);
      return res.json(minutasList);
    } catch (error) {
      console.error("Get minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/minutas/batch-toggle", requireAdmin, async (req, res) => {
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
      return res.json({ message: `${updated} minutas ${activo ? "activadas" : "desactivadas"}`, updated });
    } catch (error) {
      console.error("Batch toggle minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/minutas", requireAdmin, async (req, res) => {
    try {
      const { casinoIds, ...rest } = req.body;
      const targetIds = casinoIds && Array.isArray(casinoIds) && casinoIds.length > 0 ? casinoIds : rest.casinoId ? [rest.casinoId] : [];
      if (targetIds.length === 0) {
        return res.status(400).json({ message: "Debe seleccionar al menos un casino" });
      }
      const created = [];
      for (const cid of targetIds) {
        const data = { ...rest, casinoId: cid };
        const parsed = insertMinutaSchema.safeParse(data);
        if (!parsed.success) {
          return res.status(400).json({ message: "Datos inv\xE1lidos", errors: parsed.error.errors });
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
  app2.put("/api/minutas/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { casinoId, fecha, familia, opcion1, opcion2, opcion3, opcion4, opcion5, activo } = req.body;
      const updateData = {};
      if (casinoId !== void 0) updateData.casinoId = casinoId;
      if (fecha !== void 0) updateData.fecha = fecha;
      if (familia !== void 0) updateData.familia = familia;
      if (opcion1 !== void 0) updateData.opcion1 = opcion1;
      if (opcion2 !== void 0) updateData.opcion2 = opcion2;
      if (opcion3 !== void 0) updateData.opcion3 = opcion3;
      if (opcion4 !== void 0) updateData.opcion4 = opcion4;
      if (opcion5 !== void 0) updateData.opcion5 = opcion5;
      if (activo !== void 0) updateData.activo = activo;
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
  app2.delete("/api/minutas/:id", requireAdmin, async (req, res) => {
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
  app2.post("/api/minutas/:id/clonar", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha, casinoIds } = req.body;
      const original = await storage.getMinuta(id);
      if (!original) {
        return res.status(404).json({ message: "Minuta original no encontrada" });
      }
      const targetDate = fecha || original.fecha;
      const targetCasinos = casinoIds && Array.isArray(casinoIds) && casinoIds.length > 0 ? casinoIds : [original.casinoId];
      const created = [];
      for (const cid of targetCasinos) {
        const cloneData = {
          casinoId: cid,
          fecha: targetDate,
          familia: original.familia,
          opcion1: original.opcion1,
          opcion2: original.opcion2,
          opcion3: original.opcion3,
          opcion4: original.opcion4,
          opcion5: original.opcion5
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
  app2.get("/api/familias", async (req, res) => {
    try {
      const allFamilias = await storage.getAllFamilias();
      return res.json(allFamilias);
    } catch (error) {
      console.error("Get familias error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/familias", requireAdmin, async (req, res) => {
    try {
      const { nombre, color } = req.body;
      if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });
      const familia = await storage.createFamilia({ nombre, color: color || "#D4A843" });
      return res.status(201).json(familia);
    } catch (error) {
      if (error.code === "23505") return res.status(409).json({ message: "Ya existe una familia con ese nombre" });
      console.error("Create familia error:", error);
      return res.status(500).json({ message: "Error al crear familia" });
    }
  });
  app2.put("/api/familias/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, color, activo } = req.body;
      const updateData = {};
      if (nombre !== void 0) updateData.nombre = nombre;
      if (color !== void 0) updateData.color = color;
      if (activo !== void 0) updateData.activo = activo;
      const familia = await storage.updateFamilia(id, updateData);
      if (!familia) return res.status(404).json({ message: "Familia no encontrada" });
      return res.json(familia);
    } catch (error) {
      console.error("Update familia error:", error);
      return res.status(500).json({ message: "Error al actualizar familia" });
    }
  });
  app2.delete("/api/familias/:id", requireAdmin, async (req, res) => {
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
  app2.get("/api/periodos", requireAdmin, async (req, res) => {
    try {
      const allPeriodos = await storage.getAllPeriodos();
      return res.json(allPeriodos);
    } catch (error) {
      console.error("Get periodos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.get("/api/periodos/casino/:casinoId", async (req, res) => {
    try {
      const { casinoId } = req.params;
      const periodosList = await storage.getPeriodosByCasino(casinoId);
      return res.json(periodosList);
    } catch (error) {
      console.error("Get periodos by casino error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/periodos", requireAdmin, async (req, res) => {
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
        fechaFin: new Date(fechaFin)
      });
      return res.status(201).json(periodo);
    } catch (error) {
      console.error("Create periodo error:", error);
      return res.status(500).json({ message: "Error al crear periodo" });
    }
  });
  app2.put("/api/periodos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, fechaInicio, fechaFin, activo } = req.body;
      const updateData = {};
      if (nombre !== void 0) updateData.nombre = nombre;
      if (fechaInicio !== void 0) updateData.fechaInicio = new Date(fechaInicio);
      if (fechaFin !== void 0) updateData.fechaFin = new Date(fechaFin);
      if (activo !== void 0) updateData.activo = activo;
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
  app2.delete("/api/periodos/:id", requireAdmin, async (req, res) => {
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
  app2.get("/api/pedidos/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const pedidosList = await storage.getPedidosByUser(userId);
      return res.json(pedidosList);
    } catch (error) {
      console.error("Get pedidos error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/pedidos", async (req, res) => {
    try {
      const parsed = insertPedidoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inv\xE1lidos" });
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
      const now = /* @__PURE__ */ new Date();
      const activePeriodos = casinoPeriodos.filter((p) => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
      if (casinoPeriodos.filter((p) => p.activo).length > 0 && activePeriodos.length === 0) {
        return res.status(403).json({ message: "La inscripci\xF3n no est\xE1 disponible en este momento. Fuera del horario de inscripci\xF3n." });
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
        nombreVisita
      });
      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create pedido error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.get("/api/periodo-activo/:casinoId", async (req, res) => {
    try {
      const { casinoId } = req.params;
      const periodosList = await storage.getPeriodosByCasino(casinoId);
      const now = /* @__PURE__ */ new Date();
      const activo = periodosList.find((p) => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
      return res.json({ activo: !!activo, periodo: activo || null });
    } catch (error) {
      return res.status(500).json({ message: "Error al verificar periodo" });
    }
  });
  app2.post("/api/pedidos/semanal", async (req, res) => {
    try {
      const { userId, selecciones } = req.body;
      if (!userId || !selecciones || !Array.isArray(selecciones)) {
        return res.status(400).json({ message: "userId y selecciones son requeridos" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      if (user.casinoId) {
        const periodosList = await storage.getPeriodosByCasino(user.casinoId);
        const now = /* @__PURE__ */ new Date();
        const periodoActivo = periodosList.find((p) => p.activo && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now);
        if (!periodoActivo) {
          return res.status(403).json({ message: "No hay un periodo de inscripci\xF3n activo. Contacta a tu administrador." });
        }
      }
      const results = [];
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
          tipo: selTipo
        });
        results.push(pedido);
      }
      return res.status(201).json(results);
    } catch (error) {
      console.error("Create pedidos semanales error:", error);
      return res.status(500).json({ message: "Error al registrar selecciones semanales" });
    }
  });
  app2.post("/api/pedidos/visita", async (req, res) => {
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
        nombreVisita
      });
      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create vale visita error:", error);
      return res.status(500).json({ message: "Error al crear vale de visita" });
    }
  });
  app2.get("/api/reportes/dashboard", requireAdmin, async (req, res) => {
    try {
      const allPedidos = await db.select().from(pedidos);
      const totalInscripciones = allPedidos.filter((p) => p.tipo === "seleccion" || !p.tipo).length;
      const totalNoAsiste = allPedidos.filter((p) => p.tipo === "no_asiste").length;
      const totalVisitas = allPedidos.filter((p) => p.tipo === "visita").length;
      return res.json({ totalInscripciones, totalNoAsiste, totalVisitas });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return res.status(500).json({ message: "Error al obtener estad\xEDsticas" });
    }
  });
  app2.get("/api/reportes/consolidacion", requireAdmin, async (req, res) => {
    try {
      const { casinoId, fecha } = req.query;
      if (!casinoId || !fecha) {
        return res.status(400).json({ message: "casinoId y fecha son requeridos" });
      }
      const casino = await storage.getCasino(casinoId);
      if (!casino) {
        return res.status(404).json({ message: "Casino no encontrado" });
      }
      const minutasList = await storage.getMinutasByCasino(casinoId);
      const minuta = minutasList.find((m) => m.fecha === fecha);
      if (!minuta) {
        return res.json({ casinoNombre: casino.nombre, fecha, minuta: null, opciones: [], totalPedidos: 0 });
      }
      const pedidosForMinuta = await storage.getPedidosByMinuta(minuta.id);
      const seleccionPedidos = pedidosForMinuta.filter((p) => p.tipo !== "no_asiste" && p.tipo !== "visita");
      const noAsistePedidos = pedidosForMinuta.filter((p) => p.tipo === "no_asiste");
      const visitaPedidos = pedidosForMinuta.filter((p) => p.tipo === "visita");
      const totalPedidos = seleccionPedidos.length;
      const opciones = [];
      const allOptions = [minuta.opcion1, minuta.opcion2, minuta.opcion3, minuta.opcion4, minuta.opcion5];
      for (let i = 0; i < allOptions.length; i++) {
        if (!allOptions[i]) continue;
        const num = i + 1;
        const count = seleccionPedidos.filter((p) => p.opcionSeleccionada === num).length;
        opciones.push({
          numero: num,
          descripcion: allOptions[i],
          cantidad: count,
          porcentaje: totalPedidos > 0 ? Math.round(count / totalPedidos * 100) : 0
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
        visitas: visitaPedidos.map((v) => ({ nombreVisita: v.nombreVisita, codigoQr: v.codigoQr }))
      });
    } catch (error) {
      console.error("Consolidacion error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/usuarios/upload", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibi\xF3 archivo" });
      }
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let created = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
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
            errorDetails.push({ row: rowNum, error: "RUT o Nombre vac\xEDo" });
            errors++;
            continue;
          }
          if (looksLikeRut(rut) && !validarRutChileno(rut)) {
            errorDetails.push({ row: rowNum, error: `RUT ${rut} inv\xE1lido \u2014 d\xEDgito verificador incorrecto` });
            errors++;
            continue;
          }
          const rol = rolRaw === "interlocutor" ? "interlocutor" : rolRaw === "admin" ? "admin" : "comensal";
          let casinoId = "";
          if (casinoRaw) {
            if (casinoRaw.includes("-") && casinoRaw.length > 20) {
              casinoId = casinoRaw;
            } else {
              const allCasinos = await storage.getCasinos();
              const match = allCasinos.find((c) => c.nombre.toLowerCase() === casinoRaw.toLowerCase());
              if (match) casinoId = match.id;
            }
          }
          const existing = await storage.getUserByRut(rut);
          if (existing) {
            skipped++;
            continue;
          }
          const digits = rut.replace(/[^0-9]/g, "");
          const defaultPassword = digits.slice(0, 4) || "1234";
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          await storage.createUser({ rut, nombre, apellido, password: hashedPassword, role: rol, casinoId: casinoId || null });
          created++;
        } catch (err) {
          errorDetails.push({ row: rowNum, error: err.message || "Error desconocido" });
          errors++;
        }
      }
      try {
        fs.unlinkSync(req.file.path);
      } catch {
      }
      return res.json({ created, skipped, errors, errorDetails });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Error al procesar el archivo" });
    }
  });
  const EX = {
    darkFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } },
    navyFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF16213E" } },
    headerBlueFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F3460" } },
    goldLightFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E7" } },
    greenFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
    orangeFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } },
    redLightFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCDD2" } },
    whiteFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
    grayFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } },
    optFills: [
      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } },
      { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E5F5" } },
      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEBEE" } }
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
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } }
    },
    borderGold: {
      top: { style: "medium", color: { argb: "FFD4A843" } },
      bottom: { style: "medium", color: { argb: "FFD4A843" } },
      left: { style: "medium", color: { argb: "FFD4A843" } },
      right: { style: "medium", color: { argb: "FFD4A843" } }
    },
    center: { horizontal: "center", vertical: "middle" },
    left: { horizontal: "left", vertical: "middle", wrapText: true },
    right: { horizontal: "right", vertical: "middle" }
  };
  app2.get("/api/plantillas/usuarios", async (_req, res) => {
    try {
      const casinosList = await storage.getCasinos();
      const wb = new ExcelJS.Workbook();
      wb.creator = "Vascan SPA";
      wb.created = /* @__PURE__ */ new Date();
      const wsInst = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF1A1A2E" } } });
      wsInst.columns = [{ width: 26 }, { width: 68 }];
      wsInst.mergeCells("A1:B1");
      wsInst.getCell("A1").value = "PLANTILLA DE CARGA DE USUARIOS";
      wsInst.getCell("A1").font = EX.fontTitle;
      wsInst.getCell("A1").fill = EX.darkFill;
      wsInst.getCell("A1").alignment = EX.center;
      wsInst.getRow(1).height = 36;
      wsInst.mergeCells("A2:B2");
      wsInst.getCell("A2").value = "VASCAN SPA \u2014 Sistema de Inscripci\xF3n de Comensales";
      wsInst.getCell("A2").font = EX.fontSubGold;
      wsInst.getCell("A2").fill = EX.navyFill;
      wsInst.getCell("A2").alignment = EX.center;
      wsInst.getRow(2).height = 24;
      wsInst.getCell("A4").value = "INSTRUCCIONES";
      wsInst.getCell("A4").font = EX.fontSubtitle;
      wsInst.getCell("A4").fill = EX.goldLightFill;
      wsInst.getCell("B4").fill = EX.goldLightFill;
      wsInst.getRow(4).height = 28;
      const instructions = [
        "Complete los datos en la hoja 'Usuarios' respetando el formato indicado.",
        "El campo RUT debe incluir gui\xF3n y d\xEDgito verificador (ej: 12345678-9).",
        "El campo ROL tiene un men\xFA desplegable: comensal, interlocutor, admin.",
        "El campo CASINO tiene un men\xFA desplegable con los casinos disponibles.",
        "La contrase\xF1a por defecto ser\xE1n los primeros 4 d\xEDgitos del RUT.",
        "Los usuarios con RUT duplicado ser\xE1n omitidos autom\xE1ticamente."
      ];
      instructions.forEach((text2, i) => {
        const row = 6 + i;
        wsInst.getCell(`A${row}`).value = `${i + 1}.`;
        wsInst.getCell(`A${row}`).font = EX.fontGold;
        wsInst.getCell(`A${row}`).alignment = EX.right;
        wsInst.getCell(`B${row}`).value = text2;
        wsInst.getCell(`B${row}`).font = EX.fontNormal;
      });
      const obRow = 13;
      wsInst.getCell(`A${obRow}`).value = "CAMPOS OBLIGATORIOS:";
      wsInst.getCell(`A${obRow}`).font = EX.fontBoldDark;
      wsInst.getCell(`A${obRow}`).fill = EX.greenFill;
      wsInst.getCell(`A${obRow}`).border = EX.borderThin;
      wsInst.getCell(`B${obRow}`).value = "RUT, Nombre, Apellido";
      wsInst.getCell(`B${obRow}`).font = EX.fontNormal;
      wsInst.getCell(`B${obRow}`).fill = EX.greenFill;
      wsInst.getCell(`B${obRow}`).border = EX.borderThin;
      wsInst.getCell(`A${obRow + 1}`).value = "CAMPOS OPCIONALES:";
      wsInst.getCell(`A${obRow + 1}`).font = EX.fontBoldDark;
      wsInst.getCell(`A${obRow + 1}`).fill = EX.orangeFill;
      wsInst.getCell(`A${obRow + 1}`).border = EX.borderThin;
      wsInst.getCell(`B${obRow + 1}`).value = "Rol (default: comensal), Casino (seleccionar del desplegable)";
      wsInst.getCell(`B${obRow + 1}`).font = EX.fontNormal;
      wsInst.getCell(`B${obRow + 1}`).fill = EX.orangeFill;
      wsInst.getCell(`B${obRow + 1}`).border = EX.borderThin;
      const wsUsers = wb.addWorksheet("Usuarios", { properties: { tabColor: { argb: "FFD4A843" } } });
      wsUsers.columns = [
        { header: "RUT", key: "rut", width: 18 },
        { header: "NOMBRE", key: "nombre", width: 22 },
        { header: "APELLIDO", key: "apellido", width: 22 },
        { header: "ROL", key: "rol", width: 18 },
        { header: "CASINO", key: "casino", width: 32 }
      ];
      const headerRowU = wsUsers.getRow(1);
      headerRowU.height = 30;
      headerRowU.eachCell((cell) => {
        cell.font = EX.fontHeader;
        cell.fill = EX.headerBlueFill;
        cell.alignment = EX.center;
        cell.border = EX.borderGold;
      });
      const casinoNames = casinosList.map((c) => c.nombre);
      const casinoMap = {};
      casinosList.forEach((c) => {
        casinoMap[c.nombre] = c.id;
      });
      const examples = [
        { rut: "12345678-9", nombre: "Juan", apellido: "P\xE9rez", rol: "comensal", casino: casinoNames[0] || "" },
        { rut: "98765432-1", nombre: "Mar\xEDa", apellido: "Gonz\xE1lez", rol: "interlocutor", casino: casinoNames[0] || "" },
        { rut: "11223344-5", nombre: "Carlos", apellido: "Mu\xF1oz", rol: "comensal", casino: "" }
      ];
      examples.forEach((ex) => wsUsers.addRow(ex));
      for (let i = 0; i < 97; i++) wsUsers.addRow({ rut: "", nombre: "", apellido: "", rol: "", casino: "" });
      const DATA_ROWS = 100;
      for (let r = 2; r <= DATA_ROWS + 1; r++) {
        const row = wsUsers.getRow(r);
        const isExample = r <= 4;
        const isEven = r % 2 === 0;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = isExample ? { ...EX.fontSmall, italic: true } : EX.fontNormal;
          cell.fill = isExample ? EX.goldLightFill : isEven ? EX.grayFill : EX.whiteFill;
          cell.border = EX.borderThin;
          cell.alignment = colNumber === 1 ? EX.center : EX.left;
        });
        wsUsers.getCell(`D${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"comensal,interlocutor,admin"'],
          showErrorMessage: true,
          errorTitle: "Rol inv\xE1lido",
          error: "Seleccione: comensal, interlocutor o admin",
          promptTitle: "Seleccionar Rol",
          prompt: "Elija el rol del usuario",
          showInputMessage: true
        };
        if (casinoNames.length > 0) {
          wsUsers.getCell(`E${r}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`"${casinoNames.join(",")}"`],
            showErrorMessage: true,
            errorTitle: "Casino inv\xE1lido",
            error: "Seleccione un casino de la lista",
            promptTitle: "Seleccionar Casino",
            prompt: "Elija el casino asignado",
            showInputMessage: true
          };
        }
      }
      const wsCasinos = wb.addWorksheet("Casinos (Referencia)", { properties: { tabColor: { argb: "FF0F3460" } } });
      wsCasinos.columns = [
        { header: "NOMBRE", key: "nombre", width: 35 },
        { header: "DIRECCI\xD3N", key: "direccion", width: 40 },
        { header: "ID (UUID)", key: "id", width: 42 },
        { header: "ESTADO", key: "estado", width: 12 }
      ];
      const headerRowC = wsCasinos.getRow(1);
      headerRowC.height = 28;
      headerRowC.eachCell((cell) => {
        cell.font = EX.fontHeader;
        cell.fill = EX.headerBlueFill;
        cell.alignment = EX.center;
        cell.border = EX.borderGold;
      });
      casinosList.forEach((c) => {
        const row = wsCasinos.addRow({ nombre: c.nombre, direccion: c.direccion || "\u2014", id: c.id, estado: c.activo ? "Activo" : "Inactivo" });
        row.eachCell((cell) => {
          cell.font = EX.fontNormal;
          cell.border = EX.borderThin;
          cell.alignment = EX.left;
        });
      });
      wsCasinos.state = "visible";
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Usuarios_Vascan.xlsx");
      return res.send(Buffer.from(buf));
    } catch (error) {
      console.error("Template error:", error);
      return res.status(500).json({ message: "Error al generar plantilla" });
    }
  });
  app2.get("/api/plantillas/minutas", async (_req, res) => {
    try {
      const casinosList = await storage.getCasinos();
      const wb = new ExcelJS.Workbook();
      wb.creator = "Vascan SPA";
      wb.created = /* @__PURE__ */ new Date();
      const wsInst = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF1A1A2E" } } });
      wsInst.columns = [{ width: 22 }, { width: 72 }];
      wsInst.mergeCells("A1:B1");
      wsInst.getCell("A1").value = "PLANTILLA DE PLANIFICACI\xD3N DE MINUTAS";
      wsInst.getCell("A1").font = EX.fontTitle;
      wsInst.getCell("A1").fill = EX.darkFill;
      wsInst.getCell("A1").alignment = EX.center;
      wsInst.getRow(1).height = 36;
      wsInst.mergeCells("A2:B2");
      wsInst.getCell("A2").value = "VASCAN SPA \u2014 Sistema de Inscripci\xF3n de Comensales";
      wsInst.getCell("A2").font = EX.fontSubGold;
      wsInst.getCell("A2").fill = EX.navyFill;
      wsInst.getCell("A2").alignment = EX.center;
      wsInst.getRow(2).height = 24;
      wsInst.getCell("A4").value = "INSTRUCCIONES";
      wsInst.getCell("A4").font = EX.fontSubtitle;
      wsInst.getCell("A4").fill = EX.goldLightFill;
      wsInst.getCell("B4").fill = EX.goldLightFill;
      const minInstructions = [
        "Complete las minutas en la hoja correspondiente a cada casino.",
        "Cada semana tiene 5 columnas (Lunes a Viernes) y hasta 5 opciones de men\xFA por d\xEDa.",
        "La fila FECHA contiene las fechas en formato AAAA-MM-DD. No modificar el formato.",
        "Las opciones 4 y 5 son opcionales (dejar en blanco si no aplica).",
        "Para importar, suba este archivo en el panel de administraci\xF3n > Carga Masiva.",
        "La secci\xF3n CONSOLIDACI\xD3N se llena autom\xE1ticamente con los datos de inscripci\xF3n."
      ];
      minInstructions.forEach((text2, i) => {
        const row = 6 + i;
        wsInst.getCell(`A${row}`).value = `${i + 1}.`;
        wsInst.getCell(`A${row}`).font = EX.fontGold;
        wsInst.getCell(`A${row}`).alignment = EX.right;
        wsInst.getCell(`B${row}`).value = text2;
        wsInst.getCell(`B${row}`).font = EX.fontNormal;
      });
      wsInst.getCell("A13").value = "IMPORTANTE:";
      wsInst.getCell("A13").font = EX.fontBoldDark;
      wsInst.getCell("A13").fill = EX.redLightFill;
      wsInst.getCell("A13").border = EX.borderThin;
      wsInst.getCell("B13").value = "No modificar la estructura de las hojas ni las filas de FECHA / ID Casino.";
      wsInst.getCell("B13").font = EX.fontNormal;
      wsInst.getCell("B13").fill = EX.redLightFill;
      wsInst.getCell("B13").border = EX.borderThin;
      const today = /* @__PURE__ */ new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const DIAS = ["Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes"];
      for (const casino of casinosList) {
        const safeSheetName = casino.nombre.substring(0, 28).replace(/[\\\/\?\*\[\]]/g, "");
        const ws = wb.addWorksheet(safeSheetName, { properties: { tabColor: { argb: "FFD4A843" } } });
        ws.columns = [
          { width: 20 },
          { width: 20 },
          { width: 30 },
          { width: 30 },
          { width: 30 },
          { width: 30 },
          { width: 30 }
        ];
        ws.mergeCells("A1:G1");
        ws.getCell("A1").value = "PLANIFICACI\xD3N SEMANAL DE MINUTAS";
        ws.getCell("A1").font = EX.fontTitle;
        ws.getCell("A1").fill = EX.darkFill;
        ws.getCell("A1").alignment = EX.center;
        ws.getRow(1).height = 32;
        ws.getCell("A2").value = "Casino:";
        ws.getCell("A2").font = EX.fontGold;
        ws.getCell("B2").value = casino.nombre;
        ws.getCell("B2").font = EX.fontBoldDark;
        ws.getCell("A3").value = "Direcci\xF3n:";
        ws.getCell("A3").font = EX.fontSmall;
        ws.getCell("B3").value = casino.direccion || "\u2014";
        ws.getCell("B3").font = EX.fontSmall;
        ws.getCell("A4").value = "ID Casino:";
        ws.getCell("A4").font = { ...EX.fontSmall, size: 8 };
        ws.getCell("B4").value = casino.id;
        ws.getCell("B4").font = { ...EX.fontSmall, size: 8 };
        let currentRow = 6;
        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(monday);
          weekStart.setDate(monday.getDate() + week * 7);
          const dates = [];
          const dateLabels = [];
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
            cell.fill = EX.headerBlueFill;
            cell.alignment = EX.center;
            cell.border = EX.borderGold;
          });
          currentRow++;
          const dateRow = ws.getRow(currentRow);
          dateRow.values = ["", "FECHA", ...dates];
          dateRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { ...EX.fontSmall, bold: true, color: { argb: "FF0F3460" } };
            cell.fill = EX.goldLightFill;
            cell.alignment = EX.center;
            cell.border = EX.borderThin;
          });
          currentRow++;
          for (let opt = 0; opt < 5; opt++) {
            const optRow = ws.getRow(currentRow);
            optRow.values = [opt === 0 ? "" : "", `OPCI\xD3N ${opt + 1}`, "", "", "", "", ""];
            optRow.height = 24;
            const optFill = EX.optFills[opt];
            optRow.getCell(1).font = EX.fontSmall;
            optRow.getCell(1).fill = optFill;
            optRow.getCell(1).border = EX.borderThin;
            optRow.getCell(2).font = EX.fontGold;
            optRow.getCell(2).fill = optFill;
            optRow.getCell(2).alignment = EX.left;
            optRow.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              const cell = optRow.getCell(c);
              cell.font = EX.fontNormal;
              cell.fill = EX.whiteFill;
              cell.alignment = EX.left;
              cell.border = EX.borderThin;
            }
            currentRow++;
          }
          currentRow++;
          const consHeaderRow = ws.getRow(currentRow);
          consHeaderRow.values = ["", "CONSOLIDACI\xD3N", ...dateLabels];
          consHeaderRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { ...EX.fontHeader, color: { argb: "FFB8902E" } };
            cell.fill = EX.goldLightFill;
            cell.alignment = EX.center;
            cell.border = EX.borderThin;
          });
          currentRow++;
          for (let i = 0; i < 5; i++) {
            const consRow = ws.getRow(currentRow);
            consRow.values = ["", `Inscritos Op.${i + 1}`, 0, 0, 0, 0, 0];
            consRow.getCell(2).font = EX.fontSmall;
            consRow.getCell(2).fill = EX.optFills[i];
            consRow.getCell(2).alignment = EX.left;
            consRow.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              consRow.getCell(c).font = EX.fontNormal;
              consRow.getCell(c).fill = EX.optFills[i];
              consRow.getCell(c).alignment = EX.center;
              consRow.getCell(c).border = EX.borderThin;
            }
            currentRow++;
          }
          const extraLabels = ["Sin inscripci\xF3n", "Visitas"];
          for (const label of extraLabels) {
            const row = ws.getRow(currentRow);
            row.values = ["", label, "", "", "", "", ""];
            row.getCell(2).font = EX.fontSmall;
            row.getCell(2).fill = EX.grayFill;
            row.getCell(2).alignment = EX.left;
            row.getCell(2).border = EX.borderThin;
            for (let c = 3; c <= 7; c++) {
              row.getCell(c).font = EX.fontNormal;
              row.getCell(c).fill = EX.grayFill;
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
            cell.fill = EX.darkFill;
            cell.alignment = EX.center;
            cell.border = EX.borderGold;
          });
          currentRow += 3;
        }
      }
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=Plantilla_Minutas_Vascan.xlsx");
      return res.send(Buffer.from(buf));
    } catch (error) {
      console.error("Template minutas error:", error);
      return res.status(500).json({ message: "Error al generar plantilla" });
    }
  });
  app2.post("/api/minutas/upload", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibi\xF3 archivo" });
      }
      const workbook = XLSX.readFile(req.file.path);
      let created = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      for (const sheetName of workbook.SheetNames) {
        if (sheetName === "Instrucciones") continue;
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
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
          const fechas = [row[2], row[3], row[4], row[5], row[6]].filter(Boolean).map((f) => String(f).trim());
          for (let dayIdx = 0; dayIdx < fechas.length; dayIdx++) {
            const fecha = fechas[dayIdx];
            if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
            try {
              const opciones = [];
              for (let optRow = 1; optRow <= 5; optRow++) {
                const optionRow = rows[i + optRow];
                if (optionRow && optionRow[dayIdx + 2]) {
                  opciones.push(String(optionRow[dayIdx + 2]).trim());
                }
              }
              if (opciones.length < 3) continue;
              const existingMinutas = await storage.getMinutasByCasino(casinoId);
              const existing = existingMinutas.find((m) => m.fecha === fecha);
              if (existing) {
                skipped++;
                continue;
              }
              await storage.createMinuta({
                casinoId,
                fecha,
                opcion1: opciones[0],
                opcion2: opciones[1],
                opcion3: opciones[2],
                opcion4: opciones[3] || null,
                opcion5: opciones[4] || null
              });
              created++;
            } catch (err) {
              errorDetails.push({ sheet: sheetName, row: i, error: err.message });
              errors++;
            }
          }
        }
      }
      try {
        fs.unlinkSync(req.file.path);
      } catch {
      }
      return res.json({ created, skipped, errors, errorDetails });
    } catch (error) {
      console.error("Upload minutas error:", error);
      return res.status(500).json({ message: "Error al procesar el archivo" });
    }
  });
  app2.get("/api/seed", async (_req, res) => {
    try {
      await autoSeed();
      return res.json({ message: "Seed ejecutado" });
    } catch (error) {
      console.error("Seed error:", error);
      return res.status(500).json({ message: "Error al crear datos de prueba" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function setupNoCache(app2) {
  app2.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    next();
  });
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "public")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  app.set("trust proxy", 1);
  setupCors(app);
  setupNoCache(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
