# Rifa Online - Full Stack Application

## Overview
Complete web app for managing online raffles ("rifas") in Spanish. Includes a public participant page with an interactive ticket grid, and a password-protected admin dashboard for managing participants, confirming payments, drawing winners per prize, and configuring the raffle.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend)
- **UI**: shadcn/ui components
- **Animations**: framer-motion, canvas-confetti
- **PDF Export**: jsPDF + jspdf-autotable

## Key Files
- `shared/schema.ts` - Database schema (raffleConfig, prizes, participants, winners)
- `server/db.ts` - Database connection (pg Pool + Drizzle)
- `server/storage.ts` - Storage interface with DatabaseStorage implementation
- `server/routes.ts` - API routes prefixed with /api
- `client/src/context/RaffleContext.tsx` - Frontend state management (fetches from API)
- `client/src/pages/public/Home.tsx` - Public raffle page with ticket grid
- `client/src/pages/admin/Dashboard.tsx` - Admin panel (login, participants, draw, config)
- `client/src/components/raffle/TicketGrid.tsx` - Interactive ticket grid component

## Database Tables
- `raffle_config` - Single row for raffle settings (name, price, dates, admin password)
- `prizes` - Multiple prizes per raffle with sort order
- `participants` - Ticket reservations/sales with status (reserved/sold)
- `winners` - Links prizes to winning participants

## API Endpoints
- `GET /api/config` - Get raffle configuration (password excluded)
- `PATCH /api/config` - Update raffle configuration
- `GET/POST /api/prizes` - List/add prizes
- `PATCH/DELETE /api/prizes/:id` - Update/remove prize
- `GET /api/participants` - List all participants
- `POST /api/participants/reserve` - Reserve a ticket
- `POST /api/participants/confirm/:ticketNumber` - Confirm payment
- `GET /api/winners` - List winners with participant/prize details
- `POST /api/winners/draw/:prizeId` - Draw winner for a prize
- `POST /api/winners/publish` - Publish winners publicly
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/change-password` - Change admin password
- `POST /api/raffle/reset` - Reset all participants/winners

## Design
- Colors: Green = available, Yellow = reserved, Red = sold
- Fonts: Inter (body) + Outfit (display)
- Admin default password: admin123
- Phone format: +56 prefix (Chile)

## User Preferences
- All UI text in Spanish
- Prize images support URL or base64 data URIs
- Launch date logic: extends 30 days if <50% sold when date arrives
- Reset creates new launch date 30 days from today
