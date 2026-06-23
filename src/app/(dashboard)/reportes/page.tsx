"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Printer, Filter, Database, Calendar, Settings2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const REPORT_TYPES = [
  { id: 'inventario_general', title: 'Inventario General del Hato', description: 'Lista completa de animales activos, categorías y estados.' },
  { id: 'produccion_leche', title: 'Resumen de Producción Lechera', description: 'Producción por vaca y total del hato en un periodo.' },
  { id: 'balance_financiero', title: 'Estado de Ganancias y Pérdidas', description: 'Resumen de ingresos y egresos detallado.' },
  { id: 'kpis_desempeno', title: 'Indicadores de Desempeño (KPIs)', description: 'Nacimientos, mortalidad y GDP promedio.' },
]

export default function ReportesPage() {
  const [reportType, setReportType] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("month")
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [cardexOpen, setCardexOpen] = useState(false)
  const [cardexCodigo, setCardexCodigo] = useState("")
  const [cardexLoading, setCardexLoading] = useState(false)
  const { fincaId } = useGlobalStore()
  const supabase = createClient()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_reports')
      if (stored) {
        setRecentReports(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Error reading recent reports:", e)
    }
  }, [])

  async function generatePDF(typeToGenerate?: string, customFilename?: string, mode: 'download' | 'preview' = 'download') {
    const targetType = typeToGenerate || reportType
    if (!targetType) {
      toast.error("Selecciona un tipo de reporte")
      return
    }

    setLoading(true)
    try {
      // Importación dinámica para evitar que Vercel incluya jspdf en el Edge Runtime
      const jsPDFModule = await import("jspdf")
      const autoTableModule = await import("jspdf-autotable")
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || (jsPDFModule as any)
      const autoTable = autoTableModule.default
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Header
      doc.setFontSize(22)
      doc.setTextColor(45, 106, 46) // Verde Siempre Mío
      doc.text("Siempre Mío", 105, 20, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text("Portal Administrativo de Ganadería", 105, 26, { align: 'center' })
      
      doc.setDrawColor(200)
      doc.line(14, 30, 196, 30)

      // Report Info
      const selectedReport = REPORT_TYPES.find(r => r.id === targetType)
      doc.setFontSize(16)
      doc.setTextColor(0)
      doc.text(selectedReport?.title || "Reporte del Hato", 14, 45)
      
      // ── Resolver fincas del usuario (aislamiento multi-tenant) ──
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user session found")

      let fincaIds: string[] = []
      if (fincaId) {
        fincaIds = [fincaId]
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        fincaIds = (userFincas || []).map((f: any) => f.id)
      }

      if (fincaIds.length === 0) {
        toast.error("No hay fincas disponibles para generar el reporte")
        return
      }

      // Rango de fecha seleccionado → fecha de inicio (null = histórico total)
      const now = new Date()
      let fromDate: string | null = null
      if (dateRange === 'today') fromDate = now.toISOString().split('T')[0]
      else if (dateRange === 'month') fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      else if (dateRange === 'year') fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

      const rangeLabels: Record<string, string> = { today: 'Hoy', month: 'Mes actual', year: 'Año completo', all: 'Histórico total' }
      doc.setFontSize(10)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 52)
      doc.text(`Finca: ${fincaId || "Todas las fincas"}`, 14, 57)
      doc.text(`Periodo: ${rangeLabels[dateRange] || 'Histórico total'}`, 14, 62)

      const formatMoney = (n: number) =>
        '$ ' + (n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

      if (targetType === 'inventario_general') {
        const { data, error } = await (supabase.from('animales') as any)
          .select('codigo, nombre, categoria, raza, estado')
          .eq('deleted', false)
          .in('propietario_id', fincaIds)
        if (error) throw error

        const rows = (data || []).map((a: any) => [a.codigo || '', a.nombre || '', a.categoria || '', a.raza || '', a.estado || ''])

        autoTable(doc, {
          startY: 70,
          head: [['Código', 'Nombre', 'Categoría', 'Raza', 'Estado']],
          body: rows.length > 0 ? rows : [['—', 'Sin animales registrados', '', '', '']],
          headStyles: { fillColor: [45, 106, 46] },
          styles: { fontSize: 9 }
        })

        doc.setFontSize(10)
        doc.setTextColor(80)
        doc.text(`Total de animales: ${rows.length}`, 14, (doc as any).lastAutoTable.finalY + 8)

      } else if (targetType === 'produccion_leche') {
        // Mapa de animales de la(s) finca(s) para resolver vaca_id → código/nombre
        const { data: animalRows } = await (supabase.from('animales') as any)
          .select('uuid, codigo, nombre')
          .eq('deleted', false)
          .in('propietario_id', fincaIds)

        const animalMap: Record<string, any> = {}
        const animalUuids: string[] = []
        ;(animalRows || []).forEach((a: any) => { animalMap[a.uuid] = a; animalUuids.push(a.uuid) })

        let rows: any[] = []
        let totalLitros = 0
        let totalRegistros = 0

        if (animalUuids.length > 0) {
          let q = (supabase.from('registros_leche') as any)
            .select('vaca_id, litros, fecha, turno')
            .eq('deleted', false)
            .in('vaca_id', animalUuids)
          if (fromDate) q = q.gte('fecha', fromDate)
          const { data: regs, error } = await q
          if (error) throw error

          const agg: Record<string, { codigo: string; nombre: string; litros: number; count: number }> = {}
          ;(regs || []).forEach((r: any) => {
            const a = animalMap[r.vaca_id]
            if (!a) return
            if (!agg[r.vaca_id]) agg[r.vaca_id] = { codigo: a.codigo || '', nombre: a.nombre || '', litros: 0, count: 0 }
            agg[r.vaca_id].litros += (r.litros || 0)
            agg[r.vaca_id].count += 1
            totalLitros += (r.litros || 0)
            totalRegistros += 1
          })

          rows = Object.values(agg)
            .sort((x, y) => y.litros - x.litros)
            .map(v => [
              v.codigo,
              v.nombre,
              String(v.count),
              String(Math.round(v.litros * 10) / 10),
              v.count > 0 ? String(Math.round((v.litros / v.count) * 10) / 10) : '0'
            ])
        }

        autoTable(doc, {
          startY: 70,
          head: [['Código', 'Vaca', 'Ordeños', 'Litros Totales', 'Prom/Ordeño']],
          body: rows.length > 0 ? rows : [['—', 'Sin registros en el periodo', '', '', '']],
          headStyles: { fillColor: [45, 106, 46] },
          styles: { fontSize: 9 }
        })

        const fy = (doc as any).lastAutoTable.finalY + 8
        doc.setFontSize(11)
        doc.setTextColor(0)
        doc.text(`Producción total del hato: ${Math.round(totalLitros * 10) / 10} L`, 14, fy)
        doc.text(`Total de ordeños registrados: ${totalRegistros}`, 14, fy + 6)
        doc.text(`Promedio por ordeño: ${totalRegistros > 0 ? Math.round((totalLitros / totalRegistros) * 10) / 10 : 0} L`, 14, fy + 12)

      } else if (targetType === 'balance_financiero') {
        let q = (supabase.from('transacciones') as any)
          .select('tipo, categoria, monto, fecha')
          .eq('deleted', false)
          .in('propietario_id', fincaIds)
        if (fromDate) q = q.gte('fecha', fromDate)
        const { data: txs, error } = await q
        if (error) throw error

        const ingresos: Record<string, number> = {}
        const egresos: Record<string, number> = {}
        let totalIng = 0
        let totalEg = 0
        ;(txs || []).forEach((t: any) => {
          const monto = t.monto || 0
          const cat = t.categoria || 'Sin categoría'
          if ((t.tipo || '').toLowerCase() === 'ingreso') {
            ingresos[cat] = (ingresos[cat] || 0) + monto
            totalIng += monto
          } else {
            egresos[cat] = (egresos[cat] || 0) + monto
            totalEg += monto
          }
        })

        const body: any[] = []
        body.push([{ content: 'INGRESOS', colSpan: 2, styles: { fillColor: [232, 245, 233], textColor: [45, 106, 46], fontStyle: 'bold' } }])
        Object.entries(ingresos).forEach(([cat, val]) => body.push([cat, formatMoney(val)]))
        if (Object.keys(ingresos).length === 0) body.push(['Sin ingresos en el periodo', formatMoney(0)])
        body.push([{ content: 'Total Ingresos', styles: { fontStyle: 'bold' } }, { content: formatMoney(totalIng), styles: { fontStyle: 'bold' } }])

        body.push([{ content: 'EGRESOS', colSpan: 2, styles: { fillColor: [253, 235, 235], textColor: [180, 40, 40], fontStyle: 'bold' } }])
        Object.entries(egresos).forEach(([cat, val]) => body.push([cat, formatMoney(val)]))
        if (Object.keys(egresos).length === 0) body.push(['Sin egresos en el periodo', formatMoney(0)])
        body.push([{ content: 'Total Egresos', styles: { fontStyle: 'bold' } }, { content: formatMoney(totalEg), styles: { fontStyle: 'bold' } }])

        const balance = totalIng - totalEg
        body.push([
          { content: 'BALANCE NETO', styles: { fontStyle: 'bold', fillColor: [45, 106, 46], textColor: [255, 255, 255] } },
          { content: formatMoney(balance), styles: { fontStyle: 'bold', fillColor: [45, 106, 46], textColor: [255, 255, 255] } }
        ])

        autoTable(doc, {
          startY: 70,
          head: [['Concepto', 'Monto']],
          body,
          headStyles: { fillColor: [45, 106, 46] },
          styles: { fontSize: 10 },
          columnStyles: { 1: { halign: 'right' } }
        })

      } else if (targetType === 'kpis_desempeno') {
        const { data: animals } = await (supabase.from('animales') as any)
          .select('uuid, codigo, nombre, categoria, estado, procedencia, peso_nacimiento, fecha_nacimiento')
          .eq('deleted', false)
          .in('propietario_id', fincaIds)

        const list = animals || []
        const totalAnimales = list.length
        const nacimientos = list.filter((a: any) => a.procedencia === 'Nacimiento').length
        const muertos = list.filter((a: any) => a.estado === 'Muerto').length
        const vendidos = list.filter((a: any) => a.estado === 'Vendido').length
        const activos = list.filter((a: any) => a.estado === 'Activo').length
        const mortalidadPct = totalAnimales > 0 ? (muertos / totalAnimales) * 100 : 0

        const animalUuids = list.map((a: any) => a.uuid)

        // Partos registrados en el periodo
        let partos = 0
        if (animalUuids.length > 0) {
          let q = (supabase.from('eventos_reproductivos') as any)
            .select('tipo_evento, fecha_evento')
            .eq('deleted', false)
            .in('animal_id', animalUuids)
          if (fromDate) q = q.gte('fecha_evento', fromDate)
          const { data: eventos } = await q
          partos = (eventos || []).filter((e: any) => (e.tipo_evento || '').toLowerCase() === 'parto').length
        }

        // GDP promedio del hato (replica la lógica de la página de peso)
        let totalGdpSum = 0
        let totalGdpCount = 0
        if (animalUuids.length > 0) {
          const { data: pesajes } = await (supabase.from('registros_peso') as any)
            .select('animal_id, peso, fecha_pesaje')
            .eq('deleted', false)
            .in('animal_id', animalUuids)

          const weighings: Record<string, { fecha: string; peso: number }[]> = {}
          list.forEach((a: any) => {
            weighings[a.uuid] = []
            if (a.peso_nacimiento && a.fecha_nacimiento) {
              weighings[a.uuid].push({ fecha: a.fecha_nacimiento, peso: a.peso_nacimiento })
            }
          })
          ;(pesajes || []).forEach((p: any) => {
            if (weighings[p.animal_id]) weighings[p.animal_id].push({ fecha: p.fecha_pesaje, peso: p.peso })
          })

          Object.values(weighings).forEach((ws) => {
            ws.sort((w1, w2) => new Date(w1.fecha).getTime() - new Date(w2.fecha).getTime())
            for (let i = 1; i < ws.length; i++) {
              const days = Math.round((new Date(ws[i].fecha).getTime() - new Date(ws[i - 1].fecha).getTime()) / 86400000)
              if (days > 0) {
                totalGdpSum += (ws[i].peso - ws[i - 1].peso) / days
                totalGdpCount += 1
              }
            }
          })
        }
        const avgGdp = totalGdpCount > 0 ? totalGdpSum / totalGdpCount : 0

        const body = [
          ['Total de animales registrados', String(totalAnimales)],
          ['Animales activos', String(activos)],
          ['Nacimientos (procedencia)', String(nacimientos)],
          ['Partos registrados', String(partos)],
          ['Mortalidad (cantidad)', String(muertos)],
          ['Tasa de mortalidad', `${mortalidadPct.toFixed(1)} %`],
          ['Animales vendidos', String(vendidos)],
          ['GDP promedio del hato', `${avgGdp.toFixed(2)} kg/día`],
        ]

        autoTable(doc, {
          startY: 70,
          head: [['Indicador', 'Valor']],
          body,
          headStyles: { fillColor: [45, 106, 46] },
          styles: { fontSize: 11 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        })
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Página ${i} de ${pageCount} - Generado por Siempre Mío Web`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
      }

      const filename = customFilename || `Reporte_${targetType}_${new Date().getTime()}.pdf`

      const blob = doc.output('blob')
      const sizeKb = Math.round(blob.size / 1024)

      // Modo previsualización: abrir en una pestaña nueva sin descargar ni archivar
      if (mode === 'preview') {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        toast.success("Vista previa generada")
        return
      }

      doc.save(filename)

      // Guardar en reportes recientes
      const newReport = {
        id: crypto.randomUUID(),
        title: selectedReport?.title || "Reporte del Hato",
        filename,
        timestamp: Date.now(),
        sizeKb,
        type: targetType
      }

      const stored = localStorage.getItem('recent_reports')
      let list: any[] = []
      if (stored) {
        try {
          list = JSON.parse(stored)
        } catch (e) {
          list = []
        }
      }

      list = list.filter(r => r.filename !== filename)
      const updated = [newReport, ...list].slice(0, 5)
      setRecentReports(updated)
      localStorage.setItem('recent_reports', JSON.stringify(updated))

      toast.success("Reporte generado con éxito")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Error al generar el archivo PDF")
    } finally {
      setLoading(false)
    }
  }

  async function generateCardex(mode: 'download' | 'preview' = 'download', codigoArg?: string) {
    const codigo = (codigoArg ?? cardexCodigo).trim()
    if (!codigo) {
      toast.error("Ingresa el código del animal")
      return
    }

    setCardexLoading(true)
    try {
      const jsPDFModule = await import("jspdf")
      const autoTableModule = await import("jspdf-autotable")
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || (jsPDFModule as any)
      const autoTable = autoTableModule.default

      // Resolver fincas del usuario (aislamiento multi-tenant)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user session found")

      let fincaIds: string[] = []
      if (fincaId) {
        fincaIds = [fincaId]
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        fincaIds = (userFincas || []).map((f: any) => f.id)
      }
      if (fincaIds.length === 0) {
        toast.error("No hay fincas disponibles")
        return
      }

      // Buscar el animal por código dentro de las fincas del usuario
      const { data: animals } = await (supabase.from('animales') as any)
        .select('*')
        .eq('deleted', false)
        .in('propietario_id', fincaIds)
        .ilike('codigo', codigo)

      const animal = (animals || [])[0]
      if (!animal) {
        toast.error(`No se encontró ningún animal con el código "${codigo}"`)
        return
      }

      const animalUuid = animal.uuid
      const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : '—')

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Encabezado
      doc.setFontSize(22)
      doc.setTextColor(45, 106, 46)
      doc.text("Siempre Mío", 105, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text("Portal Administrativo de Ganadería", 105, 26, { align: 'center' })
      doc.setDrawColor(200)
      doc.line(14, 30, 196, 30)

      doc.setFontSize(16)
      doc.setTextColor(0)
      doc.text(`Cardex Animal — ${animal.codigo || ''}`, 14, 45)
      doc.setFontSize(10)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 52)

      // Ficha del animal
      autoTable(doc, {
        startY: 58,
        head: [['Ficha del Animal', '']],
        body: [
          ['Código', animal.codigo || '—'],
          ['Nombre', animal.nombre || '—'],
          ['Categoría', animal.categoria || '—'],
          ['Raza', animal.raza || '—'],
          ['Sexo', animal.sexo || '—'],
          ['Estado', animal.estado || '—'],
          ['Procedencia', animal.procedencia || '—'],
          ['Fecha de nacimiento', fmtDate(animal.fecha_nacimiento)],
          ['Peso al nacimiento', animal.peso_nacimiento ? `${animal.peso_nacimiento} kg` : '—'],
          ['Peso actual', animal.peso_actual ? `${animal.peso_actual} kg` : '—'],
        ],
        headStyles: { fillColor: [45, 106, 46] },
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
      })

      // Historial de pesajes
      const { data: pesajes } = await (supabase.from('registros_peso') as any)
        .select('peso, fecha_pesaje, observacion')
        .eq('deleted', false)
        .eq('animal_id', animalUuid)
        .order('fecha_pesaje', { ascending: false })

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Historial de Pesajes', 'Peso (kg)', 'Observación']],
        body: (pesajes || []).length > 0
          ? (pesajes || []).map((p: any) => [fmtDate(p.fecha_pesaje), String(p.peso ?? '—'), p.observacion || ''])
          : [['Sin registros de peso', '', '']],
        headStyles: { fillColor: [45, 106, 46] },
        styles: { fontSize: 9 }
      })

      // Historial de producción de leche
      const { data: leche } = await (supabase.from('registros_leche') as any)
        .select('litros, fecha, turno')
        .eq('deleted', false)
        .eq('vaca_id', animalUuid)
        .order('fecha', { ascending: false })

      const totalLeche = (leche || []).reduce((s: number, r: any) => s + (r.litros || 0), 0)
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Producción de Leche (últimos 15)', 'Turno', 'Litros']],
        body: (leche || []).length > 0
          ? (leche || []).slice(0, 15).map((r: any) => [fmtDate(r.fecha), r.turno || '—', String(r.litros ?? 0)])
          : [['Sin registros de leche', '', '']],
        foot: (leche || []).length > 0 ? [['Total acumulado', '', `${Math.round(totalLeche * 10) / 10} L`]] : undefined,
        headStyles: { fillColor: [45, 106, 46] },
        footStyles: { fillColor: [232, 245, 233], textColor: [45, 106, 46], fontStyle: 'bold' },
        styles: { fontSize: 9 }
      })

      // Historial de salud
      const { data: salud } = await (supabase.from('eventos_salud') as any)
        .select('tipo_evento, fecha, medicamento, dosis, observacion')
        .eq('deleted', false)
        .eq('animal_id', animalUuid)
        .order('fecha', { ascending: false })

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Historial de Salud', 'Evento', 'Medicamento', 'Dosis']],
        body: (salud || []).length > 0
          ? (salud || []).map((s: any) => [fmtDate(s.fecha), s.tipo_evento || '—', s.medicamento || '—', s.dosis || '—'])
          : [['Sin eventos de salud', '', '', '']],
        headStyles: { fillColor: [45, 106, 46] },
        styles: { fontSize: 9 }
      })

      // Historial reproductivo
      const { data: repro } = await (supabase.from('eventos_reproductivos') as any)
        .select('tipo_evento, fecha_evento, diagnostico, observacion')
        .eq('deleted', false)
        .eq('animal_id', animalUuid)
        .order('fecha_evento', { ascending: false })

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Historial Reproductivo', 'Evento', 'Diagnóstico / Observación']],
        body: (repro || []).length > 0
          ? (repro || []).map((e: any) => [fmtDate(e.fecha_evento), e.tipo_evento || '—', e.diagnostico || e.observacion || '—'])
          : [['Sin eventos reproductivos', '', '']],
        headStyles: { fillColor: [45, 106, 46] },
        styles: { fontSize: 9 }
      })

      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Página ${i} de ${pageCount} - Generado por Siempre Mío Web`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
      }

      const filename = `Cardex_${animal.codigo || 'animal'}_${new Date().getTime()}.pdf`
      const blob = doc.output('blob')
      const sizeKb = Math.round(blob.size / 1024)

      if (mode === 'preview') {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        toast.success("Vista previa generada")
        return
      }

      doc.save(filename)

      // Guardar en reportes recientes (incluye el código para poder regenerarlo)
      const newReport = {
        id: crypto.randomUUID(),
        title: `Cardex ${animal.codigo || ''}`.trim(),
        filename,
        timestamp: Date.now(),
        sizeKb,
        type: 'cardex',
        codigo: animal.codigo || codigo
      }

      const stored = localStorage.getItem('recent_reports')
      let list: any[] = []
      if (stored) {
        try {
          list = JSON.parse(stored)
        } catch (e) {
          list = []
        }
      }

      list = list.filter(r => r.filename !== filename)
      const updated = [newReport, ...list].slice(0, 5)
      setRecentReports(updated)
      localStorage.setItem('recent_reports', JSON.stringify(updated))

      setCardexOpen(false)
      toast.success("Cardex generado con éxito")
    } catch (error) {
      console.error("Error generating cardex:", error)
      toast.error("Error al generar el cardex")
    } finally {
      setCardexLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Reportes</h1>
        <p className="text-muted-foreground">
          Genera y exporta documentos PDF profesionales para la gestión de tu hato.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Configuración del Reporte
              </CardTitle>
              <CardDescription>Selecciona los parámetros para la exportación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="report-type">Tipo de Reporte</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REPORT_TYPES.map((type) => (
                    <div 
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                        reportType === type.id 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border/50 hover:border-primary/50 bg-card/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${reportType === type.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                        <span className="font-semibold text-sm">{type.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4" /> Origen de Datos
                  </Label>
                  <Select defaultValue="supabase">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supabase">Cloud Supabase (Realtime)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Rango de Fecha
                  </Label>
                  <Select value={dateRange} onValueChange={(v) => v && setDateRange(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="month">Mes Actual</SelectItem>
                      <SelectItem value="year">Año Completo</SelectItem>
                      <SelectItem value="all">Histórico Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border/50 rounded-b-xl flex justify-between p-4">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <Filter className="w-4 h-4" /> Limpiar Filtros
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => generatePDF(undefined, undefined, 'preview')}
                  disabled={loading || !reportType}
                >
                  <Printer className="w-4 h-4" /> Previsualizar
                </Button>
                <Button
                  onClick={() => generatePDF()}
                  disabled={loading || !reportType}
                  className="gap-2 min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Descargar PDF
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-primary">Nota sobre Privacidad</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los reportes generados contienen información sensible del hato. Asegúrate de cumplir con las normativas locales de manejo de datos ganaderos. El sistema utiliza encriptación SSL para la descarga de datos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Reportes Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReports.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10 p-4">
                  No has generado reportes recientemente.
                </div>
              ) : (
                recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group hover:border-primary/50 transition-colors cursor-default">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-background rounded border border-border/50 text-red-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate max-w-[160px]" title={report.filename}>
                          {report.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(report.timestamp).toLocaleDateString()} • {report.sizeKb} KB
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => report.type === 'cardex'
                        ? generateCardex('download', report.codigo)
                        : generatePDF(report.type, report.filename)}
                      title="Volver a generar y descargar"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Cardex Animal
              </CardTitle>
              <CardDescription className="text-xs">
                Genera la ficha individual de un animal específico con su historial completo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={cardexOpen} onOpenChange={setCardexOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5 gap-2">
                      <Search className="w-4 h-4" /> Buscar por Código
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cardex Animal</DialogTitle>
                    <DialogDescription>
                      Ingresa el código del animal para generar su ficha completa con historial de peso, leche, salud y reproducción.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label htmlFor="cardex-codigo">Código del animal</Label>
                    <Input
                      id="cardex-codigo"
                      value={cardexCodigo}
                      onChange={(e) => setCardexCodigo(e.target.value)}
                      placeholder="Ej: A-001"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cardexCodigo.trim() && !cardexLoading) generateCardex('download')
                      }}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={cardexLoading || !cardexCodigo.trim()}
                      onClick={() => generateCardex('preview')}
                    >
                      <Printer className="w-4 h-4" /> Previsualizar
                    </Button>
                    <Button
                      className="gap-2 min-w-[130px]"
                      disabled={cardexLoading || !cardexCodigo.trim()}
                      onClick={() => generateCardex('download')}
                    >
                      {cardexLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Generando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" /> Descargar
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
