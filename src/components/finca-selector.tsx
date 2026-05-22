"use client"

import { useGlobalStore } from "@/store/global-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database } from "lucide-react"

export function FincaSelector() {
  const { fincaId, setFincaId } = useGlobalStore()

  // In a real app, this would be fetched from Supabase
  const mockFincas = [
    { id: "finca-1", nombre: "Siempre Mío Principal" },
    { id: "finca-2", nombre: "Anexo Norte" }
  ]

  return (
    <div className="flex items-center gap-2">
      <Database className="w-4 h-4 text-muted-foreground" />
      <Select
        value={fincaId || "all"}
        onValueChange={(val) => setFincaId(val === "all" ? null : val)}
      >
        <SelectTrigger className="w-[130px] sm:w-[180px] h-8 text-[11px] sm:text-xs">
          <SelectValue placeholder="Todas las fincas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las fincas</SelectItem>
          {mockFincas.map((finca) => (
            <SelectItem key={finca.id} value={finca.id}>
              {finca.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
