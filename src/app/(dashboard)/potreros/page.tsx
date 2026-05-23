"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Database } from "@/lib/supabase/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGlobalStore } from "@/store/global-store"
import { differenceInDays, format } from "date-fns"
import { toast } from "sonner"
import { ArrowRight, Tractor, Plus, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Extended type for frontend logic
type Potrero = Database['public']['Tables']['potreros']['Row'] & {
  fechaEntrada?: string | null
  cantidadAnimales?: number
  loteAsignado?: {
    uuid: string
    nombre: string
    color: string
  } | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

export default function PotrerosPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()
  const [selectedPotrero, setSelectedPotrero] = useState<Potrero | null>(null)
  
  // Rotación y asignación states
  const [destinoId, setDestinoId] = useState<string>("")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("")
  const [diasDescanso, setDiasDescanso] = useState<number>(30)
  const [origenRestDays, setOrigenRestDays] = useState<number>(30)
  const [operationTab, setOperationTab] = useState<"move" | "vacate">("move")

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    superficieHa: "",
    condicion: "100",
    estado: "libre"
  })

  // 1. Cargar Potreros con Ocupación y Lote en tiempo real
  const { data: potreros = [], isLoading: loadingPotreros } = useQuery({
    queryKey: ['potreros', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      
      // Fetch potreros
      const { data: potrerosData, error: potrerosError } = await (supabase
        .from('potreros') as any)
        .select('*')
        .eq('deleted', false)
        .order('nombre')
      if (potrerosError) throw potrerosError

      // Fetch active occupations
      const { data: occupationsData, error: occupationsError } = await (supabase
        .from('ocupaciones_potrero') as any)
        .select('*')
        .is('fecha_salida_real', null)
        .eq('deleted', false)
      if (occupationsError) throw occupationsError

      // Fetch lotes
      const { data: lotesData, error: lotesError } = await (supabase
        .from('lotes') as any)
        .select('*')
        .eq('deleted', false)
      if (lotesError) throw lotesError

      // Fetch animals for counting
      const { data: animalsData, error: animalsError } = await (supabase
        .from('animales') as any)
        .select('uuid, lote_id')
        .eq('deleted', false)
      if (animalsError) throw animalsError

      // Group animals per lote
      const animalCountByLote: Record<string, number> = {};
      (animalsData || [])?.forEach((a: any) => {
        const lId = a.lote_id || a.loteId
        if (lId) {
          animalCountByLote[lId] = (animalCountByLote[lId] || 0) + 1
        }
      })

      // Map occupations to target potreroId
      const activeOccupationsMap: Record<string, any> = {};
      (occupationsData || [])?.forEach((occ: any) => {
        const pId = occ.potrero_id || occ.potreroId
        const lId = occ.lote_id || occ.loteId
        if (pId && lId) {
          const lote = (lotesData || [])?.find((l: any) => l.uuid === lId)
          if (lote) {
            activeOccupationsMap[pId] = {
              occupationUuid: occ.uuid,
              loteUuid: lote.uuid,
              loteNombre: lote.nombre,
              loteColor: lote.color,
              fechaIngreso: occ.fecha_ingreso || occ.fechaIngreso,
              cantidadAnimales: animalCountByLote[lote.uuid] || 0
            }
          }
        }
      })

      return (potrerosData || []).map((p: any) => {
        const pId = p.uuid
        const activeOcc = activeOccupationsMap[pId]
        
        let estadoUi = 'libre'
        if (activeOcc) {
          estadoUi = 'en_uso'
        } else if (p.estado.toLowerCase() === 'descanso') {
          estadoUi = 'descanso'
        } else if (p.estado.toLowerCase() === 'ocupado') {
          estadoUi = 'en_uso'
        }

        return {
          uuid: p.uuid,
          nombre: p.nombre,
          superficieHa: p.superficie_ha || p.superficieHa || 0,
          condicion: p.condicion || 0,
          alturaPastoMetros: p.altura_pasto_metros || p.alturaPastoMetros || 0,
          diasDescanso: p.dias_descanso || p.diasDescanso || 0,
          fechaUltimaLiberacion: p.fecha_ultima_liberacion || p.fechaUltimaLiberacion || null,
          deleted: p.deleted,
          synced: p.synced,
          updatedAt: p.updated_at || p.updatedAt || '',
          estado: estadoUi,
          fechaEntrada: activeOcc ? activeOcc.fechaIngreso : null,
          cantidadAnimales: activeOcc ? activeOcc.cantidadAnimales : 0,
          loteAsignado: activeOcc ? {
            uuid: activeOcc.loteUuid,
            nombre: activeOcc.loteNombre,
            color: activeOcc.loteColor
          } : null
        }
      }) as Potrero[]
    }
  })

  // 2. Cargar Todos los Lotes
  const { data: allLotes = [] } = useQuery({
    queryKey: ['allLotes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('lotes') as any)
        .select('*')
        .eq('deleted', false)
        .order('nombre')
      if (error) throw error
      return (data || []).map((l: any) => ({
        uuid: l.uuid,
        nombre: l.nombre,
        color: l.color,
        categoriaLote: l.categoria_lote || l.categoriaLote || ''
      }))
    }
  })

  // Helper para ver si un lote está ocupando otro potrero
  const getPotreroOcupadoPorLote = (loteUuid: string) => {
    return potreros.find(p => p.loteAsignado?.uuid === loteUuid)
  }

  // 3. Mutación para Crear Potrero
  const handleCreatePotrero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.superficieHa || !form.condicion) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const payload = {
        uuid: crypto.randomUUID(),
        nombre: form.nombre,
        superficie_ha: parseFloat(form.superficieHa),
        condicion: parseFloat(form.condicion) / 100,
        estado: form.estado === 'ocupado' ? 'Ocupado' : form.estado === 'descanso' ? 'Descanso' : 'Libre',
        altura_pasto_metros: 0.2,
        dias_descanso: form.estado === 'descanso' ? 30 : 0,
        fecha_ultima_liberacion: form.estado === 'descanso' ? new Date().toISOString() : null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase.from('potreros') as any).insert([payload])
      if (error) throw error

      toast.success("Potrero creado exitosamente")
      setOpenRegister(false)
      setForm({
        nombre: "",
        superficieHa: "",
        condicion: "100",
        estado: "libre"
      })
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
    } catch (error: any) {
      console.error("Error creating potrero:", error)
      toast.error(error.message || "Error al crear el potrero")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 4. Mutación para Asignar Lote (Con opción de traslado y descanso)
  const assignLoteMutation = useMutation({
    mutationFn: async ({
      potreroUuid,
      loteUuid,
      originPotreroUuid,
      originRestDays
    }: {
      potreroUuid: string
      loteUuid: string
      originPotreroUuid?: string
      originRestDays?: number
    }) => {
      const supabase = createClient()
      
      // Si el lote ya ocupaba otro potrero, vaciarlo primero
      if (originPotreroUuid) {
        const { error: occError } = await (supabase.from('ocupaciones_potrero') as any)
          .update({
            fecha_salida_real: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('potrero_id', originPotreroUuid)
          .is('fecha_salida_real', null)
        if (occError) throw occError

        const { error: potError } = await (supabase.from('potreros') as any)
          .update({
            estado: 'Descanso',
            dias_descanso: originRestDays || 0,
            fecha_ultima_liberacion: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('uuid', originPotreroUuid)
        if (potError) throw potError
      }

      // Crear nueva ocupación
      const newOcc = {
        uuid: crypto.randomUUID(),
        potrero_id: potreroUuid,
        lote_id: loteUuid,
        fecha_ingreso: new Date().toISOString(),
        fecha_salida_real: null,
        dias_programados: 30,
        synced: true,
        deleted: false,
        updated_at: new Date().toISOString()
      }
      const { error: newOccError } = await (supabase.from('ocupaciones_potrero') as any)
        .insert([newOcc])
      if (newOccError) throw newOccError

      // Actualizar destino potrero
      const { error: targetPotError } = await (supabase.from('potreros') as any)
        .update({
          estado: 'Ocupado',
          dias_descanso: 0,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', potreroUuid)
      if (targetPotError) throw targetPotError

      return { potreroUuid, loteUuid }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      toast.success("Lote asignado correctamente")
      setSelectedPotrero(null)
      setSelectedLoteId("")
      setOrigenRestDays(30)
    },
    onError: (err: any) => {
      toast.error("Error al asignar el lote: " + err.message)
    }
  })

  // 5. Mutación para Desocupar Lote (Poniendo en descanso)
  const vacatePotreroMutation = useMutation({
    mutationFn: async ({
      potreroUuid,
      restDays
    }: {
      potreroUuid: string
      restDays: number
    }) => {
      const supabase = createClient()

      // Terminar ocupación activa
      const { error: occError } = await (supabase.from('ocupaciones_potrero') as any)
        .update({
          fecha_salida_real: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('potrero_id', potreroUuid)
        .is('fecha_salida_real', null)
      if (occError) throw occError

      // Actualizar potrero
      const { error: potError } = await (supabase.from('potreros') as any)
        .update({
          estado: 'Descanso',
          dias_descanso: restDays,
          fecha_ultima_liberacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('uuid', potreroUuid)
      if (potError) throw potError

      return { potreroUuid }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      toast.success("Potrero desocupado y en descanso")
      setSelectedPotrero(null)
      setDiasDescanso(30)
    },
    onError: (err: any) => {
      toast.error("Error al desocupar el potrero: " + err.message)
    }
  })

  // 6. Mutación para Trasladar/Rotar Lote de potrero A a B
  const moveLoteMutation = useMutation({
    mutationFn: async ({
      origenPotreroUuid,
      destinoPotreroUuid,
      loteUuid,
      diasDescansoOrigen
    }: {
      origenPotreroUuid: string
      destinoPotreroUuid: string
      loteUuid: string
      diasDescansoOrigen: number
    }) => {
      const supabase = createClient()

      // Terminar ocupación en origen
      const { error: occError } = await (supabase.from('ocupaciones_potrero') as any)
        .update({
          fecha_salida_real: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('potrero_id', origenPotreroUuid)
        .is('fecha_salida_real', null)
      if (occError) throw occError

      // Actualizar potrero origen a Descanso
      const { error: potError } = await (supabase.from('potreros') as any)
        .update({
          estado: 'Descanso',
          dias_descanso: diasDescansoOrigen,
          fecha_ultima_liberacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('uuid', origenPotreroUuid)
      if (potError) throw potError

      // Crear ocupación en destino
      const newOcc = {
        uuid: crypto.randomUUID(),
        potrero_id: destinoPotreroUuid,
        lote_id: loteUuid,
        fecha_ingreso: new Date().toISOString(),
        fecha_salida_real: null,
        dias_programados: 30,
        synced: true,
        deleted: false,
        updated_at: new Date().toISOString()
      }
      const { error: newOccError } = await (supabase.from('ocupaciones_potrero') as any)
        .insert([newOcc])
      if (newOccError) throw newOccError

      // Actualizar potrero destino a Ocupado
      const { error: targetPotError } = await (supabase.from('potreros') as any)
        .update({
          estado: 'Ocupado',
          dias_descanso: 0,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', destinoPotreroUuid)
      if (targetPotError) throw targetPotError

      return { origenPotreroUuid, destinoPotreroUuid, loteUuid }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      toast.success("Lote trasladado correctamente")
      setSelectedPotrero(null)
      setDestinoId("")
      setDiasDescanso(30)
    },
    onError: (err: any) => {
      toast.error("Error al mover el lote: " + err.message)
    }
  })

  // Manejo de acciones en UI
  const handleMoveBatch = () => {
    if (!selectedPotrero || !destinoId || !selectedPotrero.loteAsignado) return
    moveLoteMutation.mutate({ 
      origenPotreroUuid: selectedPotrero.uuid, 
      destinoPotreroUuid: destinoId,
      loteUuid: selectedPotrero.loteAsignado.uuid,
      diasDescansoOrigen: diasDescanso
    })
  }

  const handleVacatePotrero = () => {
    if (!selectedPotrero) return
    vacatePotreroMutation.mutate({
      potreroUuid: selectedPotrero.uuid,
      restDays: diasDescanso
    })
  }

  const handleAssignLote = () => {
    if (!selectedPotrero || !selectedLoteId) return
    
    const ocupadoPor = getPotreroOcupadoPorLote(selectedLoteId)
    assignLoteMutation.mutate({
      potreroUuid: selectedPotrero.uuid,
      loteUuid: selectedLoteId,
      originPotreroUuid: ocupadoPor?.uuid,
      originRestDays: ocupadoPor ? origenRestDays : undefined
    })
  }

  const potrerosLibres = potreros.filter(p => p.estado === 'libre' && p.uuid !== selectedPotrero?.uuid)
  const selectedLoteOcupadoPor = selectedLoteId ? getPotreroOcupadoPorLote(selectedLoteId) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tractor className="w-8 h-8 text-primary" />
            Mapa de Potreros
          </h1>
          <p className="text-muted-foreground">
            Visualización interactiva y gestión avanzada de rotación de lotes, cargas animales y descanso de pastos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['potreros'] })}
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={openRegister} onOpenChange={setOpenRegister}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Nuevo Potrero
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreatePotrero} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Nuevo Potrero</DialogTitle>
                  <DialogDescription>
                    Registra un nuevo potrero en el sistema para control de rotación.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Potrero (Requerido)</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej. Potrero Norte A"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="superficieHa">Superficie (Ha)</Label>
                      <Input
                        id="superficieHa"
                        type="number"
                        step="0.01"
                        placeholder="Ej. 12.5"
                        value={form.superficieHa}
                        onChange={(e) => setForm({ ...form, superficieHa: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condicion">Condición de Pasto (%)</Label>
                      <Input
                        id="condicion"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Ej. 85"
                        value={form.condicion}
                        onChange={(e) => setForm({ ...form, condicion: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado Inicial</Label>
                    <Select value={form.estado} onValueChange={(val) => setForm({ ...form, estado: val || "libre" })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un estado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre">Disponible (Libre)</SelectItem>
                        <SelectItem value="descanso">En Descanso</SelectItem>
                        <SelectItem value="ocupado">Ocupado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Creando..." : "Crear Potrero"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingPotreros ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span>Cargando datos del mapa de potreros...</span>
        </div>
      ) : potreros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-dashed p-6">
          <Tractor className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No se encontraron potreros</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Comienza registrando tu primer potrero para planificar tus rotaciones y descansos de pastos.
          </p>
          <Button onClick={() => setOpenRegister(true)}>Registrar Potrero</Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={fincaId || "all"}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {potreros.map((potrero) => {
              let bgColor = ""
              let statusText = ""
              
              if (potrero.estado === "libre") {
                bgColor = "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/15"
                statusText = "Disponible"
              } else if (potrero.estado === "en_uso") {
                bgColor = "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                statusText = "Ocupado"
              } else {
                bgColor = "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                statusText = "En Descanso"
              }

              const diasOcupacion = potrero.fechaEntrada ? differenceInDays(new Date(), new Date(potrero.fechaEntrada)) : 0
              const alertaOcupacion = diasOcupacion > 7

              // Cálculo de descanso restante
              let descansoRestanteMsg = ""
              if (potrero.estado === "descanso" && potrero.fechaUltimaLiberacion) {
                const diasPasados = differenceInDays(new Date(), new Date(potrero.fechaUltimaLiberacion))
                const restante = Math.max(0, potrero.diasDescanso - diasPasados)
                descansoRestanteMsg = restante > 0 ? `${restante} días restantes` : "Listo para uso"
              }

              return (
                <motion.div 
                  key={potrero.uuid} 
                  variants={itemVariants}
                  layoutId={`card-${potrero.uuid}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedPotrero(potrero)
                    setDestinoId("")
                    setSelectedLoteId("")
                    setDiasDescanso(30)
                    setOrigenRestDays(30)
                    setOperationTab("move")
                  }}
                  className="cursor-pointer h-full"
                >
                  <Card className={`border-2 h-full transition-all duration-300 hover:shadow-md relative overflow-hidden flex flex-col justify-between ${bgColor}`}>
                    {potrero.loteAsignado && (
                      <div 
                        className="absolute top-0 left-0 right-0 h-1" 
                        style={{ backgroundColor: potrero.loteAsignado.color }}
                      />
                    )}
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex justify-between items-start gap-1">
                        <CardTitle className="text-lg font-bold truncate">{potrero.nombre}</CardTitle>
                        <Badge variant="outline" className="bg-background/40 backdrop-blur-sm shrink-0 border-current/20 text-[10px]">
                          {statusText}
                        </Badge>
                      </div>
                      <CardDescription className="text-current opacity-85 text-xs flex items-center gap-1.5 mt-0.5">
                        <Tractor className="w-3.5 h-3.5 opacity-80" /> {potrero.superficieHa} Ha
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-1.5 text-xs mt-2 border-t pt-2 border-current/10">
                        {potrero.estado === 'en_uso' && potrero.loteAsignado ? (
                          <>
                            <div className="flex justify-between">
                              <span className="opacity-90">Lote Asignado:</span>
                              <span className="font-bold flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: potrero.loteAsignado.color }} />
                                {potrero.loteAsignado.nombre}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-90">Carga Animal:</span>
                              <span className="font-bold">{potrero.cantidadAnimales || 0} cabezas</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-90">Días en uso:</span>
                              <span className={`font-bold ${alertaOcupacion ? 'text-destructive font-extrabold' : ''}`}>
                                {diasOcupacion} días
                              </span>
                            </div>
                          </>
                        ) : potrero.estado === 'descanso' ? (
                          <>
                            <div className="flex justify-between">
                              <span className="opacity-90">Límite descanso:</span>
                              <span className="font-bold">{potrero.diasDescanso} días</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-90">Estado descanso:</span>
                              <span className="font-bold text-primary dark:text-green-400">{descansoRestanteMsg}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] opacity-75 italic py-1">
                            Disponible para pastoreo inmediato.
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-dashed border-current/5">
                          <span className="opacity-90">Condición Pasto:</span>
                          <span className="font-bold">{(potrero.condicion * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Operaciones de Potrero via Sheet lateral */}
      <Sheet open={!!selectedPotrero} onOpenChange={(open) => !open && setSelectedPotrero(null)}>
        <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto border-l-2 bg-background">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2.5">
              <Tractor className="w-6 h-6 text-primary" />
              <SheetTitle className="text-2xl font-bold">{selectedPotrero?.nombre}</SheetTitle>
            </div>
            <SheetDescription>
              Gestión e historial operativo de rotación del polígono.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-6">
            {/* Ficha técnica rápida */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-4 rounded-xl border">
              <div>
                <span className="text-muted-foreground block mb-0.5">Estado Actual</span>
                <Badge variant={selectedPotrero?.estado === 'libre' ? 'default' : 'secondary'} className="capitalize bg-primary/10 text-primary hover:bg-primary/10 border border-primary/10 text-[10px]">
                  {selectedPotrero?.estado === 'en_uso' ? 'Ocupado (En uso)' : selectedPotrero?.estado === 'descanso' ? 'En descanso' : 'Disponible (Libre)'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Superficie</span>
                <span className="font-semibold block text-sm">{selectedPotrero?.superficieHa} Hectáreas</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Carga de Ganado</span>
                <span className="font-semibold block text-sm">{selectedPotrero?.cantidadAnimales || 0} Animales</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">
                  {selectedPotrero?.estado === 'en_uso' ? 'Días acumulados' : 'Última liberación'}
                </span>
                <span className="font-semibold block text-sm">
                  {selectedPotrero?.estado === 'en_uso' 
                    ? `${selectedPotrero.fechaEntrada ? differenceInDays(new Date(), new Date(selectedPotrero.fechaEntrada)) : 0} días`
                    : selectedPotrero?.fechaUltimaLiberacion 
                      ? format(new Date(selectedPotrero.fechaUltimaLiberacion), "dd/MM/yyyy")
                      : 'Ninguna'
                  }
                </span>
              </div>
            </div>

            {/* CASO 1: Potrero Ocupado (Rotación y Desocupación) */}
            {selectedPotrero?.estado === 'en_uso' && (
              <div className="space-y-6">
                <div className="flex rounded-lg border p-1 bg-muted/40">
                  <button 
                    onClick={() => setOperationTab("move")}
                    className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                      operationTab === "move" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Rotar / Mover Lote
                  </button>
                  <button 
                    onClick={() => setOperationTab("vacate")}
                    className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                      operationTab === "vacate" 
                        ? "bg-background text-destructive shadow-sm" 
                        : "text-muted-foreground hover:text-destructive"
                    }`}
                  >
                    Liberar / Vaciar Potrero
                  </button>
                </div>

                {/* Sub-form 1A: Mover Lote */}
                {operationTab === "move" && (
                  <Card className="p-4 space-y-4 border bg-card shadow-sm">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm flex items-center gap-1">
                        <ArrowRight className="w-4 h-4 text-primary" /> Mover Lote (Rotación)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Mueve los animales del lote <strong style={{ color: selectedPotrero.loteAsignado?.color }} className="underline">{selectedPotrero.loteAsignado?.nombre}</strong> a otro potrero libre.
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Potrero Destino</Label>
                        <Select value={destinoId} onValueChange={(val) => setDestinoId(val || "")}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Selecciona un potrero disponible..." />
                          </SelectTrigger>
                          <SelectContent>
                            {potrerosLibres.length > 0 ? (
                              potrerosLibres.map(p => (
                                <SelectItem key={p.uuid} value={p.uuid} className="text-xs">
                                  {p.nombre} (Pasto al {(p.condicion * 100).toFixed(0)}% • {p.superficieHa} Ha)
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled className="text-xs">No hay potreros libres disponibles</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Días de descanso para el Potrero Origen ({selectedPotrero.nombre})
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="365"
                          value={diasDescanso}
                          onChange={(e) => setDiasDescanso(parseInt(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          El potrero actual entrará en descanso por este número de días para su recuperación.
                        </p>
                      </div>

                      <Button 
                        className="w-full text-xs h-9 gap-1.5 mt-2" 
                        onClick={handleMoveBatch}
                        disabled={!destinoId || destinoId === 'none' || moveLoteMutation.isPending}
                      >
                        {moveLoteMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Confirmar Rotación de Lote"
                        )}
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Sub-form 1B: Desocupar Lote */}
                {operationTab === "vacate" && (
                  <Card className="p-4 space-y-4 border-destructive/20 bg-destructive/5 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-destructive flex items-center gap-1">
                        ⚠️ Vaciar Potrero
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Retira el lote del potrero sin moverlo a otro específico (los animales regresarán a establo o área común).
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Días de descanso para este Potrero ({selectedPotrero.nombre})
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="365"
                          value={diasDescanso}
                          onChange={(e) => setDiasDescanso(parseInt(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Indica los días de descanso que requiere este potrero para sanar su vegetación.
                        </p>
                      </div>

                      <Button 
                        variant="destructive"
                        className="w-full text-xs h-9 gap-1.5 mt-2" 
                        onClick={handleVacatePotrero}
                        disabled={vacatePotreroMutation.isPending}
                      >
                        {vacatePotreroMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Liberar Lote y Poner en Descanso"
                        )}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* CASO 2: Potrero Vacío (Asignación de Lote) */}
            {selectedPotrero?.estado !== 'en_uso' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-4 border bg-card shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <Plus className="w-4 h-4 text-primary" /> Asignar Lote a este Potrero
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Elige un lote de animales para que empiece a pastar en este potrero.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Lote Ganadero</Label>
                      <Select value={selectedLoteId} onValueChange={(val) => setSelectedLoteId(val || "")}>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Selecciona un lote..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allLotes.length > 0 ? (
                            allLotes.map((l: any) => {
                              const ocupadoPor = getPotreroOcupadoPorLote(l.uuid)
                              return (
                                <SelectItem key={l.uuid} value={l.uuid} className="text-xs">
                                  {l.nombre} {ocupadoPor ? `(Ocupando ${ocupadoPor.nombre})` : '(Libre)'}
                                </SelectItem>
                              )
                            })
                          ) : (
                            <SelectItem value="none" disabled className="text-xs">No hay lotes creados</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Alerta de traslado automático */}
                    {selectedLoteOcupadoPor && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2.5 text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-bold flex items-center gap-1.5">
                          ⚠️ Lote Ocupado en {selectedLoteOcupadoPor.nombre}
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          Este lote se trasladará automáticamente a este potrero. Especifica a continuación cuántos días de descanso tendrá el potrero origen <strong>{selectedLoteOcupadoPor.nombre}</strong>.
                        </p>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                            Días de descanso para {selectedLoteOcupadoPor.nombre}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            value={origenRestDays}
                            onChange={(e) => setOrigenRestDays(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs bg-background/50 border-amber-500/30 text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full text-xs h-9 gap-1.5 mt-2"
                      onClick={handleAssignLote}
                      disabled={!selectedLoteId || selectedLoteId === 'none' || assignLoteMutation.isPending}
                    >
                      {assignLoteMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Confirmar Asignación de Lote"
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Resumen del Lote asignado actualmente */}
            {selectedPotrero?.estado === 'en_uso' && selectedPotrero.loteAsignado && (
              <div className="space-y-3.5 pt-4 border-t">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Detalles del Lote Asignado
                </h4>
                <div className="p-3 bg-muted/20 border rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full inline-block border" 
                      style={{ backgroundColor: selectedPotrero.loteAsignado.color }} 
                    />
                    <div>
                      <span className="font-bold block">{selectedPotrero.loteAsignado.nombre}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Carga Animal: {selectedPotrero.cantidadAnimales || 0} cabezas asignadas
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    En pastoreo
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
