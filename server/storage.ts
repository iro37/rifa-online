import { eq, and, asc, lt } from "drizzle-orm";
import { db } from "./db";
import {
  raffleConfig, prizes, participants, winners,
  type RaffleConfig, type InsertRaffleConfig,
  type Prize, type InsertPrize,
  type Participant, type InsertParticipant,
  type Winner, type InsertWinner,
} from "@shared/schema";
import { randomUUID } from "crypto";

const DEFAULT_RAFFLE_ID = "main-raffle";

export interface IStorage {
  getConfig(): Promise<RaffleConfig>;
  updateConfig(data: Partial<InsertRaffleConfig>): Promise<RaffleConfig>;

  getPrizes(): Promise<Prize[]>;
  addPrize(data: Omit<InsertPrize, 'raffleId'>): Promise<Prize>;
  updatePrize(prizeId: string, data: Partial<InsertPrize>): Promise<Prize | undefined>;
  removePrize(prizeId: string): Promise<void>;

  getParticipants(): Promise<Participant[]>;
  reserveTicket(data: Omit<InsertParticipant, 'raffleId' | 'status'>): Promise<Participant>;
  confirmPayment(ticketNumber: number): Promise<Participant | undefined>;
  getTicketStatus(ticketNumber: number): Promise<string>;

  getWinners(): Promise<(Winner & { participant: Participant; prize: Prize })[]>;
  drawWinner(prizeId: string): Promise<Participant | null>;
  publishWinners(): Promise<void>;

  resetRaffle(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private async ensureConfig(): Promise<RaffleConfig> {
    const existing = await db.select().from(raffleConfig).where(eq(raffleConfig.id, DEFAULT_RAFFLE_ID));
    if (existing.length > 0) return existing[0];

    const [created] = await db.insert(raffleConfig).values({
      id: DEFAULT_RAFFLE_ID,
      name: 'Gran Rifa Tecnológica',
      ticketPrice: 5000,
      totalTickets: 100,
      endDate: '2026-12-31',
      launchDate: '2026-04-30',
      paymentLink: 'https://mpago.li/example',
      adminPassword: 'admin123',
      areWinnersPublished: false,
    }).returning();

    const existingPrizes = await db.select().from(prizes).where(eq(prizes.raffleId, DEFAULT_RAFFLE_ID));
    if (existingPrizes.length === 0) {
      await db.insert(prizes).values({
        id: 'prize-1',
        raffleId: DEFAULT_RAFFLE_ID,
        name: '1er Lugar',
        description: 'Espectacular Consola de Última Generación 1TB + 2 Controles',
        image: '/images/prize.jpg',
        sortOrder: 0,
      });
    }

    return created;
  }

  async getConfig(): Promise<RaffleConfig> {
    return this.ensureConfig();
  }

  async updateConfig(data: Partial<InsertRaffleConfig>): Promise<RaffleConfig> {
    await this.ensureConfig();
    const [updated] = await db.update(raffleConfig)
      .set(data)
      .where(eq(raffleConfig.id, DEFAULT_RAFFLE_ID))
      .returning();
    return updated;
  }

  async getPrizes(): Promise<Prize[]> {
    await this.ensureConfig();
    return db.select().from(prizes)
      .where(eq(prizes.raffleId, DEFAULT_RAFFLE_ID))
      .orderBy(asc(prizes.sortOrder));
  }

  async addPrize(data: Omit<InsertPrize, 'raffleId'>): Promise<Prize> {
    const existingPrizes = await this.getPrizes();
    const [created] = await db.insert(prizes).values({
      ...data,
      id: data.id || `prize-${Date.now()}`,
      raffleId: DEFAULT_RAFFLE_ID,
      sortOrder: data.sortOrder ?? existingPrizes.length,
    }).returning();
    return created;
  }

  async updatePrize(prizeId: string, data: Partial<InsertPrize>): Promise<Prize | undefined> {
    const [updated] = await db.update(prizes)
      .set(data)
      .where(and(eq(prizes.id, prizeId), eq(prizes.raffleId, DEFAULT_RAFFLE_ID)))
      .returning();
    return updated;
  }

  async removePrize(prizeId: string): Promise<void> {
    await db.delete(prizes)
      .where(and(eq(prizes.id, prizeId), eq(prizes.raffleId, DEFAULT_RAFFLE_ID)));
  }

  async cleanExpiredReservations(): Promise<number> {
    const expireTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await db.select().from(participants)
      .where(and(
        eq(participants.raffleId, DEFAULT_RAFFLE_ID),
        eq(participants.status, 'reserved'),
        lt(participants.reservedAt, expireTime)
      ));
    if (expired.length > 0) {
      console.log(`[cleanup] Liberando ${expired.length} reservas expiradas: tickets ${expired.map(e => e.ticketNumber).join(', ')}`);
      await db.delete(participants)
        .where(and(
          eq(participants.raffleId, DEFAULT_RAFFLE_ID),
          eq(participants.status, 'reserved'),
          lt(participants.reservedAt, expireTime)
        ));
    }
    return expired.length;
  }

  async getParticipants(): Promise<Participant[]> {
    await this.cleanExpiredReservations();
    return db.select().from(participants)
      .where(eq(participants.raffleId, DEFAULT_RAFFLE_ID))
      .orderBy(asc(participants.ticketNumber));
  }

  async reserveTicket(data: Omit<InsertParticipant, 'raffleId' | 'status'>): Promise<Participant> {
    await db.delete(participants)
      .where(and(
        eq(participants.raffleId, DEFAULT_RAFFLE_ID),
        eq(participants.ticketNumber, data.ticketNumber)
      ));

    const [created] = await db.insert(participants).values({
      ...data,
      raffleId: DEFAULT_RAFFLE_ID,
      status: 'reserved',
    }).returning();
    return created;
  }

  async confirmPayment(ticketNumber: number): Promise<Participant | undefined> {
    const [updated] = await db.update(participants)
      .set({ status: 'sold' })
      .where(and(
        eq(participants.raffleId, DEFAULT_RAFFLE_ID),
        eq(participants.ticketNumber, ticketNumber)
      ))
      .returning();
    return updated;
  }

  async getTicketStatus(ticketNumber: number): Promise<string> {
    await this.cleanExpiredReservations();
    const result = await db.select().from(participants)
      .where(and(
        eq(participants.raffleId, DEFAULT_RAFFLE_ID),
        eq(participants.ticketNumber, ticketNumber)
      ));
    return result.length > 0 ? result[0].status : 'available';
  }

  async getWinners(): Promise<(Winner & { participant: Participant; prize: Prize })[]> {
    const winnerRows = await db.select().from(winners)
      .where(eq(winners.raffleId, DEFAULT_RAFFLE_ID));
    
    const result: (Winner & { participant: Participant; prize: Prize })[] = [];
    for (const w of winnerRows) {
      const [participant] = await db.select().from(participants).where(eq(participants.id, w.participantId));
      const [prize] = await db.select().from(prizes).where(eq(prizes.id, w.prizeId));
      if (participant && prize) {
        result.push({ ...w, participant, prize });
      }
    }
    return result;
  }

  async drawWinner(prizeId: string): Promise<Participant | null> {
    const soldParticipants = await db.select().from(participants)
      .where(and(
        eq(participants.raffleId, DEFAULT_RAFFLE_ID),
        eq(participants.status, 'sold')
      ));
    
    const existingWinners = await db.select().from(winners)
      .where(eq(winners.raffleId, DEFAULT_RAFFLE_ID));
    const winnerParticipantIds = existingWinners.map(w => w.participantId);
    
    const eligible = soldParticipants.filter(p => !winnerParticipantIds.includes(p.id));
    if (eligible.length === 0) return null;

    const selected = eligible[Math.floor(Math.random() * eligible.length)];

    await db.delete(winners)
      .where(and(
        eq(winners.raffleId, DEFAULT_RAFFLE_ID),
        eq(winners.prizeId, prizeId)
      ));

    await db.insert(winners).values({
      raffleId: DEFAULT_RAFFLE_ID,
      prizeId,
      participantId: selected.id,
    });

    return selected;
  }

  async publishWinners(): Promise<void> {
    await db.update(raffleConfig)
      .set({ areWinnersPublished: true })
      .where(eq(raffleConfig.id, DEFAULT_RAFFLE_ID));
  }

  async resetRaffle(): Promise<void> {
    await db.delete(winners).where(eq(winners.raffleId, DEFAULT_RAFFLE_ID));
    await db.delete(participants).where(eq(participants.raffleId, DEFAULT_RAFFLE_ID));
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    
    await db.update(raffleConfig)
      .set({
        areWinnersPublished: false,
        launchDate: nextDate.toISOString().split('T')[0],
      })
      .where(eq(raffleConfig.id, DEFAULT_RAFFLE_ID));
  }
}

export const storage = new DatabaseStorage();
