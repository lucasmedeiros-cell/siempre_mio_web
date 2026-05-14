"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Layout, Clock, CheckCircle2, AlertCircle, ChevronRight, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
  const { fincaId } = useGlobalStore()
  const supabase = createClient()

  useEffect(() => {
    fetchTareas()
  }, [fincaId])

  async function fetchTareas() {
    setLoading(true)
    try {
      let query = supabase
        .from('tareas')
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietarioId', fincaId)
      }

      const { data, error } = await query
      if (error) throw error
      setTareas((data || []) as Tarea[])
    } catch (error) {
      console.error("Error fetching tareas:", error)
      toast.error("Error al cargar las tareas")
    } finally {
      setLoading(false)
    }
  }

  async function updateTareaEstado(uuid: string, nuevoEstado: string) {
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ estado: nuevoEstado, updatedAt: new Date().toISOString() })
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
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Tarea
          </Button>
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
                      {tareas.filter(t => t.estado === column.id).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 p-3 space-y-3 min-h-[500px]">
                  {loading ? (
                    [1, 2].map(i => (
                      <Card key={i} className="animate-pulse h-24 bg-muted/50" />
                    ))
                  ) : (
                    tareas
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
            <CardHeader>
              <CardTitle>Vista de Calendario</CardTitle>
            </CardHeader>
            <CardContent className="h-[600px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg m-4 border border-dashed">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Módulo de calendario interactivo en desarrollo</p>
                <p className="text-sm">Próximamente: Integración con FullCalendar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
