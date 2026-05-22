"use client"

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

  // 1. DATOS REALES DESDE SUPABASE
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard_overview', fincaId],
    queryFn: async () => {
      const supabase = createClient()

      // Fetch de las principales tablas
      const { data: animales } = await (supabase.from('animales') as any).select('sexo, categoria, estado').eq('deleted', false) as { data: any[] | null }
      const { data: potreros } = await (supabase.from('potreros') as any).select('estado').eq('deleted', false) as { data: any[] | null }
      const { data: leche } = await (supabase.from('registros_leche') as any).select('litros, fecha').eq('deleted', false) as { data: any[] | null }
      const { data: transacciones } = await (supabase.from('transacciones') as any).select('tipo, monto, fecha').eq('deleted', false) as { data: any[] | null }
      const { data: actividades } = await (supabase.from('actividades_log') as any).select('uuid, descripcion, fecha').eq('deleted', false).order('fecha', { ascending: false }).limit(5) as { data: any[] | null }
      const { data: alertas } = await (supabase.from('alertas') as any).select('uuid, titulo, estado, prioridad').eq('deleted', false).eq('estado', 'Pendiente').limit(3) as { data: any[] | null }

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
        actividadReciente: actividades?.map((act) => ({
          id: act.uuid,
          texto: act.descripcion || "Actividad registrada",
          hora: new Date(act.fecha).toLocaleDateString(),
          tipo: "general"
        })) || [],
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
          <Card className="h-[calc(50%-12px)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Actividad Reciente
              </CardTitle>
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
    </div>
  )
}
