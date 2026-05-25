"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useGlobalStore } from "@/store/global-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Finca {
  id: string
  nombre: string
}

export function FincaSelector() {
  const { fincaId, setFincaId } = useGlobalStore()
  const supabase = createClient()

  // Fetch user first to scope fincas query key
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    }
  })

  // Fetch fincas from Supabase dynamically
  const { data: fincas = [], isLoading } = useQuery<Finca[]>({
    queryKey: ['fincas', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('fincas')
        .select('id, nombre')
        .eq('propietario_id', user.id)
        .order('nombre')

      if (error) {
        console.error("Error cargando fincas:", error.message)
        return []
      }
      return (data || []) as Finca[]
    },
    enabled: !!user
  })

  // Auto-select first finca if none is selected or if the selected one does not exist in the list
  useEffect(() => {
    if (fincas.length > 0) {
      const exists = fincas.some((f) => f.id === fincaId)
      if (!fincaId || !exists) {
        setFincaId(fincas[0].id)
      }
    } else if (!isLoading && fincas.length === 0 && fincaId !== null) {
      setFincaId(null)
    }
  }, [fincas, fincaId, setFincaId, isLoading])

  return (
    <div className="flex items-center gap-2">
      <Database className="w-4 h-4 text-muted-foreground" />
      <Select
        value={fincaId || "all"}
        onValueChange={(val) => setFincaId(val === "all" ? null : val)}
        disabled={isLoading || fincas.length === 0}
      >
        <SelectTrigger className="w-[130px] sm:w-[180px] h-8 text-[11px] sm:text-xs">
          <SelectValue placeholder={isLoading ? "Cargando..." : "Todas las fincas"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las fincas</SelectItem>
          {fincas.map((finca) => (
            <SelectItem key={finca.id} value={finca.id}>
              {finca.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
