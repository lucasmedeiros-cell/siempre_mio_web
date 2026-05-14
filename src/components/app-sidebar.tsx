"use client"

import { Home, Settings, Tractor, Milk, Activity, BarChart3, Database } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Gestión Hato",
    url: "/hato",
    icon: Database,
  },
  {
    title: "Gestión de Lotes",
    url: "/lotes",
    icon: Database,
  },
  {
    title: "Producción Lechera",
    url: "/leche",
    icon: Milk,
  },
  {
    title: "Potreros",
    url: "/potreros",
    icon: Tractor,
  },
  {
    title: "Salud Animal",
    url: "/salud",
    icon: Activity,
  },
  {
    title: "Tablero de Tareas",
    url: "/tareas",
    icon: Activity,
  },
  {
    title: "Confinamiento",
    url: "/confinamiento",
    icon: Tractor,
  },
  {
    title: "Reportes PDF",
    url: "/reportes",
    icon: BarChart3,
  },
  {
    title: "Finanzas",
    url: "/finanzas",
    icon: BarChart3,
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r-0 !bg-transparent">
      <SidebarContent className="bg-sidebar/60 backdrop-blur-2xl border-r border-border/50">
        <div className="p-5 flex items-center gap-3 font-bold text-xl tracking-tight text-primary border-b border-border/50 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          Siempre Mío
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-2">
              {items.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={`transition-all duration-300 rounded-lg h-10 px-3 flex items-center gap-3 ${isActive ? 'menu-active-glow' : 'hover:translate-x-1 hover:bg-primary/5 hover:text-primary text-muted-foreground'}`}
                      isActive={isActive}
                      render={<a href={item.url} />}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "opacity-70"}`} />
                      <span className={isActive ? "font-semibold" : "font-medium"}>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
