"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Wallet, TrendingUp, TrendingDown, Package, ShieldAlert } from "lucide-react"
import { useGlobalStore } from "@/store/global-store"
import { createClient } from "@/lib/supabase/client"

export default function FinanzasPage() {
  const { fincaId } = useGlobalStore()

  // Transacciones Financieras Reales
  const { data: transacciones = [] } = useQuery({
    queryKey: ['transacciones', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('transacciones')
        .select('*')
        .eq('deleted', false)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      
      return (data || []).map(t => ({
        id: t.uuid,
        fecha: t.fecha,
        tipo: t.tipo?.toLowerCase() === 'ingreso' ? 'ingreso' : 'egreso',
        categoria: t.categoria || 'General',
        descripcion: t.observacion || t.categoria || 'Sin descripción',
        montoBs: t.monto || 0,
        responsable: 'Admin'
      }))
    }
  })

  // Inventario Real
  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('inventarios')
        .select('*')
        .eq('deleted', false)
      
      if (error) throw error
      
      return (data || []).map(i => ({
        id: i.uuid,
        nombre: i.nombre,
        categoria: i.categoria || 'Insumo',
        stockActual: i.stockActual || 0,
        stockMinimo: i.stockMinimo || 10,
        stockMaximo: (i.stockMinimo || 10) * 3 // Simulamos maximo para la barra
      }))
    }
  })

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + t.montoBs, 0)
  const totalEgresos = transacciones.filter(t => t.tipo === 'egreso').reduce((acc, t) => acc + t.montoBs, 0)
  const balance = totalIngresos - totalEgresos

  const insumosCriticos = insumos.filter(i => i.stockActual <= i.stockMinimo)

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Economía y Almacén</h1>
        <p className="text-muted-foreground">
          Gestión del flujo de caja, control de ingresos/egresos e inventario físico de la finca.
        </p>
      </div>

      <Tabs defaultValue="flujo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flujo" className="gap-2"><Wallet className="w-4 h-4"/> Flujo de Caja</TabsTrigger>
          <TabsTrigger value="almacen" className="gap-2">
            <Package className="w-4 h-4"/> Inventario 
            {insumosCriticos.length > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">{insumosCriticos.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flujo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-BO')} Bs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos (Mes)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  +{totalIngresos.toLocaleString('es-BO')} Bs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos (Mes)</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  -{totalEgresos.toLocaleString('es-BO')} Bs
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Últimas Transacciones</CardTitle>
              <CardDescription>Registro histórico de movimientos financieros en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacciones.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {format(new Date(tx.fecha), "dd MMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.categoria}</Badge>
                      </TableCell>
                      <TableCell>{tx.descripcion}</TableCell>
                      <TableCell className={`text-right font-bold ${tx.tipo === 'ingreso' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.tipo === 'ingreso' ? '+' : '-'}{tx.montoBs.toLocaleString('es-BO')} Bs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="almacen" className="space-y-4">
          {insumosCriticos.length > 0 && (
            <Card className="border-red-500/50 bg-red-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-lg">
                  <ShieldAlert className="w-5 h-5" /> Alerta de Reabastecimiento
                </CardTitle>
                <CardDescription className="text-red-700/80 dark:text-red-400/80">
                  Existen {insumosCriticos.length} productos críticos que requieren orden de compra inmediata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm text-red-700 dark:text-red-400 font-medium">
                  {insumosCriticos.map(insumo => (
                    <li key={insumo.id}>{insumo.nombre} (Stock actual: {insumo.stockActual} | Mínimo requerido: {insumo.stockMinimo})</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Inventario Físico de Insumos</CardTitle>
              <CardDescription>Monitoreo de stock de alimentos, medicinas y genética.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="w-[300px]">Nivel de Stock</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((insumo) => {
                    const porcentaje = (insumo.stockActual / insumo.stockMaximo) * 100
                    const isCritical = insumo.stockActual <= insumo.stockMinimo
                    
                    return (
                      <TableRow key={insumo.id}>
                        <TableCell className="font-medium">{insumo.nombre}</TableCell>
                        <TableCell><Badge variant="secondary">{insumo.categoria}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress 
                              value={porcentaje} 
                              className={`h-2 ${isCritical ? '[&>div]:bg-red-500' : (porcentaje < 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500')}`} 
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">{porcentaje.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={isCritical ? "text-red-600 dark:text-red-400 font-bold" : ""}>
                            {insumo.stockActual}
                          </span>
                          <span className="text-muted-foreground ml-1">/ {insumo.stockMaximo}</span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
