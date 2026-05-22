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

export default function HatoPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)

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

  // Ejemplo de Mutación Compatible con Offline-First
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
      toast.success("Animal registrado correctamente")
    }
  })

  const handleCreateMock = () => {
    addAnimalMutation.mutate({
      codigo: `RP-NEW-${Math.floor(Math.random() * 1000)}`,
      nombre: "Nuevo Ternero",
      raza: "Angus",
      sexo: "Macho",
      categoria: "Ternero",
      estado: "Activo",
      pesoActual: 40,
      fechaNacimiento: new Date().toISOString()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Hato</h1>
          <p className="text-muted-foreground">
            Administra el inventario de animales, filtra por lote, categoría y exporta reportes.
          </p>
        </div>
        <Button onClick={handleCreateMock} disabled={addAnimalMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Registrar Animal
        </Button>
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
