import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const raffleConfig = pgTable("raffle_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default('Gran Rifa'),
  ticketPrice: integer("ticket_price").notNull().default(5000),
  totalTickets: integer("total_tickets").notNull().default(100),
  endDate: text("end_date").notNull().default('2026-12-31'),
  launchDate: text("launch_date").notNull().default('2026-04-30'),
  paymentLink: text("payment_link").notNull().default(''),
  adminPassword: text("admin_password").notNull().default('admin123'),
  areWinnersPublished: boolean("are_winners_published").notNull().default(false),
});

export const prizes = pgTable("prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raffleId: varchar("raffle_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(''),
  image: text("image").notNull().default(''),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raffleId: varchar("raffle_id").notNull(),
  name: text("name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  ticketNumber: integer("ticket_number").notNull(),
  status: text("status").notNull().default('reserved'),
  reservedAt: timestamp("reserved_at").defaultNow(),
});

export const winners = pgTable("winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raffleId: varchar("raffle_id").notNull(),
  prizeId: varchar("prize_id").notNull(),
  participantId: varchar("participant_id").notNull(),
});

export const insertRaffleConfigSchema = createInsertSchema(raffleConfig).omit({ id: true });
export const insertPrizeSchema = createInsertSchema(prizes).omit({ id: true });
export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, reservedAt: true });
export const insertWinnerSchema = createInsertSchema(winners).omit({ id: true });

export type RaffleConfig = typeof raffleConfig.$inferSelect;
export type InsertRaffleConfig = z.infer<typeof insertRaffleConfigSchema>;
export type Prize = typeof prizes.$inferSelect;
export type InsertPrize = z.infer<typeof insertPrizeSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Winner = typeof winners.$inferSelect;
export type InsertWinner = z.infer<typeof insertWinnerSchema>;
