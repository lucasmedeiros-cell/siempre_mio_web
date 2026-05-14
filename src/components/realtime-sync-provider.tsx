"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    const supabase = createClient()

    // Listen to data mutations on the most important tables to invalidate React Query cache
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['animales'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard_kpis'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lotes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lotes'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'potreros' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['potreros'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard_kpis'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produccion_leche' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['produccion_leche'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard_kpis'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transacciones' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transacciones'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard_kpis'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return <>{children}</>
}
