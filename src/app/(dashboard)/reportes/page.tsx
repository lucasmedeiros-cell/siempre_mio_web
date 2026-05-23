"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Printer, Filter, Database, Calendar, Settings2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const REPORT_TYPES = [
  { id: 'inventario_general', title: 'Inventario General del Hato', description: 'Lista completa de animales activos, categorías y estados.' },
  { id: 'produccion_leche', title: 'Resumen de Producción Lechera', description: 'Producción por vaca y total del hato en un periodo.' },
  { id: 'balance_financiero', title: 'Estado de Ganancias y Pérdidas', description: 'Resumen de ingresos y egresos detallado.' },
  { id: 'kpis_desempeno', title: 'Indicadores de Desempeño (KPIs)', description: 'Nacimientos, mortalidad y GDP promedio.' },
]

export default function ReportesPage() {
  const [reportType, setReportType] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])
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

  async function generatePDF(typeToGenerate?: string, customFilename?: string) {
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
      
      doc.setFontSize(10)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 52)
      doc.text(`Finca: ${fincaId || "Todas las fincas"}`, 14, 57)

      // Data Fetching and Table Rendering
      if (targetType === 'inventario_general') {
        let query = (supabase.from('animales') as any).select('codigo, nombre, categoria, raza, estado').eq('deleted', false)
        if (fincaId) query = query.eq('propietarioId', fincaId)
        
        const { data, error } = await query
        if (error) throw error

        const rows = (data || []).map((a: any) => [a.codigo || '', a.nombre || '', a.categoria || '', a.raza || '', a.estado || ''])

        autoTable(doc, {
          startY: 65,
          head: [['Código', 'Nombre', 'Categoría', 'Raza', 'Estado']],
          body: rows,
          headStyles: { fillColor: [45, 106, 46] },
          styles: { fontSize: 9 }
        })
      } else {
        // Placeholder for other reports
        doc.setFontSize(12)
        doc.text("Este reporte se encuentra en fase de desarrollo.", 14, 80)
        doc.text("Próximamente se incluirán tablas dinámicas y gráficos.", 14, 87)
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
      doc.save(filename)

      // Guardar en reportes recientes
      const blob = doc.output('blob')
      const sizeKb = Math.round(blob.size / 1024)

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
                  <Select defaultValue="today">
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
                <Button variant="outline" className="gap-2">
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
                      onClick={() => generatePDF(report.type, report.filename)}
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
              <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5">
                Buscar por Código
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
