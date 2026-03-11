import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type TicketStatus = 'available' | 'reserved' | 'sold';
export type LaunchStatus = 'pending' | 'extended' | 'ready' | 'completed' | 'sold_out';

export interface Participant {
  id: string;
  name: string;
  lastName: string;
  phone: string;
  email?: string | null;
  ticketNumber: number;
  status: string;
  reservedAt?: string | Date;
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  image: string;
  sortOrder?: number;
}

export interface RaffleConfig {
  name: string;
  prizes: Prize[];
  ticketPrice: number;
  totalTickets: number;
  endDate: string;
  launchDate: string;
  paymentLink: string;
  areWinnersPublished: boolean;
}

export interface WinnerEntry {
  id: string;
  prizeId: string;
  participantId: string;
  participant: Participant;
  prize: Prize;
}

interface RaffleContextType {
  config: RaffleConfig;
  updateConfig: (config: Partial<RaffleConfig>) => Promise<void>;
  updatePrize: (prizeId: string, data: Partial<Prize>) => Promise<void>;
  addPrize: () => Promise<void>;
  removePrize: (prizeId: string) => Promise<void>;
  participants: Participant[];
  reserveTicket: (ticketNumber: number, participantData: { name: string; lastName: string; phone: string; email?: string }) => Promise<Participant | null>;
  confirmPayment: (ticketNumber: number) => Promise<void>;
  getTicketStatus: (ticketNumber: number) => TicketStatus;
  resetRaffle: () => Promise<void>;
  drawWinner: (prizeId: string) => Promise<Participant | null>;
  winners: Record<string, Participant>;
  publishWinners: () => Promise<void>;
  areWinnersPublished: boolean;
  getLaunchStatus: () => LaunchStatus;
  getCurrentLaunchDate: () => string;
  getPercentageSold: () => number;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const defaultConfig: RaffleConfig = {
  name: 'Gran Rifa Tecnológica',
  prizes: [],
  ticketPrice: 5000,
  totalTickets: 100,
  endDate: '2026-12-31',
  launchDate: '2026-04-30',
  paymentLink: '',
  areWinnersPublished: false,
};

const RaffleContext = createContext<RaffleContextType | undefined>(undefined);

export function RaffleProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RaffleConfig>(defaultConfig);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Record<string, Participant>>({});
  const [areWinnersPublished, setAreWinnersPublished] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const [configRes, participantsRes, winnersRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/participants'),
        fetch('/api/winners'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig({
          name: configData.name,
          prizes: configData.prizes || [],
          ticketPrice: configData.ticketPrice,
          totalTickets: configData.totalTickets,
          endDate: configData.endDate,
          launchDate: configData.launchDate,
          paymentLink: configData.paymentLink,
          areWinnersPublished: configData.areWinnersPublished,
        });
        setAreWinnersPublished(configData.areWinnersPublished);
      }

      if (participantsRes.ok) {
        setParticipants(await participantsRes.json());
      }

      if (winnersRes.ok) {
        const winnersData: WinnerEntry[] = await winnersRes.json();
        const winnersMap: Record<string, Participant> = {};
        winnersData.forEach(w => {
          winnersMap[w.prizeId] = w.participant;
        });
        setWinners(winnersMap);
      }
    } catch (e) {
      console.error('Error fetching raffle data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateConfig = async (newConfig: Partial<RaffleConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({
          ...prev,
          ...newConfig,
          prizes: data.prizes || prev.prizes,
        }));
      }
    } catch (e) {
      console.error('Error updating config:', e);
    }
  };

  const updatePrize = async (prizeId: string, data: Partial<Prize>) => {
    try {
      const res = await fetch(`/api/prizes/${prizeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          prizes: prev.prizes.map(p => p.id === prizeId ? { ...p, ...data } : p),
        }));
      }
    } catch (e) {
      console.error('Error updating prize:', e);
    }
  };

  const addPrize = async () => {
    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${config.prizes.length + 1}º Lugar`,
          description: '',
          image: '',
        }),
      });
      if (res.ok) {
        const newPrize = await res.json();
        setConfig(prev => ({
          ...prev,
          prizes: [...prev.prizes, newPrize],
        }));
      }
    } catch (e) {
      console.error('Error adding prize:', e);
    }
  };

  const removePrize = async (prizeId: string) => {
    try {
      const res = await fetch(`/api/prizes/${prizeId}`, { method: 'DELETE' });
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          prizes: prev.prizes.filter(p => p.id !== prizeId),
        }));
      }
    } catch (e) {
      console.error('Error removing prize:', e);
    }
  };

  const reserveTicket = async (ticketNumber: number, participantData: { name: string; lastName: string; phone: string; email?: string }): Promise<Participant | null> => {
    try {
      const res = await fetch('/api/participants/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketNumber, ...participantData }),
      });
      if (res.ok) {
        const newParticipant = await res.json();
        setParticipants(prev => [...prev.filter(p => p.ticketNumber !== ticketNumber), newParticipant]);
        return newParticipant;
      } else {
        const err = await res.json();
        throw new Error(err.message);
      }
    } catch (e: any) {
      console.error('Error reserving ticket:', e);
      throw e;
    }
  };

  const confirmPayment = async (ticketNumber: number) => {
    try {
      const res = await fetch(`/api/participants/confirm/${ticketNumber}`, { method: 'POST' });
      if (res.ok) {
        setParticipants(prev =>
          prev.map(p => p.ticketNumber === ticketNumber ? { ...p, status: 'sold' } : p)
        );
      }
    } catch (e) {
      console.error('Error confirming payment:', e);
    }
  };

  const getTicketStatus = (ticketNumber: number): TicketStatus => {
    const participant = participants.find(p => p.ticketNumber === ticketNumber);
    return participant ? (participant.status as TicketStatus) : 'available';
  };

  const resetRaffle = async () => {
    try {
      const res = await fetch('/api/raffle/reset', { method: 'POST' });
      if (res.ok) {
        setParticipants([]);
        setWinners({});
        setAreWinnersPublished(false);
        await refreshData();
      }
    } catch (e) {
      console.error('Error resetting raffle:', e);
    }
  };

  const drawWinner = async (prizeId: string): Promise<Participant | null> => {
    try {
      const res = await fetch(`/api/winners/draw/${prizeId}`, { method: 'POST' });
      if (res.ok) {
        const winner = await res.json();
        setWinners(prev => ({ ...prev, [prizeId]: winner }));
        return winner;
      }
      return null;
    } catch (e) {
      console.error('Error drawing winner:', e);
      return null;
    }
  };

  const publishWinners = async () => {
    try {
      const res = await fetch('/api/winners/publish', { method: 'POST' });
      if (res.ok) {
        setAreWinnersPublished(true);
      }
    } catch (e) {
      console.error('Error publishing winners:', e);
    }
  };

  const getPercentageSold = () => {
    if (!config.totalTickets) return 0;
    const soldCount = participants.filter(p => p.status === 'sold').length;
    const percentage = (soldCount / config.totalTickets) * 100;
    return percentage > 0 && percentage < 1 ? Number(percentage.toFixed(1)) : Math.round(percentage);
  };

  const getCurrentLaunchDate = (): string => {
    const originalLaunchDate = new Date(config.launchDate);
    const totalSold = participants.filter(p => p.status === 'sold').length;
    const minRequired = Math.ceil(config.totalTickets * 0.5);
    const todayStr = new Date().toISOString().split('T')[0];

    if (totalSold === config.totalTickets) {
      return todayStr;
    }

    if (todayStr >= config.launchDate && totalSold < minRequired) {
      const extendedDate = new Date(originalLaunchDate);
      extendedDate.setDate(extendedDate.getDate() + 30);
      return extendedDate.toISOString().split('T')[0];
    }

    return config.launchDate;
  };

  const getLaunchStatus = (): LaunchStatus => {
    const totalSold = participants.filter(p => p.status === 'sold').length;
    const minRequired = Math.ceil(config.totalTickets * 0.5);
    const today = new Date().toISOString().split('T')[0];
    const currentLaunchDate = getCurrentLaunchDate();

    if (totalSold === config.totalTickets) {
      return 'sold_out';
    }

    if (today >= config.launchDate && totalSold < minRequired) {
      return 'extended';
    }

    if (today > currentLaunchDate) {
      return 'completed';
    }

    if (totalSold >= minRequired) {
      return 'ready';
    }

    return 'pending';
  };

  return (
    <RaffleContext.Provider value={{
      config,
      updateConfig,
      updatePrize,
      addPrize,
      removePrize,
      participants,
      reserveTicket,
      confirmPayment,
      getTicketStatus,
      resetRaffle,
      drawWinner,
      winners,
      publishWinners,
      areWinnersPublished,
      getLaunchStatus,
      getCurrentLaunchDate,
      getPercentageSold,
      loading,
      refreshData,
    }}>
      {children}
    </RaffleContext.Provider>
  );
}

export const useRaffle = () => {
  const context = useContext(RaffleContext);
  if (context === undefined) {
    throw new Error('useRaffle must be used within a RaffleProvider');
  }
  return context;
};
