import React from 'react';
import { useRaffle, TicketStatus } from '@/context/RaffleContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TicketGridProps {
  onSelectTicket?: (number: number) => void;
  selectedTicket?: number | null;
  readOnly?: boolean;
}

export function TicketGrid({ onSelectTicket, selectedTicket, readOnly = false }: TicketGridProps) {
  const { config, getTicketStatus } = useRaffle();
  
  const tickets = Array.from({ length: config.totalTickets }, (_, i) => i + 1);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'available':
        return 'bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)]';
      case 'reserved':
        return 'bg-[hsl(45,93%,47%)] text-white hover:bg-[hsl(45,93%,42%)]';
      case 'sold':
        return 'bg-[hsl(0,84%,60%)] text-white hover:bg-[hsl(0,84%,55%)]';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Selecciona tu número</h3>
        <div className="flex gap-2 text-sm">
          <Badge className="bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)]">Disponible</Badge>
          <Badge className="bg-[hsl(45,93%,47%)] hover:bg-[hsl(45,93%,42%)]">Reservado</Badge>
          <Badge className="bg-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,55%)] text-white">Vendido</Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-xl bg-muted/20">
        {tickets.map(num => {
          const status = getTicketStatus(num);
          const isSelected = selectedTicket === num;
          
          return (
            <button
              key={num}
              onClick={() => !readOnly && status === 'available' && onSelectTicket?.(num)}
              disabled={readOnly || status !== 'available'}
              className={cn(
                "h-12 w-full rounded-md font-bold text-sm transition-all flex items-center justify-center shadow-sm",
                getStatusColor(status),
                status === 'available' && !readOnly ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-90",
                isSelected && "ring-4 ring-primary ring-offset-2 scale-110 z-10 shadow-md"
              )}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
