"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts"
import { Beef, Milk, Tractor, Wallet, Activity, Syringe, Clock } from "lucide-react"
import { useGlobalStore } from "@/store/global-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Animación simple para los números
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {prefix}{value.toLocaleString('es-BO')}{suffix}
    </motion.span>
  )
}

export default function DashboardPage() {
  const { fincaId } = useGlobalStore()
  const [openAllActivities, setOpenAllActivities] = useState(false)
  const [filterType, setFilterType] = useState("todos")

  // 1. DATOS REALES DESDE SUPABASE
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard_overview', fincaId],
    queryFn: async () => {
      const supabase = createClient()

      // Fetch de las principales tablas (obtenemos uuid y codigo para el mapa de relaciones)
      const { data: animales } = await (supabase.from('animales') as any).select('uuid, codigo, sexo, categoria, estado').eq('deleted', false) as { data: any[] | null }
      const { data: potreros } = await (supabase.from('potreros') as any).select('estado').eq('deleted', false) as { data: any[] | null }
      const { data: leche } = await (supabase.from('registros_leche') as any).select('litros, fecha').eq('deleted', false) as { data: any[] | null }
      const { data: transacciones } = await (supabase.from('transacciones') as any).select('tipo, monto, fecha').eq('deleted', false) as { data: any[] | null }
      const { data: actividades } = await (supabase.from('actividades_log') as any).select('uuid, descripcion, fecha').eq('deleted', false).order('fecha', { ascending: false }).limit(5) as { data: any[] | null }
      const { data: alertas } = await (supabase.from('alertas') as any).select('uuid, titulo, estado, prioridad').eq('deleted', false).eq('estado', 'Pendiente').limit(3) as { data: any[] | null }

      // Mapa de animal uuid a codigo
      const animalMap: Record<string, string> = {}
      ;(animales || []).forEach((a: any) => {
        if (a.uuid) {
          animalMap[a.uuid] = a.codigo || ''
        }
      })

      // Carga adicional de actualizaciones en tiempo real para el agregador de actividad reciente (límites aumentados a 20 para el Ver Todo)
      const { data: recentAnimals } = await (supabase.from('animales') as any)
        .select('uuid, codigo, nombre, updated_at')
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentHealth } = await (supabase.from('eventos_salud') as any)
        .select('uuid, animal_id, tipo_evento, medicamento, updated_at')
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentLeche } = await (supabase.from('registros_leche') as any)
        .select('uuid, vaca_id, litros, fecha, updated_at')
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentTrans } = await (supabase.from('transacciones') as any)
        .select('uuid, tipo, categoria, monto, updated_at')
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(20) as { data: any[] | null }

      // KPI: Total Hato
      const totalAnimales = animales?.length || 0
      const machos = animales?.filter(a => a.sexo === 'Macho').length || 0
      const porcentajeMachos = totalAnimales > 0 ? Math.round((machos / totalAnimales) * 100) : 0

      // Composición Hato
      const vacas = animales?.filter(a => a.categoria === 'Vaca' || (a.sexo === 'Hembra' && a.estado !== 'Vendido' && a.categoria !== 'Ternera')).length || 0
      const toros = animales?.filter(a => a.categoria === 'Toro' || (a.sexo === 'Macho' && a.estado !== 'Vendido' && a.categoria !== 'Ternero')).length || 0
      const terneros = animales?.filter(a => a.categoria === 'Ternero' || a.categoria === 'Ternera').length || 0
      const novillas = animales?.filter(a => a.categoria === 'Novilla').length || 0

      // Producción Lechera Diaria
      const hoy = new Date().toISOString().split('T')[0]
      const ayerDate = new Date()
      ayerDate.setDate(ayerDate.getDate() - 1)
      const ayer = ayerDate.toISOString().split('T')[0]

      const produccionHoy = leche?.filter(l => l.fecha.startsWith(hoy)).reduce((sum, l) => sum + (l.litros || 0), 0) || 0
      const produccionAyer = leche?.filter(l => l.fecha.startsWith(ayer)).reduce((sum, l) => sum + (l.litros || 0), 0) || 0

      // KPI: Potreros
      const potrerosCriticos = potreros?.filter(p => p.estado === 'Crítico' || p.estado === 'Malo').length || 0

      // KPI: Balance Mensual
      const mesActual = new Date().toISOString().substring(0, 7) // "YYYY-MM"
      const transaccionesMes = transacciones?.filter(t => t.fecha?.startsWith(mesActual)) || []
      const ingresos = transaccionesMes.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + (t.monto || 0), 0)
      const egresos = transaccionesMes.filter(t => t.tipo === 'Egreso').reduce((sum, t) => sum + (t.monto || 0), 0)
      const balanceMensual = ingresos - egresos

      // Agregador inteligente de actividades
      const aggregatedActivities: any[] = [];

      // 1. Actividades del log manual (si existen)
      actividades?.forEach((act) => {
        const timestamp = new Date(act.fecha).getTime();
        if (!isNaN(timestamp)) {
          aggregatedActivities.push({
            id: act.uuid,
            texto: act.descripcion || "Actividad registrada",
            timestamp,
            hora: new Date(act.fecha).toLocaleDateString(),
            tipo: "log"
          });
        }
      });

      // 2. Registro de animales recientes
      recentAnimals?.forEach((a) => {
        const dateVal = a.updated_at || a.updatedAt;
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();
        aggregatedActivities.push({
          id: `animal-${a.uuid}`,
          texto: `Animal registrado: RP ${a.codigo}${a.nombre ? ` (${a.nombre})` : ''}`,
          timestamp,
          hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(),
          tipo: "animal"
        });
      });

      // 3. Tratamientos o eventos de salud recientes
      recentHealth?.forEach((h) => {
        const aId = h.animal_id || h.animalId || '';
        const animCode = aId ? (animalMap[aId] || '') : '';
        const dateVal = h.updated_at || h.updatedAt;
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();
        aggregatedActivities.push({
          id: `health-${h.uuid}`,
          texto: `${h.tipo_evento || h.tipoEvento || 'Tratamiento'}${animCode ? ` a RP ${animCode}` : ''}${h.medicamento ? ` con ${h.medicamento}` : ''}`,
          timestamp,
          hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(),
          tipo: "salud"
        });
      });

      // 4. Producción de leche reciente
      recentLeche?.forEach((l) => {
        const vId = l.vaca_id || l.vacaId || '';
        const animCode = vId ? (animalMap[vId] || '') : '';
        const dateVal = l.updated_at || l.updatedAt;
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();
        aggregatedActivities.push({
          id: `leche-${l.uuid}`,
          texto: `Ordeño de ${l.litros} L${animCode ? ` (Vaca RP ${animCode})` : ''}`,
          timestamp,
          hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(),
          tipo: "leche"
        });
      });

      // 5. Transacciones financieras recientes
      recentTrans?.forEach((t) => {
        const dateVal = t.updated_at || t.updatedAt;
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();
        aggregatedActivities.push({
          id: `trans-${t.uuid}`,
          texto: `${t.tipo === 'Ingreso' ? 'Ingreso' : 'Egreso'} de Bs. ${t.monto} (${t.categoria})`,
          timestamp,
          hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(),
          tipo: "transaccion"
        });
      });

      // Ordenar actividades de forma cronológica descendente
      const allSortedActivities = [...aggregatedActivities].sort((a, b) => b.timestamp - a.timestamp);
      const sortedActivities = allSortedActivities.slice(0, 5);

      return {
        kpis: {
          totalAnimales,
          porcentajeMachos,
          produccionAyer,
          produccionHoy,
          potrerosCriticos,
          balanceMensual
        },
        lecheSemanal: [
          { date: 'Ayer', litros: produccionAyer },
          { date: 'Hoy', litros: produccionHoy }
        ],
        composicionHato: [
          { name: 'Vacas', value: vacas, color: 'hsl(var(--primary))' },
          { name: 'Toros', value: toros, color: '#8b5a2b' },
          { name: 'Terneros', value: terneros, color: '#f59e0b' },
          { name: 'Novillas', value: novillas, color: '#10b981' }
        ],
        flujoCaja: [
          { name: 'Mes Actual', ingresos, egresos }
        ],
        actividadReciente: sortedActivities.map((act) => ({
          id: act.id,
          texto: act.texto,
          hora: act.hora,
          tipo: act.tipo
        })),
        todasLasActividades: allSortedActivities.map((act) => ({
          id: act.id,
          texto: act.texto,
          hora: act.hora,
          tipo: act.tipo
        })),
        alertasSalud: alertas?.map((alerta) => ({
          id: alerta.uuid,
          texto: alerta.titulo,
          prioridad: (alerta.prioridad as string)?.toLowerCase() || 'media'
        })) || []
      }
    }
  })

  if (!dashboardData) return null

  const { kpis, lecheSemanal, composicionHato, flujoCaja, actividadReciente, alertasSalud } = dashboardData

  const porcentajeSubidaLeche = ((kpis.produccionHoy - kpis.produccionAyer) / kpis.produccionAyer) * 100

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Mando</h1>
        <p className="text-muted-foreground">
          Visión global reactiva. Los datos se actualizan en tiempo real desde la aplicación móvil.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hato</CardTitle>
            <Beef className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold"><AnimatedNumber value={kpis.totalAnimales} /></div>
            <p className="text-xs text-muted-foreground">
              {kpis.porcentajeMachos}% Machos / {100 - kpis.porcentajeMachos}% Hembras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producción Diaria</CardTitle>
            <Milk className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold"><AnimatedNumber value={kpis.produccionHoy} suffix=" L" /></div>
            <p className={`text-xs ${porcentajeSubidaLeche >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {porcentajeSubidaLeche >= 0 ? '+' : ''}{porcentajeSubidaLeche.toFixed(1)}% respecto a ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carga Pastoreo</CardTitle>
            <Tractor className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold"><AnimatedNumber value={Math.round((kpis.potrerosCriticos / 12) * 100)} suffix="%" /></div>
            <p className="text-xs text-muted-foreground">
              {kpis.potrerosCriticos} potreros en estado crítico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Mensual</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              <AnimatedNumber value={kpis.balanceMensual} prefix="+" suffix=" Bs" />
            </div>
            <p className="text-xs text-muted-foreground">Flujo neto de caja</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">

        {/* Gráficos Principales (Ocupan 2 columnas) */}
        <div className="col-span-1 md:col-span-5 lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Producción Lechera Semanal</CardTitle>
              <CardDescription>Curva de rendimiento de los últimos 7 días</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lecheSemanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeche" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="litros" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeche)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Composición del Hato</CardTitle>
                <CardDescription>Distribución de inventario animal</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={composicionHato}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {composicionHato.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flujo de Caja (Mensual)</CardTitle>
                <CardDescription>Ingresos vs Egresos semanales</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flujoCaja} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos (Bs)" />
                    <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos (Bs)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Panel Lateral (Ocupa 1 columna) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-6">
          <Card 
            className="h-[calc(50%-12px)] cursor-pointer hover:shadow-md transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            tabIndex={0}
            onClick={() => {
              setFilterType("todos");
              setOpenAllActivities(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFilterType("todos");
                setOpenAllActivities(true);
              }
            }}
            title="Presiona Enter o haz clic para ver todo el historial de actividades"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Actividad Reciente
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] text-primary hover:text-primary/80 h-7 px-2 font-bold select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterType("todos");
                  setOpenAllActivities(true);
                }}
              >
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {actividadReciente.map((act) => (
                  <div key={act.id} className="flex gap-4">
                    <div className="relative mt-1">
                      <div className="absolute left-1.5 top-1.5 h-full w-0.5 bg-border -z-10" />
                      <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{act.texto}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {act.hora}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="h-[calc(50%-12px)] border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Syringe className="w-5 h-5" /> Alertas de Salud
              </CardTitle>
              <CardDescription className="text-red-600/80 dark:text-red-400/80">
                Controles y tratamientos críticos que vencen hoy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertasSalud.map((alerta) => (
                  <div key={alerta.id} className="flex justify-between items-start border-b border-red-500/20 pb-3 last:border-0">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {alerta.texto}
                    </span>
                    <Badge variant={alerta.prioridad === 'alta' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {alerta.prioridad}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Historial Completo Dialog Pop-up */}
      <Dialog open={openAllActivities} onOpenChange={setOpenAllActivities}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" />
                <DialogTitle className="text-xl font-bold">Historial Completo de Actividades</DialogTitle>
              </div>
            </div>
            <DialogDescription className="mt-1">
              Registro agregado de todo lo subido y modificado en el hato en tiempo real.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros de Tipo */}
          <div className="flex gap-1.5 flex-wrap py-3 border-b">
            {[
              { id: "todos", label: "Todos" },
              { id: "animal", label: "🐂 Animales" },
              { id: "salud", label: "💉 Salud" },
              { id: "leche", label: "🥛 Leche" },
              { id: "transaccion", label: "💰 Finanzas" },
              { id: "log", label: "📝 Logs" }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                  filterType === f.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Listado de Actividades del Historial */}
          <div className="space-y-4 py-4">
            {(() => {
              const list = (dashboardData as any).todasLasActividades || [];
              const filtered = list.filter((act: any) => filterType === "todos" || act.tipo === filterType);
              
              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                    No se encontraron registros para esta categoría.
                  </div>
                )
              }

              return (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filtered.map((act: any) => {
                    let badgeColor = "";
                    let badgeLabel = "";
                    if (act.tipo === 'animal') {
                      badgeColor = "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/10";
                      badgeLabel = "Animal";
                    } else if (act.tipo === 'salud') {
                      badgeColor = "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/10";
                      badgeLabel = "Salud";
                    } else if (act.tipo === 'leche') {
                      badgeColor = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/10";
                      badgeLabel = "Leche";
                    } else if (act.tipo === 'transaccion') {
                      badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/10";
                      badgeLabel = "Finanzas";
                    } else {
                      badgeColor = "bg-muted text-muted-foreground border-border";
                      badgeLabel = "Log";
                    }

                    return (
                      <div key={act.id} className="flex gap-4 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-all">
                        <div className="relative mt-1 shrink-0">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold leading-tight text-foreground truncate break-words flex-1">
                              {act.texto}
                            </p>
                            <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${badgeColor}`}>
                              {badgeLabel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {act.hora}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <DialogFooter className="pt-2 border-t mt-4">
            <Button onClick={() => setOpenAllActivities(false)} variant="secondary" size="sm" className="w-full">
              Cerrar Historial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
