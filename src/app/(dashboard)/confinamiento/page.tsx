"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Beef, UtensilsCrossed, Calculator, Info, TrendingUp, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

interface Receta {
  uuid: string
  nombre: string
  proteinaTotal: number
  costoTotal: number
  ingredientesJson: string
}

export default function ConfinamientoPage() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loading, setLoading] = useState(true)
  const { fincaId } = useGlobalStore()
  const supabase = createClient()

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    proteinaTotal: "",
    costoTotal: "",
    ingredientes: ""
  })

  useEffect(() => {
    fetchRecetas()
  }, [fincaId])

  async function fetchRecetas() {
    setLoading(true)
    try {
      let query = (supabase
        .from('recetas_info') as any)
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietario_id', fincaId)
      }

      const { data, error } = await query
      if (error) throw error

      const mappedRecetas = (data || []).map((r: any) => ({
        uuid: r.uuid,
        nombre: r.nombre,
        proteinaTotal: r.proteina_total || r.proteinaTotal || 0,
        costoTotal: r.costo_total || r.costoTotal || 0,
        ingredientesJson: r.ingredientes_json || r.ingredientesJson || '[]'
      })) as Receta[]

      setRecetas(mappedRecetas)
    } catch (error) {
      console.error("Error fetching recetas:", error)
      toast.error("Error al cargar las recetas de dieta")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateReceta(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.proteinaTotal || !form.costoTotal) return

    setIsSubmitting(true)
    try {
      const ingredientesList = form.ingredientes
        ? form.ingredientes.split(',').map(i => i.trim()).filter(Boolean)
        : []
      
      const payload = {
        uuid: crypto.randomUUID(),
        nombre: form.nombre,
        proteina_total: parseFloat(form.proteinaTotal),
        costo_total: parseFloat(form.costoTotal),
        ingredientes_json: JSON.stringify(ingredientesList),
        propietario_id: fincaId || null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase.from('recetas_info') as any).insert([payload])
      if (error) throw error

      toast.success("Receta de dieta creada correctamente")
      setOpenRegister(false)
      setForm({
        nombre: "",
        proteinaTotal: "",
        costoTotal: "",
        ingredientes: ""
      })
      fetchRecetas()
    } catch (error) {
      console.error("Error creating receta:", error)
      toast.error("Error al crear la receta")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dietas de Confinamiento</h1>
          <p className="text-muted-foreground">
            Gestión nutricional y formulación de raciones para engorde.
          </p>
        </div>
         <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" /> Historial de Carga
          </Button>
          <Dialog open={openRegister} onOpenChange={setOpenRegister}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Nueva Receta
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateReceta} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Nueva Receta de Dieta</DialogTitle>
                  <DialogDescription>
                    Registra una fórmula de ración alimenticia para el ganado.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Receta (Requerido)</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej. Engorde Rápido Fase 1"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="proteinaTotal">Proteína Total (%)</Label>
                      <Input
                        id="proteinaTotal"
                        type="number"
                        step="0.1"
                        placeholder="Ej. 14.5"
                        value={form.proteinaTotal}
                        onChange={(e) => setForm({ ...form, proteinaTotal: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costoTotal">Costo por kg (Bs.)</Label>
                      <Input
                        id="costoTotal"
                        type="number"
                        step="0.01"
                        placeholder="Ej. 2.50"
                        value={form.costoTotal}
                        onChange={(e) => setForm({ ...form, costoTotal: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ingredientes">Ingredientes (Separados por comas)</Label>
                    <Input
                      id="ingredientes"
                      placeholder="Ej. Maíz molido, Harina de soya, Núcleo mineral"
                      value={form.ingredientes}
                      onChange={(e) => setForm({ ...form, ingredientes: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Creando..." : "Crear Receta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Beef className="w-4 h-4" /> Animales en Confinamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0</div>
            <p className="text-xs text-muted-foreground">+0 desde el último mes</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> GDP Promedio Confinado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">0.00 kg</div>
            <p className="text-xs text-muted-foreground">Meta: 1.20 kg/día</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Costo Promedio Ración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs. 0.00</div>
            <p className="text-xs text-muted-foreground">Calculado por kg MS</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recetas de Alimento</CardTitle>
              <CardDescription>Fórmulas activas para el suministro diario.</CardDescription>
            </div>
            <UtensilsCrossed className="w-5 h-5 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Prot. %</TableHead>
                    <TableHead>Costo/kg</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">Cargando recetas...</TableCell>
                    </TableRow>
                  ) : recetas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No hay recetas registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recetas.map((receta) => (
                      <TableRow key={receta.uuid}>
                        <TableCell className="font-medium">{receta.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {receta.proteinaTotal.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>Bs. {receta.costoTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Ver</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg">Asignación de Lotes</CardTitle>
            </div>
            <CardDescription>
              Animales actualmente en programa de nutrición intensiva.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted rounded-full p-4 mb-4">
              <Beef className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              No hay animales asignados a programas de confinamiento en esta finca.
            </p>
            <Button variant="outline" className="mt-4" size="sm">Asignar Lote</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
