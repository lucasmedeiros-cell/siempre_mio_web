"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, Bell, Shield, MapPin, Save, Lock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FincaSelector } from "@/components/finca-selector"
import { toast } from "sonner"

export default function SettingsPage() {
  const { fincaId } = useGlobalStore()
  const supabase = createClient()
  const [notifications, setNotifications] = useState(true)
  const [savingNotif, setSavingNotif] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("Usuario")
  const [saving, setSaving] = useState(false)

  // Cambio de contraseña
  const [openPwd, setOpenPwd] = useState(false)
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (user) {
          setFullName(user.user_metadata?.full_name || "")
          setEmail(user.email || "")
          setRole(user.user_metadata?.role || "Administrador")
          setNotifications(user.user_metadata?.notifications ?? true)
        }
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handleToggleNotifications = async () => {
    const next = !notifications
    setNotifications(next)
    setSavingNotif(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { notifications: next } })
      if (error) throw error
      toast.success(next ? "Notificaciones activadas" : "Notificaciones desactivadas")
    } catch (error: any) {
      console.error("Error updating notifications:", error)
      setNotifications(!next) // revertir en caso de error
      toast.error("No se pudo guardar la preferencia de notificaciones")
    } finally {
      setSavingNotif(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success("Contraseña actualizada correctamente")
      setOpenPwd(false)
      setNewPwd("")
      setConfirmPwd("")
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast.error(error.message || "Error al actualizar la contraseña")
    } finally {
      setSavingPwd(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      })
      if (error) throw error
      toast.success("Perfil actualizado correctamente")
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast.error(error.message || "Error al actualizar el perfil")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Ajustes del sistema, preferencias de usuario y parámetros de la finca.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
          <TabsTrigger value="perfil" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Perfil de Usuario</TabsTrigger>
          <TabsTrigger value="preferencias" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Preferencias</TabsTrigger>
          <TabsTrigger value="finca" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Gestión de Finca</TabsTrigger>
        </TabsList>
        
        {/* Pestaña: Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/> Información Personal</CardTitle>
              <CardDescription>Actualiza tus datos de contacto y perfil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-6 text-muted-foreground">Cargando datos de perfil...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input
                        id="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Lucas Parada"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        value={email}
                        disabled
                        type="email"
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol en el Sistema</Label>
                    <Input
                      id="role"
                      value={role}
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={loading || saving}>
                <Save className="w-4 h-4 mr-2"/> {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="premium-card border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="w-5 h-5"/> Seguridad</CardTitle>
              <CardDescription>Opciones de seguridad de la cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={openPwd} onOpenChange={setOpenPwd}>
                <DialogTrigger
                  render={
                    <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                      <Lock className="w-4 h-4" /> Cambiar Contraseña
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Cambiar Contraseña</DialogTitle>
                      <DialogDescription>
                        Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="new-pwd">Nueva Contraseña</Label>
                      <Input
                        id="new-pwd"
                        type="password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pwd">Confirmar Contraseña</Label>
                      <Input
                        id="confirm-pwd"
                        type="password"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={savingPwd} className="w-full">
                        {savingPwd ? "Guardando..." : "Actualizar Contraseña"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Preferencias */}
        <TabsContent value="preferencias" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary"/> Notificaciones</CardTitle>
              <CardDescription>Controla qué alertas recibes del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificaciones Push</Label>
                  <p className="text-sm text-muted-foreground">Recibe alertas importantes sobre inventario y salud en tu navegador.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications}
                  aria-label="Notificaciones Push"
                  disabled={savingNotif}
                  onClick={handleToggleNotifications}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 disabled:opacity-60 ${notifications ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>Personaliza cómo se ve el dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Tema Visual</Label>
                  <p className="text-sm text-muted-foreground">Alternar entre modo claro y oscuro.</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Finca */}
        <TabsContent value="finca" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary"/> Contexto Activo</CardTitle>
              <CardDescription>Selecciona la finca sobre la cual quieres operar o visualizar datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm">
                <Label className="mb-2 block">Finca Actual</Label>
                <FincaSelector />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
