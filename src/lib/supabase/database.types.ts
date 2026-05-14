export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      animales: {
        Row: {
          uuid: string
          codigo: string
          nombre: string
          raza: string
          sexo: string
          categoria: string
          propietarioId: string
          procedencia: string
          fechaNacimiento: string | null
          pesoNacimiento: number | null
          pesoActual: number | null
          precioCompraBob: number | null
          estado: string
          loteId: string | null
          madreId: string | null
          padreId: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['animales']['Row']>
        Update: Partial<Database['public']['Tables']['animales']['Row']>
      }
      registros_peso: {
        Row: {
          uuid: string
          animalId: string
          fechaPesaje: string
          peso: number
          observacion: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['registros_peso']['Row']>
        Update: Partial<Database['public']['Tables']['registros_peso']['Row']>
      }
      eventos_reproductivos: {
        Row: {
          uuid: string
          animalId: string
          tipoEvento: string
          fechaEvento: string
          toroId: string | null
          criaId: string | null
          observacion: string | null
          diagnostico: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['eventos_reproductivos']['Row']>
        Update: Partial<Database['public']['Tables']['eventos_reproductivos']['Row']>
      }
      registros_leche: {
        Row: {
          uuid: string
          vacaId: string
          fecha: string
          turno: string
          litros: number
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['registros_leche']['Row']>
        Update: Partial<Database['public']['Tables']['registros_leche']['Row']>
      }
      lotes: {
        Row: {
          uuid: string
          fincaId: string | null
          nombre: string
          descripcion: string | null
          color: string
          categoriaLote: string
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['lotes']['Row']>
        Update: Partial<Database['public']['Tables']['lotes']['Row']>
      }
      potreros: {
        Row: {
          uuid: string
          nombre: string
          superficieHa: number
          condicion: number
          estado: string
          alturaPastoMetros: number
          diasDescanso: number
          fechaUltimaLiberacion: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['potreros']['Row']>
        Update: Partial<Database['public']['Tables']['potreros']['Row']>
      }
      ocupaciones_potrero: {
        Row: {
          uuid: string
          potreroId: string
          loteId: string
          fechaIngreso: string
          fechaSalidaReal: string | null
          diasProgramados: number
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['ocupaciones_potrero']['Row']>
        Update: Partial<Database['public']['Tables']['ocupaciones_potrero']['Row']>
      }
      lote_animales: {
        Row: {
          uuid: string
          loteId: string
          animalId: string
          fechaIngreso: string
          fechaSalida: string | null
          activo: boolean
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['lote_animales']['Row']>
        Update: Partial<Database['public']['Tables']['lote_animales']['Row']>
      }
      eventos_salud: {
        Row: {
          uuid: string
          animalId: string
          tipoEvento: string
          fecha: string
          medicamento: string | null
          dosis: string | null
          costoBob: number | null
          fechaProximaAplicacion: string | null
          observacion: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['eventos_salud']['Row']>
        Update: Partial<Database['public']['Tables']['eventos_salud']['Row']>
      }
      inventarios: {
        Row: {
          uuid: string
          nombre: string
          categoria: string
          stockActual: number
          stockMinimo: number
          unidad: string
          fechaVencimiento: string | null
          propietarioId: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['inventarios']['Row']>
        Update: Partial<Database['public']['Tables']['inventarios']['Row']>
      }
      alertas: {
        Row: {
          uuid: string
          titulo: string
          mensaje: string
          fechaLimite: string
          estado: string
          tipo: string
          referenciaId: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['alertas']['Row']>
        Update: Partial<Database['public']['Tables']['alertas']['Row']>
      }
      transacciones: {
        Row: {
          uuid: string
          tipo: string
          categoria: string
          monto: number
          fecha: string
          contraparte: string | null
          observacion: string | null
          propietarioId: string | null
          referenciaId: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['transacciones']['Row']>
        Update: Partial<Database['public']['Tables']['transacciones']['Row']>
      }
      actividades_log: {
        Row: {
          uuid: string
          propietarioId: string | null
          entidad: string
          accion: string
          descripcion: string
          fecha: string
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['actividades_log']['Row']>
        Update: Partial<Database['public']['Tables']['actividades_log']['Row']>
      }
      tareas: {
        Row: {
          uuid: string
          propietarioId: string | null
          titulo: string
          estado: string
          prioridad: string
          fechaLimite: string | null
          animalId: string | null
          asignadoA: string | null
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['tareas']['Row']>
        Update: Partial<Database['public']['Tables']['tareas']['Row']>
      }
      recetas_info: {
        Row: {
          uuid: string
          propietarioId: string | null
          nombre: string
          ingredientesJson: string
          proteinaTotal: number
          costoTotal: number
          synced: boolean
          deleted: boolean
          updatedAt: string
        }
        Insert: Partial<Database['public']['Tables']['recetas_info']['Row']>
        Update: Partial<Database['public']['Tables']['recetas_info']['Row']>
      }
    }
  }
}
