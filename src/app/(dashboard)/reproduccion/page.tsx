"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { format, differenceInDays, addDays, isThisMonth } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Baby,
  Heart,
  Plus,
  CalendarDays,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"

// ─── Tipos ────────────────────────────────────────────────────────────────────
//
// Valores confirmados en simulate_data.js (los que realmente están en la BD):
//   tipo_evento: 'Servicio' | 'Parto'
//   diagnostico: 'Preñada' | 'Normal' | null
//   campo fecha: fecha_evento  (NO "fecha")
//   campo notas: observacion   (NO "notas")

type TipoEvento =
  | "Servicio"
  | "Inseminación Artificial"
  | "Parto"
  | "Aborto"
  | "Destete"
  | "Celo"

const TIPOS_EVENTO: TipoEvento[] = [
  "Servicio",
  "Inseminación Artificial",
  "Parto",
  "Aborto",
  "Destete",
  "Celo",
]

type Tab = "gestaciones" | "servicios" | "partos" | "indices"

interface EventoReproductivo {
  uuid: string
  animalId: string
  tipoEvento: string
  fechaEvento: string          // campo real en BD: fecha_evento
  observacion: string | null  // campo real en BD: observacion
  diagnostico: string | null  // 'Preñada' | 'Normal' | null
  animal: { codigo: string; nombre: string; categoria: string } | null
}

// Duración estándar de gestación bovina: ~283 días
const DIAS_GESTACION = 283

function parseFecha(str: string | null): Date | null {
  if (!str) return null
  const s = str.includes("T") ? str.split("T")[0] : str
  const [y, m, d] = s.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt.getTime()) ? null : dt
}

function diasRestantes(fechaServicio: string | null): number | null {
  const d = parseFecha(fechaServicio)
  if (!d) return null
  const parto = addDays(d, DIAS_GESTACION)
  return differenceInDays(parto, new Date())
}

function getBadgeColor(tipo: string) {
  switch (tipo) {
    case "Servicio":
    case "Inseminación Artificial":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
    case "Parto":
      return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
    case "Aborto":
      return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
    case "Destete":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
    case "Celo":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  valueClass = "",
  icon,
}: {
  label: string
  value: string | number
  sublabel?: string
  valueClass?: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-5 flex flex-row items-start justify-between space-y-0">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{label}</p>
        <span className="text-muted-foreground opacity-60">{icon}</span>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className={`text-3xl font-extrabold tracking-tight ${valueClass}`}>{value}</div>
        {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
        <Baby className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <p className="font-semibold text-foreground">{mensaje}</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Usa el botón &quot;+ Registrar Evento&quot; para comenzar a registrar eventos reproductivos.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReproduccionPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>("gestaciones")
  const [openForm, setOpenForm] = useState(false)

  const [form, setForm] = useState({
    animalId: "",
    tipoEvento: "" as TipoEvento | "",
    fecha: new Date().toISOString().split("T")[0],
    notas: "",
  })

  // ── Animales (selector) ────────────────────────────────────────────────────

  const { data: animales = [] } = useQuery({
    queryKey: ["animales_repro_select", fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("animales")
        .select("uuid, codigo, nombre, sexo, categoria")
        .eq("deleted", false)
        .order("codigo", { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // ── Eventos reproductivos ──────────────────────────────────────────────────

  const { data: eventos = [], isLoading } = useQuery<EventoReproductivo[]>({
    queryKey: ["eventos_reproductivos", fincaId],
    queryFn: async () => {
      const supabase = createClient()

      // Mapa de animales para mostrar código/nombre
      const { data: animalRows } = await supabase
        .from("animales")
        .select("uuid, codigo, nombre, categoria")
        .eq("deleted", false)

      const animalMap: Record<string, { codigo: string; nombre: string; categoria: string }> = {}
      ;(animalRows || []).forEach((a: any) => {
        animalMap[a.uuid] = {
          codigo: a.codigo,
          nombre: a.nombre || "",
          categoria: a.categoria || "",
        }
      })

      // Fetch eventos — ordenar por fecha_evento (campo real en BD)
      const { data, error } = await (supabase.from("eventos_reproductivos") as any)
        .select("*")
        .eq("deleted", false)
        .order("fecha_evento", { ascending: false })

      if (error) {
        console.warn("eventos_reproductivos error:", error.message)
        return []
      }

      return (data || []).map((e: any): EventoReproductivo => ({
        uuid: e.uuid,
        animalId: e.animal_id,
        tipoEvento: e.tipo_evento,
        // La BD almacena el campo como fecha_evento
        fechaEvento: e.fecha_evento || "",
        observacion: e.observacion || null,
        diagnostico: e.diagnostico || null,
        animal: animalMap[e.animal_id] || null,
      }))
    },
  })

  // ── Mutación: registrar evento ─────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const supabase = createClient()
      const row = {
        uuid: crypto.randomUUID(),
        animal_id: payload.animalId,
        tipo_evento: payload.tipoEvento,
        // Guardar en el campo correcto de la BD
        fecha_evento: payload.fecha,
        observacion: payload.notas || null,
        diagnostico: null,
        toro_id: null,
        cria_id: null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString(),
      }
      const { error } = await (supabase.from("eventos_reproductivos") as any).insert([row])
      if (error) throw error
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_reproductivos"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard_overview"] })
      toast.success("Evento reproductivo registrado")
      setOpenForm(false)
      setForm({
        animalId: "",
        tipoEvento: "",
        fecha: new Date().toISOString().split("T")[0],
        notas: "",
      })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error("Error al registrar el evento")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.animalId || !form.tipoEvento || !form.fecha) {
      toast.error("Selecciona un animal, tipo de evento y fecha")
      return
    }
    addMutation.mutate(form)
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────

  // Servicios este mes
  const serviciosEsteMes = eventos.filter((e: EventoReproductivo) => {
    const d = parseFecha(e.fechaEvento)
    return (
      d &&
      isThisMonth(d) &&
      (e.tipoEvento === "Servicio" || e.tipoEvento === "Inseminación Artificial")
    )
  })

  // Partos este mes
  const partosEsteMes = eventos.filter((e: EventoReproductivo) => {
    const d = parseFecha(e.fechaEvento)
    return d && isThisMonth(d) && e.tipoEvento === "Parto"
  })

  // Gestaciones activas: Servicios con diagnostico="Preñada" y sin Parto posterior
  const serviciosPreniados = eventos.filter(
    (e: EventoReproductivo) =>
      (e.tipoEvento === "Servicio" || e.tipoEvento === "Inseminación Artificial") &&
      e.diagnostico === "Preñada"
  )

  const gestacionesActivas = serviciosPreniados.filter((serv: EventoReproductivo) => {
    const partosDelAnimal = eventos.filter(
      (e: EventoReproductivo) =>
        e.animalId === serv.animalId && e.tipoEvento === "Parto"
    )
    if (partosDelAnimal.length === 0) return true
    const fechaServ = parseFecha(serv.fechaEvento)
    return partosDelAnimal.every((p: EventoReproductivo) => {
      const fp = parseFecha(p.fechaEvento)
      return fp && fechaServ && fp < fechaServ
    })
  })

  // Tasa de concepción
  const totalServicios = eventos.filter(
    (e: EventoReproductivo) =>
      e.tipoEvento === "Servicio" || e.tipoEvento === "Inseminación Artificial"
  ).length
  const totalPreniadas = serviciosPreniados.length
  const tasaConcepcion =
    totalServicios > 0 ? Math.round((totalPreniadas / totalServicios) * 100) : 0

  // ── Contenido por tab ──────────────────────────────────────────────────────

  const tabContent = () => {
    if (isLoading) {
      return (
        <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
          Cargando datos...
        </div>
      )
    }

    // ── Gestaciones ──────────────────────────────────────────────────────────
    if (tab === "gestaciones") {
      return gestacionesActivas.length === 0 ? (
        <EmptyState mensaje="Sin gestaciones activas" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Fecha Servicio</TableHead>
                <TableHead>Parto Estimado</TableHead>
                <TableHead>Días Restantes</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestacionesActivas.map((g: EventoReproductivo) => {
                const fServ = parseFecha(g.fechaEvento)
                const fParto = fServ ? addDays(fServ, DIAS_GESTACION) : null
                const dias = diasRestantes(g.fechaEvento)
                return (
                  <TableRow key={g.uuid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{g.animal?.codigo || "—"}</span>
                        <span className="text-xs text-muted-foreground">{g.animal?.nombre || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {fServ ? format(fServ, "dd MMM yyyy", { locale: es }) : "—"}
                    </TableCell>
                    <TableCell>
                      {fParto ? (
                        <span className="font-medium text-primary">
                          {format(fParto, "dd MMM yyyy", { locale: es })}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {dias !== null ? (
                        <span
                          className={`font-bold ${
                            dias <= 14
                              ? "text-red-600 dark:text-red-400"
                              : dias <= 30
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                        >
                          {dias > 0 ? `${dias} días` : dias === 0 ? "¡Hoy!" : "Vencido"}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {dias !== null && dias <= 14 ? (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 border text-[10px]">
                          <AlertCircle className="w-3 h-3 mr-1" /> Inminente
                        </Badge>
                      ) : (
                        <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 border text-[10px]">
                          <Heart className="w-3 h-3 mr-1" /> Preñada
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )
    }

    // ── Servicios ────────────────────────────────────────────────────────────
    if (tab === "servicios") {
      const servicios = eventos.filter(
        (e: EventoReproductivo) =>
          e.tipoEvento === "Servicio" ||
          e.tipoEvento === "Inseminación Artificial" ||
          e.tipoEvento === "Celo"
      )
      return servicios.length === 0 ? (
        <EmptyState mensaje="Sin servicios registrados" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicios.map((s: EventoReproductivo) => {
                const fd = parseFecha(s.fechaEvento)
                return (
                  <TableRow key={s.uuid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{s.animal?.codigo || "—"}</span>
                        <span className="text-xs text-muted-foreground">{s.animal?.nombre || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${getBadgeColor(s.tipoEvento)}`}
                      >
                        {s.tipoEvento}
                      </Badge>
                    </TableCell>
                    <TableCell>{fd ? format(fd, "dd MMM yyyy", { locale: es }) : "—"}</TableCell>
                    <TableCell>
                      {s.diagnostico ? (
                        <Badge
                          className={`text-[10px] ${
                            s.diagnostico === "Preñada"
                              ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 border"
                              : "bg-muted text-muted-foreground border"
                          }`}
                        >
                          {s.diagnostico}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {s.observacion || "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )
    }

    // ── Partos ───────────────────────────────────────────────────────────────
    if (tab === "partos") {
      const partos = eventos.filter(
        (e: EventoReproductivo) => e.tipoEvento === "Parto" || e.tipoEvento === "Aborto"
      )
      return partos.length === 0 ? (
        <EmptyState mensaje="Sin partos registrados" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partos.map((p: EventoReproductivo) => {
                const fd = parseFecha(p.fechaEvento)
                const isParto = p.tipoEvento === "Parto"
                return (
                  <TableRow key={p.uuid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{p.animal?.codigo || "—"}</span>
                        <span className="text-xs text-muted-foreground">{p.animal?.nombre || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${getBadgeColor(p.tipoEvento)}`}
                      >
                        {isParto ? (
                          <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
                        )}
                        {p.tipoEvento}
                      </Badge>
                    </TableCell>
                    <TableCell>{fd ? format(fd, "dd MMM yyyy", { locale: es }) : "—"}</TableCell>
                    <TableCell>
                      {p.diagnostico ? (
                        <Badge className="text-[10px] bg-muted text-muted-foreground border">
                          {p.diagnostico}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {p.observacion || "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )
    }

    // ── Índices ──────────────────────────────────────────────────────────────
    const totalPartos = eventos.filter((e: EventoReproductivo) => e.tipoEvento === "Parto").length
    const totalAbortos = eventos.filter((e: EventoReproductivo) => e.tipoEvento === "Aborto").length
    const tasaAborto =
      totalPartos + totalAbortos > 0
        ? Math.round((totalAbortos / (totalPartos + totalAbortos)) * 100)
        : 0

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-2">
        {[
          {
            label: "Total Servicios",
            value: totalServicios,
            icon: <Heart className="w-5 h-5 text-blue-500" />,
            sub: "Montas e inseminaciones registradas",
            vc: "",
          },
          {
            label: "Confirmadas Preñadas",
            value: totalPreniadas,
            icon: <Stethoscope className="w-5 h-5 text-violet-500" />,
            sub: "Preñeces confirmadas con diagnóstico",
            vc: "",
          },
          {
            label: "Tasa de Concepción",
            value: `${tasaConcepcion}%`,
            vc: tasaConcepcion >= 60 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
            icon: <TrendingUp className="w-5 h-5 text-primary" />,
            sub: tasaConcepcion >= 60 ? "Buena" : tasaConcepcion >= 40 ? "Regular" : "Baja",
          },
          {
            label: "Total Partos",
            value: totalPartos,
            icon: <Baby className="w-5 h-5 text-green-500" />,
            sub: "Crías nacidas registradas",
            vc: "",
          },
          {
            label: "Total Abortos",
            value: totalAbortos,
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            sub: "Pérdidas gestacionales",
            vc: "",
          },
          {
            label: "Tasa de Aborto",
            value: `${tasaAborto}%`,
            vc: tasaAborto > 10 ? "text-red-600 dark:text-red-400" : "text-foreground",
            icon: <TrendingUp className="w-5 h-5 text-amber-500" />,
            sub: tasaAborto <= 5 ? "Normal" : "Alta",
          },
        ].map((idx) => (
          <Card key={idx.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                {idx.label}
              </p>
              {idx.icon}
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className={`text-3xl font-extrabold ${idx.vc}`}>{idx.value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{idx.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "gestaciones", label: "Gestaciones activas", count: gestacionesActivas.length },
    { id: "servicios", label: "Servicios" },
    { id: "partos", label: "Partos recientes" },
    { id: "indices", label: "Índices" },
  ]

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Reproducción</h1>
          <p className="text-muted-foreground">Control reproductivo del hato</p>
        </div>

        {/* Dialog Registrar Evento */}
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger
            render={
              <Button className="gap-2 self-start">
                <Plus className="h-4 w-4" /> Registrar Evento
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Registrar evento reproductivo</DialogTitle>
                <DialogDescription>
                  Registra servicios, diagnósticos, partos u otros eventos del ciclo reproductivo.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Animal */}
                <div className="space-y-2">
                  <Label htmlFor="repro-animal">Vaca / Animal *</Label>
                  <Select
                    value={form.animalId}
                    onValueChange={(v) => setForm({ ...form, animalId: v || "" })}
                  >
                    <SelectTrigger id="repro-animal">
                      <SelectValue placeholder="Seleccioná un animal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {animales.map((a: any) => (
                        <SelectItem key={a.uuid} value={a.uuid}>
                          {a.codigo} {a.nombre ? `- ${a.nombre}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de evento */}
                <div className="space-y-2">
                  <Label htmlFor="repro-tipo">Tipo de evento *</Label>
                  <Select
                    value={form.tipoEvento}
                    onValueChange={(v) => setForm({ ...form, tipoEvento: v as TipoEvento })}
                  >
                    <SelectTrigger id="repro-tipo">
                      <SelectValue placeholder="Seleccioná un tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_EVENTO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="repro-fecha">Fecha *</Label>
                  <Input
                    id="repro-fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                  />
                </div>

                {/* Notas */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="repro-notas">Notas / Observaciones</Label>
                  <Textarea
                    id="repro-notas"
                    placeholder="Observaciones adicionales..."
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Guardando..." : "Registrar evento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard
          label="Gestaciones Activas"
          value={gestacionesActivas.length}
          sublabel={
            gestacionesActivas.length === 0
              ? "Sin partos inmediatos"
              : `${
                  gestacionesActivas.filter((g: EventoReproductivo) => {
                    const d = diasRestantes(g.fechaEvento)
                    return d !== null && d <= 30
                  }).length
                } próximas en 30 días`
          }
          icon={<Heart className="w-4 h-4" />}
        />
        <KpiCard
          label="Servicios Este Mes"
          value={serviciosEsteMes.length}
          sublabel="Montas e inseminaciones"
          icon={<CalendarDays className="w-4 h-4" />}
        />
        <KpiCard
          label="Partos Este Mes"
          value={partosEsteMes.length}
          sublabel="Crías registradas este mes"
          icon={<Baby className="w-4 h-4" />}
        />
        <KpiCard
          label="Tasa de Concepción"
          value={`${tasaConcepcion}%`}
          sublabel={tasaConcepcion >= 60 ? "Buena" : tasaConcepcion >= 40 ? "Regular" : "Baja"}
          valueClass={
            tasaConcepcion >= 60
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Tabs + Contenido */}
      <Card>
        <CardHeader className="pb-0 px-0 pt-0">
          <div className="flex gap-1 px-4 pt-4 border-b border-border/60 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap border-b-2 transition-all -mb-px ${
                  tab === t.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      tab === t.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-4 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tabContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
