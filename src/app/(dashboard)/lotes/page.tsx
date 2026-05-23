"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Pencil, Trash2, CheckSquare, Square, Trash, Loader2 } from "lucide-react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

  // States for viewing/managing animals in lotes
  const [selectedLoteForAnimals, setSelectedLoteForAnimals] = useState<LoteWithCount | null>(null)
  const [animalsDialogOpen, setAnimalsDialogOpen] = useState(false)
  const [loteAnimals, setLoteAnimals] = useState<any[]>([])
  const [loadingLoteAnimals, setLoadingLoteAnimals] = useState(false)
  const [availableAnimals, setAvailableAnimals] = useState<any[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [selectedAnimalsToAssign, setSelectedAnimalsToAssign] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [removingAnimalId, setRemovingAnimalId] = useState<string | null>(null)

  // Filter and search states for available animals
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Todos")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchLotes()
  }, [fincaId])

  async function fetchLoteAnimals(loteId: string) {
    setLoadingLoteAnimals(true)
    try {
      const { data, error } = await supabase
        .from('animales')
        .select('*')
        .eq('lote_id', loteId)
        .eq('deleted', false)
      
      if (error) throw error
      setLoteAnimals(data || [])
    } catch (error) {
      console.error("Error fetching lote animals:", error)
      toast.error("Error al cargar los animales del lote")
    } finally {
      setLoadingLoteAnimals(false)
    }
  }

  async function fetchAvailableAnimals(loteId: string) {
    setLoadingAvailable(true)
    try {
      const { data, error } = await supabase
        .from('animales')
        .select('uuid, codigo, nombre, categoria, raza, lote_id')
        .eq('deleted', false)
      
      if (error) throw error
      
      // Filter out animals already in this lote
      const filtered = (data || []).filter((a: any) => a.lote_id !== loteId)
      setAvailableAnimals(filtered)
    } catch (error) {
      console.error("Error fetching available animals:", error)
      toast.error("Error al cargar animales disponibles")
    } finally {
      setLoadingAvailable(false)
    }
  }

  async function handleAssignAnimals() {
    if (selectedAnimalsToAssign.length === 0 || !selectedLoteForAnimals) return
    setIsAssigning(true)
    try {
      const { error } = await (supabase.from('animales') as any)
        .update({
          lote_id: selectedLoteForAnimals.uuid,
          updated_at: new Date().toISOString()
        })
        .in('uuid', selectedAnimalsToAssign)

      if (error) throw error
      
      toast.success("Animales asignados correctamente")
      setSelectedAnimalsToAssign([])
      setShowAddSection(false)
      fetchLoteAnimals(selectedLoteForAnimals.uuid)
      fetchLotes() // refresh counts in main list
    } catch (error) {
      console.error("Error assigning animals:", error)
      toast.error("Error al asignar los animales")
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleRemoveAnimal(animalUuid: string) {
    if (!selectedLoteForAnimals) return
    setRemovingAnimalId(animalUuid)
    try {
      const { error } = await (supabase.from('animales') as any)
        .update({
          lote_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', animalUuid)

      if (error) throw error

      toast.success("Animal quitado del lote")
      fetchLoteAnimals(selectedLoteForAnimals.uuid)
      fetchLotes() // refresh counts in main list
    } catch (error) {
      console.error("Error removing animal from lote:", error)
      toast.error("Error al quitar el animal del lote")
    } finally {
      setRemovingAnimalId(null)
    }
  }

  // Trigger when Ver Animales is clicked
  const handleOpenAnimalsDialog = (lote: LoteWithCount) => {
    setSelectedLoteForAnimals(lote)
    setAnimalsDialogOpen(true)
    setShowAddSection(false)
    setSelectedAnimalsToAssign([])
    setSelectedCategoryFilter("Todos")
    setSearchQuery("")
    fetchLoteAnimals(lote.uuid)
    fetchAvailableAnimals(lote.uuid)
  }

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

  // Filter calculations for available animals
  const uniqueCategories = Array.from(
    new Set(availableAnimals.map(a => a.categoria))
  ).filter(Boolean) as string[]

  const filteredAvailableAnimals = availableAnimals.filter((animal) => {
    const matchesCategory = selectedCategoryFilter === "Todos" || animal.categoria === selectedCategoryFilter;
    const matchesSearch = !searchQuery || 
      animal.codigo.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (animal.nombre && animal.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  })

  const allFilteredSelected = filteredAvailableAnimals.length > 0 && 
    filteredAvailableAnimals.every(a => selectedAnimalsToAssign.includes(a.uuid))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Remove all filtered animals from selection
      const filteredUuids = filteredAvailableAnimals.map(a => a.uuid);
      setSelectedAnimalsToAssign(prev => prev.filter(id => !filteredUuids.includes(id)));
    } else {
      // Add all filtered animals to selection
      const filteredUuids = filteredAvailableAnimals.map(a => a.uuid);
      setSelectedAnimalsToAssign(prev => Array.from(new Set([...prev, ...filteredUuids])));
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto text-xs"
                    onClick={() => handleOpenAnimalsDialog(lote)}
                  >
                    Ver Animales
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para Ver y Asignar Animales al Lote */}
      <Dialog open={animalsDialogOpen} onOpenChange={setAnimalsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedLoteForAnimals?.color || "#2D6A2E" }} 
              />
              <DialogTitle className="text-2xl font-bold">
                Lote: {selectedLoteForAnimals?.nombre}
              </DialogTitle>
            </div>
            <DialogDescription>
              Administra los animales asignados a este lote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {/* Header / Actions inside Dialog */}
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Animales en el Lote ({loteAnimals.length})
              </h3>
              
              <Button 
                onClick={() => {
                  setShowAddSection(!showAddSection);
                  setSelectedAnimalsToAssign([]);
                  if (!showAddSection && selectedLoteForAnimals) {
                    fetchAvailableAnimals(selectedLoteForAnimals.uuid);
                  }
                }}
                variant={showAddSection ? "secondary" : "default"}
                size="sm"
                className="gap-1 text-xs"
              >
                {showAddSection ? "Cancelar" : "+ Asignar Animales"}
              </Button>
            </div>

            {/* Agregar Animales Section */}
            {showAddSection && (
              <Card className="border-primary/20 bg-muted/30 p-4 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Selecciona los animales para asignar a este lote</h4>
                  <p className="text-xs text-muted-foreground">
                    Se muestran todos los animales del hato que no pertenecen a este lote.
                  </p>
                </div>

                {loadingAvailable ? (
                  <div className="flex justify-center items-center py-6 text-sm text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Cargando animales disponibles...
                  </div>
                ) : availableAnimals.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center bg-background rounded border border-dashed">
                    No hay otros animales disponibles para asignar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Filtros y Buscador */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b pb-3">
                      {/* Búsqueda por Texto */}
                      <div className="relative flex-1">
                        <Input
                          placeholder="Buscar por RP o Nombre..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 text-xs pr-8"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Botón de Seleccionar Todos */}
                      <Button
                        type="button"
                        variant={allFilteredSelected ? "destructive" : "outline"}
                        size="sm"
                        onClick={handleToggleSelectAll}
                        className="text-xs h-9 gap-1.5 shrink-0"
                      >
                        {allFilteredSelected ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            Deseleccionar Todos
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            Seleccionar Todos ({filteredAvailableAnimals.length})
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Filtros por Categoría (Chips) */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Filtrar por Categoría
                      </Label>
                      <div className="flex gap-1.5 flex-wrap max-h-[70px] overflow-y-auto pb-1">
                        {["Todos", ...uniqueCategories].map((cat) => {
                          const isActive = selectedCategoryFilter === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategoryFilter(cat)}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border ${
                                isActive 
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                  : "bg-background text-muted-foreground border-border hover:bg-muted/80"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid de Animales Filtrados */}
                    {filteredAvailableAnimals.length === 0 ? (
                      <div className="py-8 text-center bg-background rounded border border-dashed text-xs text-muted-foreground">
                        No se encontraron animales que coincidan con la búsqueda o filtro.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1 border rounded bg-background">
                        {filteredAvailableAnimals.map((animal) => {
                          const isChecked = selectedAnimalsToAssign.includes(animal.uuid);
                          return (
                            <div 
                              key={animal.uuid}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedAnimalsToAssign(prev => prev.filter(id => id !== animal.uuid));
                                } else {
                                  setSelectedAnimalsToAssign(prev => [...prev, animal.uuid]);
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all hover:bg-muted text-xs ${
                                isChecked ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border"
                              }`}
                            >
                              <div className="text-primary shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-primary" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="truncate flex-1">
                                <span className="font-mono font-bold block">{animal.codigo}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {animal.nombre || "Sin Nombre"}
                                </span>
                                <span className="text-[9px] font-medium text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/10 inline-block mt-0.5">
                                  {animal.categoria}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {availableAnimals.length > 0 && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setShowAddSection(false);
                        setSelectedAnimalsToAssign([]);
                      }}
                      className="text-xs h-8"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleAssignAnimals}
                      disabled={selectedAnimalsToAssign.length === 0 || isAssigning}
                      className="text-xs h-8 gap-1"
                    >
                      {isAssigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirmar Asignación ({selectedAnimalsToAssign.length})
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* List of Lote Animals */}
            {loadingLoteAnimals ? (
              <div className="flex justify-center items-center py-12 text-sm text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                Cargando animales del lote...
              </div>
            ) : loteAnimals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-xl border border-dashed">
                <Users className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <h4 className="font-medium text-sm">Este lote está vacío</h4>
                <p className="text-xs text-muted-foreground max-w-[250px] mt-1 mb-4">
                  No hay animales asignados a este lote todavía. ¡Haz clic en "+ Asignar Animales" para agregar!
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[120px] font-semibold text-xs">Código / RP</TableHead>
                      <TableHead className="font-semibold text-xs">Nombre</TableHead>
                      <TableHead className="font-semibold text-xs">Categoría</TableHead>
                      <TableHead className="font-semibold text-xs">Raza</TableHead>
                      <TableHead className="w-[100px] text-right font-semibold text-xs">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteAnimals.map((animal) => {
                      const isMale = animal.sexo === "Macho";
                      return (
                        <TableRow key={animal.uuid} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-xs flex items-center gap-1.5 py-2.5">
                            <span className="text-sm">{isMale ? '🐂' : '🐄'}</span>
                            {animal.codigo}
                          </TableCell>
                          <TableCell className="text-xs py-2.5">{animal.nombre || "-"}</TableCell>
                          <TableCell className="text-xs py-2.5">
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] bg-background">
                              {animal.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2.5">{animal.raza}</TableCell>
                          <TableCell className="text-right py-2.5">
                            <Button 
                              onClick={() => handleRemoveAnimal(animal.uuid)}
                              disabled={removingAnimalId === animal.uuid}
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] gap-1"
                              title="Quitar del lote"
                            >
                              {removingAnimalId === animal.uuid ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash className="w-3 h-3" />
                              )}
                              Quitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t mt-4">
            <Button onClick={() => setAnimalsDialogOpen(false)} variant="secondary" size="sm" className="w-full">
              Cerrar Diálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
