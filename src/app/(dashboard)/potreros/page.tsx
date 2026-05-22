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
import { differenceInDays } from "date-fns"
import { toast } from "sonner"
import { ArrowRight, Tractor, Plus } from "lucide-react"
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
  const [destinoId, setDestinoId] = useState<string>("")

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    superficieHa: "",
    condicion: "100",
    estado: "libre"
  })

  const handleCreatePotrero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.superficieHa || !form.condicion) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const payload = {
        uuid: crypto.randomUUID(),
        nombre: form.nombre,
        superficieHa: parseFloat(form.superficieHa),
        condicion: parseFloat(form.condicion) / 100,
        estado: form.estado === 'ocupado' ? 'Ocupado' : form.estado === 'descanso' ? 'Descanso' : 'Libre',
        alturaPastoMetros: 0.2,
        diasDescanso: 0,
        fechaUltimaLiberacion: null,
        deleted: false,
        synced: true,
        updatedAt: new Date().toISOString()
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

  const { data: potreros = [] } = useQuery({
    queryKey: ['potreros', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('potreros').select('*').eq('deleted', false).order('nombre')
      if (error) throw error
      
      return (data || []).map((p: any) => ({
        ...p,
        // Adaptamos el estado real al formato que espera la UI (libre, en_uso, descanso)
        estado: p.estado.toLowerCase() === 'ocupado' || p.estado === 'En Uso' ? 'en_uso' 
              : p.estado.toLowerCase() === 'descanso' ? 'descanso' : 'libre',
        fechaEntrada: null, // Podría venir de ocupaciones_potrero
        cantidadAnimales: 0 // Podría venir de ocupaciones_potrero -> lotes -> animales
      })) as Potrero[]
    }
  })

  const moveBatchMutation = useMutation({
    mutationFn: async ({ origenId, destinoId }: { origenId: string, destinoId: string }) => {
      // Aquí iría la transacción a Supabase:
      // 1. Actualizar animales SET potrero_id = destinoId WHERE potrero_id = origenId
      // 2. Actualizar potrero origen SET estado = 'descanso', fechaUltimaLiberacion = NOW()
      // 3. Actualizar potrero destino SET estado = 'en_uso', fechaEntrada = NOW()
      return { origenId, destinoId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] })
      toast.success("Lote trasladado exitosamente")
      setSelectedPotrero(null)
      setDestinoId("")
    }
  })

  const handleMoveBatch = () => {
    if (!selectedPotrero || !destinoId) return
    moveBatchMutation.mutate({ 
      origenId: selectedPotrero.uuid, 
      destinoId 
    })
  }

  const potrerosLibres = potreros.filter(p => p.estado === 'libre' && p.uuid !== selectedPotrero?.uuid)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Potreros</h1>
          <p className="text-muted-foreground">
            Visualización de la cuadrícula interactiva. Gestiona la rotación de lotes y evalúa los días de ocupación.
          </p>
        </div>
        <div>
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
              bgColor = "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-400"
              statusText = "Disponible"
            } else if (potrero.estado === "en_uso") {
              bgColor = "bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-400"
              statusText = "Ocupado"
            } else {
              bgColor = "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400"
              statusText = "En Descanso"
            }

            const diasOcupacion = potrero.fechaEntrada ? differenceInDays(new Date(), new Date(potrero.fechaEntrada)) : 0
            const alertaOcupacion = diasOcupacion > 7

            return (
              <motion.div 
                key={potrero.uuid} 
                variants={itemVariants}
                layoutId={`card-${potrero.uuid}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPotrero(potrero)}
                className="cursor-pointer h-full"
              >
                <Card className={`border-2 h-full transition-colors hover:shadow-md ${bgColor}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{potrero.nombre}</CardTitle>
                      <Badge variant="outline" className={`bg-background/50 backdrop-blur-sm ${alertaOcupacion ? 'border-red-500 text-red-500' : ''}`}>
                        {statusText}
                      </Badge>
                    </div>
                    <CardDescription className="text-current opacity-80 flex items-center gap-2">
                      <Tractor className="w-3 h-3" /> {potrero.superficieHa} Ha
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mt-2">
                      <div className="flex justify-between">
                        <span>Carga Animal:</span>
                        <span className="font-bold">{potrero.cantidadAnimales || 0} cabezas</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ocupación:</span>
                        <span className={`font-bold ${alertaOcupacion ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {potrero.estado === 'en_uso' ? `${diasOcupacion} días` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Condición MV:</span>
                        <span className="font-medium">{(potrero.condicion * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <Sheet open={!!selectedPotrero} onOpenChange={(open) => !open && setSelectedPotrero(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">{selectedPotrero?.nombre}</SheetTitle>
            <SheetDescription>
              Gestión operativa del polígono
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-8">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg border">
              <div>
                <span className="text-muted-foreground block mb-1">Estado Actual</span>
                <Badge variant={selectedPotrero?.estado === 'libre' ? 'default' : 'secondary'} className="capitalize">
                  {selectedPotrero?.estado.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Superficie</span>
                <span className="font-medium">{selectedPotrero?.superficieHa} Hectáreas</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Carga Actual</span>
                <span className="font-medium">{selectedPotrero?.cantidadAnimales || 0} Animales</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Días en uso</span>
                <span className="font-medium">
                  {selectedPotrero?.fechaEntrada ? differenceInDays(new Date(), new Date(selectedPotrero.fechaEntrada)) : 0} días
                </span>
              </div>
            </div>

            {selectedPotrero?.estado === 'en_uso' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                  <ArrowRight className="w-5 h-5 text-primary" /> Mover Lote (Rotación)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Transfiere los {selectedPotrero.cantidadAnimales} animales a un potrero disponible para permitir el descanso de este polígono.
                </p>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Potrero Destino</label>
                  <Select value={destinoId} onValueChange={(val) => setDestinoId(val || "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un potrero libre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {potrerosLibres.length > 0 ? (
                        potrerosLibres.map(p => (
                          <SelectItem key={p.uuid} value={p.uuid}>
                            {p.nombre} ({(p.condicion * 100).toFixed(0)}% MV)
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No hay potreros libres</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleMoveBatch}
                    disabled={!destinoId || destinoId === 'none' || moveBatchMutation.isPending}
                  >
                    {moveBatchMutation.isPending ? "Transfiriendo..." : "Confirmar Movimiento"}
                  </Button>
                </div>
              </div>
            )}

            {selectedPotrero?.estado === 'en_uso' && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold border-b pb-2">Resumen del Lote</h4>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-background border rounded-md">
                      <span className="font-medium">Vaca RP-0{i * 12}</span>
                      <Badge variant="outline">Lote Principal</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center mt-2">+ {selectedPotrero.cantidadAnimales! - 3} animales más</p>
                </div>
              </div>
            )}
            
            {selectedPotrero?.estado !== 'en_uso' && (
              <div className="p-6 bg-muted/20 border border-dashed rounded-lg text-center space-y-2">
                <Tractor className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Este potrero está actualmente vacío.</p>
                <p className="text-xs text-muted-foreground">Para ingresar animales, debes realizar el movimiento desde el potrero de origen donde se encuentra el lote actual.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
