"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useGlobalStore } from "@/store/global-store"
import { useQueryClient } from "@tanstack/react-query"

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { setFincaId } = useGlobalStore()
  const queryClient = useQueryClient()

  // Clear any existing store or cache state when mounting the login page to prevent session leaks
  useEffect(() => {
    queryClient.clear()
    setFincaId(null)
    sessionStorage.clear()
  }, [queryClient, setFincaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          toast.error("Error de autenticación", {
            description: error.message
          })
          return
        }

        toast.success("Bienvenido a Siempre Mío")
        sessionStorage.setItem("sessionActive", "true")
        router.push("/")
        router.refresh()
      } else {
        // Register Mode
        if (!fullName.trim()) {
          toast.error("Por favor ingresa tu nombre completo")
          setLoading(false)
          return
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              role: "Administrador"
            }
          }
        })

        if (error) {
          toast.error("Error al registrarse", {
            description: error.message
          })
          return
        }

        toast.success("Registro exitoso", {
          description: "Revisa tu correo electrónico para confirmar tu cuenta y acceder al sistema.",
          duration: 8000,
        })
        setMode('login')
        setFullName("")
        setPassword("")
      }
    } catch (err) {
      toast.error("Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-xl overflow-hidden flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo Siempre Mío" 
                className="w-full h-full object-contain" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? "Siempre Mío" : "Crear Cuenta"}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? "Ingresa al portal administrativo del hato" 
              : "Regístrate en Siempre Mío para comenzar"
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  placeholder="Ej. Lucas Parada" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="ejemplo@siempremio.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading 
                ? (mode === 'login' ? "Iniciando sesión..." : "Registrando cuenta...") 
                : (mode === 'login' ? "Ingresar" : "Registrarse")
              }
            </Button>
            
            <div className="text-center text-sm mt-2">
              {mode === 'login' ? (
                <p className="text-muted-foreground">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Regístrate aquí
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Inicia sesión
                  </button>
                </p>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
