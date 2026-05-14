"use client"

import { Animal } from "@/components/hato/columns"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Activity, Syringe, Weight } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface AnimalSheetProps {
  animal: Animal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnimalSheet({ animal, open, onOpenChange }: AnimalSheetProps) {
  if (!animal) return null

  const isMale = animal.sexo === "Macho"

  // Mock weight history
  const weightHistory = [
    { date: "Ene 2023", peso: animal.pesoActual! * 0.7 },
    { date: "May 2023", peso: animal.pesoActual! * 0.8 },
    { date: "Sep 2023", peso: animal.pesoActual! * 0.9 },
    { date: "Actual", peso: animal.pesoActual! },
  ]

  // Mock health events
  const healthEvents = [
    { fecha: "2023-11-15", tipo: "Vacuna", det: "Fiebre Aftosa" },
    { fecha: "2023-08-02", tipo: "Tratamiento", det: "Antiparasitario" }
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left space-y-4 border-b pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold border-2 border-primary/20">
                {isMale ? '🐂' : '🐄'}
              </div>
              <div>
                <SheetTitle className="text-2xl">{animal.nombre || "Sin Nombre"}</SheetTitle>
                <SheetDescription className="text-lg font-mono">
                  {animal.codigo}
                </SheetDescription>
              </div>
            </div>
            <Badge variant={animal.estado === 'Activo' ? 'default' : 'secondary'} className="text-sm">
              {animal.estado}
            </Badge>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Categoría</span>
              <span className="font-medium">{animal.categoria}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Raza</span>
              <span className="font-medium">{animal.raza}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Sexo</span>
              <span className="font-medium">{animal.sexo}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Procedencia</span>
              <span className="font-medium">{animal.procedencia}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">F. Nacimiento</span>
              <span className="font-medium">
                {animal.fechaNacimiento ? format(new Date(animal.fechaNacimiento), "dd/MM/yyyy") : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Sincronización Móvil</span>
              <Badge variant={animal.synced ? "outline" : "destructive"}>
                {animal.synced ? "Sincronizado" : "Pendiente"}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Weight className="w-4 h-4" />
              Curva de Crecimiento (kg)
            </h4>
            <div className="h-[200px] w-full rounded-lg border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Historial de Salud Reciente
            </h4>
            <div className="space-y-4 border-l-2 border-muted ml-2 pl-4">
              {healthEvents.map((evt, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {evt.tipo === "Vacuna" ? <Syringe className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                        {evt.tipo}
                      </p>
                      <p className="text-xs text-muted-foreground">{evt.det}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(evt.fecha), "dd/MM/yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
