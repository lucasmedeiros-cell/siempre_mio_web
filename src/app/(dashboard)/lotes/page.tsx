"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PALETTE_COLORS = [
  { hex: "#2D6A2E", label: "Verde Oscuro" },
  { hex: "#155E75", label: "Azul Petróleo" },
  { hex: "#9A3412", label: "Óxido" },
  { hex: "#581C87", label: "Púrpura" },
  { hex: "#854D0E", label: "Mostaza" },
  { hex: "#166534", label: "Verde Hoja" },
]

interface LoteWithCount {
  uuid: string
  nombre: string
  descripcion: string | null
  color: string
  categoriaLote: string
  animalCount: number
}

export default function LotesPage() {
  const [lotes, setLotes] = useState<LoteWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const { fincaId } = useGlobalStore()
  const supabase = createClient()

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    categoriaLote: "Engorde",
    descripcion: "",
    color: "#2D6A2E",
  })

  useEffect(() => {
    fetchLotes()
  }, [fincaId])

  async function fetchLotes() {
    setLoading(true)
    try {
      let query = (supabase.from('lotes') as any)
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('finca_id', fincaId)
      }

      const { data: lotesData, error: lotesError } = await query

      if (lotesError) throw lotesError
      if (!lotesData || lotesData.length === 0) {
        setLotes([])
        return
      }

      // Fetch animal counts for each lote
      const lotesWithCounts = await Promise.all(
        (lotesData || []).map(async (lote: any) => {
          const { count, error: countError } = await (supabase
            .from('animales') as any)
            .select('*', { count: 'exact', head: true })
            .eq('lote_id', lote.uuid)
            .eq('deleted', false)

          if (countError) console.error("Error fetching count for lote", lote.uuid, countError)

          return {
            uuid: lote.uuid,
            nombre: lote.nombre,
            descripcion: lote.descripcion,
            color: lote.color,
            categoriaLote: lote.categoria_lote || lote.categoriaLote || '',
            fincaId: lote.finca_id || lote.fincaId || null,
            animalCount: count || 0
          }
        })
      )

      setLotes(lotesWithCounts)
    } catch (error) {
      console.error("Error fetching lotes:", error)
      toast.error("Error al cargar los lotes")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLote(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre) return

    setIsSubmitting(true)
    try {
      const payload = {
        uuid: crypto.randomUUID(),
        nombre: form.nombre,
        categoria_lote: form.categoriaLote,
        descripcion: form.descripcion || null,
        color: form.color,
        finca_id: fincaId || null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase.from('lotes') as any).insert([payload])
      if (error) throw error

      toast.success("Lote creado correctamente")
      setOpenRegister(false)
      setForm({
        nombre: "",
        categoriaLote: "Engorde",
        descripcion: "",
        color: "#2D6A2E",
      })
      fetchLotes()
    } catch (error) {
      console.error("Error creating lote:", error)
      toast.error("Error al crear el lote")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Lotes</h1>
          <p className="text-muted-foreground">
            Administra los grupos de animales y su distribución en la finca.
          </p>
        </div>
        <Dialog open={openRegister} onOpenChange={setOpenRegister}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Nuevo Lote
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateLote} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Lote</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles para registrar un nuevo lote en la finca.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Lote (Requerido)</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej. Lote Engorde A"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoriaLote">Categoría</Label>
                  <Select value={form.categoriaLote} onValueChange={(val) => setForm({ ...form, categoriaLote: val || "" })}>
                    <SelectTrigger id="categoriaLote">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engorde">Engorde</SelectItem>
                      <SelectItem value="Lechero">Lechero</SelectItem>
                      <SelectItem value="Cría">Cría</SelectItem>
                      <SelectItem value="Recría">Recría</SelectItem>
                      <SelectItem value="Secado">Secado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    placeholder="Ej. Animales de 2 años en fase final"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color Representativo</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PALETTE_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setForm({ ...form, color: col.hex })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          form.color === col.hex ? "border-primary scale-110 shadow" : "border-transparent"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Creando..." : "Confirmar Lote"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="h-24 bg-muted animate-pulse" />
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-dashed">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No se encontraron lotes</h3>
          <p className="text-muted-foreground mb-6">
            Comienza creando un nuevo lote para organizar tu ganado.
          </p>
          <Button variant="outline" onClick={fetchLotes}>Reintentar</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map((lote) => (
            <Card key={lote.uuid} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: lote.color || "#2D6A2E" }}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">{lote.nombre}</CardTitle>
                  <CardDescription>{lote.categoriaLote}</CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1 px-2 py-1">
                  <Users className="w-3 h-3" />
                  {lote.animalCount}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {lote.descripcion || "Sin descripción"}
                </p>
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border/50">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="ml-auto text-xs">
                    Ver Animales
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
