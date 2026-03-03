import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  casinos,
  minutas,
  pedidos,
  periodos,
  type User,
  type InsertUser,
  type Casino,
  type InsertCasino,
  type Minuta,
  type InsertMinuta,
  type Pedido,
  type InsertPedido,
  type Periodo,
  type InsertPeriodo,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByRut(rut: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCasinos(): Promise<Casino[]>;
  getCasino(id: string): Promise<Casino | undefined>;
  createCasino(casino: InsertCasino): Promise<Casino>;
  getMinutasByCasino(casinoId: string): Promise<Minuta[]>;
  getMinuta(id: string): Promise<Minuta | undefined>;
  createMinuta(minuta: InsertMinuta): Promise<Minuta>;
  getPedidosByUser(userId: string): Promise<Pedido[]>;
  getPedidoByUserAndMinuta(
    userId: string,
    minutaId: string,
  ): Promise<Pedido | undefined>;
  createPedido(pedido: InsertPedido & { codigoQr?: string }): Promise<Pedido>;
  getPedidosByMinuta(minutaId: string): Promise<Pedido[]>;
  getPeriodosByCasino(casinoId: string): Promise<Periodo[]>;
  createPeriodo(periodo: InsertPeriodo): Promise<Periodo>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByRut(rut: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.rut, rut));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCasinos(): Promise<Casino[]> {
    return db.select().from(casinos).where(eq(casinos.activo, true));
  }

  async getCasino(id: string): Promise<Casino | undefined> {
    const [casino] = await db
      .select()
      .from(casinos)
      .where(eq(casinos.id, id));
    return casino;
  }

  async createCasino(insertCasino: InsertCasino): Promise<Casino> {
    const [casino] = await db
      .insert(casinos)
      .values(insertCasino)
      .returning();
    return casino;
  }

  async getMinutasByCasino(casinoId: string): Promise<Minuta[]> {
    return db
      .select()
      .from(minutas)
      .where(
        and(eq(minutas.casinoId, casinoId), eq(minutas.activo, true)),
      );
  }

  async getMinuta(id: string): Promise<Minuta | undefined> {
    const [minuta] = await db
      .select()
      .from(minutas)
      .where(eq(minutas.id, id));
    return minuta;
  }

  async createMinuta(insertMinuta: InsertMinuta): Promise<Minuta> {
    const [minuta] = await db
      .insert(minutas)
      .values(insertMinuta)
      .returning();
    return minuta;
  }

  async getPedidosByUser(userId: string): Promise<Pedido[]> {
    return db.select().from(pedidos).where(eq(pedidos.userId, userId));
  }

  async getPedidoByUserAndMinuta(
    userId: string,
    minutaId: string,
  ): Promise<Pedido | undefined> {
    const [pedido] = await db
      .select()
      .from(pedidos)
      .where(
        and(eq(pedidos.userId, userId), eq(pedidos.minutaId, minutaId)),
      );
    return pedido;
  }

  async createPedido(insertPedido: InsertPedido & { codigoQr?: string }): Promise<Pedido> {
    const [pedido] = await db
      .insert(pedidos)
      .values(insertPedido)
      .returning();
    return pedido;
  }

  async getPedidosByMinuta(minutaId: string): Promise<Pedido[]> {
    return db.select().from(pedidos).where(eq(pedidos.minutaId, minutaId));
  }

  async getPeriodosByCasino(casinoId: string): Promise<Periodo[]> {
    return db
      .select()
      .from(periodos)
      .where(eq(periodos.casinoId, casinoId));
  }

  async createPeriodo(insertPeriodo: InsertPeriodo): Promise<Periodo> {
    const [periodo] = await db
      .insert(periodos)
      .values(insertPeriodo)
      .returning();
    return periodo;
  }
}

export const storage = new DatabaseStorage();
