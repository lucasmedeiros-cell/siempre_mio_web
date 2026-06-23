"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Layout, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Tarea {
  uuid: string
  titulo: string
  estado: 'Pendiente' | 'En Progreso' | 'Completada'
  prioridad: 'Baja' | 'Media' | 'Alta'
  fechaLimite: string | null
  asignadoA: string | null
}

const COLUMNS = [
  { id: 'Pendiente', title: 'Pendientes', icon: Clock, color: 'text-yellow-500' },
  { id: 'En Progreso', title: 'En Progreso', icon: AlertCircle, color: 'text-blue-500' },
  { id: 'Completada', title: 'Completadas', icon: CheckCircle2, color: 'text-green-500' },
]

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterPrioridad, setFilterPrioridad] = useState("Todas")
  const { fincaId } = useGlobalStore()
  const supabase = createClient()

  const [openRegister, setOpenRegister] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    titulo: "",
    prioridad: "Media" as 'Baja' | 'Media' | 'Alta',
    fechaLimite: new Date().toISOString().split('T')[0],
    asignadoA: "",
  })

  useEffect(() => {
    fetchTareas()
  }, [fincaId])

  async function fetchTareas() {
    setLoading(true)
    try {
      let query = (supabase
        .from('tareas') as any)
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietario_id', fincaId)
      }

      const { data, error } = await query
      if (error) throw error

      const mappedTareas = (data || []).map((t: any) => ({
        uuid: t.uuid,
        titulo: t.titulo,
        estado: t.estado,
        prioridad: t.prioridad,
        fechaLimite: t.fecha_limite || t.fechaLimite || null,
        asignadoA: t.asignado_a || t.asignadoA || null
      })) as Tarea[]

      setTareas(mappedTareas)
    } catch (error) {
      console.error("Error fetching tareas:", error)
      toast.error("Error al cargar las tareas")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTarea(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo) return

    setIsSubmitting(true)
    try {
      const payload = {
        uuid: crypto.randomUUID(),
        titulo: form.titulo,
        estado: "Pendiente",
        prioridad: form.prioridad,
        fecha_limite: form.fechaLimite ? new Date(form.fechaLimite).toISOString() : null,
        asignado_a: form.asignadoA || null,
        propietario_id: fincaId || null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase.from('tareas') as any).insert([payload])
      if (error) throw error

      toast.success("Tarea creada correctamente")
      setOpenRegister(false)
      setForm({
        titulo: "",
        prioridad: "Media",
        fechaLimite: new Date().toISOString().split('T')[0],
        asignadoA: "",
      })
      fetchTareas()
    } catch (error) {
      console.error("Error creating tarea:", error)
      toast.error("Error al crear la tarea")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateTareaEstado(uuid: string, nuevoEstado: string) {
    try {
      const { error } = await (supabase
        .from('tareas') as any)
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('uuid', uuid)

      if (error) throw error

      setTareas(prev => prev.map(t => t.uuid === uuid ? { ...t, estado: nuevoEstado as any } : t))
      toast.success("Tarea actualizada")
    } catch (error) {
      console.error("Error updating tarea:", error)
      toast.error("Error al actualizar la tarea")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetEstado: string) => {
    const tareaId = e.dataTransfer.getData("tareaId")
    if (tareaId) {
      updateTareaEstado(tareaId, targetEstado)
    }
  }

  const handleDragStart = (e: React.DragEvent, tareaId: string) => {
    e.dataTransfer.setData("tareaId", tareaId)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1)
  // Day of week index shifted to Mon-Sun (0-6)
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7
  // Total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Total days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const gridCells = []

  // Pre-fill days from previous month
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      day: i,
      isCurrentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    })
  }

  // Post-fill next month days to complete a 6-week grid (42 cells)
  const remainingCells = 42 - gridCells.length
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      day: i,
      isCurrentMonth: false,
      dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    })
  }

  const visibleTareas = filterPrioridad === "Todas"
    ? tareas
    : tareas.filter(t => t.prioridad === filterPrioridad)

  const getTasksForDateStr = (dateStr: string) => {
    return visibleTareas.filter(t => {
      if (!t.fechaLimite) return false
      return t.fechaLimite.split('T')[0] === dateStr
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tablero de Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las actividades operativas de la finca en estilo Kanban.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {filterPrioridad === "Todas" ? "Filtros" : `Prioridad: ${filterPrioridad}`}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Filtrar por prioridad</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filterPrioridad} onValueChange={(v) => setFilterPrioridad(v || "Todas")}>
                <DropdownMenuRadioItem value="Todas">Todas</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Alta">Alta</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Media">Media</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Baja">Baja</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={openRegister} onOpenChange={setOpenRegister}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Nueva Tarea
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateTarea} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Nueva Tarea</DialogTitle>
                  <DialogDescription>
                    Registra una actividad para el equipo de trabajo de la finca.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título de la Tarea (Requerido)</Label>
                    <Input
                      id="titulo"
                      placeholder="Ej. Vacunación contra Fiebre Aftosa"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select 
                        value={form.prioridad} 
                        onValueChange={(val) => setForm({ ...form, prioridad: (val || "Media") as 'Baja' | 'Media' | 'Alta' })}
                      >
                        <SelectTrigger id="prioridad">
                          <SelectValue placeholder="Selecciona prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baja">Baja</SelectItem>
                          <SelectItem value="Media">Media</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechaLimite">Fecha Límite</Label>
                      <Input
                        id="fechaLimite"
                        type="date"
                        value={form.fechaLimite}
                        onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asignadoA">Asignado a (Responsable)</Label>
                    <Input
                      id="asignadoA"
                      placeholder="Ej. Juan Pérez"
                      value={form.asignadoA}
                      onChange={(e) => setForm({ ...form, asignadoA: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Creando..." : "Crear Tarea"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <Layout className="w-4 h-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" /> Calendario
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kanban" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                className="flex flex-col h-full bg-muted/30 rounded-xl border border-border/50 overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-4 border-b border-border/50 bg-background/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <column.icon className={`w-5 h-5 ${column.color}`} />
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="secondary" className="ml-2 bg-background">
                      {visibleTareas.filter(t => t.estado === column.id).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpenRegister(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 p-3 space-y-3 min-h-[500px]">
                  {loading ? (
                    [1, 2].map(i => (
                      <Card key={i} className="animate-pulse h-24 bg-muted/50" />
                    ))
                  ) : (
                    visibleTareas
                      .filter(t => t.estado === column.id)
                      .map((tarea) => (
                        <Card
                          key={tarea.uuid}
                          draggable
                          onDragStart={(e) => handleDragStart(e, tarea.uuid)}
                          className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-border/50 group"
                        >
                          <CardHeader className="p-3 pb-0">
                            <div className="flex items-center justify-between mb-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${tarea.prioridad === 'Alta' ? 'border-red-500 text-red-500 bg-red-50/50' :
                                    tarea.prioridad === 'Media' ? 'border-yellow-500 text-yellow-500 bg-yellow-50/50' :
                                      'border-green-500 text-green-500 bg-green-50/50'
                                  }`}
                              >
                                {tarea.prioridad}
                              </Badge>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                            <CardTitle className="text-sm font-medium leading-tight">
                              {tarea.titulo}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {tarea.fechaLimite ? format(new Date(tarea.fechaLimite), 'd MMM', { locale: es }) : 'Sin fecha'}
                              </div>
                              <div className="flex -space-x-2">
                                <div className="h-5 w-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold">
                                  {tarea.asignadoA?.substring(0, 2).toUpperCase() || 'SM'}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

         <TabsContent value="calendar" className="mt-0">
          <Card className="border-border/50">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="text-xl">Calendario de Actividades</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Vista mensual de tareas programadas. Haz clic en un día para programar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold min-w-[120px] text-center text-sm capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  type="button"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground mb-2">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>
              <div className="grid grid-cols-7 gap-1 bg-muted/20 p-1 rounded-lg border border-border/50">
                {gridCells.map((cell, idx) => {
                  const dayTasks = getTasksForDateStr(cell.dateStr)
                  const isToday = cell.dateStr === new Date().toISOString().split('T')[0]
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setForm({
                          ...form,
                          fechaLimite: cell.dateStr
                        })
                        setOpenRegister(true)
                      }}
                      className={`min-h-[90px] p-1.5 flex flex-col justify-between rounded-md transition-all cursor-pointer border ${
                        cell.isCurrentMonth
                          ? "bg-background/40 hover:bg-background/80 border-border/20 text-foreground"
                          : "bg-muted/10 border-transparent text-muted-foreground/40 hover:bg-muted/20"
                      } ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${isToday ? "text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center font-bold" : ""}`}>
                          {cell.day}
                        </span>
                        {dayTasks.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">
                            {dayTasks.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-end gap-1 mt-1 overflow-hidden">
                        {dayTasks.slice(0, 2).map((tarea) => {
                          const priorityColor =
                            tarea.prioridad === 'Alta' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' :
                            tarea.prioridad === 'Media' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' :
                            'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                          
                          return (
                            <div
                              key={tarea.uuid}
                              title={tarea.titulo}
                              className={`text-[9px] truncate px-1 py-0.5 rounded border leading-none font-medium ${priorityColor}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(`Tarea: ${tarea.titulo}`, {
                                  description: `Prioridad: ${tarea.prioridad} | Responsable: ${tarea.asignadoA || 'Sin asignar'}`,
                                });
                              }}
                            >
                              {tarea.titulo}
                            </div>
                          )
                        })}
                        {dayTasks.length > 2 && (
                          <div className="text-[8px] text-muted-foreground text-center font-bold">
                            + {dayTasks.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
