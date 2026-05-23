"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Milk, Droplets, Sun, Moon, Plus } from "lucide-react"
import { useGlobalStore } from "@/store/global-store"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function LecheriaPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ vacaId: "", turno: "Manana", litros: "" })

  // Fetch de vacas (hembras) para el selector
  const { data: vacasHembra = [] } = useQuery({
    queryKey: ['vacas_hembra_select', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('animales')
        .select('uuid, codigo, nombre')
        .eq('deleted', false)
        .eq('sexo', 'Hembra')
        .order('codigo', { ascending: true })
      
      if (error) throw error
      return data || []
    }
  })

  // Fetch de datos reales
  const { data: lecheData, isLoading } = useQuery({
    queryKey: ['produccion_leche_full', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      
      const hoy = new Date().toISOString().split('T')[0]
      const hace30dias = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
      
      // 1. Obtener animales para el mapeo
      const { data: animalRows, error: animalError } = await supabase.from('animales')
        .select('uuid, codigo, nombre')
        .eq('deleted', false)

      if (animalError) throw animalError

      const animalMap: Record<string, { codigo: string; nombre: string }> = {}
      ;(animalRows || []).forEach((a: any) => {
        animalMap[a.uuid] = {
          codigo: a.codigo,
          nombre: a.nombre || ''
        }
      })

      // 2. Obtener registros de leche
      const { data: registros, error: registrosError } = await supabase.from('registros_leche')
        .select('*')
        .eq('deleted', false)
        .gte('fecha', hace30dias)

      if (registrosError) throw registrosError
        
      const regs = (registros || []).map((r: any) => {
        const aId = r.vaca_id || r.vacaId || null
        const aInfo = aId ? animalMap[aId] : null
        return {
          ...r,
          animales: aInfo ? { codigo: aInfo.codigo, nombre: aInfo.nombre } : null
        }
      }) as any[]
      
      // KPIs Día Actual
      const regsHoy = regs.filter(r => r.fecha.startsWith(hoy))
      const mananaRaw = regsHoy.filter(r => r.turno?.toLowerCase() === 'mañana' || r.turno?.toLowerCase() === 'manana').reduce((sum, r) => sum + (r.litros || 0), 0)
      const tardeRaw = regsHoy.filter(r => r.turno?.toLowerCase() === 'tarde').reduce((sum, r) => sum + (r.litros || 0), 0)
      const totalHoyRaw = mananaRaw + tardeRaw
      const manana = Math.round(mananaRaw * 10) / 10
      const tarde = Math.round(tardeRaw * 10) / 10
      const totalHoy = Math.round(totalHoyRaw * 10) / 10
      
      // Chart 30 días
      const diasMap: Record<string, number> = {}
      for(let i=29; i>=0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        diasMap[dateStr] = 0
      }
      
      regs.forEach(r => {
        const fechaStr = r.fecha.split('T')[0]
        if (diasMap[fechaStr] !== undefined) {
          diasMap[fechaStr] += (r.litros || 0)
        }
      })
      
      const chartData = Object.entries(diasMap).map(([dateStr, litros]) => ({
        date: format(new Date(dateStr), "dd MMM", { locale: es }),
        litros: Math.round(litros * 10) / 10
      }))
      
      // Top vacas mes
      const vacasMap: Record<string, { litrosMes: number, nombre: string, rp: string }> = {}
      regs.forEach(r => {
        const a = r.animales as any
        if (!a) return
        if (!vacasMap[a.codigo]) {
          vacasMap[a.codigo] = { litrosMes: 0, nombre: a.nombre || 'Desconocida', rp: a.codigo }
        }
        vacasMap[a.codigo].litrosMes = Math.round((vacasMap[a.codigo].litrosMes + (r.litros || 0)) * 10) / 10
      })
      
      const topVacas = Object.values(vacasMap).sort((a, b) => b.litrosMes - a.litrosMes).slice(0, 10)
      const maximo = topVacas.length > 0 ? topVacas[0].litrosMes : 100
      
      return { kpis: { total: totalHoy, manana, tarde }, chartData, topVacas: topVacas.map(v => ({...v, maximo})) }
    }
  })
  
  const kpis = lecheData?.kpis || { total: 0, manana: 0, tarde: 0 }
  const chartData = lecheData?.chartData || []
  const topVacas = lecheData?.topVacas || []

  const addProduccionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const supabase = createClient()
      const p = {
        uuid: payload.uuid,
        vaca_id: payload.vacaId || null,
        fecha: new Date().toISOString().split('T')[0],
        turno: payload.turno,
        litros: payload.litros,
        synced: true,
        deleted: false,
        updated_at: payload.updatedAt || new Date().toISOString()
      }
      
      const { error } = await (supabase.from('registros_leche') as any).insert([p])
      if (error) throw error
      return p
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produccion_leche_full'] })
      toast.success("Ordeño registrado correctamente")
      setOpen(false)
      setForm({ vacaId: "", turno: "Manana", litros: "" })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vacaId || !form.litros) return
    addProduccionMutation.mutate({
      ...form,
      litros: parseFloat(form.litros),
      uuid: crypto.randomUUID(),
      synced: true,
      updatedAt: new Date().toISOString()
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Milk className="h-8 w-8 text-primary" /> Producción Lechera
          </h1>
          <p className="text-muted-foreground">
            Métricas de ordeño, rendimiento mensual y top productoras.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger 
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Registrar Ordeño
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registro Rápido de Ordeño</DialogTitle>
                <DialogDescription>
                  Ingresa la producción individual de una vaca.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vacaId">Vaca (Código RP - Requerido)</Label>
                  <Select value={form.vacaId} onValueChange={(val) => setForm({ ...form, vacaId: val || "" })}>
                    <SelectTrigger id="vacaId">
                      <SelectValue placeholder="Selecciona una vaca" />
                    </SelectTrigger>
                    <SelectContent>
                      {vacasHembra.map((v: any) => (
                        <SelectItem key={v.uuid} value={v.uuid}>
                          {v.codigo} - {v.nombre || "Sin Nombre"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turno</Label>
                  <Select value={form.turno} onValueChange={(val) => setForm({...form, turno: (val || "Manana") as string})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manana">Mañana</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Litros</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="0.0" 
                    value={form.litros}
                    onChange={(e) => setForm({...form, litros: e.target.value})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addProduccionMutation.isPending}>
                  {addProduccionMutation.isPending ? "Guardando..." : "Guardar Registro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Día</CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number.isInteger(kpis.total) ? kpis.total : kpis.total.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground">+5% vs ayer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordeño Mañana</CardTitle>
            <Sun className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number.isInteger(kpis.manana) ? kpis.manana : kpis.manana.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground">56% de la producción</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordeño Tarde</CardTitle>
            <Moon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number.isInteger(kpis.tarde) ? kpis.tarde : kpis.tarde.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground">44% de la producción</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        <Card className="col-span-1 md:col-span-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>Rendimiento Mensual (Últimos 30 días)</CardTitle>
            <CardDescription>Curva total de litros en la finca seleccionada.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLitros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)} L`, 'Producción']}
                />
                <Area type="monotone" dataKey="litros" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLitros)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3 lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Top 10 Vacas (Mes)</CardTitle>
            <CardDescription>Mejores productoras individuales.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              {topVacas.map((vaca, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border font-bold text-xs text-primary">
                    #{index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {vaca.nombre} <span className="text-muted-foreground">({vaca.rp})</span>
                      </p>
                      <span className="text-sm font-bold text-primary">{Number.isInteger(vaca.litrosMes) ? vaca.litrosMes : vaca.litrosMes.toFixed(1)} L</span>
                    </div>
                    <Progress value={(vaca.litrosMes / vaca.maximo) * 100} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
