import React, { useState } from 'react';
import { useRaffle } from '@/context/RaffleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Settings, Users, ArrowLeft, Download, RotateCcw, CheckCircle2, MessageCircle, Calendar, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'wouter';

function Login({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        onLogin();
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Panel Administrador</CardTitle>
          <CardDescription>Ingresa para gestionar la rifa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={pwd} 
                onChange={(e) => { setPwd(e.target.value); setError(false); }} 
                className={error ? "border-red-500" : ""}
                data-testid="input-admin-password"
              />
              {error && <p className="text-xs text-red-500">Contraseña incorrecta</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
              {loading ? 'Ingresando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const { 
    config, updateConfig, updatePrize, addPrize, removePrize,
    participants, confirmPayment, getTicketStatus, reserveTicket, 
    resetRaffle, drawWinner, winners, publishWinners, areWinnersPublished,
    getLaunchStatus, getCurrentLaunchDate, getPercentageSold
  } = useRaffle();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Lista de Participantes - " + config.name, 14, 15);
    
    const tableData = participants.map(p => [
      p.ticketNumber.toString(),
      `${p.name} ${p.lastName}`,
      p.phone,
      p.status === 'sold' ? 'Vendido' : 'Reservado'
    ]);

    autoTable(doc, {
      head: [['Número', 'Nombre', 'Teléfono', 'Estado']],
      body: tableData,
      startY: 20,
    });

    doc.save("participantes-rifa.pdf");
    toast({ title: "PDF Exportado correctamente" });
  };

  const handleConfirmPayment = async (num: number, phone: string, name: string) => {
    await confirmPayment(num);
    
    const message = `Hola ${name}, tu pago ha sido confirmado. Tu número para la rifa es el ${num}. ¡Mucha suerte!`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodedMessage}`;
    
    window.open(waUrl, '_blank');
    
    toast({
      title: "Pago confirmado",
      description: `El número ${num} ha sido marcado como vendido.`,
    });
  };

  const handleDrawWinner = async (prizeId: string) => {
    const w = await drawWinner(prizeId);
    if (w) {
      toast({
        title: "¡Sorteo Realizado!",
        description: `El ganador es el número ${w.ticketNumber}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay números elegibles para sortear.",
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.trim().length < 4) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 4 caracteres.",
      });
      return;
    }
    
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: '', newPassword }),
      });
      if (res.ok) {
        setNewPassword('');
        toast({
          title: "Contraseña actualizada",
          description: "La nueva contraseña para el panel admin se ha guardado.",
        });
      } else {
        const err = await res.json();
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar la contraseña." });
    }
  };

  const launchStatus = getLaunchStatus();
  const currentLaunchDate = getCurrentLaunchDate();
  const percentageSold = getPercentageSold();
  const soldCount = participants.filter(p => p.status === 'sold').length;
  const reservedCount = participants.filter(p => p.status === 'reserved').length;
  const minRequired = Math.ceil(config.totalTickets * 0.5);
  const revenue = soldCount * config.ticketPrice;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Admin: {config.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/respaldo-rifa-final.zip" download>
              <Download className="h-4 w-4 mr-2" /> Backup ZIP
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Launch Status Alert */}
        <Alert className={`mb-8 border-2 ${
          launchStatus === 'sold_out' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
          launchStatus === 'ready' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
          launchStatus === 'extended' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
          'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
        }`}>
          <Calendar className="h-4 w-4" />
          <AlertTitle className={
            launchStatus === 'sold_out' ? 'text-green-700 dark:text-green-400' :
            launchStatus === 'ready' ? 'text-blue-700 dark:text-blue-400' :
            launchStatus === 'extended' ? 'text-yellow-700 dark:text-yellow-400' :
            'text-gray-700 dark:text-gray-400'
          }>
            {launchStatus === 'sold_out' && '✓ ¡Se vendió todo!'}
            {launchStatus === 'ready' && `✓ ${percentageSold}% alcanzado - Lanzamiento en ${new Date(currentLaunchDate).toLocaleDateString()}`}
            {launchStatus === 'extended' && `⏳ Aún no se alcanza el 50% - Fecha extendida a ${new Date(currentLaunchDate).toLocaleDateString()}`}
            {launchStatus === 'pending' && `Necesitas ${minRequired - soldCount} más (${percentageSold}%)`}
          </AlertTitle>
          <AlertDescription className={
            launchStatus === 'sold_out' ? 'text-green-600 dark:text-green-500' :
            launchStatus === 'ready' ? 'text-blue-600 dark:text-blue-500' :
            launchStatus === 'extended' ? 'text-yellow-600 dark:text-yellow-500' :
            'text-gray-600 dark:text-gray-500'
          }>
            {launchStatus === 'sold_out' && 'Todos los números fueron vendidos. Puedes lanzar la rifa inmediatamente.'}
            {launchStatus === 'ready' && `Se alcanzó el 50% requerido (${soldCount}/${minRequired}). Lista para lanzarse en la fecha programada.`}
            {launchStatus === 'extended' && `Solo ${soldCount} de ${minRequired} vendidos. La fecha se extendió 30 días automáticamente.`}
            {launchStatus === 'pending' && `Necesitas ${minRequired - soldCount} números vendidos más para alcanzar el mínimo del 50% requerido.`}
          </AlertDescription>
        </Alert>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recaudación</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">${revenue.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vendidos</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{soldCount} / {config.totalTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">{percentageSold}% de la meta</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reservados</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{reservedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {config.totalTickets ? Math.round((reservedCount / config.totalTickets) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ocupación Total</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${percentageSold >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                {config.totalTickets ? Math.round(((soldCount + reservedCount) / config.totalTickets) * 100) : 0}%
              </div>
              <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{width: `${percentageSold}%`}}></div>
                <div className="bg-yellow-500 h-full" style={{width: `${config.totalTickets ? (reservedCount / config.totalTickets) * 100 : 0}%`}}></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-3">
            <TabsTrigger value="participants"><Users className="w-4 h-4 mr-2" /> Participantes</TabsTrigger>
            <TabsTrigger value="draw"><Trophy className="w-4 h-4 mr-2" /> Sorteo</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Config</TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Participantes</CardTitle>
                <CardDescription>Gestiona las reservas y confirma los pagos.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Nº</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay participantes aún</TableCell></TableRow>
                      ) : (
                        participants.sort((a,b) => a.ticketNumber - b.ticketNumber).map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-bold text-lg">{p.ticketNumber}</TableCell>
                            <TableCell>{p.name} {p.lastName}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                <span>{p.phone}</span>
                                {p.email && <span className="text-muted-foreground">{p.email}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'sold' ? "default" : "secondary"} className={p.status === 'sold' ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600 text-white"}>
                                {p.status === 'sold' ? 'Vendido' : 'Reservado'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {p.status === 'reserved' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleConfirmPayment(p.ticketNumber, p.phone, p.name)}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Pago
                                </Button>
                              )}
                              {p.status === 'sold' && (
                                <Button size="sm" variant="outline" onClick={() => {
                                  const msg = encodeURIComponent(`Hola ${p.name}, te recordamos que tu número para la rifa es el ${p.ticketNumber}. ¡Mucha suerte!`);
                                  window.open(`https://wa.me/${p.phone.replace(/\+/g, '')}?text=${msg}`, '_blank');
                                }}>
                                  <MessageCircle className="w-4 h-4 mr-1 text-green-600" /> WhatsApp
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="draw" className="space-y-6">
            <div className="grid gap-6">
              {config.prizes.map((prize) => {
                const prizeWinner = winners[prize.id];
                
                return (
                  <Card key={prize.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        Sorteo: {prize.name}
                      </CardTitle>
                      <CardDescription>{prize.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-6">
                      {!prizeWinner ? (
                        <Button 
                          size="lg" 
                          className="h-14 px-8 rounded-full bg-primary" 
                          onClick={() => handleDrawWinner(prize.id)} 
                          disabled={soldCount === 0}
                        >
                          <Trophy className="w-5 h-5 mr-2" />
                          Sortear Ganador
                        </Button>
                      ) : (
                        <div className="text-center space-y-4 animate-in zoom-in duration-500">
                          <div className="inline-block p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <Trophy className="w-12 h-12 text-yellow-500" />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-primary mb-1">Número {prizeWinner.ticketNumber}</h2>
                            <p className="text-xl">{prizeWinner.name} {prizeWinner.lastName}</p>
                            <p className="text-muted-foreground">{prizeWinner.phone}</p>
                          </div>
                          
                          <div className="pt-2">
                            <Button variant="outline" size="sm" onClick={() => handleDrawWinner(prize.id)}>
                              Sortear de nuevo
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="py-6 flex flex-col items-center gap-4">
                <Button 
                  size="lg"
                  onClick={() => publishWinners()} 
                  disabled={areWinnersPublished || Object.keys(winners).length === 0} 
                  className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                >
                  {areWinnersPublished ? 'Ganadores Publicados' : 'Publicar Ganadores en Página Principal'}
                </Button>
                
                {areWinnersPublished && (
                  <Alert className="bg-green-50 border-green-200 w-full max-w-md">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">¡Publicado!</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Todos los visitantes ahora pueden ver a los ganadores.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de la Rifa</CardTitle>
                  <CardDescription>Modifica los detalles generales.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Rifa</Label>
                    <Input value={config.name} onChange={e => updateConfig({name: e.target.value})} />
                  </div>
                  
                  <div className="pt-4 pb-2 border-b">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Premios</h3>
                      <Button size="sm" variant="outline" onClick={addPrize} className="flex gap-2">
                        <Plus size={16} /> Agregar Premio
                      </Button>
                    </div>
                    
                    <div className="space-y-6">
                      {config.prizes.map((prize, index) => (
                        <div key={prize.id} className="p-4 border rounded-lg bg-secondary/20 relative group">
                          {config.prizes.length > 1 && (
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePrize(prize.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Nombre del Premio (ej: 1er Lugar)</Label>
                              <Input 
                                value={prize.name} 
                                onChange={e => updatePrize(prize.id, {name: e.target.value})} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Descripción del Premio</Label>
                              <Input 
                                value={prize.description} 
                                onChange={e => updatePrize(prize.id, {description: e.target.value})} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Imagen del Premio (URL o Archivo JPG/PNG)</Label>
                              <div className="flex gap-2">
                                <Input 
                                  value={prize.image} 
                                  onChange={e => updatePrize(prize.id, {image: e.target.value})} 
                                  placeholder="https://ejemplo.com/imagen.jpg"
                                />
                                <div className="relative overflow-hidden">
                                  <Input 
                                    type="file" 
                                    accept="image/jpeg, image/png"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-[100px] z-10"
                                    title="Subir imagen"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updatePrize(prize.id, {image: reader.result as string});
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  <Button type="button" variant="outline" className="w-[100px]">Subir</Button>
                                </div>
                              </div>
                              {prize.image && (
                                <div className="mt-2 h-20 w-32 rounded-md border overflow-hidden">
                                  <img src={prize.image} alt="Vista previa" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Valor del Número ($)</Label>
                      <Input type="number" value={config.ticketPrice} onChange={e => updateConfig({ticketPrice: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad (1-1000)</Label>
                      <Input type="number" max="1000" value={config.totalTickets} onChange={e => updateConfig({totalTickets: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Lanzamiento Original</Label>
                    <Input type="date" value={config.launchDate} onChange={e => updateConfig({launchDate: e.target.value})} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se usará esta fecha si se alcanza el 50% de ventas. Si no, se extenderá 30 días más automáticamente.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Link de Pago (MercadoPago, Flow, etc)</Label>
                    <Input value={config.paymentLink} onChange={e => updateConfig({paymentLink: e.target.value})} />
                  </div>
                  
                  <div className="pt-4 pb-2 border-b mt-4 mb-4"></div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Seguridad</h3>
                    <Label>Cambiar Contraseña de Administrador</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        placeholder="Nueva contraseña" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                      />
                      <Button onClick={handleChangePassword} variant="secondary">Actualizar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900/50">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Zona de Peligro</CardTitle>
                  <CardDescription>Acciones destructivas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border border-red-100 dark:border-red-900/30 rounded-lg bg-red-50/50 dark:bg-red-900/10 space-y-3">
                    <h3 className="font-semibold text-red-800 dark:text-red-300">Reiniciar Rifa</h3>
                    <p className="text-sm text-red-600 dark:text-red-400">Esto borrará todos los participantes, reservas y el historial de ganadores. La configuración (precio, nombre) se mantendrá.</p>
                    <Button variant="destructive" className="w-full mt-2" onClick={() => {
                      if(window.confirm('¿Estás SEGURO de que deseas borrar todos los participantes? Esta acción no se puede deshacer.')) {
                        resetRaffle();
                        toast({title: "Rifa reseteada", description: "Se han borrado todos los participantes."});
                      }
                    }}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Borrar todo e iniciar nueva rifa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
