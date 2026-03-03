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
  insertCasinoSchema: () => insertCasinoSchema,
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
var minutas = pgTable("minutas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  casinoId: varchar("casino_id").notNull().references(() => casinos.id),
  fecha: date("fecha").notNull(),
  opcion1: text("opcion_1").notNull(),
  opcion2: text("opcion_2").notNull(),
  opcion3: text("opcion_3").notNull(),
  opcion4: text("opcion_4"),
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
var insertMinutaSchema = createInsertSchema(minutas).pick({
  casinoId: true,
  fecha: true,
  opcion1: true,
  opcion2: true,
  opcion3: true,
  opcion4: true
});
var insertPedidoSchema = createInsertSchema(pedidos).pick({
  userId: true,
  minutaId: true,
  opcionSeleccionada: true,
  codigoQr: true
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
  async getMinutasByCasino(casinoId) {
    return db.select().from(minutas).where(and(eq(minutas.casinoId, casinoId), eq(minutas.activo, true)));
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
  async getPeriodosByCasino(casinoId) {
    return db.select().from(periodos).where(eq(periodos.casinoId, casinoId));
  }
  async createPeriodo(insertPeriodo) {
    const [periodo] = await db.insert(periodos).values(insertPeriodo).returning();
    return periodo;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
var PgSession = connectPgSimple(session);
var upload = multer({ dest: "/tmp/uploads/" });
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
      const usersWithoutPasswords = allUsers.map(({ password, ...u }) => u);
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
      const existing = await storage.getUserByRut(rut);
      if (existing) {
        return res.status(409).json({ message: "El RUT ya est\xE1 registrado" });
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
  app2.delete("/api/casinos/:id", requireAdmin, async (req, res) => {
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
      const minutasList = await storage.getMinutasByCasino(casinoId);
      return res.json(minutasList);
    } catch (error) {
      console.error("Get minutas error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.post("/api/minutas", requireAdmin, async (req, res) => {
    try {
      const parsed = insertMinutaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inv\xE1lidos", errors: parsed.error.errors });
      }
      const minuta = await storage.createMinuta(parsed.data);
      return res.status(201).json(minuta);
    } catch (error) {
      console.error("Create minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app2.put("/api/minutas/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { casinoId, fecha, opcion1, opcion2, opcion3, opcion4, activo } = req.body;
      const updateData = {};
      if (casinoId !== void 0) updateData.casinoId = casinoId;
      if (fecha !== void 0) updateData.fecha = fecha;
      if (opcion1 !== void 0) updateData.opcion1 = opcion1;
      if (opcion2 !== void 0) updateData.opcion2 = opcion2;
      if (opcion3 !== void 0) updateData.opcion3 = opcion3;
      if (opcion4 !== void 0) updateData.opcion4 = opcion4;
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
        codigoQr
      });
      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create pedido error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
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
          porcentaje: totalPedidos > 0 ? Math.round(count / totalPedidos * 100) : 0
        });
      }
      return res.json({
        casinoNombre: casino.nombre,
        fecha,
        minuta: { id: minuta.id, opcion1: minuta.opcion1, opcion2: minuta.opcion2, opcion3: minuta.opcion3, opcion4: minuta.opcion4 },
        opciones,
        totalPedidos
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
          const rolRaw = String(row["Rol"] || row["rol"] || "comensal").trim().toLowerCase();
          const casinoId = String(row["Casino_ID"] || row["casino_id"] || row["CasinoID"] || "").trim();
          if (!rut || !nombre) {
            errorDetails.push({ row: rowNum, error: "RUT o Nombre vac\xEDo" });
            errors++;
            continue;
          }
          const rol = rolRaw === "interlocutor" ? "interlocutor" : "comensal";
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
  setupCors(app);
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
