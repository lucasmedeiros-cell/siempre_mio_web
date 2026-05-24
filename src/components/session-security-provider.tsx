"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SessionSecurityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      // Check sessionStorage flag
      const isSessionActive = sessionStorage.getItem("sessionActive")
      
      if (!isSessionActive) {
        // Clear Supabase auth session
        await supabase.auth.signOut()
        sessionStorage.clear()
        
        // Redirect to login
        router.push("/login")
        router.refresh()
      } else {
        setAuthorized(true)
      }
    }
    
    checkSession()
  }, [router, supabase])

  // While checking, render a loading screen to prevent flash of protected content
  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b4d22] border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Cargando sesión segura...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
