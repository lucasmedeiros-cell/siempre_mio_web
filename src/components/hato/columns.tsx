"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Database } from "@/lib/supabase/database.types"
import { Badge } from "@/components/ui/badge"
import { differenceInMonths, differenceInYears } from "date-fns"

export type Animal = Database['public']['Tables']['animales']['Row']

export const columns: ColumnDef<Animal>[] = [
  {
    accessorKey: "codigo",
    header: "Código / RP",
    cell: ({ row }) => {
      const isMale = row.getValue("sexo") === "Macho"
      return (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden border">
            {/* Si tuviéramos URL de foto, iría un <img /> aquí */}
            {isMale ? '🐂' : '🐄'}
          </div>
          <span className="font-medium">{row.getValue("codigo")}</span>
        </div>
      )
    }
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "categoria",
    header: "Categoría",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="bg-background">{row.getValue("categoria")}</Badge>
      )
    }
  },
  {
    accessorKey: "sexo",
    header: "Sexo",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "raza",
    header: "Raza",
  },
  {
    id: "edad",
    header: "Edad",
    cell: ({ row }) => {
      const fechaNac = row.original.fechaNacimiento
      if (!fechaNac) return <span className="text-muted-foreground">-</span>
      
      const nacDate = new Date(fechaNac)
      const now = new Date()
      const years = differenceInYears(now, nacDate)
      const months = differenceInMonths(now, nacDate) % 12
      
      if (years > 0) {
        return <span>{years}a {months}m</span>
      }
      return <span>{months}m</span>
    }
  },
  {
    accessorKey: "pesoActual",
    header: "Peso (kg)",
    cell: ({ row }) => {
      const peso = parseFloat(row.getValue("pesoActual"))
      return <div className="font-medium">{isNaN(peso) ? '-' : `${peso} kg`}</div>
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    cell: ({ row }) => {
      const estado = row.getValue("estado") as string
      return (
        <Badge variant={estado === 'Activo' ? 'default' : 'secondary'}>
          {estado}
        </Badge>
      )
    }
  },
]
