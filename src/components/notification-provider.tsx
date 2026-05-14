"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { BellRing, Stethoscope } from "lucide-react"

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run this if we have a supabase URL configured, otherwise it will crash.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    const supabase = createClient()

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertas',
        },
        (payload) => {
          const alerta = payload.new as any
          
          toast(alerta.titulo || "Nueva Alerta", {
            description: alerta.mensaje || "Se ha registrado una nueva alerta en el sistema.",
            icon: <BellRing className="h-4 w-4 text-destructive" />,
          })
          
          // Opcional: reproducir sonido
          // const audio = new Audio('/alert.mp3')
          // audio.play().catch(e => console.error("Error playing sound", e))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eventos_salud',
        },
        (payload) => {
          const evento = payload.new as any
          
          toast("Evento de Salud", {
            description: `Nuevo registro de ${evento.tipoEvento || 'salud'} para el animal ID: ${evento.animalId}`,
            icon: <Stethoscope className="h-4 w-4 text-blue-500" />,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <>{children}</>
}
