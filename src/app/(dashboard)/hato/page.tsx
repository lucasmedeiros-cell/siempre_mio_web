"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DataTable } from "@/components/hato/data-table"
import { columns, Animal } from "@/components/hato/columns"
import { AnimalSheet } from "@/components/hato/animal-sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useGlobalStore } from "@/store/global-store"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
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

export default function HatoPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [openRegister, setOpenRegister] = useState(false)
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    raza: "",
    sexo: "Macho",
    categoria: "Ternero",
    estado: "Activo",
    pesoActual: ""
  })

  const { data: animales = [], isLoading } = useQuery({
    queryKey: ['animales', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('animales')
        .select('*')
        .eq('deleted', false)
        .order('createdAt', { ascending: false, nullsFirst: false })
      
      if (error && error.code !== 'PGRST116') {
        // Ignoramos error si no encuentra la columna createdAt y ordenamos por defecto
        const { data: fallbackData } = await supabase.from('animales')
          .select('*')
          .eq('deleted', false)
        return (fallbackData || []) as Animal[]
      }
      return (data || []) as Animal[]
    }
  })

  // Mutación para agregar un animal real
  const addAnimalMutation = useMutation({
    mutationFn: async (newAnimal: Partial<Animal>) => {
      const supabase = createClient()
      const payload = {
        ...newAnimal,
        uuid: crypto.randomUUID(),
        synced: true,
        deleted: false,
        updatedAt: new Date().toISOString()
      }

      const { error } = await (supabase.from('animales') as any).insert([payload])
      if (error) throw error
      return payload as Animal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_overview'] })
      toast.success("Animal registrado correctamente")
      setOpenRegister(false)
      setForm({
        codigo: "",
        nombre: "",
        raza: "",
        sexo: "Macho",
        categoria: "Ternero",
        estado: "Activo",
        pesoActual: ""
      })
    },
    onError: () => {
      toast.error("Error al registrar el animal. Verifica que el código RP sea único.")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo) return

    addAnimalMutation.mutate({
      codigo: form.codigo,
      nombre: form.nombre || undefined,
      raza: form.raza || undefined,
      sexo: form.sexo,
      categoria: form.categoria,
      estado: form.estado,
      pesoActual: form.pesoActual ? parseFloat(form.pesoActual) : undefined,
      propietarioId: fincaId || undefined,
      procedencia: "Nacimiento",
      fechaNacimiento: new Date().toISOString()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Hato</h1>
          <p className="text-muted-foreground">
            Administra el inventario de animales, filtra por lote, categoría y exporta reportes.
          </p>
        </div>

        <Dialog open={openRegister} onOpenChange={setOpenRegister}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Registrar Animal
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Animal</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles para registrar un nuevo animal en la finca.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código RP (Requerido)</Label>
                  <Input
                    id="codigo"
                    placeholder="Ej. RP-425"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej. Clavel"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raza">Raza</Label>
                  <Input
                    id="raza"
                    placeholder="Ej. Nelore"
                    value={form.raza}
                    onChange={(e) => setForm({ ...form, raza: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select value={form.sexo} onValueChange={(val) => setForm({ ...form, sexo: val || "Macho" })}>
                    <SelectTrigger id="sexo">
                      <SelectValue placeholder="Selecciona el sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Hembra">Hembra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    placeholder="Ej. Ternero, Vaca, Toro"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pesoActual">Peso Actual (kg)</Label>
                  <Input
                    id="pesoActual"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form.pesoActual}
                    onChange={(e) => setForm({ ...form, pesoActual: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={form.estado} onValueChange={(val) => setForm({ ...form, estado: val || "Activo" })}>
                    <SelectTrigger id="estado">
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Muerto">Muerto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={addAnimalMutation.isPending} className="w-full">
                  {addAnimalMutation.isPending ? "Registrando..." : "Confirmar Registro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario Animal</CardTitle>
          <CardDescription>
            Mostrando todos los animales registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={animales} 
            onRowClick={(row) => setSelectedAnimal(row)} 
          />
        </CardContent>
      </Card>

      <AnimalSheet 
        animal={selectedAnimal} 
        open={!!selectedAnimal} 
        onOpenChange={(open) => !open && setSelectedAnimal(null)} 
      />
    </div>
  )
}
