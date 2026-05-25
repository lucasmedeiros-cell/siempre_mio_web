"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Wallet, TrendingUp, TrendingDown, Package, ShieldAlert, Plus } from "lucide-react"
import { useGlobalStore } from "@/store/global-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function FinanzasPage() {
  const { fincaId } = useGlobalStore()
  const queryClient = useQueryClient()

  // Diálogos abiertos
  const [openTx, setOpenTx] = useState(false)
  const [openInv, setOpenInv] = useState(false)

  // Estados de formularios
  const [formTx, setFormTx] = useState({
    tipo: "Ingreso",
    categoria: "Venta de Leche",
    monto: "",
    fecha: new Date().toISOString().split('T')[0],
    observacion: "",
  })

  const [formInv, setFormInv] = useState({
    nombre: "",
    categoria: "Alimento",
    stockActual: "",
    stockMinimo: "",
    unidad: "Kg",
  })

  // Mutación para agregar una transacción financiera
  const addTxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const supabase = createClient()
      const dataPayload = {
        uuid: crypto.randomUUID(),
        tipo: payload.tipo,
        categoria: payload.categoria,
        monto: payload.monto,
        fecha: payload.fecha.split('T')[0],
        observacion: payload.observacion,
        propietario_id: payload.propietarioId || null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }
      const { error } = await (supabase.from('transacciones') as any).insert([dataPayload])
      if (error) throw error
      return dataPayload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_overview'] })
      toast.success("Transacción registrada correctamente")
      setOpenTx(false)
      setFormTx({
        tipo: "Ingreso",
        categoria: "Venta de Leche",
        monto: "",
        fecha: new Date().toISOString().split('T')[0],
        observacion: "",
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error("Error al registrar la transacción")
    }
  })

  // Mutación para agregar un insumo al almacén
  const addInvMutation = useMutation({
    mutationFn: async (payload: any) => {
      const supabase = createClient()
      const dataPayload = {
        uuid: crypto.randomUUID(),
        nombre: payload.nombre,
        categoria: payload.categoria,
        stock_actual: payload.stockActual,
        stock_minimo: payload.stockMinimo,
        unidad: payload.unidad,
        propietario_id: payload.propietarioId || null,
        deleted: false,
        synced: true,
        updated_at: new Date().toISOString()
      }
      const { error } = await (supabase.from('inventarios') as any).insert([dataPayload])
      if (error) throw error
      return dataPayload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_overview'] })
      toast.success("Insumo agregado al inventario")
      setOpenInv(false)
      setFormInv({
        nombre: "",
        categoria: "Alimento",
        stockActual: "",
        stockMinimo: "",
        unidad: "Kg",
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error("Error al registrar el insumo")
    }
  })

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTx.monto || !formTx.fecha) return

    let targetFincaId = fincaId
    if (!targetFincaId) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) targetFincaId = user.id
    }

    addTxMutation.mutate({
      tipo: formTx.tipo,
      categoria: formTx.categoria,
      monto: parseFloat(formTx.monto),
      fecha: new Date(formTx.fecha).toISOString(),
      observacion: formTx.observacion || null,
      propietarioId: targetFincaId || null,
    })
  }

  const handleSubmitInv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formInv.nombre || !formInv.stockActual || !formInv.stockMinimo) return

    let targetFincaId = fincaId
    if (!targetFincaId) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) targetFincaId = user.id
    }

    addInvMutation.mutate({
      nombre: formInv.nombre,
      categoria: formInv.categoria,
      stockActual: parseFloat(formInv.stockActual),
      stockMinimo: parseFloat(formInv.stockMinimo),
      unidad: formInv.unidad,
      propietarioId: targetFincaId || null,
    })
  }

  // Transacciones Financieras Reales
  const { data: transacciones = [] } = useQuery({
    queryKey: ['transacciones', fincaId],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase.from('transacciones')
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietario_id', fincaId)
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        const fincaIds = (userFincas || []).map((f: any) => f.id)
        if (fincaIds.length === 0) return []
        query = query.in('propietario_id', fincaIds)
      }

      const { data, error } = await query.order('fecha', { ascending: false })
      
      if (error) throw error
      
      return (data || []).map((t: any) => ({
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase.from('inventarios')
        .select('*')
        .eq('deleted', false)

      if (fincaId) {
        query = query.eq('propietario_id', fincaId)
      } else {
        const { data: userFincas } = await supabase
          .from('fincas')
          .select('id')
          .eq('propietario_id', user.id)
        const fincaIds = (userFincas || []).map((f: any) => f.id)
        if (fincaIds.length === 0) return []
        query = query.in('propietario_id', fincaIds)
      }

      const { data, error } = await query
      
      if (error) throw error
      
      return (data || []).map((i: any) => ({
        id: i.uuid,
        nombre: i.nombre,
        categoria: i.categoria || 'Insumo',
        stockActual: i.stock_actual || i.stockActual || 0,
        stockMinimo: i.stock_minimo || i.stockMinimo || 10,
        stockMaximo: (i.stock_minimo || i.stock_minimo || i.stockMinimo || 10) * 3
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-4 pb-4">
              <div>
                <CardTitle>Últimas Transacciones</CardTitle>
                <CardDescription>Registro histórico de movimientos financieros en la base de datos.</CardDescription>
              </div>
              <Dialog open={openTx} onOpenChange={setOpenTx}>
                <DialogTrigger
                  render={
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Registrar Transacción
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleSubmitTx} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Registrar Transacción</DialogTitle>
                      <DialogDescription>
                        Registra un ingreso o egreso de caja para la finca.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select 
                            value={formTx.tipo} 
                            onValueChange={(val) => {
                               const selectedVal = val || "Ingreso";
                               setFormTx({
                                 ...formTx,
                                 tipo: selectedVal,
                                 categoria: selectedVal === "Ingreso" ? "Venta de Leche" : "Alimentos / Concentrados"
                               });
                             }}
                          >
                            <SelectTrigger id="tipo">
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ingreso">Ingreso (+)</SelectItem>
                              <SelectItem value="Egreso">Egreso (-)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monto">Monto (Bs)</Label>
                          <Input
                            id="monto"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formTx.monto}
                            onChange={(e) => setFormTx({ ...formTx, monto: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoria">Categoría</Label>
                          <Select 
                            value={formTx.categoria} 
                            onValueChange={(val) => setFormTx({ ...formTx, categoria: val || "" })}
                          >
                            <SelectTrigger id="categoria">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {formTx.tipo === "Ingreso" ? (
                                <>
                                  <SelectItem value="Venta de Leche">Venta de Leche</SelectItem>
                                  <SelectItem value="Venta de Animal">Venta de Animal</SelectItem>
                                  <SelectItem value="Servicios de Finca">Servicios de Finca</SelectItem>
                                  <SelectItem value="Otros Ingresos">Otros Ingresos</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Alimentos / Concentrados">Alimentos / Concentrados</SelectItem>
                                  <SelectItem value="Medicinas / Clínica">Medicinas / Clínica</SelectItem>
                                  <SelectItem value="Mano de Obra">Mano de Obra</SelectItem>
                                  <SelectItem value="Mantenimiento / Equipos">Mantenimiento / Equipos</SelectItem>
                                  <SelectItem value="Servicios Básicos">Servicios Básicos</SelectItem>
                                  <SelectItem value="Otros Egresos">Otros Egresos</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fecha">Fecha</Label>
                          <Input
                            id="fecha"
                            type="date"
                            value={formTx.fecha}
                            onChange={(e) => setFormTx({ ...formTx, fecha: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="observacion">Detalle / Nota</Label>
                        <Input
                          id="observacion"
                          placeholder="Ej. Pago quincena ordeñador principal"
                          value={formTx.observacion}
                          onChange={(e) => setFormTx({ ...formTx, observacion: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={addTxMutation.isPending} className="w-full">
                        {addTxMutation.isPending ? "Guardando..." : "Confirmar Registro"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
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
              </div>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-4 pb-4">
              <div>
                <CardTitle>Inventario Físico de Insumos</CardTitle>
                <CardDescription>Monitoreo de stock de alimentos, medicinas y genética.</CardDescription>
              </div>
              <Dialog open={openInv} onOpenChange={setOpenInv}>
                <DialogTrigger
                  render={
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Registrar Insumo
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleSubmitInv} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Registrar Insumo / Producto</DialogTitle>
                      <DialogDescription>
                        Registra un producto en el inventario de la finca.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombreInv">Nombre del Insumo (Requerido)</Label>
                        <Input
                          id="nombreInv"
                          placeholder="Ej. Balanceado Iniciador"
                          value={formInv.nombre}
                          onChange={(e) => setFormInv({ ...formInv, nombre: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoriaInv">Categoría</Label>
                          <Select 
                            value={formInv.categoria} 
                            onValueChange={(val) => setFormInv({ ...formInv, categoria: val || "Alimento" })}
                          >
                            <SelectTrigger id="categoriaInv">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Alimento">Alimento</SelectItem>
                              <SelectItem value="Medicina">Medicina</SelectItem>
                              <SelectItem value="Semilla">Semilla</SelectItem>
                              <SelectItem value="Fertilizante">Fertilizante</SelectItem>
                              <SelectItem value="Genética">Genética</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="unidadInv">Unidad de Medida</Label>
                          <Select 
                            value={formInv.unidad} 
                            onValueChange={(val) => setFormInv({ ...formInv, unidad: val || "Kg" })}
                          >
                            <SelectTrigger id="unidadInv">
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kg">Kilogramos (Kg)</SelectItem>
                              <SelectItem value="L">Litros (L)</SelectItem>
                              <SelectItem value="Dosis">Dosis</SelectItem>
                              <SelectItem value="Bolsa">Bolsas / Sacos</SelectItem>
                              <SelectItem value="Unidad">Unidades</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stockActualInv">Stock Actual (Requerido)</Label>
                          <Input
                            id="stockActualInv"
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            value={formInv.stockActual}
                            onChange={(e) => setFormInv({ ...formInv, stockActual: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="stockMinimoInv">Stock Mínimo (Alerta)</Label>
                          <Input
                            id="stockMinimoInv"
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            value={formInv.stockMinimo}
                            onChange={(e) => setFormInv({ ...formInv, stockMinimo: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={addInvMutation.isPending} className="w-full">
                        {addInvMutation.isPending ? "Guardando..." : "Confirmar Insumo"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
