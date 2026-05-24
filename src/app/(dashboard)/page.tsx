"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts"
import {
  Beef, Milk, Tractor, Wallet, Activity, Syringe, Clock,
  Settings2, TrendingUp, Baby, Skull, ShoppingCart, Droplets, Eye, EyeOff, X
} from "lucide-react"
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

// ─── Tipos ──────────────────────────────────────────────────────────────────

type KpiId =
  | "animales"
  | "gdp"
  | "lecheHoy"
  | "promPorVaca"
  | "nacimientos"
  | "muertes"
  | "ventas"

interface KpiConfig {
  id: KpiId
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string
}

const ALL_KPIS: KpiConfig[] = [
  {
    id: "animales",
    label: "ANIMALES TOTALES",
    sublabel: "Total en finca",
    icon: <Beef className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "gdp",
    label: "GANANCIA PROM. (30D)",
    sublabel: "Promedio últimos 30 días",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "lecheHoy",
    label: "LECHE HOY (TOTAL)",
    sublabel: "0 vacas ordeñadas",
    icon: <Droplets className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "promPorVaca",
    label: "PROMEDIO POR VACA",
    sublabel: "Por animal productor hoy",
    icon: <Milk className="h-4 w-4" />,
    color: "text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "nacimientos",
    label: "NACIMIENTOS (12M)",
    sublabel: "Crías nacidas últimos 12 meses",
    icon: <Baby className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
  },
  {
    id: "muertes",
    label: "MUERTES (12M)",
    sublabel: "Animales fallecidos últimos 12 meses",
    icon: <Skull className="h-4 w-4" />,
    color: "text-red-600 dark:text-red-400",
  },
  {
    id: "ventas",
    label: "VENTAS (12M)",
    sublabel: "Animales vendidos últimos 12 meses",
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
  },
]

const STORAGE_KEY = "dashboard_kpis_visible"

const DEFAULT_VISIBLE: Record<KpiId, boolean> = {
  animales: true,
  gdp: true,
  lecheHoy: true,
  promPorVaca: true,
  nacimientos: true,
  muertes: true,
  ventas: true,
}

// ─── AnimatedNumber ──────────────────────────────────────────────────────────

const AnimatedNumber = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, type: "spring" }}
  >
    {prefix}
    {value.toLocaleString("es-BO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}
    {suffix}
  </motion.span>
)

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  config,
  value,
  sublabel,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  config: KpiConfig
  value: number
  sublabel?: string
  suffix?: string
  prefix?: string
  decimals?: number
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 pt-3 px-4">
          <p className={`text-[10px] font-bold tracking-wider uppercase ${config.color} opacity-80`}>
            {config.label}
          </p>
          <span className={`${config.color} opacity-70`}>{config.icon}</span>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className={`text-2xl font-extrabold tracking-tight ${config.color}`}>
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {sublabel ?? config.sublabel}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Panel de Personalización ────────────────────────────────────────────────

function PersonalizarPanel({
  visible,
  onChange,
  onClose,
}: {
  visible: Record<KpiId, boolean>
  onChange: (id: KpiId, val: boolean) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 top-10 z-50 w-72 rounded-xl border bg-card shadow-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Personalizar KPIs</p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Activa o desactiva las métricas que quieres ver en el panel.
      </p>
      <div className="space-y-1.5">
        {ALL_KPIS.map((kpi) => (
          <button
            key={kpi.id}
            onClick={() => onChange(kpi.id, !visible[kpi.id])}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left
              ${visible[kpi.id]
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted/30 opacity-60"
              }`}
          >
            <span className={`${kpi.color} shrink-0`}>{kpi.icon}</span>
            <span className="flex-1 text-[11px] font-semibold text-foreground leading-tight">
              {kpi.label}
            </span>
            {visible[kpi.id] ? (
              <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          ALL_KPIS.forEach((k) => onChange(k.id, true))
        }}
        className="mt-3 w-full text-[10px] font-semibold text-primary hover:underline"
      >
        Mostrar todas
      </button>
    </motion.div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { fincaId } = useGlobalStore()
  const [openAllActivities, setOpenAllActivities] = useState(false)
  const [filterType, setFilterType] = useState("todos")
  const [showPersonalizar, setShowPersonalizar] = useState(false)

  // Persistencia de KPIs visibles en localStorage
  const [kpisVisible, setKpisVisible] = useState<Record<KpiId, boolean>>(DEFAULT_VISIBLE)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<KpiId, boolean>
        setKpisVisible((prev) => ({ ...prev, ...parsed }))
      }
    } catch (_) { /* noop */ }
  }, [])

  const toggleKpi = (id: KpiId, val: boolean) => {
    setKpisVisible((prev) => {
      const next = { ...prev, [id]: val }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch (_) { /* noop */ }
      return next
    })
  }

  // 1. DATOS REALES DESDE SUPABASE
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard_overview", fincaId],
    queryFn: async () => {
      const supabase = createClient()

      const { data: animales } = await (supabase.from("animales") as any)
        .select("uuid, codigo, sexo, categoria, estado, fecha_nacimiento, created_at")
        .eq("deleted", false) as { data: any[] | null }

      const { data: potreros } = await (supabase.from("potreros") as any)
        .select("estado")
        .eq("deleted", false) as { data: any[] | null }

      const { data: leche } = await (supabase.from("registros_leche") as any)
        .select("litros, fecha, vaca_id")
        .eq("deleted", false) as { data: any[] | null }

      const { data: transacciones } = await (supabase.from("transacciones") as any)
        .select("tipo, monto, fecha, categoria")
        .eq("deleted", false) as { data: any[] | null }

      const { data: actividades } = await (supabase.from("actividades_log") as any)
        .select("uuid, descripcion, fecha")
        .eq("deleted", false)
        .order("fecha", { ascending: false })
        .limit(5) as { data: any[] | null }

      const { data: alertas } = await (supabase.from("alertas") as any)
        .select("uuid, titulo, estado, prioridad")
        .eq("deleted", false)
        .eq("estado", "Pendiente")
        .limit(3) as { data: any[] | null }

      // Actividades recientes agregadas
      const animalMap: Record<string, string> = {}
      ;(animales || []).forEach((a: any) => {
        if (a.uuid) animalMap[a.uuid] = a.codigo || ""
      })

      const { data: recentAnimals } = await (supabase.from("animales") as any)
        .select("uuid, codigo, nombre, updated_at")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentHealth } = await (supabase.from("eventos_salud") as any)
        .select("uuid, animal_id, tipo_evento, medicamento, updated_at")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentLeche } = await (supabase.from("registros_leche") as any)
        .select("uuid, vaca_id, litros, fecha, updated_at")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(20) as { data: any[] | null }

      const { data: recentTrans } = await (supabase.from("transacciones") as any)
        .select("uuid, tipo, categoria, monto, updated_at")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(20) as { data: any[] | null }

      // ── KPIs ────────────────────────────────────────────────────────────

      const totalAnimales = animales?.length || 0

      const machos = animales?.filter((a) => a.sexo === "Macho").length || 0
      const porcentajeMachos = totalAnimales > 0 ? Math.round((machos / totalAnimales) * 100) : 0

      // Composición del hato
      const vacasProd = animales?.filter((a) => a.categoria === "Vaca productora" || a.categoria === "Vaca").length || 0
      const novillas = animales?.filter((a) => a.categoria === "Novilla").length || 0
      const toretes = animales?.filter((a) => a.categoria === "Torete").length || 0
      const terneros = animales?.filter((a) => a.categoria === "Ternero").length || 0
      const terneras = animales?.filter((a) => a.categoria === "Ternera").length || 0
      const toros = animales?.filter((a) => a.categoria === "Toro").length || 0

      // Producción de leche
      const hoy = new Date().toISOString().split("T")[0]
      const ayerDate = new Date()
      ayerDate.setDate(ayerDate.getDate() - 1)
      const ayer = ayerDate.toISOString().split("T")[0]

      const registrosHoy = leche?.filter((l) => l.fecha?.startsWith(hoy)) || []
      const produccionHoy = registrosHoy.reduce((sum, l) => sum + (l.litros || 0), 0)
      const produccionAyer = leche?.filter((l) => l.fecha?.startsWith(ayer)).reduce((sum, l) => sum + (l.litros || 0), 0) || 0

      // Vacas ordeñadas hoy (únicas)
      const vacasOrdenadas = new Set(registrosHoy.map((l) => l.vaca_id).filter(Boolean)).size
      const promPorVaca = vacasOrdenadas > 0 ? produccionHoy / vacasOrdenadas : 0

      // KPI: Potreros
      const potrerosCriticos = potreros?.filter((p) => p.estado === "Crítico" || p.estado === "Malo").length || 0

      // KPI: Balance Mensual
      const mesActual = new Date().toISOString().substring(0, 7)
      const transaccionesMes = transacciones?.filter((t) => t.fecha?.startsWith(mesActual)) || []
      const ingresos = transaccionesMes.filter((t) => t.tipo === "Ingreso").reduce((sum, t) => sum + (t.monto || 0), 0)
      const egresos = transaccionesMes.filter((t) => t.tipo === "Egreso").reduce((sum, t) => sum + (t.monto || 0), 0)
      const balanceMensual = ingresos - egresos

      // KPI: Nacimientos últimos 12 meses (por created_at de animales jóvenes o fecha_nacimiento)
      const hace12m = new Date()
      hace12m.setFullYear(hace12m.getFullYear() - 1)
      const hace12mStr = hace12m.toISOString().split("T")[0]

      const nacimientos12m = animales?.filter((a) => {
        const fn = a.fecha_nacimiento || a.created_at
        return fn && fn >= hace12mStr
      }).length || 0

      // KPI: Muertes últimos 12 meses (animales con estado 'Muerto' creados/actualizados en rango)
      // Aproximación con estado 'Muerto' (no hay fecha_muerte en modelo visible)
      const muertos12m = animales?.filter((a) => {
        return a.estado === "Muerto"
      }).length || 0

      // KPI: Ventas últimos 12 meses
      const ventas12m = transacciones?.filter((t) => {
        return (
          (t.tipo === "Ingreso" && (t.categoria === "Venta animal" || t.categoria === "Venta" || t.categoria === "Venta de animal")) &&
          t.fecha >= hace12mStr
        )
      }).length || 0

      // También contamos animales marcados como Vendido en últimos 12 meses
      const animalesVendidos12m = animales?.filter((a) => a.estado === "Vendido").length || 0
      const totalVentas12m = Math.max(ventas12m, animalesVendidos12m)

      // GDP (Ganancia Diaria de Peso) - aproximación 30 días
      // No tenemos tabla de pesos en la query actual; placeholder 0
      const gdp30d = 0

      // Leche semanal (últimos 7 días)
      const lecheSemanalMap: Record<string, number> = {}
      const dias7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split("T")[0]
      })
      dias7.forEach((d) => { lecheSemanalMap[d] = 0 })
      leche?.forEach((l) => {
        const d = l.fecha?.split("T")[0]
        if (d && d in lecheSemanalMap) lecheSemanalMap[d] += l.litros || 0
      })
      const lecheSemanal = dias7.map((d) => ({
        date: new Date(d + "T12:00:00").toLocaleDateString("es-BO", { weekday: "short", day: "numeric" }),
        litros: Math.round(lecheSemanalMap[d] * 10) / 10,
      }))

      // Actividades agregadas
      const aggregatedActivities: any[] = []

      actividades?.forEach((act) => {
        const timestamp = new Date(act.fecha).getTime()
        if (!isNaN(timestamp)) {
          aggregatedActivities.push({ id: act.uuid, texto: act.descripcion || "Actividad registrada", timestamp, hora: new Date(act.fecha).toLocaleDateString(), tipo: "log" })
        }
      })
      recentAnimals?.forEach((a) => {
        const dateVal = a.updated_at
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now()
        aggregatedActivities.push({ id: `animal-${a.uuid}`, texto: `Animal registrado: RP ${a.codigo}${a.nombre ? ` (${a.nombre})` : ""}`, timestamp, hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(), tipo: "animal" })
      })
      recentHealth?.forEach((h) => {
        const aId = h.animal_id || ""
        const animCode = aId ? (animalMap[aId] || "") : ""
        const dateVal = h.updated_at
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now()
        aggregatedActivities.push({ id: `health-${h.uuid}`, texto: `${h.tipo_evento || "Tratamiento"}${animCode ? ` a RP ${animCode}` : ""}${h.medicamento ? ` con ${h.medicamento}` : ""}`, timestamp, hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(), tipo: "salud" })
      })
      recentLeche?.forEach((l) => {
        const vId = l.vaca_id || ""
        const animCode = vId ? (animalMap[vId] || "") : ""
        const dateVal = l.updated_at
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now()
        aggregatedActivities.push({ id: `leche-${l.uuid}`, texto: `Ordeño de ${l.litros} L${animCode ? ` (Vaca RP ${animCode})` : ""}`, timestamp, hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(), tipo: "leche" })
      })
      recentTrans?.forEach((t) => {
        const dateVal = t.updated_at
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now()
        aggregatedActivities.push({ id: `trans-${t.uuid}`, texto: `${t.tipo === "Ingreso" ? "Ingreso" : "Egreso"} de Bs. ${t.monto} (${t.categoria})`, timestamp, hora: dateVal ? new Date(dateVal).toLocaleDateString() : new Date().toLocaleDateString(), tipo: "transaccion" })
      })

      const allSortedActivities = [...aggregatedActivities].sort((a, b) => b.timestamp - a.timestamp)
      const sortedActivities = allSortedActivities.slice(0, 5)

      return {
        kpis: {
          totalAnimales,
          porcentajeMachos,
          produccionAyer,
          produccionHoy,
          vacasOrdenadas,
          promPorVaca,
          potrerosCriticos,
          balanceMensual,
          ingresos,
          egresos,
          nacimientos12m,
          muertos12m,
          totalVentas12m,
          gdp30d,
          vacasProd,
          novillas,
          toretes,
          terneros,
          terneras,
          toros,
        },
        lecheSemanal,
        composicionHato: [
          { name: "Vaca Prod.", value: vacasProd, color: "#16a34a" },
          { name: "Novilla", value: novillas, color: "#ca8a04" },
          { name: "Torete", value: toretes, color: "#ea580c" },
          { name: "Ternero", value: terneros, color: "#2563eb" },
          { name: "Ternera", value: terneras, color: "#7c3aed" },
          { name: "Toro", value: toros, color: "#dc2626" },
        ],
        flujoCaja: [{ name: "Mes Actual", ingresos, egresos }],
        actividadReciente: sortedActivities.map((act) => ({ id: act.id, texto: act.texto, hora: act.hora, tipo: act.tipo })),
        todasLasActividades: allSortedActivities.map((act) => ({ id: act.id, texto: act.texto, hora: act.hora, tipo: act.tipo })),
        alertasSalud: alertas?.map((alerta) => ({ id: alerta.uuid, texto: alerta.titulo, prioridad: (alerta.prioridad as string)?.toLowerCase() || "media" })) || [],
      }
    },
  })

  if (!dashboardData) return null

  const { kpis, lecheSemanal, composicionHato, flujoCaja, actividadReciente, alertasSalud } = dashboardData

  const porcentajeSubidaLeche =
    kpis.produccionAyer > 0
      ? ((kpis.produccionHoy - kpis.produccionAyer) / kpis.produccionAyer) * 100
      : 0

  // Mapa id → valor renderizado
  const kpiValues: Record<KpiId, { value: number; suffix?: string; prefix?: string; decimals?: number; sublabel?: string }> = {
    animales: {
      value: kpis.totalAnimales,
      sublabel: `${kpis.porcentajeMachos}% machos · ${100 - kpis.porcentajeMachos}% hembras`,
    },
    gdp: {
      value: kpis.gdp30d,
      suffix: " kg/día",
      decimals: 2,
      sublabel: "Promedio últimos 30 días",
    },
    lecheHoy: {
      value: kpis.produccionHoy,
      suffix: " L",
      decimals: 1,
      sublabel: `${kpis.vacasOrdenadas} vacas ordeñadas`,
    },
    promPorVaca: {
      value: kpis.promPorVaca,
      suffix: " L",
      decimals: 1,
      sublabel: "Por animal productor hoy",
    },
    nacimientos: {
      value: kpis.nacimientos12m,
      sublabel: "Crías nacidas últimos 12 meses",
    },
    muertes: {
      value: kpis.muertos12m,
      sublabel: "Animales fallecidos últimos 12 meses",
    },
    ventas: {
      value: kpis.totalVentas12m,
      sublabel: "Animales vendidos últimos 12 meses",
    },
  }

  const visibleKpis = ALL_KPIS.filter((k) => kpisVisible[k.id])

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de la finca</p>
      </div>

      {/* KPI Row + Personalizar */}
      <div>
        <div className="flex items-center justify-end mb-3 relative">
          <div className="relative">
            <button
              id="btn-personalizar"
              onClick={() => setShowPersonalizar((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              <Settings2 className="w-4 h-4" />
              Personalizar
            </button>
            <AnimatePresence>
              {showPersonalizar && (
                <PersonalizarPanel
                  visible={kpisVisible}
                  onChange={toggleKpi}
                  onClose={() => setShowPersonalizar(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div
          layout
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {visibleKpis.map((kpi) => {
              const v = kpiValues[kpi.id]
              return (
                <KpiCard
                  key={kpi.id}
                  config={kpi}
                  value={v.value}
                  suffix={v.suffix}
                  prefix={v.prefix}
                  decimals={v.decimals}
                  sublabel={v.sublabel}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>

        {visibleKpis.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-xl">
            No hay KPIs visibles.{" "}
            <button
              onClick={() => setShowPersonalizar(true)}
              className="text-primary underline"
            >
              Personalizar
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Gráficos Principales */}
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
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="litros" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeche)" name="Litros" />
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
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {composicionHato.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flujo de Caja (Mensual)</CardTitle>
                <CardDescription>Ingresos vs Egresos del mes actual</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flujoCaja} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos (Bs)" />
                    <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos (Bs)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-6">
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            tabIndex={0}
            onClick={() => { setFilterType("todos"); setOpenAllActivities(true) }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilterType("todos"); setOpenAllActivities(true) }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Actividad Reciente
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-primary hover:text-primary/80 h-7 px-2 font-bold select-none"
                onClick={(e) => { e.stopPropagation(); setFilterType("todos"); setOpenAllActivities(true) }}
              >
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
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

          <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Syringe className="w-5 h-5" /> Alertas de Salud
              </CardTitle>
              <CardDescription className="text-red-600/80 dark:text-red-400/80">
                Controles y tratamientos críticos pendientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertasSalud.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin alertas activas.</p>
                )}
                {alertasSalud.map((alerta) => (
                  <div key={alerta.id} className="flex justify-between items-start border-b border-red-500/20 pb-3 last:border-0">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">{alerta.texto}</span>
                    <Badge variant={alerta.prioridad === "alta" ? "destructive" : "secondary"} className="text-[10px]">
                      {alerta.prioridad}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial Dialog */}
      <Dialog open={openAllActivities} onOpenChange={setOpenAllActivities}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              <DialogTitle className="text-xl font-bold">Historial Completo de Actividades</DialogTitle>
            </div>
            <DialogDescription className="mt-1">
              Registro agregado de todo lo subido y modificado en el hato en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1.5 flex-wrap py-3 border-b">
            {[
              { id: "todos", label: "Todos" },
              { id: "animal", label: "🐂 Animales" },
              { id: "salud", label: "💉 Salud" },
              { id: "leche", label: "🥛 Leche" },
              { id: "transaccion", label: "💰 Finanzas" },
              { id: "log", label: "📝 Logs" },
            ].map((f) => (
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

          <div className="space-y-4 py-4">
            {(() => {
              const list = (dashboardData as any).todasLasActividades || []
              const filtered = list.filter((act: any) => filterType === "todos" || act.tipo === filterType)

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
                    let badgeColor = ""
                    let badgeLabel = ""
                    if (act.tipo === "animal") { badgeColor = "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/10"; badgeLabel = "Animal" }
                    else if (act.tipo === "salud") { badgeColor = "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/10"; badgeLabel = "Salud" }
                    else if (act.tipo === "leche") { badgeColor = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/10"; badgeLabel = "Leche" }
                    else if (act.tipo === "transaccion") { badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/10"; badgeLabel = "Finanzas" }
                    else { badgeColor = "bg-muted text-muted-foreground border-border"; badgeLabel = "Log" }

                    return (
                      <div key={act.id} className="flex gap-4 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-all">
                        <div className="relative mt-1 shrink-0">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold leading-tight text-foreground truncate flex-1">{act.texto}</p>
                            <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${badgeColor}`}>{badgeLabel}</Badge>
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
