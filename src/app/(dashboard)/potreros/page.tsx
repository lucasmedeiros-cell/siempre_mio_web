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
import { ArrowRight, Tractor, Plus, Loader2, RefreshCw, Pencil, Trash } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  lastOccupation?: {
    loteNombre: string
    dias: number
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
  const [operationTab, setOperationTab] = useState<"move" | "vacate" | "edit">("move")

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    superficieHa: "",
    condicion: "",
    tipoPasto: "",
    estado: "libre",
    notas: ""
  })

  // Edit potrero state
  const [editForm, setEditForm] = useState({
    nombre: "",
    superficieHa: "",
    condicion: "",
    tipoPasto: "",
    estado: "",
    notas: "",
    alturaPastoMetros: "",
    diasDescansoEdit: ""
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

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

      // Fetch all occupations to retrieve active ones and history sorted by date
      const { data: occupationsData, error: occupationsError } = await (supabase
        .from('ocupaciones_potrero') as any)
        .select('*')
        .eq('deleted', false)
        .order('fecha_ingreso', { ascending: false })
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
      const lastOccupationsMap: Record<string, any> = {};

      (occupationsData || [])?.forEach((occ: any) => {
        const pId = occ.potrero_id || occ.potreroId
        const lId = occ.lote_id || occ.loteId
        if (pId && lId) {
          const lote = (lotesData || [])?.find((l: any) => l.uuid === lId)
          if (lote) {
            const isCompleted = occ.fecha_salida_real || occ.fechaSalidaReal;

            if (!isCompleted && !activeOccupationsMap[pId]) {
              activeOccupationsMap[pId] = {
                occupationUuid: occ.uuid,
                loteUuid: lote.uuid,
                loteNombre: lote.nombre,
                loteColor: lote.color,
                fechaIngreso: occ.fecha_ingreso || occ.fechaIngreso,
                cantidadAnimales: animalCountByLote[lote.uuid] || 0
              }
            }

            if (isCompleted && !lastOccupationsMap[pId]) {
              const fin = occ.fecha_salida_real || occ.fechaSalidaReal
              const ini = occ.fecha_ingreso || occ.fechaIngreso
              let diff = 0
              if (fin && ini) {
                diff = differenceInDays(new Date(fin), new Date(ini))
              }
              lastOccupationsMap[pId] = {
                loteNombre: lote.nombre,
                dias: diff
              }
            }
          }
        }
      })

      return (potrerosData || []).map((p: any) => {
        const pId = p.uuid
        const activeOcc = activeOccupationsMap[pId]
        const lastOcc = lastOccupationsMap[pId] || null
        
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
          tipoPasto: p.tipo_pasto || p.tipoPasto || '',
          notas: p.notas || '',
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
          } : null,
          lastOccupation: lastOcc
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

  // 3b. Mutación para Editar Potrero
  const handleEditPotrero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPotrero || !editForm.nombre || !editForm.superficieHa || !editForm.condicion) return
    setIsSavingEdit(true)
    try {
      const supabase = createClient()
      const condRaw = parseFloat(editForm.condicion)
      const payload: Record<string, any> = {
        nombre: editForm.nombre.trim(),
        superficie_ha: parseFloat(editForm.superficieHa),
        condicion: condRaw,
        tipo_pasto: editForm.tipoPasto.trim() || null,
        estado: editForm.estado === 'en_uso' ? 'Ocupado' : editForm.estado === 'descanso' ? 'Descanso' : 'Libre',
        notas: editForm.notas.trim() || null,
        updated_at: new Date().toISOString()
      }
      const alturaRaw = parseFloat(editForm.alturaPastoMetros)
      if (!isNaN(alturaRaw)) payload.altura_pasto_metros = alturaRaw
      const descRaw = parseInt(editForm.diasDescansoEdit)
      if (!isNaN(descRaw)) payload.dias_descanso = descRaw

      const { error } = await (supabase.from('potreros') as any)
        .update(payload)
        .eq('uuid', selectedPotrero.uuid)
      if (error) throw error

      toast.success("Potrero actualizado correctamente")
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      setSelectedPotrero(null)
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar el potrero")
    } finally {
      setIsSavingEdit(false)
    }
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
        condicion: parseFloat(form.condicion),
        estado: form.estado === 'ocupado' ? 'Ocupado' : form.estado === 'descanso' ? 'Descanso' : 'Libre',
        altura_pasto_metros: 0.2,
        dias_descanso: form.estado === 'descanso' ? 30 : 0,
        fecha_ultima_liberacion: form.estado === 'descanso' ? new Date().toISOString() : null,
        tipo_pasto: form.tipoPasto || null,
        notas: form.notas || null,
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
        condicion: "",
        tipoPasto: "",
        estado: "libre",
        notas: ""
      })
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
    } catch (error: any) {
      console.error("Error creating potrero:", error)
      toast.error(error.message || "Error al crear el potrero")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mutación para Eliminar Potrero (Lógico)
  const deleteMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const supabase = createClient()
      const { error } = await (supabase.from('potreros') as any)
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq('uuid', uuid)
      if (error) throw error
      return uuid
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      toast.success("Potrero eliminado correctamente")
      setSelectedPotrero(null)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error("Error al eliminar el potrero: " + err.message)
    }
  })

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
            <Tractor className="w-8 h-8 text-[#1b4d22]" />
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

          {/* Formulario de Registro en Dialog */}
          <Dialog open={openRegister} onOpenChange={setOpenRegister}>
            <DialogTrigger
              render={
                <Button className="gap-2 bg-[#1b4d22] hover:bg-[#143a1a] text-white">
                  <Plus className="w-4 h-4" /> Nuevo Potrero
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleCreatePotrero} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Nuevo Potrero</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Potrero Norte"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                      className="h-10"
                    />
                  </div>

                  {/* Row: Superficie y Condición */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="superficieHa">Superficie (ha)</Label>
                      <Input
                        id="superficieHa"
                        type="number"
                        step="0.01"
                        placeholder="Hectáreas"
                        value={form.superficieHa}
                        onChange={(e) => setForm({ ...form, superficieHa: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="condicion">Condición (factor de producción) *</Label>
                      <Select 
                        value={form.condicion} 
                        onValueChange={(val) => setForm({ ...form, condicion: val || "" })}
                      >
                        <SelectTrigger id="condicion" className="h-10">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="2.5">2.5</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="0.5">0.5</SelectItem>
                          <SelectItem value="0.25">0.25</SelectItem>
                          <SelectItem value="0.20">0.20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tipo de pasto */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tipoPasto">Tipo de pasto</Label>
                    <Input
                      id="tipoPasto"
                      placeholder="Ej: Brachiaria, Panicum"
                      value={form.tipoPasto}
                      onChange={(e) => setForm({ ...form, tipoPasto: e.target.value })}
                      className="h-10"
                    />
                  </div>

                  {/* Estado */}
                  <div className="space-y-1.5">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={form.estado} onValueChange={(val) => setForm({ ...form, estado: val || "libre" })}>
                      <SelectTrigger id="estado" className="h-10">
                        <SelectValue placeholder="Seleccionar estado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre">Disponible</SelectItem>
                        <SelectItem value="descanso">En Descanso</SelectItem>
                        <SelectItem value="ocupado">Ocupado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notas */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      placeholder="Observaciones adicionales..."
                      value={form.notas}
                      onChange={(e) => setForm({ ...form, notas: e.target.value })}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenRegister(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#1b4d22] hover:bg-[#143a1a] text-white">
                    {isSubmitting ? "Creando..." : "Crear potrero"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingPotreros ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#1b4d22]" />
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
              const diasOcupacion = potrero.fechaEntrada ? differenceInDays(new Date(), new Date(potrero.fechaEntrada)) : 0
              
              // Cálculo de descanso restante
              let descansoRestanteDays = 0
              let diasPasados = 0
              if (potrero.estado === "descanso" && potrero.fechaUltimaLiberacion) {
                diasPasados = differenceInDays(new Date(), new Date(potrero.fechaUltimaLiberacion))
                descansoRestanteDays = Math.max(0, potrero.diasDescanso - diasPasados)
              }

              // Último lote y días
              const lastLoteName = potrero.lastOccupation ? potrero.lastOccupation.loteNombre : 'ninguno'
              const lastLoteDays = potrero.lastOccupation ? `${potrero.lastOccupation.dias}` : '—'

              return (
                <motion.div 
                  key={potrero.uuid} 
                  variants={itemVariants}
                  layoutId={`card-${potrero.uuid}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedPotrero(potrero)
                    setDestinoId("")
                    setSelectedLoteId("")
                    setDiasDescanso(30)
                    setOrigenRestDays(30)
                    setOperationTab(potrero.estado === 'en_uso' ? "move" : "edit")
                    setEditForm({
                      nombre: potrero.nombre,
                      superficieHa: String(potrero.superficieHa || ""),
                      condicion: String(potrero.condicion || ""),
                      tipoPasto: potrero.tipoPasto || "",
                      estado: potrero.estado || "",
                      notas: potrero.notas || "",
                      alturaPastoMetros: String(potrero.alturaPastoMetros || ""),
                      diasDescansoEdit: String(potrero.diasDescanso || "")
                    })
                  }}
                  className="cursor-pointer h-full"
                >
                  <Card className="border border-border/80 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between p-5 h-full">
                    {/* Lote Color Indicator */}
                    {potrero.loteAsignado && (
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5" 
                        style={{ backgroundColor: potrero.loteAsignado.color }}
                      />
                    )}

                    <div>
                      {/* Header: Nombre y Estado */}
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-2xl font-extrabold text-foreground leading-none">{potrero.nombre}</span>
                        <span className={`text-[10px] font-bold tracking-wider uppercase ${
                          potrero.estado === 'libre' 
                            ? 'text-green-600 dark:text-green-400' 
                            : potrero.estado === 'descanso' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {potrero.estado === 'libre' ? 'DISPONIBLE' : potrero.estado === 'descanso' ? 'DESCANSO' : 'OCUPADO'}
                        </span>
                      </div>

                      {/* Tipo de pasto (en minúsculas) */}
                      <div className="text-xs text-muted-foreground/80 lowercase mb-4">
                        {potrero.tipoPasto || 'sin pasto especificado'}
                      </div>

                      {/* Grid de Superficie y Animales */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 block mb-0.5">SUPERFICIE</span>
                          <span className="text-lg font-extrabold text-foreground">{potrero.superficieHa} ha</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 block mb-0.5">ANIMALES</span>
                          <span className="text-lg font-extrabold text-foreground">{potrero.cantidadAnimales || 0}</span>
                        </div>
                      </div>

                      {/* Caja informativa de rotación/descanso */}
                      <div className="bg-[#faf7f2] dark:bg-[#1a1c18]/50 border border-[#e9dfcc]/50 dark:border-border/60 rounded-xl p-3.5 space-y-2 mb-4">
                        <div className="flex justify-between text-xs font-semibold">
                          {potrero.estado === 'descanso' ? (
                            <>
                              <span className="text-foreground">Descanso</span>
                              <span className="text-green-700 dark:text-green-400">
                                {diasPasados} / {potrero.diasDescanso} días
                              </span>
                            </>
                          ) : potrero.estado === 'en_uso' ? (
                            <>
                              <span className="text-foreground">Ocupación</span>
                              <span className="text-amber-700 dark:text-amber-400">
                                {diasOcupacion} días en uso
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-foreground">Estado</span>
                              <span className="text-green-700 dark:text-green-400">Disponible</span>
                            </>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              potrero.estado === 'en_uso' ? 'bg-amber-500' : 'bg-[#1b4d22]'
                            }`}
                            style={{ 
                              width: potrero.estado === 'descanso' && potrero.diasDescanso > 0
                                ? `${Math.min(100, (diasPasados / potrero.diasDescanso) * 100)}%`
                                : potrero.estado === 'libre' 
                                ? '100%' 
                                : `${Math.min(100, (diasOcupacion / 7) * 100)}%`
                            }}
                          />
                        </div>

                        {/* Info: Último lote y mensaje de disponibilidad */}
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 inline-block" />
                            <span>
                              {potrero.estado === 'en_uso' && potrero.loteAsignado
                                ? `Lote actual: ${potrero.loteAsignado.nombre}`
                                : `Último lote: ${lastLoteName} (${lastLoteDays} días)`
                              }
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                            {potrero.estado === 'libre' 
                              ? 'Listo para ocupar' 
                              : potrero.estado === 'descanso' 
                                ? (descansoRestanteDays <= 0 ? 'Listo para ocupar' : `En recuperación (${descansoRestanteDays} días rest.)`)
                                : 'En pastoreo activo'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separator & Footer Actions */}
                    <div className="border-t border-border/60 pt-4 flex items-center justify-end gap-3 w-full">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPotrero(potrero)
                          setOperationTab("edit")
                          setEditForm({
                            nombre: potrero.nombre,
                            superficieHa: String(potrero.superficieHa || ""),
                            condicion: String(potrero.condicion || ""),
                            tipoPasto: potrero.tipoPasto || "",
                            estado: potrero.estado || "",
                            notas: potrero.notas || "",
                            alturaPastoMetros: String(potrero.alturaPastoMetros || ""),
                            diasDescansoEdit: String(potrero.diasDescanso || "")
                          })
                        }}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Estás seguro de que deseas eliminar el potrero "${potrero.nombre}"?`)) {
                            deleteMutation.mutate(potrero.uuid)
                          }
                        }}
                        className="text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full px-5 py-1.5 transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
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
              <Tractor className="w-6 h-6 text-[#1b4d22]" />
              <SheetTitle className="text-2xl font-bold">{selectedPotrero?.nombre}</SheetTitle>
            </div>
            <SheetDescription>
              Gestión e historial operativo de rotación del polígono.
            </SheetDescription>
          </SheetHeader>

          {/* Tab bar */}
          <div className="flex rounded-lg border p-1 bg-muted/40 mt-4">
            <button
              onClick={() => setOperationTab("edit")}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                operationTab === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
            {selectedPotrero?.estado === 'en_uso' && (
              <>
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
                  Liberar
                </button>
              </>
            )}
            {selectedPotrero?.estado !== 'en_uso' && (
              <button
                onClick={() => setOperationTab("move")}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                  operationTab === "move"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Asignar Lote
              </button>
            )}
          </div>
          
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
              <div>
                <span className="text-muted-foreground block mb-0.5">Tipo de Pasto</span>
                <span className="font-semibold block text-sm">{selectedPotrero?.tipoPasto || 'Ninguno'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Condición (Factor)</span>
                <span className="font-semibold block text-sm">{selectedPotrero?.condicion || '—'}</span>
              </div>
              {selectedPotrero?.notas && (
                <div className="col-span-2 mt-1">
                  <span className="text-muted-foreground block mb-1">Notas</span>
                  <p className="text-xs text-muted-foreground bg-background p-2.5 rounded-lg border leading-relaxed">
                    {selectedPotrero.notas}
                  </p>
                </div>
              )}
            </div>

            {/* Formulario de Edición */}
            {operationTab === "edit" && (
              <Card className="p-4 border bg-card shadow-sm">
                <form onSubmit={handleEditPotrero} className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <Pencil className="w-4 h-4 text-primary" /> Editar Potrero
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Modifica los datos de este potrero en el sistema.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Nombre */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-nombre" className="text-xs font-semibold">Nombre *</Label>
                      <Input
                        id="edit-nombre"
                        value={editForm.nombre}
                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                        placeholder="Ej. Potrero Norte"
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Row: Superficie y Condición */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-superficie" className="text-xs font-semibold">Superficie (ha)</Label>
                        <Input
                          id="edit-superficie"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.superficieHa}
                          onChange={(e) => setEditForm({ ...editForm, superficieHa: e.target.value })}
                          placeholder="Hectáreas"
                          required
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-condicion" className="text-xs font-semibold">Condición (factor de prod.) *</Label>
                        <Select 
                          value={editForm.condicion} 
                          onValueChange={(val) => setEditForm({ ...editForm, condicion: val || "" })}
                        >
                          <SelectTrigger id="edit-condicion" className="h-9 text-xs">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="2.5">2.5</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="0.5">0.5</SelectItem>
                            <SelectItem value="0.25">0.25</SelectItem>
                            <SelectItem value="0.20">0.20</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Tipo de pasto */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-tipoPasto" className="text-xs font-semibold">Tipo de pasto</Label>
                      <Input
                        id="edit-tipoPasto"
                        value={editForm.tipoPasto}
                        onChange={(e) => setEditForm({ ...editForm, tipoPasto: e.target.value })}
                        placeholder="Ej: Brachiaria, Panicum"
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Estado */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-estado" className="text-xs font-semibold">Estado</Label>
                      <Select 
                        value={editForm.estado} 
                        onValueChange={(val) => setEditForm({ ...editForm, estado: val || "libre" })}
                      >
                        <SelectTrigger id="edit-estado" className="h-9 text-xs">
                          <SelectValue placeholder="Seleccionar estado..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="libre">Disponible</SelectItem>
                          <SelectItem value="descanso">En Descanso</SelectItem>
                          <SelectItem value="en_uso">Ocupado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-notas" className="text-xs font-semibold">Notas</Label>
                      <Textarea
                        id="edit-notas"
                        placeholder="Observaciones adicionales..."
                        value={editForm.notas}
                        onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                        rows={3}
                        className="resize-none text-xs"
                      />
                    </div>

                    {/* Campos Técnicos Ocultos / Altura */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-altura" className="text-xs font-semibold">Altura Pasto (m)</Label>
                        <Input
                          id="edit-altura"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.alturaPastoMetros}
                          onChange={(e) => setEditForm({ ...editForm, alturaPastoMetros: e.target.value })}
                          placeholder="Ej. 0.35"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-descanso" className="text-xs font-semibold">Días Descanso Meta</Label>
                        <Input
                          id="edit-descanso"
                          type="number"
                          min="0"
                          max="365"
                          value={editForm.diasDescansoEdit}
                          onChange={(e) => setEditForm({ ...editForm, diasDescansoEdit: e.target.value })}
                          placeholder="Ej. 30"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-xs h-10 gap-1.5 mt-1 bg-[#1b4d22] hover:bg-[#143a1a] text-white"
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Guardar Cambios"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* CASO 1: Potrero Ocupado (Rotación y Desocupación) */}
            {operationTab !== "edit" && selectedPotrero?.estado === 'en_uso' && (
              <div className="space-y-6">
                {/* Sub-form 1A: Mover Lote */}
                {operationTab === "move" && (
                  <Card className="p-4 space-y-4 border bg-card shadow-sm">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm flex items-center gap-1">
                        <ArrowRight className="w-4 h-4 text-[#1b4d22]" /> Mover Lote (Rotación)
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
                                  {p.nombre} ({p.tipoPasto || 'sin pasto'} • {p.superficieHa} Ha)
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
                        className="w-full text-xs h-9 gap-1.5 mt-2 bg-[#1b4d22] hover:bg-[#143a1a] text-white" 
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
            {operationTab !== "edit" && selectedPotrero?.estado !== 'en_uso' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-4 border bg-card shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <Plus className="w-4 h-4 text-[#1b4d22]" /> Asignar Lote a este Potrero
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
                      className="w-full text-xs h-9 gap-1.5 mt-2 bg-[#1b4d22] hover:bg-[#143a1a] text-white"
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
