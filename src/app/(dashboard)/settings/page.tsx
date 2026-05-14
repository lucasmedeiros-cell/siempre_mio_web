"use client"

import { useState } from "react"
import { useGlobalStore } from "@/store/global-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Bell, Shield, MapPin, Save, ThemeIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FincaSelector } from "@/components/finca-selector"
import { toast } from "sonner"

export default function SettingsPage() {
  const { fincaId } = useGlobalStore()
  const [notifications, setNotifications] = useState(true)

  const handleSave = () => {
    toast.success("Configuración guardada correctamente")
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input id="name" defaultValue="Administrador" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" defaultValue="admin@siempremio.com" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol en el Sistema</Label>
                <Input id="role" defaultValue="Super Administrador" disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}><Save className="w-4 h-4 mr-2"/> Guardar Cambios</Button>
            </CardFooter>
          </Card>
          
          <Card className="premium-card border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="w-5 h-5"/> Seguridad</CardTitle>
              <CardDescription>Opciones de seguridad de la cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">Cambiar Contraseña</Button>
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
                  onClick={() => setNotifications(!notifications)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${notifications ? 'bg-primary' : 'bg-muted'}`}
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
