import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface ParentPinState {
  /** true depois que o PIN dos pais foi validado (área dos pais liberada). */
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

/**
 * Status de desbloqueio da área dos pais do modo criança.
 *
 * SEGURANÇA: o PIN em si NUNCA entra aqui (nem em outro estado persistente) —
 * só o booleano `unlocked`. Persistido no sessionStorage: sobrevive ao F5,
 * some ao fechar a aba.
 */
export const useParentPinStore = create<ParentPinState>()(
  persist(
    (set) => ({
      unlocked: false,
      unlock: () => set({ unlocked: true }),
      lock: () => set({ unlocked: false }),
    }),
    {
      name: 'tasabido.pais',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
