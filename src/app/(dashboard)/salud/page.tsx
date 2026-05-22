"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { format, isAfter, isThisMonth } from "date-fns"
import { es } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Activity, Plus, Syringe, Stethoscope, AlertCircle } from "lucide-react"

export default function SaludPage() {
  const { fincaId } = useGlobalStore()
  const [openForm, setOpenForm] = useState(false)

  // Consultar eventos de salud y unirlos con información de animales
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['eventos_salud', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('eventos_salud') as any)
        .select(`
          *,
          animales (
            codigo,
            nombre
          )
        `)
        .eq('deleted', false)
        .order('fecha', { ascending: false })

      if (error) throw error
      return (data || []) as any[]
    }
  })

  // Cálculos de KPIs
  const eventosEsteMes = eventos.filter(e => e.fecha && isThisMonth(new Date(e.fecha)))
  const costoTotal = eventos.reduce((acc, e) => acc + (e.costoBob || 0), 0)
  
  // Próximas aplicaciones (donde la fechaProximaAplicacion sea futura)
  const proximasAplicaciones = eventos.filter(e => e.fechaProximaAplicacion && isAfter(new Date(e.fechaProximaAplicacion), new Date()))

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salud Animal</h1>
          <p className="text-muted-foreground">
            Gestión clínica, tratamientos y calendarios de vacunación del hato.
          </p>
        </div>

        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger 
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Registrar Evento
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Evento de Salud</DialogTitle>
              <DialogDescription>
                Ingresa los detalles del tratamiento, vacuna o diagnóstico.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center text-muted-foreground">
              Formulario en construcción...
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos (Mes Actual)</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{eventosEsteMes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tratamientos y vacunas aplicadas</p>
          </CardContent>
        </Card>
        
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Aplicaciones</CardTitle>
            <AlertCircle className={`h-4 w-4 ${proximasAplicaciones.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${proximasAplicaciones.length > 0 ? 'text-amber-500' : ''}`}>
              {proximasAplicaciones.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recordatorios pendientes</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total de Salud</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-red-500">Bs</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {costoTotal.toLocaleString('es-BO')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inversión acumulada en tratamientos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Historial Clínico Reciente
          </CardTitle>
          <CardDescription>Registro de todas las intervenciones médicas en el hato.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Medicamento / Dosis</TableHead>
                <TableHead>Próx. Aplicación</TableHead>
                <TableHead className="text-right">Costo (Bs)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Cargando datos...</TableCell>
                </TableRow>
              ) : eventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No hay eventos de salud registrados.
                  </TableCell>
                </TableRow>
              ) : (
                eventos.map((evento) => {
                  const animalInfo = (evento as any).animales;
                  const isVacuna = evento.tipoEvento?.toLowerCase().includes('vacun') || evento.tipoEvento?.toLowerCase().includes('inyecc');

                  return (
                    <TableRow key={evento.uuid}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(evento.fecha), "dd MMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{animalInfo?.codigo || 'Desconocido'}</span>
                          <span className="text-xs text-muted-foreground">{animalInfo?.nombre || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-background">
                          {isVacuna ? <Syringe className="w-3 h-3 text-blue-500" /> : <Stethoscope className="w-3 h-3 text-primary" />}
                          {evento.tipoEvento || 'Tratamiento'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{evento.medicamento || '-'}</span>
                          <span className="text-xs text-muted-foreground">{evento.dosis ? `Dosis: ${evento.dosis}` : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {evento.fechaProximaAplicacion ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                            {format(new Date(evento.fechaProximaAplicacion), "dd/MM/yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {evento.costoBob ? evento.costoBob.toLocaleString('es-BO') : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
