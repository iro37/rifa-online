import React, { useState } from 'react';
import { useRaffle } from '@/context/RaffleContext';
import { TicketGrid } from '@/components/raffle/TicketGrid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Clock, Tag, AlertCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import confetti from 'canvas-confetti';
import { Link } from 'wouter';

export default function Home() {
  const { 
    config, 
    participants, 
    reserveTicket, 
    areWinnersPublished, 
    winners, 
    getLaunchStatus, 
    getCurrentLaunchDate, 
    getPercentageSold 
  } = useRaffle();
  const { toast } = useToast();
  
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    phone: '',
    email: ''
  });

  const availableCount = config.totalTickets - participants.length;
  const launchStatus = getLaunchStatus();
  const currentLaunchDate = getCurrentLaunchDate();
  const percentageSold = getPercentageSold();
  const totalSold = participants.filter(p => p.status === 'sold').length;
  const minRequired = Math.ceil(config.totalTickets * 0.5);

  const handleSelectTicket = (num: number) => {
    setSelectedNumber(num);
    setIsDialogOpen(true);
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNumber) return;

    const phoneToSave = formData.phone.startsWith('+56') 
      ? formData.phone 
      : `+56${formData.phone}`;

    try {
      await reserveTicket(selectedNumber, { ...formData, phone: phoneToSave });
      setIsDialogOpen(false);
      setSelectedNumber(null);
      setFormData({ name: '', lastName: '', phone: '', email: '' });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "¡Número reservado con éxito!",
        description: `Has reservado el número ${selectedNumber}. Tienes 24hrs para confirmar el pago.`,
      });

      window.open(config.paymentLink, '_blank');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "No se pudo reservar el número.",
      });
    }
  };

  const getLaunchStatusMessage = () => {
    switch (launchStatus) {
      case 'sold_out':
        return {
          title: '¡Se vendieron todos los números!',
          description: `¡La rifa se lanzará inmediatamente! 🎉`,
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-400'
        };
      case 'ready':
        return {
          title: '✓ ¡50% alcanzado!',
          description: `La rifa se lanzará el ${new Date(currentLaunchDate).toLocaleDateString()}`,
          color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-400'
        };
      case 'extended':
        return {
          title: '⏳ Aún no se alcanza el 50%',
          description: `Se necesitan ${minRequired - totalSold} números más. Fecha extendida hasta ${new Date(currentLaunchDate).toLocaleDateString()}`,
          color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-700 dark:text-yellow-400'
        };
      default:
        return {
          title: 'Pendiente de alcanzar el 50%',
          description: `Necesitamos ${minRequired - totalSold} números más antes de ${new Date(config.launchDate).toLocaleDateString()}`,
          color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400'
        };
    }
  };

  const statusMessage = getLaunchStatusMessage();

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="text-yellow-400" />
            {config.name}
          </h1>
          <Link href="/admin">
            <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
              Panel Admin
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid md:grid-cols-[1fr_2fr] gap-8">
        
        {/* Left Column: Info & Prize */}
        <div className="space-y-6">
          {areWinnersPublished && Object.keys(winners).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Trophy /> ¡Ganadores de la Rifa!
              </h2>
              {config.prizes.map(prize => {
                const prizeWinner = winners[prize.id];
                if (!prizeWinner) return null;
                
                return (
                  <Card key={`winner-${prize.id}`} className="border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20 shadow-lg animate-in fade-in zoom-in duration-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-center text-yellow-700 dark:text-yellow-500">
                        {prize.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-4xl font-black text-primary mb-1">{prizeWinner.ticketNumber}</div>
                        <div className="text-lg font-medium">{prizeWinner.name} {prizeWinner.lastName}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Status & Stats */}
          <Card className="shadow-md border-0 ring-1 ring-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-base text-foreground">Fecha de Lanzamiento</div>
                    <div className="text-sm">{new Date(currentLaunchDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>

                <div className="bg-secondary/50 p-4 rounded-lg border space-y-4">
                  <div className="grid grid-cols-3 gap-1 text-center divide-x">
                    <div className="flex flex-col px-1 justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mb-1">Disponibles</span>
                      <span className="text-sm font-bold text-green-600 truncate">{availableCount}</span>
                    </div>
                    <div className="flex flex-col px-1 justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mb-1">Reservados</span>
                      <span className="text-sm font-bold text-yellow-600 truncate">{participants.filter(p => p.status === 'reserved').length}</span>
                    </div>
                    <div className="flex flex-col px-1 justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mb-1">Vendidos</span>
                      <span className="text-sm font-bold text-red-600 truncate">{totalSold}</span>
                    </div>
                  </div>
                  <div className="text-xs text-center text-muted-foreground pt-2 border-t font-medium">
                    Total de números: {config.totalTickets}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Premio(s)</h2>
            {config.prizes.map((prize, index) => (
              <Card key={prize.id} className="overflow-hidden shadow-xl border-0 ring-1 ring-border/50">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img 
                    src={prize.image || `https://placehold.co/800x450/e2e8f0/64748b?text=Premio+${index + 1}`} 
                    alt={prize.name} 
                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/800x450/e2e8f0/64748b?text=${encodeURIComponent(prize.name)}`;
                    }}
                  />
                  {index === 0 && (
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1.5">
                      <Tag size={16} />
                      ${config.ticketPrice.toLocaleString()}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-white font-bold text-xl">{prize.name}</h3>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <p className="text-base text-foreground">
                    {prize.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Grid */}
        <div className="bg-card rounded-xl shadow-xl ring-1 ring-border/50 p-6">
          <TicketGrid 
            onSelectTicket={handleSelectTicket} 
            selectedTicket={selectedNumber} 
          />
        </div>
      </main>

      {/* Reservation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar Número {selectedNumber}</DialogTitle>
            <DialogDescription>
              Completa tus datos para reservar. Luego serás redirigido al pago.
              Valor: ${config.ticketPrice.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleReserve} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input 
                  id="name" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input 
                  id="lastName" 
                  required 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Pérez"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (WhatsApp) *</Label>
              <div className="flex">
                <div className="flex items-center justify-center bg-muted border border-r-0 border-input rounded-l-md px-3 text-sm text-muted-foreground font-medium">
                  +56
                </div>
                <Input 
                  id="phone" 
                  required 
                  className="rounded-l-none"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Solo números
                    setFormData({...formData, phone: val});
                  }}
                  placeholder="9 1234 5678"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="juan@ejemplo.com"
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-bold bg-green-600 hover:bg-green-700 text-white">
                Reservar y Pagar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
