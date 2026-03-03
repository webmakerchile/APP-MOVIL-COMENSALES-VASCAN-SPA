import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { pool } from "./db";
import { loginSchema, insertUserSchema, insertMinutaSchema, insertPedidoSchema, insertCasinoSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);

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

  app.get("/api/casinos", async (_req: Request, res: Response) => {
    try {
      const casinosList = await storage.getCasinos();
      return res.json(casinosList);
    } catch (error) {
      console.error("Get casinos error:", error);
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

  app.post("/api/minutas", async (req: Request, res: Response) => {
    try {
      const parsed = insertMinutaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      const minuta = await storage.createMinuta(parsed.data);
      return res.status(201).json(minuta);
    } catch (error) {
      console.error("Create minuta error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

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

      const existing = await storage.getPedidoByUserAndMinuta(
        parsed.data.userId,
        parsed.data.minutaId,
      );
      if (existing) {
        return res.status(409).json({ message: "Ya existe un pedido para esta minuta" });
      }

      const codigoQr = `VASCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pedido = await storage.createPedido({
        ...parsed.data,
        codigoQr,
      });

      return res.status(201).json(pedido);
    } catch (error) {
      console.error("Create pedido error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/seed", async (_req: Request, res: Response) => {
    try {
      const existingCasinos = await storage.getCasinos();
      if (existingCasinos.length > 0) {
        return res.json({ message: "Datos de prueba ya existen" });
      }

      const casino = await storage.createCasino({
        nombre: "Casino Central Santiago",
        direccion: "Av. Providencia 1234, Santiago",
      });

      const casino2 = await storage.createCasino({
        nombre: "Casino Planta Rancagua",
        direccion: "Calle Industrial 567, Rancagua",
      });

      const today = new Date();
      const dates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }

      for (const fecha of dates) {
        await storage.createMinuta({
          casinoId: casino.id,
          fecha,
          opcion1: "Pollo al horno con arroz y ensalada",
          opcion2: "Pescado frito con puré de papas",
          opcion3: "Pasta boloñesa con parmesano",
          opcion4: "Ensalada César con pollo grillado",
        });

        await storage.createMinuta({
          casinoId: casino2.id,
          fecha,
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

      return res.json({ message: "Datos de prueba creados exitosamente" });
    } catch (error) {
      console.error("Seed error:", error);
      return res.status(500).json({ message: "Error al crear datos de prueba" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
