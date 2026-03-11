import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === CONFIG ===
  app.get("/api/config", async (_req, res) => {
    try {
      const config = await storage.getConfig();
      const configPrizes = await storage.getPrizes();
      const { adminPassword, ...publicConfig } = config;
      res.json({ ...publicConfig, prizes: configPrizes });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/config", async (req, res) => {
    try {
      const updated = await storage.updateConfig(req.body);
      const configPrizes = await storage.getPrizes();
      res.json({ ...updated, prizes: configPrizes });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === PRIZES ===
  app.get("/api/prizes", async (_req, res) => {
    try {
      const allPrizes = await storage.getPrizes();
      res.json(allPrizes);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/prizes", async (req, res) => {
    try {
      const prize = await storage.addPrize(req.body);
      res.json(prize);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/prizes/:id", async (req, res) => {
    try {
      const prize = await storage.updatePrize(req.params.id, req.body);
      if (!prize) return res.status(404).json({ message: "Premio no encontrado" });
      res.json(prize);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/prizes/:id", async (req, res) => {
    try {
      await storage.removePrize(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === PARTICIPANTS ===
  app.get("/api/participants", async (_req, res) => {
    try {
      const all = await storage.getParticipants();
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/reserve", async (req, res) => {
    try {
      const { ticketNumber, name, lastName, phone, email } = req.body;
      
      const existingStatus = await storage.getTicketStatus(ticketNumber);
      if (existingStatus !== 'available') {
        return res.status(409).json({ message: "Este número ya está reservado o vendido." });
      }

      const participant = await storage.reserveTicket({ ticketNumber, name, lastName, phone, email });
      res.json(participant);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/confirm/:ticketNumber", async (req, res) => {
    try {
      const ticketNumber = parseInt(req.params.ticketNumber);
      const updated = await storage.confirmPayment(ticketNumber);
      if (!updated) return res.status(404).json({ message: "Participante no encontrado" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tickets/:ticketNumber/status", async (req, res) => {
    try {
      const ticketNumber = parseInt(req.params.ticketNumber);
      const status = await storage.getTicketStatus(ticketNumber);
      res.json({ status });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === WINNERS ===
  app.get("/api/winners", async (_req, res) => {
    try {
      const allWinners = await storage.getWinners();
      res.json(allWinners);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/winners/draw/:prizeId", async (req, res) => {
    try {
      const winner = await storage.drawWinner(req.params.prizeId);
      if (!winner) return res.status(400).json({ message: "No hay participantes elegibles para sortear." });
      res.json(winner);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/winners/publish", async (_req, res) => {
    try {
      await storage.publishWinners();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN AUTH ===
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const config = await storage.getConfig();
      if (password === config.adminPassword) {
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Contraseña incorrecta" });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 4 caracteres" });
      }
      await storage.updateConfig({ adminPassword: newPassword });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === RESET ===
  app.post("/api/raffle/reset", async (_req, res) => {
    try {
      await storage.resetRaffle();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
