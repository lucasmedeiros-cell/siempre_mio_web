import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { FincaSelector } from "@/components/finca-selector"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-primary/10 dark:to-primary/5 transition-colors duration-500">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden p-2 md:p-4">
          <div className="flex-1 flex flex-col bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative transition-all duration-300">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 bg-background/40 backdrop-blur-md px-4">
              <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-colors" />
              <Separator orientation="vertical" className="mr-2 h-4 opacity-50" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/" className="hover:text-primary transition-colors">Siempre Mío</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium text-primary">Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <FincaSelector />
                <ThemeToggle />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
