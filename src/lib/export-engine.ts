import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { formatInTimeZone } from 'date-fns-tz'

export function exportToCSV<T>(data: T[], filename: string) {
  if (!data || !data.length) return

  const headers = Object.keys(data[0] as object)
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = (row as any)[header]
          return `"${value !== null && value !== undefined ? value : ""}"`
        })
        .join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToPDF<T>(data: T[], filename: string, title: string) {
  if (!data || !data.length) return

  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.text(title, 14, 22)
  doc.setFontSize(11)
  doc.setTextColor(100)
  
  const boliviaTz = 'America/La_Paz'
  const dateStr = formatInTimeZone(new Date(), boliviaTz, 'dd/MM/yyyy HH:mm:ss')
  doc.text(`Fecha de exportación: ${dateStr} (Hora Bolivia)`, 14, 30)

  const headers = Object.keys(data[0] as object)
  const rows = data.map((item) =>
    headers.map((header) => {
      const value = (item as any)[header]
      return value !== null && value !== undefined ? String(value) : ""
    })
  )

  // @ts-ignore
  if (typeof doc.autoTable === 'function') {
    // @ts-ignore
    doc.autoTable({
      startY: 40,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    })
  } else {
    doc.text("La librería jspdf-autotable no está cargada correctamente.", 14, 40)
  }

  doc.save(`${filename}.pdf`)
}

export function generateEndOfDayReport(fincaId: string | null) {
  // Simulación de recolección de datos del cierre de día (leche, finanzas, salud)
  const reportData = [
    { Categoria: "Producción de Leche", Cantidad: "450 Litros", IngresoEstimado: "1350 BOB" },
    { Categoria: "Gastos Operativos", Cantidad: "3 items", IngresoEstimado: "-450 BOB" },
    { Categoria: "Nacimientos", Cantidad: "2 Terneros", IngresoEstimado: "N/A" },
    { Categoria: "Eventos de Salud", Cantidad: "1 Vacunación", IngresoEstimado: "-120 BOB" },
  ]
  
  const boliviaTz = 'America/La_Paz'
  const dateStr = formatInTimeZone(new Date(), boliviaTz, 'yyyy-MM-dd')
  
  exportToPDF(
    reportData, 
    `Cierre_Dia_${dateStr}${fincaId ? `_${fincaId}` : ''}`, 
    `Reporte de Cierre de Día - Siempre Mío`
  )
}

