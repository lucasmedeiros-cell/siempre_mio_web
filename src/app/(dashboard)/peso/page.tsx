"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Scale, TrendingUp, Plus, Calendar, Search, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"

function parseDateSafely(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function PesoPage() {
  const { fincaId } = useGlobalStore()
  const [openForm, setOpenForm] = useState(false)
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")

  const [form, setForm] = useState({
    animalId: "",
    peso: "",
    fechaPesaje: new Date().toISOString().split('T')[0],
    observacion: ""
  })

  // 1. Obtener animales para selector y cruce de datos
  const { data: animales = [] } = useQuery({
    queryKey: ['animales_peso_select', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase.from('animales')
        .select('uuid, codigo, nombre, categoria, raza, peso_nacimiento, fecha_nacimiento, peso_actual')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietario_id', fincaId)
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        const fincaIds = (userFincas || []).map((f: any) => f.id)
        if (fincaIds.length === 0) return []
        query = query.in('propietario_id', fincaIds)
      }

      const { data, error } = await (query as any).order('codigo', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 2. Obtener registros de pesaje
  const { data: pesajes = [], isLoading } = useQuery({
    queryKey: ['registros_peso', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Resolve finca IDs
      let userFincaIds: string[] = []
      if (fincaId) {
        userFincaIds = [fincaId]
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        userFincaIds = (userFincas || []).map((f: any) => f.id)
      }
      if (userFincaIds.length === 0) return []

      // Fetch animales of this/these fincas first
      const { data: animalRows } = await supabase.from('animales')
        .select('uuid')
        .eq('deleted', false)
        .in('propietario_id', userFincaIds)

      const animalUuids = (animalRows || []).map((a: any) => a.uuid)
      if (animalUuids.length === 0) return []

      const { data, error } = await (supabase.from('registros_peso') as any)
        .select('*')
        .eq('deleted', false)
        .in('animal_id', animalUuids)
        .order('fecha_pesaje', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // 3. Mutación para agregar registro de pesaje
  const addPesoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const supabase = createClient()
      const dataPayload = {
        uuid: crypto.randomUUID(),
        animal_id: payload.animalId,
        fecha_pesaje: payload.fechaPesaje + "T12:00:00+00:00", // Evitar desfase de zona horaria
        peso: parseFloat(payload.peso),
        observacion: payload.observacion || null,
        synced: true,
        deleted: false,
        updated_at: new Date().toISOString()
      }

      // Guardar registro de pesaje
      const { error: insertError } = await (supabase.from('registros_peso') as any).insert([dataPayload])
      if (insertError) throw insertError

      // Actualizar el peso actual del animal en la tabla 'animales'
      const { error: updateError } = await (supabase.from('animales') as any)
        .update({ peso_actual: dataPayload.peso, updated_at: new Date().toISOString() })
        .eq('uuid', payload.animalId)
      
      if (updateError) {
        console.warn("Could not update current weight in animales table:", updateError)
      }

      return dataPayload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_peso'] })
      queryClient.invalidateQueries({ queryKey: ['animales_peso_select'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_overview'] })
      toast.success("Pesaje registrado correctamente")
      setOpenForm(false)
      setForm({
        animalId: "",
        peso: "",
        fechaPesaje: new Date().toISOString().split('T')[0],
        observacion: ""
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error("Error al registrar el pesaje")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.animalId || !form.peso || !form.fechaPesaje) {
      toast.error("Por favor completa los campos obligatorios")
      return
    }

    addPesoMutation.mutate(form)
  }

  // 4. Cálculos y Progresión de Pesos en el Cliente
  const calculatedData = (() => {
    const animalMap: Record<string, any> = {}
    animales.forEach((a: any) => {
      animalMap[a.uuid] = {
        ...a,
        weighings: [] // Lista ordenada de pesajes
      }
    })

    // Añadir peso de nacimiento como el primer pesaje base si existe
    animales.forEach((a: any) => {
      if (a.peso_nacimiento && a.fecha_nacimiento) {
        animalMap[a.uuid].weighings.push({
          fecha: a.fecha_nacimiento,
          peso: a.peso_nacimiento,
          observacion: "Peso al nacimiento (Base)"
        })
      }
    })

    // Añadir registros de la tabla registros_peso
    pesajes.forEach((p: any) => {
      if (animalMap[p.animal_id]) {
        animalMap[p.animal_id].weighings.push({
          fecha: p.fecha_pesaje,
          peso: p.peso,
          observacion: p.observacion || ""
        })
      }
    })

    // Procesar y calcular ganancias para cada animal
    const ledgerRows: any[] = []
    let totalGdpSum = 0
    let totalGdpCount = 0
    let highestGdp = { value: 0, animal: "Ninguno", rp: "-" }
    let weightLossCount = 0

    Object.values(animalMap).forEach((a: any) => {
      // Ordenar pesajes cronológicamente
      a.weighings.sort((w1: any, w2: any) => {
        const d1 = parseDateSafely(w1.fecha)
        const d2 = parseDateSafely(w2.fecha)
        return (d1?.getTime() || 0) - (d2?.getTime() || 0)
      })

      // Calcular ganancias entre pesajes consecutivos
      for (let i = 1; i < a.weighings.length; i++) {
        const wPrev = a.weighings[i - 1]
        const wCurr = a.weighings[i]

        const dPrev = parseDateSafely(wPrev.fecha)
        const dCurr = parseDateSafely(wCurr.fecha)

        if (dPrev && dCurr) {
          const days = differenceInDays(dCurr, dPrev)
          const diffWeight = wCurr.peso - wPrev.peso
          const gdp = days > 0 ? diffWeight / days : 0 // kg por día

          if (days > 0) {
            totalGdpSum += gdp
            totalGdpCount++

            if (gdp > highestGdp.value) {
              highestGdp = { value: gdp, animal: a.nombre || "Sin Nombre", rp: a.codigo }
            }

            if (gdp < 0 && i === a.weighings.length - 1) {
              // Si el último pesaje indica pérdida de peso
              weightLossCount++
            }
          }

          ledgerRows.push({
            id: `${a.uuid}-${i}`,
            codigo: a.codigo,
            nombre: a.nombre || "Sin Nombre",
            categoria: a.categoria || "Sin Categoría",
            fecha: wCurr.fecha,
            peso: wCurr.peso,
            pesoPrev: wPrev.peso,
            diferencia: diffWeight,
            dias: days,
            gdp: gdp,
            observacion: wCurr.observacion
          })
        }
      }
    })

    // Ordenar historial de ganancias cronológicamente descendente
    ledgerRows.sort((r1, r2) => {
      const d1 = parseDateSafely(r1.fecha)
      const d2 = parseDateSafely(r2.fecha)
      return (d2?.getTime() || 0) - (d1?.getTime() || 0)
    })

    // Promedio general de ganancia
    const avgGdp = totalGdpCount > 0 ? totalGdpSum / totalGdpCount : 0

    // Chart data 1: Evolución de Peso Promedio Hato (por meses)
    const monthlyWeights: Record<string, { sum: number, count: number }> = {}
    pesajes.forEach((p: any) => {
      const d = parseDateSafely(p.fecha_pesaje)
      if (d) {
        const key = format(d, "yyyy-MM") // Agrupar por año y mes
        if (!monthlyWeights[key]) {
          monthlyWeights[key] = { sum: 0, count: 0 }
        }
        monthlyWeights[key].sum += p.peso
        monthlyWeights[key].count++
      }
    })

    const chartWeightData = Object.entries(monthlyWeights)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split("-")
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          month: format(dateObj, "MMM yy", { locale: es }),
          peso: Math.round(val.sum / val.count)
        }
      }).slice(-6) // Últimos 6 meses

    // Chart data 2: Promedio de GDP por Categorías de animales
    const categoryGdp: Record<string, { sum: number, count: number }> = {}
    ledgerRows.forEach((r) => {
      if (!categoryGdp[r.categoria]) {
        categoryGdp[r.categoria] = { sum: 0, count: 0 }
      }
      categoryGdp[r.categoria].sum += r.gdp
      categoryGdp[r.categoria].count++
    })

    const chartCategoryData = Object.entries(categoryGdp).map(([key, val]) => ({
      category: key,
      gdp: parseFloat((val.sum / val.count).toFixed(2))
    }))

    return {
      ledgerRows,
      avgGdp,
      highestGdp,
      weightLossCount,
      chartWeightData,
      chartCategoryData
    }
  })()

  // Filtrar el listado por el buscador
  const filteredRows = calculatedData.ledgerRows.filter(r => 
    r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" /> Ganancia de Peso
          </h1>
          <p className="text-muted-foreground">
            Control de evolución de peso, ganancia diaria promedio (GDP) e indicadores nutricionales.
          </p>
        </div>

        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger 
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Registrar Pesaje
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Registrar Control de Peso</DialogTitle>
                <DialogDescription>
                  Ingresa el peso actual del animal para calcular su ganancia diaria de peso (GDP).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="animalId">Animal (Código RP - Requerido)</Label>
                  <Select value={form.animalId} onValueChange={(val) => setForm({ ...form, animalId: val || "" })}>
                    <SelectTrigger id="animalId">
                      <SelectValue placeholder="Selecciona un animal" />
                    </SelectTrigger>
                    <SelectContent>
                      {animales.map((a: any) => (
                        <SelectItem key={a.uuid} value={a.uuid}>
                          {a.codigo} - {a.nombre || "Sin Nombre"} {a.peso_actual ? `(${a.peso_actual} kg)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="peso">Peso (kg - Requerido)</Label>
                    <Input
                      id="peso"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={form.peso}
                      onChange={(e) => setForm({ ...form, peso: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaPesaje">Fecha de Control</Label>
                    <Input
                      id="fechaPesaje"
                      type="date"
                      value={form.fechaPesaje}
                      onChange={(e) => setForm({ ...form, fechaPesaje: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacion">Observaciones / Condición</Label>
                  <Input
                    id="observacion"
                    placeholder="Ej: Destete, control mensual, pastura nueva"
                    value={form.observacion}
                    onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={addPesoMutation.isPending} className="w-full">
                  {addPesoMutation.isPending ? "Guardando..." : "Guardar Pesaje"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDP Promedio Hato</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {calculatedData.avgGdp > 0 ? `+${calculatedData.avgGdp.toFixed(2)}` : calculatedData.avgGdp.toFixed(2)} kg
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ganancia diaria promedio por cabeza</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Controles</CardTitle>
            <Activity className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pesajes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pesajes registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Máxima Ganancia</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              +{calculatedData.highestGdp.value.toFixed(2)} kg/día
            </div>
            <p className="text-xs text-muted-foreground font-medium truncate">
              RP {calculatedData.highestGdp.rp} ({calculatedData.highestGdp.animal})
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Alertas de Pérdida</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {calculatedData.weightLossCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cabezas con pérdida en su último control</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Curva de Peso Promedio (Últimos Meses)</CardTitle>
            <CardDescription>Progreso medio del peso total del hato en kg.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {calculatedData.chartWeightData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                Registra pesajes para visualizar la curva de crecimiento.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculatedData.chartWeightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: any) => [`${value} kg`, 'Peso Promedio']}
                  />
                  <Area type="monotone" dataKey="peso" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPeso)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>GDP Promedio por Categoría (kg/día)</CardTitle>
            <CardDescription>Eficiencia de ganancia diaria agrupada por clasificación.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {calculatedData.chartCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                Datos insuficientes para segmentar por categoría ganadera.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculatedData.chartCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis dataKey="category" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: any) => [`${value} kg/día`, 'GDP Medio']}
                  />
                  <Bar dataKey="gdp" radius={[4, 4, 0, 0]} name="GDP Medio">
                    {calculatedData.chartCategoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.gdp >= 0.7 ? "hsl(var(--primary))" : entry.gdp > 0 ? "#f59e0b" : "#ef4444"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Pesajes */}
      <Card className="premium-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Historial de Ganancia de Peso</CardTitle>
            <CardDescription>Métricas de variación y tasa diaria de peso (GDP) por animal.</CardDescription>
          </div>

          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por RP, nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Control</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Peso Previo</TableHead>
                  <TableHead className="text-right">Peso Registrado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="text-center">Intervalo (Días)</TableHead>
                  <TableHead className="text-right">GDP Tasa</TableHead>
                  <TableHead>Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">Cargando datos de pesajes...</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                      {searchTerm ? "No se encontraron coincidencias para la búsqueda." : "Aún no hay controles de peso registrados con variación."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isGain = row.diferencia > 0
                    const isLoss = row.diferencia < 0

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {(() => {
                            const d = parseDateSafely(row.fecha);
                            return d ? format(d, "dd MMM, yyyy", { locale: es }) : "-";
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{row.codigo}</span>
                            <span className="text-xs text-muted-foreground">{row.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-background">{row.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {row.pesoPrev} kg
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {row.peso} kg
                        </TableCell>
                        <TableCell className={`text-right font-bold whitespace-nowrap ${isGain ? 'text-green-600 dark:text-green-400' : isLoss ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                          {isGain ? `+${row.diferencia.toFixed(1)}` : row.diferencia.toFixed(1)} kg
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {row.dias} días
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={`font-bold ${
                              row.gdp >= 0.7 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : row.gdp > 0 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {row.gdp > 0 ? `+${row.gdp.toFixed(2)}` : row.gdp.toFixed(2)} kg/día
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={row.observacion}>
                          {row.observacion || "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
