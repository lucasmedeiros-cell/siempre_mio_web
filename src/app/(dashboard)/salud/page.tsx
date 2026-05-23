"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { format, isAfter, isThisMonth } from "date-fns"
import { es } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Activity, Plus, Syringe, Stethoscope, AlertCircle, Calendar, Pill, Beaker, DollarSign, ClipboardList, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

function parseDateSafely(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function SaludPage() {
  const { fincaId } = useGlobalStore()
  const [openForm, setOpenForm] = useState(false)
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    animalId: "",
    tipoEvento: "Vacunación",
    medicamento: "",
    dosis: "",
    fecha: new Date().toISOString().split('T')[0],
    fechaProximaAplicacion: "",
    costoBob: "",
    observacion: "",
  })

  // Consultar lista de animales para el selector
  const { data: animales = [] } = useQuery({
    queryKey: ['animales_select', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('animales')
        .select('uuid, codigo, nombre')
        .eq('deleted', false)
        .order('codigo', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // Mutación para agregar un evento de salud
  const addEventoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const supabase = createClient()
      const dataPayload = {
        uuid: crypto.randomUUID(),
        animal_id: payload.animalId,
        tipo_evento: payload.tipoEvento,
        fecha: payload.fecha,
        medicamento: payload.medicamento,
        dosis: payload.dosis,
        costo_bob: payload.costoBob,
        fecha_proxima_aplicacion: payload.fechaProximaAplicacion,
        observacion: payload.observacion,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }
      const { error } = await (supabase.from('eventos_salud') as any).insert([dataPayload])
      if (error) throw error
      return dataPayload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos_salud'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_overview'] })
      toast.success("Evento de salud registrado")
      setOpenForm(false)
      setForm({
        animalId: "",
        tipoEvento: "Vacunación",
        medicamento: "",
        dosis: "",
        fecha: new Date().toISOString().split('T')[0],
        fechaProximaAplicacion: "",
        costoBob: "",
        observacion: "",
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error("Error al registrar el evento de salud")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.animalId || !form.fecha) {
      toast.error("Por favor selecciona un animal y una fecha")
      return
    }

    addEventoMutation.mutate({
      animalId: form.animalId,
      tipoEvento: form.tipoEvento,
      medicamento: form.medicamento || null,
      dosis: form.dosis || null,
      fecha: form.fecha,
      fechaProximaAplicacion: form.fechaProximaAplicacion || null,
      costoBob: form.costoBob ? parseFloat(form.costoBob) : null,
      observacion: form.observacion || null,
    })
  }

  // Consultar eventos de salud y unirlos con información de animales
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['eventos_salud', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      
      // 1. Obtener animales para mapear
      const { data: animalRows, error: animalError } = await supabase
        .from('animales')
        .select('uuid, codigo, nombre')
        .eq('deleted', false)

      if (animalError) throw animalError

      // Mapeo rápido de animales
      const animalMap: Record<string, { codigo: string; nombre: string }> = {}
      ;(animalRows || []).forEach((a: any) => {
        animalMap[a.uuid] = {
          codigo: a.codigo,
          nombre: a.nombre || ''
        }
      })

      // 2. Obtener eventos de salud
      const { data: saludRows, error: saludError } = await (supabase
        .from('eventos_salud') as any)
        .select('*')
        .eq('deleted', false)
        .order('fecha', { ascending: false })

      if (saludError) throw saludError
      
      return (saludRows || []).map((e: any) => {
        const aId = e.animal_id || e.animalId || null
        const aInfo = aId ? animalMap[aId] : null
        
        return {
          uuid: e.uuid,
          animalId: aId,
          tipoEvento: e.tipo_evento || e.tipoEvento || 'Tratamiento',
          fecha: e.fecha,
          medicamento: e.medicamento,
          dosis: e.dosis,
          costoBob: e.costo_bob || e.costoBob || 0,
          fechaProximaAplicacion: e.fecha_proxima_aplicacion || e.fechaProximaAplicacion || null,
          observacion: e.observacion,
          animales: aInfo ? { codigo: aInfo.codigo, nombre: aInfo.nombre } : null
        }
      }) as any[]
    }
  })

  // Cálculos de KPIs
  const eventosEsteMes = eventos.filter(e => {
    const d = parseDateSafely(e.fecha)
    return d ? isThisMonth(d) : false
  })
  const costoTotal = eventos.reduce((acc, e) => acc + (e.costoBob || 0), 0)
  
  // Próximas aplicaciones (donde la fechaProximaAplicacion sea futura)
  const proximasAplicaciones = eventos.filter(e => {
    const d = parseDateSafely(e.fechaProximaAplicacion)
    return d ? isAfter(d, new Date()) : false
  })

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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Registrar Evento de Salud</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles del tratamiento, vacuna o diagnóstico.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="animalId">Animal (Requerido)</Label>
                  <Select value={form.animalId} onValueChange={(val) => setForm({ ...form, animalId: val || "" })}>
                    <SelectTrigger id="animalId">
                      <SelectValue placeholder="Selecciona un animal" />
                    </SelectTrigger>
                    <SelectContent>
                      {animales.map((a: any) => (
                        <SelectItem key={a.uuid} value={a.uuid}>
                          {a.codigo} - {a.nombre || "Sin Nombre"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoEvento">Tipo de Evento</Label>
                  <Select value={form.tipoEvento} onValueChange={(val) => setForm({ ...form, tipoEvento: val || "Vacunación" })}>
                    <SelectTrigger id="tipoEvento">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacunación">Vacunación</SelectItem>
                      <SelectItem value="Tratamiento">Tratamiento</SelectItem>
                      <SelectItem value="Control Clínico">Control Clínico</SelectItem>
                      <SelectItem value="Desparasitación">Desparasitación</SelectItem>
                      <SelectItem value="Cirugía">Cirugía</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha (Requerido)</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicamento">Medicamento / Producto</Label>
                  <Input
                    id="medicamento"
                    placeholder="Ej. Ivermectina 1%"
                    value={form.medicamento}
                    onChange={(e) => setForm({ ...form, medicamento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosis">Dosis aplicada</Label>
                  <Input
                    id="dosis"
                    placeholder="Ej. 10 ml"
                    value={form.dosis}
                    onChange={(e) => setForm({ ...form, dosis: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaProximaAplicacion">Próxima Aplicación</Label>
                  <Input
                    id="fechaProximaAplicacion"
                    type="date"
                    value={form.fechaProximaAplicacion}
                    onChange={(e) => setForm({ ...form, fechaProximaAplicacion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costoBob">Costo (Bs)</Label>
                  <Input
                    id="costoBob"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.costoBob}
                    onChange={(e) => setForm({ ...form, costoBob: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacion">Observaciones / Síntomas</Label>
                  <Input
                    id="observacion"
                    placeholder="Detalles sobre el estado del animal o diagnóstico"
                    value={form.observacion}
                    onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={addEventoMutation.isPending} className="w-full">
                  {addEventoMutation.isPending ? "Guardando..." : "Guardar Evento"}
                </Button>
              </DialogFooter>
            </form>
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
          <div className="overflow-x-auto w-full">
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
                      <TableRow
                        key={evento.uuid}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => setSelectedEvento(evento)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {(() => {
                            const d = parseDateSafely(evento.fecha);
                            return d ? format(d, "dd MMM, yyyy", { locale: es }) : "-";
                          })()}
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
                          {(() => {
                            const d = parseDateSafely(evento.fechaProximaAplicacion);
                            return d ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                                {format(d, "dd/MM/yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
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
          </div>
        </CardContent>
      </Card>

      {/* Sheet de Detalle de Evento */}
      <Sheet open={!!selectedEvento} onOpenChange={(open) => !open && setSelectedEvento(null)}>
        <SheetContent className="w-[420px] sm:w-[500px] overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {selectedEvento?.tipoEvento?.toLowerCase().includes('vacun') || selectedEvento?.tipoEvento?.toLowerCase().includes('inyecc')
                  ? <Syringe className="h-5 w-5 text-primary" />
                  : <Stethoscope className="h-5 w-5 text-primary" />
                }
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">Detalle del Evento</SheetTitle>
                <SheetDescription>Información completa del evento de salud</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedEvento && (() => {
            const animal = (selectedEvento as any).animales
            const fechaEvento = parseDateSafely(selectedEvento.fecha)
            const fechaProxima = parseDateSafely(selectedEvento.fechaProximaAplicacion)
            const tipoColor =
              selectedEvento.tipoEvento === 'Tratamiento' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' :
              selectedEvento.tipoEvento === 'Control Clínico' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' :
              selectedEvento.tipoEvento === 'Desparasitación' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' :
              'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'

            return (
              <div className="space-y-4">
                {/* Tipo de evento */}
                <Badge className={`text-sm px-3 py-1 border font-semibold ${tipoColor}`}>
                  {selectedEvento.tipoEvento || 'Tratamiento'}
                </Badge>

                {/* Animal */}
                <div className="bg-muted/30 rounded-xl border p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                    <User className="h-3.5 w-3.5" /> Animal
                  </div>
                  {animal ? (
                    <div>
                      <p className="text-2xl font-bold text-primary">{animal.codigo}</p>
                      {animal.nombre && <p className="text-sm text-muted-foreground">{animal.nombre}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aplicado a varios animales del hato</p>
                  )}
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl border p-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      <Calendar className="h-3.5 w-3.5" /> Fecha Evento
                    </div>
                    <p className="text-base font-bold">
                      {fechaEvento ? format(fechaEvento, "dd MMM yyyy", { locale: es }) : '-'}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-4 ${fechaProxima ? 'bg-amber-500/10 border-amber-500/20' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      <Calendar className="h-3.5 w-3.5" /> Próxima Aplicación
                    </div>
                    {fechaProxima ? (
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                        {format(fechaProxima, "dd MMM yyyy", { locale: es })}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin próxima fecha</p>
                    )}
                  </div>
                </div>

                {/* Medicamento y Dosis */}
                <div className="bg-muted/30 rounded-xl border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <Pill className="h-3.5 w-3.5" /> Medicamento / Producto
                  </div>
                  <p className="text-lg font-bold">{selectedEvento.medicamento || '—'}</p>
                  {selectedEvento.dosis && (
                    <div className="flex items-center gap-2 pt-1 border-t border-dashed border-border">
                      <Beaker className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dosis aplicada</p>
                        <p className="text-sm font-semibold">{selectedEvento.dosis}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Costo */}
                {selectedEvento.costoBob != null && selectedEvento.costoBob > 0 && (
                  <div className="bg-muted/30 rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      <DollarSign className="h-3.5 w-3.5" /> Costo
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      Bs {selectedEvento.costoBob.toLocaleString('es-BO')}
                    </p>
                  </div>
                )}

                {/* Observaciones */}
                {selectedEvento.observacion && (
                  <div className="bg-muted/30 rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      <ClipboardList className="h-3.5 w-3.5" /> Observaciones
                    </div>
                    <p className="text-sm leading-relaxed">{selectedEvento.observacion}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
