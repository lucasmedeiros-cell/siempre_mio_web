import { create } from 'zustand'

interface GlobalState {
  fincaId: string | null
  setFincaId: (id: string | null) => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  fincaId: null,
  setFincaId: (id) => set({ fincaId: id }),
}))
